# Cấu trúc Dự án như sau:

```
├── README.md
├── package.json
├── src
│   ├── architecture
│   │   ├── architect.js
│   │   ├── connection.js
│   │   ├── group.js
│   │   ├── layer.js
│   │   ├── network.js
│   │   └── node.js
│   ├── config.js
│   ├── index.js
│   ├── methods
│   │   ├── activation.js
│   │   ├── connection.js
│   │   ├── cost.js
│   │   ├── crossover.js
│   │   ├── gating.js
│   │   ├── methods.js
│   │   ├── mutation.js
│   │   ├── rate.js
│   │   └── selection.js
│   ├── multithreading
│   │   ├── multi.js
│   │   └── workers
│   │       ├── browser
│   │       │   └── testworker.js
│   │       ├── node
│   │       │   ├── testworker.js
│   │       │   └── worker.js
│   │       └── workers.js
│   ├── neat.js
│   └── neataptic.js
└── webpack.config.js
```

# Danh sách Các Tệp Dự án:

## ../webpack.config.js

```
// webpack.config.js
import path from 'path';
import { fileURLToPath } from 'url';
import webpack from 'webpack';
import CopyWebpackPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: './src/neataptic.js',
  output: {
    filename: 'neataptic.min.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'neataptic',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  mode: 'production',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
    new webpack.optimize.ModuleConcatenationPlugin(),
    // new CopyWebpackPlugin([
    //   {
    //     from: path.resolve(__dirname, '/src/multithreading/workers/node/worker.js'),
    //     to: path.resolve(__dirname, 'dist')
    //   }
    // ]),
    new CopyWebpackPlugin({
      patterns: [
        { from: './src/multithreading/workers/node/worker.js', to: '.' }, // Chỉnh sửa 'source' và 'destination' theo nhu cầu của bạn
      ],
    }),
  ],
  optimization: {
    minimize: true,
  },
  resolve: {
    extensions: ['.js'],
  },
  externals: [
    'child_process',
    'os'
  ],
  node: {
    __dirname: false
  }
};

```

 ## ../src\config.js

```
// Config
const config = {
    warnings: false
};

export default config;
```

 ## ../src\index.js

```
console.log('Hello world!');

```

 ## ../src\neat.js

```
/* Import */
import Network from './architecture/network.js';
import methods from './methods/methods.js';
import config from './config.js';

/* Easier variable naming */
const { selection } = methods;


export default Neat;

class Neat {
    constructor(input, output, fitness, options = {}) {
        this.input = input; // The input size of the networks
        this.output = output; // The output size of the networks
        this.fitness = fitness; // The fitness function to evaluate the networks

        // Configure options
        this.equal = options.equal || false;
        this.clear = options.clear || false;
        this.popsize = options.popsize || 50;
        this.elitism = options.elitism || 0;
        this.provenance = options.provenance || 0;
        this.mutationRate = options.mutationRate || 0.3;
        this.mutationAmount = options.mutationAmount || 1;

        this.fitnessPopulation = options.fitnessPopulation || false;

        this.selection = options.selection || methods.selection.POWER;
        this.crossover = options.crossover || [
            methods.crossover.SINGLE_POINT,
            methods.crossover.TWO_POINT,
            methods.crossover.UNIFORM,
            methods.crossover.AVERAGE,
        ];
        this.mutation = options.mutation || methods.mutation.FFW;

        this.template = options.network || false;

        this.maxNodes = options.maxNodes || Infinity;
        this.maxConns = options.maxConns || Infinity;
        this.maxGates = options.maxGates || Infinity;

        // Custom mutation selection function if given
        this.selectMutationMethod =
            typeof options.mutationSelection === 'function'
                ? options.mutationSelection.bind(this)
                : this.selectMutationMethod.bind(this);

        // Generation counter
        this.generation = 0;

        // Initialise the genomes
        this.createPool(this.template);
    }

    /**
     * Create the initial pool of genomes
     */
    createPool(network) {
        this.population = [];

        for (let i = 0; i < this.popsize; i++) {
            let copy;
            if (this.template) {
                copy = Network.fromJSON(network.toJSON());
            } else {
                copy = new Network(this.input, this.output);
            }
            copy.score = undefined;
            this.population.push(copy);
        }
    }

    /**
     * Evaluates, selects, breeds and mutates population
     */
    async evolve() {
        // Check if evaluated, sort the population
        if (typeof this.population[this.population.length - 1].score === 'undefined') {
            await this.evaluate();
        }
        this.sort();

        const fittest = Network.fromJSON(this.population[0].toJSON());
        fittest.score = this.population[0].score;

        const newPopulation = [];

        // Elitism
        const elitists = [];
        for (let i = 0; i < this.elitism; i++) {
            elitists.push(this.population[i]);
        }

        // Provenance
        for (let i = 0; i < this.provenance; i++) {
            newPopulation.push(Network.fromJSON(this.template.toJSON()));
        }

        // Breed the next individuals
        for (let i = 0; i < this.popsize - this.elitism - this.provenance; i++) {
            newPopulation.push(this.getOffspring());
        }

        // Replace the old population with the new population
        this.population = newPopulation;
        this.mutate();

        this.population.push(...elitists);

        // Reset the scores
        for (let i = 0; i < this.population.length; i++) {
            this.population[i].score = undefined;
        }

        this.generation++;

        return fittest;
    }

    /**
     * Breeds two parents into an offspring, population MUST be sorted
     */
    getOffspring() {
        const parent1 = this.getParent();
        const parent2 = this.getParent();

        return Network.crossOver(parent1, parent2, this.equal);
    }

    /**
     * Selects a random mutation method for a genome according to the parameters
     */
    selectMutationMethod(genome) {
        const mutationMethod = this.mutation[Math.floor(Math.random() * this.mutation.length)];

        if (mutationMethod === methods.mutation.ADD_NODE && genome.nodes.length >= this.maxNodes) {
            if (config.warnings) console.warn('maxNodes exceeded!');
            return null;
        }

        if (mutationMethod === methods.mutation.ADD_CONN && genome.connections.length >= this.maxConns) {
            if (config.warnings) console.warn('maxConns exceeded!');
            return null;
        }

        if (mutationMethod === methods.mutation.ADD_GATE && genome.gates.length >= this.maxGates) {
            if (config.warnings) console.warn('maxGates exceeded!');
            return null;
        }

        return mutationMethod;
    }

    /**
     * Mutates the given (or current) population
     */
    mutate() {
        // Elitist genomes should not be included
        for (let i = 0; i < this.population.length; i++) {
            if (Math.random() <= this.mutationRate) {
                for (let j = 0; j < this.mutationAmount; j++) {
                    const mutationMethod = this.selectMutationMethod(this.population[i]);
                    if (mutationMethod) {
                        this.population[i].mutate(mutationMethod);
                    }
                }
            }
        }
    }

    /**
     * Evaluates the current population
     */
    async evaluate() {
        if (this.fitnessPopulation) {
            if (this.clear) {
                for (let i = 0; i < this.population.length; i++) {
                    this.population[i].clear();
                }
            }
            await this.fitness(this.population);
        } else {
            for (let i = 0; i < this.population.length; i++) {
                const genome = this.population[i];
                if (this.clear) genome.clear();
                genome.score = await this.fitness(genome);
            }
        }
    }

    /**
     * Sorts the population by score
     */
    sort() {
        this.population.sort((a, b) => b.score - a.score);
    }

    /**
     * Returns the fittest genome of the current population
     */
    getFittest() {
        // Check if evaluated
        if (typeof this.population[this.population.length - 1].score === 'undefined') {
            this.evaluate();
        }
        if (this.population[0].score < this.population[1].score) {
            this.sort();
        }

        return this.population[0];
    }

    /**
     * Returns the average fitness of the current population
     */
    getAverage() {
        if (typeof this.population[this.population.length - 1].score === 'undefined') {
            this.evaluate();
        }

        let score = 0;
        for (let i = 0; i < this.population.length; i++) {
            score += this.population[i].score;
        }

        return score / this.population.length;
    }

    /**
     * Gets a genome based on the selection function
     * @return {Network} genome
     */
    getParent() {
        switch (this.selection) {
            case selection.POWER:
                if (this.population[0].score < this.population[1].score) this.sort();

                const index = Math.floor(Math.pow(Math.random(), this.selection.power) * this.population.length);
                return this.population[index];
            case selection.FITNESS_PROPORTIONATE:
                // As negative fitnesses are possible
                // https://stackoverflow.com/questions/16186686/genetic-algorithm-handling-negative-fitness-values
                // this is unnecessarily run for every individual, should be changed

                let totalFitness = 0;
                let minimalFitness = 0;
                for (let i = 0; i < this.population.length; i++) {
                    const score = this.population[i].score;
                    minimalFitness = score < minimalFitness ? score : minimalFitness;
                    totalFitness += score;
                }

                minimalFitness = Math.abs(minimalFitness);
                totalFitness += minimalFitness * this.population.length;

                const random = Math.random() * totalFitness;
                let value = 0;

                for (let i = 0; i < this.population.length; i++) {
                    const genome = this.population[i];
                    value += genome.score + minimalFitness;
                    if (random < value) return genome;
                }

                // if all scores equal, return random genome
                return this.population[Math.floor(Math.random() * this.population.length)];
            case selection.TOURNAMENT:
                if (this.selection.size > this.popsize) {
                    throw new Error(
                        'Your tournament size should be lower than the population size, please change methods.selection.TOURNAMENT.size'
                    );
                }

                // Create a tournament
                const individuals = [];
                for (let i = 0; i < this.selection.size; i++) {
                    const randomIndividual = this.population[Math.floor(Math.random() * this.population.length)];
                    individuals.push(randomIndividual);
                }

                // Sort the tournament individuals by score
                individuals.sort((a, b) => b.score - a.score);

                // Select an individual
                for (let i = 0; i < this.selection.size; i++) {
                    if (Math.random() < this.selection.probability || i === this.selection.size - 1) {
                        return individuals[i];
                    }
                }
                break;
            default:
                throw new Error('Unknown selection method');
        }
    }

    /**
     * Export the current population to a json object
     */
    export() {
        const json = [];
        for (let i = 0; i < this.population.length; i++) {
            const genome = this.population[i];
            json.push(genome.toJSON());
        }

        return json;
    }

    /**
     * Import population from a json object
     */
    import(json) {
        const population = [];
        for (let i = 0; i < json.length; i++) {
            const genome = json[i];
            population.push(Network.fromJSON(genome));
        }
        this.population = population;
        this.popsize = population.length;
    }
}



```

 ## ../src\neataptic.js

```
/* Import */
import methods from './methods/methods.js';
import Connection from './architecture/connection.js';
import architect from './architecture/architect.js';
import Network from './architecture/network.js';
import config from './config.js';
import Group from './architecture/group.js';
import Layer from './architecture/layer.js';
import Node from './architecture/node.js';
import Neat from './neat.js';
import multi from './multithreading/multi.js';

/* Create the Neataptic object */
const Neataptic = {
    methods,
    Connection,
    architect,
    Network,
    config,
    Group,
    Layer,
    Node,
    Neat,
    multi,
};

/* Export */
export default Neataptic;

/* Optional: Attach Neataptic to the global window object if running in a browser */
if (typeof window !== 'undefined') {
    window.Neataptic = Neataptic;
}

```

 ## ../src\architecture\architect.js

```
/* Import */
import methods from '../methods/methods.js';
import Network from './network.js';
import Group from './group.js';
import Layer from './layer.js';
import Node from './node.js';

export default architect;

const architect = {
    /**
     * Constructs a network from a given array of connected nodes
     */
    Construct(list) {
        // Create a network
        const network = new Network(0, 0);

        // Transform all groups into nodes
        let nodes = [];

        for (let i = 0; i < list.length; i++) {
            if (list[i] instanceof Group) {
                for (let j = 0; j < list[i].nodes.length; j++) {
                    nodes.push(list[i].nodes[j]);
                }
            } else if (list[i] instanceof Layer) {
                for (let j = 0; j < list[i].nodes.length; j++) {
                    for (let k = 0; k < list[i].nodes[j].nodes.length; k++) {
                        nodes.push(list[i].nodes[j].nodes[k]);
                    }
                }
            } else if (list[i] instanceof Node) {
                nodes.push(list[i]);
            }
        }

        // Determine input and output nodes
        let inputs = [];
        let outputs = [];
        for (let i = nodes.length - 1; i >= 0; i--) {
            if (
                nodes[i].type === 'output' ||
                nodes[i].connections.out.length + nodes[i].connections.gated.length === 0
            ) {
                nodes[i].type = 'output';
                network.output++;
                outputs.push(nodes[i]);
                nodes.splice(i, 1);
            } else if (nodes[i].type === 'input' || !nodes[i].connections.in.length) {
                nodes[i].type = 'input';
                network.input++;
                inputs.push(nodes[i]);
                nodes.splice(i, 1);
            }
        }

        // Input nodes are always first, output nodes are always last
        nodes = inputs.concat(nodes).concat(outputs);

        if (network.input === 0 || network.output === 0) {
            throw new Error('Given nodes have no clear input/output node!');
        }

        for (let i = 0; i < nodes.length; i++) {
            for (let j = 0; j < nodes[i].connections.out.length; j++) {
                network.connections.push(nodes[i].connections.out[j]);
            }
            for (let j = 0; j < nodes[i].connections.gated.length; j++) {
                network.gates.push(nodes[i].connections.gated[j]);
            }
            if (nodes[i].connections.self.weight !== 0) {
                network.selfconns.push(nodes[i].connections.self);
            }
        }

        network.nodes = nodes;

        return network;
    },

    /**
     * Creates a multilayer perceptron (MLP)
     */
    Perceptron(...layers) {
        if (layers.length < 3) {
            throw new Error('You have to specify at least 3 layers');
        }

        // Create a list of nodes/groups
        const nodes = [];
        nodes.push(new Group(layers[0]));

        for (let i = 1; i < layers.length; i++) {
            let layer = layers[i];
            layer = new Group(layer);
            nodes.push(layer);
            nodes[i - 1].connect(nodes[i], methods.connection.ALL_TO_ALL);
        }

        // Construct the network
        return architect.Construct(nodes);
    },

    /**
     * Creates a randomly connected network
     */
    Random(input, hidden, output, options = {}) {
        const connections = options.connections || hidden * 2;
        const backconnections = options.backconnections || 0;
        const selfconnections = options.selfconnections || 0;
        const gates = options.gates || 0;

        const network = new Network(input, output);

        for (let i = 0; i < hidden; i++) {
            network.mutate(methods.mutation.ADD_NODE);
        }

        for (let i = 0; i < connections - hidden; i++) {
            network.mutate(methods.mutation.ADD_CONN);
        }

        for (let i = 0; i < backconnections; i++) {
            network.mutate(methods.mutation.ADD_BACK_CONN);
        }

        for (let i = 0; i < selfconnections; i++) {
            network.mutate(methods.mutation.ADD_SELF_CONN);
        }

        for (let i = 0; i < gates; i++) {
            network.mutate(methods.mutation.ADD_GATE);
        }

        return network;
    },

    /**
     * Creates a Long Short-Term Memory (LSTM) network
     */
    LSTM(...args) {
        if (args.length < 3) {
            throw new Error('You have to specify at least 3 layers');
        }

        let last = args[args.length - 1];
        let outputLayer;

        if (typeof last === 'number') {
            outputLayer = new Group(last);
            args.pop();
            last = {};
        } else {
            outputLayer = new Group(args.pop());
        }

        outputLayer.set({
            type: 'output',
        });

        const options = {};
        options.memoryToMemory = last.memoryToMemory || false;
        options.outputToMemory = last.outputToMemory || false;
        options.outputToGates = last.outputToGates || false;
        options.inputToOutput = last.inputToOutput === undefined ? true : last.inputToOutput;
        options.inputToDeep = last.inputToDeep === undefined ? true : last.inputToDeep;

        const inputLayer = new Group(args.shift());
        inputLayer.set({
            type: 'input',
        });

        const blocks = args;

        const nodes = [];
        nodes.push(inputLayer);

        let previous = inputLayer;
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];

            // Initialize required nodes (in activation order)
            const inputGate = new Group(block);
            const forgetGate = new Group(block);
            const memoryCell = new Group(block);
            const outputGate = new Group(block);
            const outputBlock = i === blocks.length - 1 ? outputLayer : new Group(block);

            inputGate.set({
                bias: 1,
            });
            forgetGate.set({
                bias: 1,
            });
            outputGate.set({
                bias: 1,
            });

            // Connect the input with all the nodes
            const input = previous.connect(memoryCell, methods.connection.ALL_TO_ALL);
            previous.connect(inputGate, methods.connection.ALL_TO_ALL);
            previous.connect(outputGate, methods.connection.ALL_TO_ALL);
            previous.connect(forgetGate, methods.connection.ALL_TO_ALL);

            // Set up internal connections
            memoryCell.connect(inputGate, methods.connection.ALL_TO_ALL);
            memoryCell.connect(forgetGate, methods.connection.ALL_TO_ALL);
            memoryCell.connect(outputGate, methods.connection.ALL_TO_ALL);
            const forget = memoryCell.connect(memoryCell, methods.connection.ONE_TO_ONE);
            const output = memoryCell.connect(outputBlock, methods.connection.ALL_TO_ALL);

            // Set up gates
            inputGate.gate(input, methods.gating.INPUT);
            forgetGate.gate(forget, methods.gating.SELF);
            outputGate.gate(output, methods.gating.OUTPUT);

            // Input to all memory cells
            if (options.inputToDeep && i > 0) {
                const input = inputLayer.connect(memoryCell, methods.connection.ALL_TO_ALL);
                inputGate.gate(input, methods.gating.INPUT);
            }

            // Optional connections
            if (options.memoryToMemory) {
                const input = memoryCell.connect(memoryCell, methods.connection.ALL_TO_ELSE);
                inputGate.gate(input, methods.gating.INPUT);
            }

            if (options.outputToMemory) {
                const input = outputLayer.connect(memoryCell, methods.connection.ALL_TO_ALL);
                inputGate.gate(input, methods.gating.INPUT);
            }

            if (options.outputToGates) {
                outputLayer.connect(inputGate, methods.connection.ALL_TO_ALL);
                outputLayer.connect(forgetGate, methods.connection.ALL_TO_ALL);
                outputLayer.connect(outputGate, methods.connection.ALL_TO_ALL);
            }

            // Add to array
            nodes.push(inputGate);
            nodes.push(forgetGate);
            nodes.push(memoryCell);
            nodes.push(outputGate);
            if (i !== blocks.length - 1) nodes.push(outputBlock);

            previous = outputBlock;
        }

        // Input to output direct connection
        if (options.inputToOutput) {
            inputLayer.connect(outputLayer, methods.connection.ALL_TO_ALL);
        }

        nodes.push(outputLayer);
        return architect.Construct(nodes);
    },

    /**
     * Creates a Gated Recurrent Unit (GRU) network
     */
    GRU(...args) {
        if (args.length < 3) {
            throw new Error('You have to specify at least 3 layers');
        }

        const inputLayer = new Group(args.shift());
        const outputLayer = new Group(args.pop());
        const blocks = args;

        const nodes = [];
        nodes.push(inputLayer);

        let previous = inputLayer;
        for (let i = 0; i < blocks.length; i++) {
            const layer = new Layer.GRU(blocks[i]);
            previous.connect(layer);
            previous = layer;

            nodes.push(layer);
        }

        previous.connect(outputLayer);
        nodes.push(outputLayer);

        return architect.Construct(nodes);
    },

    /**
     * Creates a Hopfield network of the given size
     */
    Hopfield(size) {
        const input = new Group(size);
        const output = new Group(size);

        input.connect(output, methods.connection.ALL_TO_ALL);

        input.set({
            type: 'input',
        });
        output.set({
            squash: methods.activation.STEP,
            type: 'output',
        });

        const network = architect.Construct([input, output]);

        return network;
    },

    /**
     * Creates a NARX network (Nonlinear AutoRegressive with eXogenous inputs)
     */
    NARX(inputSize, hiddenLayers, outputSize, previousInput, previousOutput) {
        if (!Array.isArray(hiddenLayers)) {
            hiddenLayers = [hiddenLayers];
        }

        const nodes = [];

        const input = new Layer.Dense(inputSize);
        const inputMemory = new Layer.Memory(inputSize, previousInput);
        const hidden = [];
        const output = new Layer.Dense(outputSize);
        const outputMemory = new Layer.Memory(outputSize, previousOutput);

        nodes.push(input);
        nodes.push(outputMemory);

        for (let i = 0; i < hiddenLayers.length; i++) {
            const hiddenLayer = new Layer.Dense(hiddenLayers[i]);
            hidden.push(hiddenLayer);
            nodes.push(hiddenLayer);
            if (typeof hidden[i - 1] !== 'undefined') {
                hidden[i - 1].connect(hiddenLayer, methods.connection.ALL_TO_ALL);
            }
        }

        nodes.push(inputMemory);
        nodes.push(output);

        input.connect(hidden[0], methods.connection.ALL_TO_ALL);
        input.connect(inputMemory, methods.connection.ONE_TO_ONE, 1);
        inputMemory.connect(hidden[0], methods.connection.ALL_TO_ALL);
        hidden[hidden.length - 1].connect(output, methods.connection.ALL_TO_ALL);
        output.connect(outputMemory, methods.connection.ONE_TO_ONE, 1);
        outputMemory.connect(hidden[0], methods.connection.ALL_TO_ALL);

        input.set({
            type: 'input',
        });
        output.set({
            type: 'output',
        });

        return architect.Construct(nodes);
    },
};

```

 ## ../src\architecture\connection.js

```
export default Connection;

class Connection {
    constructor(from, to, weight) {
        this.from = from;
        this.to = to;
        this.gain = 1;

        this.weight = (typeof weight === 'undefined') ? Math.random() * 0.2 - 0.1 : weight;

        this.gater = null;
        this.elegibility = 0;

        // Dùng để theo dõi momentum
        this.previousDeltaWeight = 0;

        // Batch training
        this.totalDeltaWeight = 0;

        this.xtrace = {
            nodes: [],
            values: []
        };
    }

    /**
     * Chuyển kết nối thành một đối tượng JSON
     */
    toJSON() {
        const json = {
            weight: this.weight
        };

        return json;
    }

    /**
     * Trả về một innovation ID
     * https://en.wikipedia.org/wiki/Pairing_function (Cantor pairing function)
     */
    static innovationID(a, b) {
        return 0.5 * (a + b) * (a + b + 1) + b;
    }
}


```

 ## ../src\architecture\group.js

```
/* Import */
import methods from '../methods/methods.js';
import config from '../config.js';
import Layer from './layer.js';
import Node from './node.js';

export default Group;

class Group {
    constructor(size) {
        this.nodes = [];
        this.connections = {
            in: [],
            out: [],
            self: []
        };

        for (let i = 0; i < size; i++) {
            this.nodes.push(new Node());
        }
    }

    /**
     * Activates all the nodes in the group
     */
    activate(value) {
        const values = [];

        if (typeof value !== 'undefined' && value.length !== this.nodes.length) {
            throw new Error('Array with values should be same as the amount of nodes!');
        }

        for (let i = 0; i < this.nodes.length; i++) {
            let activation;
            if (typeof value === 'undefined') {
                activation = this.nodes[i].activate();
            } else {
                activation = this.nodes[i].activate(value[i]);
            }

            values.push(activation);
        }

        return values;
    }

    /**
     * Propagates all the nodes in the group
     */
    propagate(rate, momentum, target) {
        if (typeof target !== 'undefined' && target.length !== this.nodes.length) {
            throw new Error('Array with values should be same as the amount of nodes!');
        }

        for (let i = this.nodes.length - 1; i >= 0; i--) {
            if (typeof target === 'undefined') {
                this.nodes[i].propagate(rate, momentum, true);
            } else {
                this.nodes[i].propagate(rate, momentum, true, target[i]);
            }
        }
    }

    /**
     * Connects the nodes in this group to nodes in another group or just a node
     */
    connect(target, method, weight) {
        let connections = [];
        let i, j;

        if (target instanceof Group) {
            if (typeof method === 'undefined') {
                if (this !== target) {
                    if (config.warnings) console.warn('No group connection specified, using ALL_TO_ALL');
                    method = methods.connection.ALL_TO_ALL;
                } else {
                    if (config.warnings) console.warn('No group connection specified, using ONE_TO_ONE');
                    method = methods.connection.ONE_TO_ONE;
                }
            }

            if (method === methods.connection.ALL_TO_ALL || method === methods.connection.ALL_TO_ELSE) {
                for (i = 0; i < this.nodes.length; i++) {
                    for (j = 0; j < target.nodes.length; j++) {
                        if (method === methods.connection.ALL_TO_ELSE && this.nodes[i] === target.nodes[j]) continue;
                        const connection = this.nodes[i].connect(target.nodes[j], weight);
                        this.connections.out.push(connection[0]);
                        target.connections.in.push(connection[0]);
                        connections.push(connection[0]);
                    }
                }
            } else if (method === methods.connection.ONE_TO_ONE) {
                if (this.nodes.length !== target.nodes.length) {
                    throw new Error('From and To group must be the same size!');
                }

                for (i = 0; i < this.nodes.length; i++) {
                    const connection = this.nodes[i].connect(target.nodes[i], weight);
                    this.connections.self.push(connection[0]);
                    connections.push(connection[0]);
                }
            }
        } else if (target instanceof Layer) {
            connections = target.input(this, method, weight);
        } else if (target instanceof Node) {
            for (i = 0; i < this.nodes.length; i++) {
                const connection = this.nodes[i].connect(target, weight);
                this.connections.out.push(connection[0]);
                connections.push(connection[0]);
            }
        }

        return connections;
    }

    /**
     * Make nodes from this group gate the given connection(s)
     */
    gate(connections, method) {
        if (typeof method === 'undefined') {
            throw new Error('Please specify Gating.INPUT, Gating.OUTPUT');
        }

        if (!Array.isArray(connections)) {
            connections = [connections];
        }

        const nodes1 = [];
        const nodes2 = [];

        let i, j;
        for (i = 0; i < connections.length; i++) {
            const connection = connections[i];
            if (!nodes1.includes(connection.from)) nodes1.push(connection.from);
            if (!nodes2.includes(connection.to)) nodes2.push(connection.to);
        }

        switch (method) {
            case methods.gating.INPUT:
                for (i = 0; i < nodes2.length; i++) {
                    const node = nodes2[i];
                    const gater = this.nodes[i % this.nodes.length];

                    for (j = 0; j < node.connections.in.length; j++) {
                        const conn = node.connections.in[j];
                        if (connections.includes(conn)) {
                            gater.gate(conn);
                        }
                    }
                }
                break;
            case methods.gating.OUTPUT:
                for (i = 0; i < nodes1.length; i++) {
                    const node = nodes1[i];
                    const gater = this.nodes[i % this.nodes.length];

                    for (j = 0; j < node.connections.out.length; j++) {
                        const conn = node.connections.out[j];
                        if (connections.includes(conn)) {
                            gater.gate(conn);
                        }
                    }
                }
                break;
            case methods.gating.SELF:
                for (i = 0; i < nodes1.length; i++) {
                    const node = nodes1[i];
                    const gater = this.nodes[i % this.nodes.length];

                    if (connections.includes(node.connections.self)) {
                        gater.gate(node.connections.self);
                    }
                }
                break;
            default:
                throw new Error('Invalid gating method!');
        }
    }

    /**
     * Sets the value of a property for every node
     */
    set(values) {
        for (let i = 0; i < this.nodes.length; i++) {
            if (typeof values.bias !== 'undefined') {
                this.nodes[i].bias = values.bias;
            }

            this.nodes[i].squash = values.squash || this.nodes[i].squash;
            this.nodes[i].type = values.type || this.nodes[i].type;
        }
    }

    /**
     * Disconnects all nodes from this group from another given group/node
     */
    disconnect(target, twosided = false) {
        // In the future, disconnect will return a connection so indexOf can be used
        let i, j, k;
        if (target instanceof Group) {
            for (i = 0; i < this.nodes.length; i++) {
                for (j = 0; j < target.nodes.length; j++) {
                    this.nodes[i].disconnect(target.nodes[j], twosided);

                    for (k = this.connections.out.length - 1; k >= 0; k--) {
                        const conn = this.connections.out[k];

                        if (conn.from === this.nodes[i] && conn.to === target.nodes[j]) {
                            this.connections.out.splice(k, 1);
                            break;
                        }
                    }

                    if (twosided) {
                        for (k = this.connections.in.length - 1; k >= 0; k--) {
                            const conn = this.connections.in[k];

                            if (conn.from === target.nodes[j] && conn.to === this.nodes[i]) {
                                this.connections.in.splice(k, 1);
                                break;
                            }
                        }
                    }
                }
            }
        } else if (target instanceof Node) {
            for (i = 0; i < this.nodes.length; i++) {
                this.nodes[i].disconnect(target, twosided);

                for (j = this.connections.out.length - 1; j >= 0; j--) {
                    const conn = this.connections.out[j];

                    if (conn.from === this.nodes[i] && conn.to === target) {
                        this.connections.out.splice(j, 1);
                        break;
                    }
                }

                if (twosided) {
                    for (j = this.connections.in.length - 1; j >= 0; j--) {
                        const conn = this.connections.in[j];

                        if (conn.from === target && conn.to === this.nodes[i]) {
                            this.connections.in.splice(j, 1);
                            break;
                        }
                    }
                }
            }
        }
    }

    /**
     * Clear the context of this group
     */
    clear() {
        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].clear();
        }
    }
}


```

 ## ../src\architecture\layer.js

```
/* Import */
import methods from '../methods/methods.js';
import Group from './group.js';
import Node from './node.js';

export default Layer;

class Layer {
    constructor() {
        this.output = null;
        this.nodes = [];
        this.connections = {
            in: [],
            out: [],
            self: []
        };
    }

    /**
     * Activates all the nodes in the group
     */
    activate(value) {
        const values = [];

        if (typeof value !== 'undefined' && value.length !== this.nodes.length) {
            throw new Error('Array with values should be same as the amount of nodes!');
        }

        for (let i = 0; i < this.nodes.length; i++) {
            let activation;
            if (typeof value === 'undefined') {
                activation = this.nodes[i].activate();
            } else {
                activation = this.nodes[i].activate(value[i]);
            }

            values.push(activation);
        }

        return values;
    }

    /**
     * Propagates all the nodes in the group
     */
    propagate(rate, momentum, target) {
        if (typeof target !== 'undefined' && target.length !== this.nodes.length) {
            throw new Error('Array with values should be same as the amount of nodes!');
        }

        for (let i = this.nodes.length - 1; i >= 0; i--) {
            if (typeof target === 'undefined') {
                this.nodes[i].propagate(rate, momentum, true);
            } else {
                this.nodes[i].propagate(rate, momentum, true, target[i]);
            }
        }
    }

    /**
     * Connects the nodes in this group to nodes in another group or just a node
     */
    connect(target, method, weight) {
        let connections;
        if (target instanceof Group || target instanceof Node) {
            connections = this.output.connect(target, method, weight);
        } else if (target instanceof Layer) {
            connections = target.input(this, method, weight);
        }

        return connections;
    }

    /**
     * Make nodes from this group gate the given connection(s)
     */
    gate(connections, method) {
        this.output.gate(connections, method);
    }

    /**
     * Sets the value of a property for every node
     */
    set(values) {
        for (let i = 0; i < this.nodes.length; i++) {
            const node = this.nodes[i];

            if (node instanceof Node) {
                if (typeof values.bias !== 'undefined') {
                    node.bias = values.bias;
                }

                node.squash = values.squash || node.squash;
                node.type = values.type || node.type;
            } else if (node instanceof Group) {
                node.set(values);
            }
        }
    }

    /**
     * Disconnects all nodes from this group from another given group/node
     */
    disconnect(target, twosided = false) {
        // In the future, disconnect will return a connection so indexOf can be used
        let i, j, k;
        if (target instanceof Group) {
            for (i = 0; i < this.nodes.length; i++) {
                for (j = 0; j < target.nodes.length; j++) {
                    this.nodes[i].disconnect(target.nodes[j], twosided);

                    for (k = this.connections.out.length - 1; k >= 0; k--) {
                        const conn = this.connections.out[k];

                        if (conn.from === this.nodes[i] && conn.to === target.nodes[j]) {
                            this.connections.out.splice(k, 1);
                            break;
                        }
                    }

                    if (twosided) {
                        for (k = this.connections.in.length - 1; k >= 0; k--) {
                            const conn = this.connections.in[k];

                            if (conn.from === target.nodes[j] && conn.to === this.nodes[i]) {
                                this.connections.in.splice(k, 1);
                                break;
                            }
                        }
                    }
                }
            }
        } else if (target instanceof Node) {
            for (i = 0; i < this.nodes.length; i++) {
                this.nodes[i].disconnect(target, twosided);

                for (j = this.connections.out.length - 1; j >= 0; j--) {
                    const conn = this.connections.out[j];

                    if (conn.from === this.nodes[i] && conn.to === target) {
                        this.connections.out.splice(j, 1);
                        break;
                    }
                }

                if (twosided) {
                    for (k = this.connections.in.length - 1; k >= 0; k--) {
                        const conn = this.connections.in[k];

                        if (conn.from === target && conn.to === this.nodes[i]) {
                            this.connections.in.splice(k, 1);
                            break;
                        }
                    }
                }
            }
        }
    }

    /**
     * Clear the context of this group
     */
    clear() {
        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].clear();
        }
    }

    /**
     * Static method to create a Dense layer
     */
    static Dense(size) {
        // Create the layer
        const layer = new Layer();

        // Init required nodes (in activation order)
        const block = new Group(size);

        layer.nodes.push(block);
        layer.output = block;

        layer.input = function (from, method, weight) {
            if (from instanceof Layer) from = from.output;
            method = method || methods.connection.ALL_TO_ALL;
            return from.connect(block, method, weight);
        };

        return layer;
    }

    /**
     * Static method to create an LSTM layer
     */
    static LSTM(size) {
        // Create the layer
        const layer = new Layer();

        // Init required nodes (in activation order)
        const inputGate = new Group(size);
        const forgetGate = new Group(size);
        const memoryCell = new Group(size);
        const outputGate = new Group(size);
        const outputBlock = new Group(size);

        inputGate.set({ bias: 1 });
        forgetGate.set({ bias: 1 });
        outputGate.set({ bias: 1 });

        // Set up internal connections
        memoryCell.connect(inputGate, methods.connection.ALL_TO_ALL);
        memoryCell.connect(forgetGate, methods.connection.ALL_TO_ALL);
        memoryCell.connect(outputGate, methods.connection.ALL_TO_ALL);
        const forget = memoryCell.connect(memoryCell, methods.connection.ONE_TO_ONE);
        const output = memoryCell.connect(outputBlock, methods.connection.ALL_TO_ALL);

        // Set up gates
        forgetGate.gate(forget, methods.gating.SELF);
        outputGate.gate(output, methods.gating.OUTPUT);

        // Add to nodes array
        layer.nodes = [inputGate, forgetGate, memoryCell, outputGate, outputBlock];

        // Define output
        layer.output = outputBlock;

        layer.input = function (from, method, weight) {
            if (from instanceof Layer) from = from.output;
            method = method || methods.connection.ALL_TO_ALL;
            let connections = [];

            const input = from.connect(memoryCell, method, weight);
            connections = connections.concat(input);

            connections = connections.concat(from.connect(inputGate, method, weight));
            connections = connections.concat(from.connect(outputGate, method, weight));
            connections = connections.concat(from.connect(forgetGate, method, weight));

            inputGate.gate(input, methods.gating.INPUT);

            return connections;
        };

        return layer;
    }

    /**
     * Static method to create a GRU layer
     */
    static GRU(size) {
        // Create the layer
        const layer = new Layer();

        const updateGate = new Group(size);
        const inverseUpdateGate = new Group(size);
        const resetGate = new Group(size);
        const memoryCell = new Group(size);
        const output = new Group(size);
        const previousOutput = new Group(size);

        previousOutput.set({
            bias: 0,
            squash: methods.activation.IDENTITY,
            type: 'constant'
        });
        memoryCell.set({
            squash: methods.activation.TANH
        });
        inverseUpdateGate.set({
            bias: 0,
            squash: methods.activation.INVERSE,
            type: 'constant'
        });
        updateGate.set({
            bias: 1
        });
        resetGate.set({
            bias: 0
        });

        // Update gate calculation
        previousOutput.connect(updateGate, methods.connection.ALL_TO_ALL);

        // Inverse update gate calculation
        updateGate.connect(inverseUpdateGate, methods.connection.ONE_TO_ONE, 1);

        // Reset gate calculation
        previousOutput.connect(resetGate, methods.connection.ALL_TO_ALL);

        // Memory calculation
        const reset = previousOutput.connect(memoryCell, methods.connection.ALL_TO_ALL);

        resetGate.gate(reset, methods.gating.OUTPUT); // gate

        // Output calculation
        const update1 = previousOutput.connect(output, methods.connection.ALL_TO_ALL);
        const update2 = memoryCell.connect(output, methods.connection.ALL_TO_ALL);

        updateGate.gate(update1, methods.gating.OUTPUT);
        inverseUpdateGate.gate(update2, methods.gating.OUTPUT);

        // Previous output calculation
        output.connect(previousOutput, methods.connection.ONE_TO_ONE, 1);

        // Add to nodes array
        layer.nodes = [updateGate, inverseUpdateGate, resetGate, memoryCell, output, previousOutput];

        layer.output = output;

        layer.input = function (from, method, weight) {
            if (from instanceof Layer) from = from.output;
            method = method || methods.connection.ALL_TO_ALL;
            let connections = [];

            connections = connections.concat(from.connect(updateGate, method, weight));
            connections = connections.concat(from.connect(resetGate, method, weight));
            connections = connections.concat(from.connect(memoryCell, method, weight));

            return connections;
        };

        return layer;
    }

    /**
     * Static method to create a Memory layer
     */
    static Memory(size, memory) {
        // Create the layer
        const layer = new Layer();
        // Because the output can only be one group, we have to put the nodes all in one group

        let previous = null;

        for (let i = 0; i < memory; i++) {
            const block = new Group(size);

            block.set({
                squash: methods.activation.IDENTITY,
                bias: 0,
                type: 'constant'
            });

            if (previous != null) {
                previous.connect(block, methods.connection.ONE_TO_ONE, 1);
            }

            layer.nodes.push(block);
            previous = block;
        }

        layer.nodes.reverse();

        for (let i = 0; i < layer.nodes.length; i++) {
            layer.nodes[i].nodes.reverse();
        }

        // Because output can only be one group, fit all memory nodes in one group
        const outputGroup = new Group(0);
        for (const group of layer.nodes) {
            outputGroup.nodes = outputGroup.nodes.concat(group.nodes);
        }
        layer.output = outputGroup;

        layer.input = function (from, method, weight) {
            if (from instanceof Layer) from = from.output;
            method = method || methods.connection.ALL_TO_ALL;

            if (from.nodes.length !== layer.nodes[layer.nodes.length - 1].nodes.length) {
                throw new Error('Previous layer size must be same as memory size');
            }

            return from.connect(layer.nodes[layer.nodes.length - 1], methods.connection.ONE_TO_ONE, 1);
        };

        return layer;
    }
}


```

 ## ../src\architecture\network.js

```

/* Import */
import multi from '../multithreading/multi.js';
import methods from '../methods/methods.js';
import Connection from './connection.js';
import config from '../config.js';
import Neat from '../neat.js';
import Node from './node.js';

/* Export */
export default Network;

/* Easier variable naming */
const { mutation } = methods;


class Network {
    constructor(input, output) {
        if (input === undefined || output === undefined) {
            throw new Error('No input or output size given');
        }

        this.input = input;
        this.output = output;

        // Store all the node and connection genes
        this.nodes = []; // Stored in activation order
        this.connections = [];
        this.gates = [];
        this.selfconns = [];

        // Regularization
        this.dropout = 0;

        // Create input and output nodes
        for (let i = 0; i < this.input + this.output; i++) {
            const type = i < this.input ? 'input' : 'output';
            this.nodes.push(new Node(type));
        }

        // Connect input nodes with output nodes directly
        for (let i = 0; i < this.input; i++) {
            for (let j = this.input; j < this.output + this.input; j++) {
                const weight = Math.random() * this.input * Math.sqrt(2 / this.input);
                this.connect(this.nodes[i], this.nodes[j], weight);
            }
        }
    }

    /**
     * Activates the network
     */
    activate(input, training = false) {
        const output = [];

        // Activate nodes chronologically
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i].type === 'input') {
                this.nodes[i].activate(input[i]);
            } else if (this.nodes[i].type === 'output') {
                const activation = this.nodes[i].activate();
                output.push(activation);
            } else {
                if (training) this.nodes[i].mask = Math.random() < this.dropout ? 0 : 1;
                this.nodes[i].activate();
            }
        }

        return output;
    }

    /**
     * Activates the network without calculating eligibility traces and such
     */
    noTraceActivate(input) {
        const output = [];

        // Activate nodes chronologically
        for (let i = 0; i < this.nodes.length; i++) {
            if (this.nodes[i].type === 'input') {
                this.nodes[i].noTraceActivate(input[i]);
            } else if (this.nodes[i].type === 'output') {
                const activation = this.nodes[i].noTraceActivate();
                output.push(activation);
            } else {
                this.nodes[i].noTraceActivate();
            }
        }

        return output;
    }

    /**
     * Backpropagate the network
     */
    propagate(rate, momentum, update, target) {
        if (target === undefined || target.length !== this.output) {
            throw new Error('Output target length should match network output length');
        }

        let targetIndex = target.length;

        // Propagate output nodes
        for (let i = this.nodes.length - 1; i >= this.nodes.length - this.output; i--) {
            this.nodes[i].propagate(rate, momentum, update, target[--targetIndex]);
        }

        // Propagate hidden and input nodes
        for (let i = this.nodes.length - this.output - 1; i >= this.input; i--) {
            this.nodes[i].propagate(rate, momentum, update);
        }
    }

    /**
     * Clear the context of the network
     */
    clear() {
        for (let i = 0; i < this.nodes.length; i++) {
            this.nodes[i].clear();
        }
    }

    /**
     * Connects the from node to the to node
     */
    connect(from, to, weight) {
        const connections = from.connect(to, weight);

        for (let i = 0; i < connections.length; i++) {
            const connection = connections[i];
            if (from !== to) {
                this.connections.push(connection);
            } else {
                this.selfconns.push(connection);
            }
        }

        return connections;
    }

    /**
     * Disconnects the from node from the to node
     */
    disconnect(from, to) {
        const connections = from === to ? this.selfconns : this.connections;

        for (let i = 0; i < connections.length; i++) {
            const connection = connections[i];
            if (connection.from === from && connection.to === to) {
                if (connection.gater !== null) this.ungate(connection);
                connections.splice(i, 1);
                break;
            }
        }

        from.disconnect(to);
    }

    /**
     * Gate a connection with a node
     */
    gate(node, connection) {
        if (!this.nodes.includes(node)) {
            throw new Error('This node is not part of the network!');
        } else if (connection.gater != null) {
            if (config.warnings) console.warn('This connection is already gated!');
            return;
        }
        node.gate(connection);
        this.gates.push(connection);
    }

    /**
     *  Remove the gate of a connection
     */
    ungate(connection) {
        const index = this.gates.indexOf(connection);
        if (index === -1) {
            throw new Error('This connection is not gated!');
        }

        this.gates.splice(index, 1);
        connection.gater.ungate(connection);
    }

    /**
     *  Removes a node from the network
     */
    remove(node) {
        const index = this.nodes.indexOf(node);

        if (index === -1) {
            throw new Error('This node does not exist in the network!');
        }

        const gaters = [];

        this.disconnect(node, node);

        const inputs = [];
        for (let i = node.connections.in.length - 1; i >= 0; i--) {
            const connection = node.connections.in[i];
            if (mutation.SUB_NODE.keep_gates && connection.gater !== null && connection.gater !== node) {
                gaters.push(connection.gater);
            }
            inputs.push(connection.from);
            this.disconnect(connection.from, node);
        }

        const outputs = [];
        for (let i = node.connections.out.length - 1; i >= 0; i--) {
            const connection = node.connections.out[i];
            if (mutation.SUB_NODE.keep_gates && connection.gater !== null && connection.gater !== node) {
                gaters.push(connection.gater);
            }
            outputs.push(connection.to);
            this.disconnect(node, connection.to);
        }

        const connections = [];
        for (let input of inputs) {
            for (let output of outputs) {
                if (!input.isProjectingTo(output)) {
                    const conn = this.connect(input, output);
                    connections.push(conn[0]);
                }
            }
        }

        for (let gater of gaters) {
            if (connections.length === 0) break;
            const connIndex = Math.floor(Math.random() * connections.length);

            this.gate(gater, connections[connIndex]);
            connections.splice(connIndex, 1);
        }

        for (let conn of node.connections.gated) {
            this.ungate(conn);
        }

        this.disconnect(node, node);

        this.nodes.splice(index, 1);
    }

    /**
 * Mutates the network with the given method
 */
    mutate(method) {
        if (!method) {
            throw new Error('No (correct) mutate method given!');
        }

        switch (method) {
            case mutation.ADD_NODE:
                this.addNodeMutation();
                break;
            case mutation.SUB_NODE:
                this.subNodeMutation();
                break;
            case mutation.ADD_CONN:
                this.addConnMutation();
                break;
            case mutation.SUB_CONN:
                this.subConnMutation();
                break;
            case mutation.MOD_WEIGHT:
                this.modWeightMutation(method);
                break;
            case mutation.MOD_BIAS:
                this.modBiasMutation();
                break;
            case mutation.MOD_ACTIVATION:
                this.modActivationMutation(method);
                break;
            case mutation.ADD_SELF_CONN:
                this.addSelfConnMutation();
                break;
            case mutation.SUB_SELF_CONN:
                this.subSelfConnMutation();
                break;
            case mutation.ADD_GATE:
                this.addGateMutation();
                break;
            case mutation.SUB_GATE:
                this.subGateMutation();
                break;
            case mutation.ADD_BACK_CONN:
                this.addBackConnMutation();
                break;
            case mutation.SUB_BACK_CONN:
                this.subBackConnMutation();
                break;
            case mutation.SWAP_NODES:
                this.swapNodesMutation(method);
                break;
            default:
                throw new Error('Unknown mutation method!');
        }
    }

    /**
     * Helper method: ADD_NODE mutation
     */
    addNodeMutation() {
        const connection = this.connections[Math.floor(Math.random() * this.connections.length)];
        const gater = connection.gater;
        this.disconnect(connection.from, connection.to);

        const toIndex = this.nodes.indexOf(connection.to);
        const node = new Node('hidden');
        node.mutate(mutation.MOD_ACTIVATION);

        const minBound = Math.min(toIndex, this.nodes.length - this.output);
        this.nodes.splice(minBound, 0, node);

        const newConn1 = this.connect(connection.from, node)[0];
        const newConn2 = this.connect(node, connection.to)[0];

        if (gater) {
            this.gate(gater, Math.random() >= 0.5 ? newConn1 : newConn2);
        }
    }

    /**
     * Helper method: SUB_NODE mutation
     */
    subNodeMutation() {
        if (this.nodes.length === this.input + this.output) {
            if (config.warnings) console.warn('No more nodes left to remove!');
            return;
        }
        const index = Math.floor(Math.random() * (this.nodes.length - this.output - this.input) + this.input);
        this.remove(this.nodes[index]);
    }

    /**
     * Helper method: ADD_CONN mutation
     */
    addConnMutation() {
        const available = [];
        for (let i = 0; i < this.nodes.length - this.output; i++) {
            const node1 = this.nodes[i];
            for (let j = Math.max(i + 1, this.input); j < this.nodes.length; j++) {
                const node2 = this.nodes[j];
                if (!node1.isProjectingTo(node2)) available.push([node1, node2]);
            }
        }
        if (!available.length) {
            if (config.warnings) console.warn('No more connections to be made!');
            return;
        }
        const [node1, node2] = available[Math.floor(Math.random() * available.length)];
        this.connect(node1, node2);
    }

    /**
     * Helper method: SUB_CONN mutation
     */
    subConnMutation() {
        const possible = this.connections.filter(conn =>
            conn.from.connections.out.length > 1 &&
            conn.to.connections.in.length > 1 &&
            this.nodes.indexOf(conn.to) > this.nodes.indexOf(conn.from)
        );
        if (!possible.length) {
            if (config.warnings) console.warn('No connections to remove!');
            return;
        }
        const randomConn = possible[Math.floor(Math.random() * possible.length)];
        this.disconnect(randomConn.from, randomConn.to);
    }

    /**
     * Helper method: MOD_WEIGHT mutation
     */
    modWeightMutation(method) {
        const allConnections = this.connections.concat(this.selfconns);
        const connection = allConnections[Math.floor(Math.random() * allConnections.length)];
        const modification = Math.random() * (method.max - method.min) + method.min;
        connection.weight += modification;
    }

    /**
     * Helper method: MOD_BIAS mutation
     */
    modBiasMutation() {
        const index = Math.floor(Math.random() * (this.nodes.length - this.input) + this.input);
        const node = this.nodes[index];
        node.mutate(mutation.MOD_BIAS);
    }

    /**
     * Helper method: MOD_ACTIVATION mutation
     */
    modActivationMutation(method) {
        if (!method.mutateOutput && this.input + this.output === this.nodes.length) {
            if (config.warnings) console.warn('No nodes that allow mutation of activation function');
            return;
        }
        const index = Math.floor(Math.random() * (this.nodes.length - (method.mutateOutput ? 0 : this.output) - this.input) + this.input);
        const node = this.nodes[index];
        node.mutate(method);
    }

    /**
     * Helper method: ADD_SELF_CONN mutation
     */
    addSelfConnMutation() {
        const possible = this.nodes.slice(this.input).filter(node => node.connections.self.weight === 0);
        if (!possible.length) {
            if (config.warnings) console.warn('No more self-connections to add!');
            return;
        }
        const node = possible[Math.floor(Math.random() * possible.length)];
        this.connect(node, node);
    }

    /**
     * Helper method: SUB_SELF_CONN mutation
     */
    subSelfConnMutation() {
        if (!this.selfconns.length) {
            if (config.warnings) console.warn('No more self-connections to remove!');
            return;
        }
        const conn = this.selfconns[Math.floor(Math.random() * this.selfconns.length)];
        this.disconnect(conn.from, conn.to);
    }

    /**
     * Helper method: ADD_GATE mutation
     */
    addGateMutation() {
        const allConnections = this.connections.concat(this.selfconns);
        const possible = allConnections.filter(conn => conn.gater === null);
        if (!possible.length) {
            if (config.warnings) console.warn('No more connections to gate!');
            return;
        }
        const index = Math.floor(Math.random() * (this.nodes.length - this.input) + this.input);
        const node = this.nodes[index];
        const conn = possible[Math.floor(Math.random() * possible.length)];
        this.gate(node, conn);
    }

    /**
     * Helper method: SUB_GATE mutation
     */
    subGateMutation() {
        if (!this.gates.length) {
            if (config.warnings) console.warn('No more connections to ungate!');
            return;
        }
        const index = Math.floor(Math.random() * this.gates.length);
        const gatedConn = this.gates[index];
        this.ungate(gatedConn);
    }

    /**
     * Helper method: ADD_BACK_CONN mutation
     */
    addBackConnMutation() {
        const available = [];
        for (let i = this.input; i < this.nodes.length; i++) {
            const node1 = this.nodes[i];
            for (let j = this.input; j < i; j++) {
                const node2 = this.nodes[j];
                if (!node1.isProjectingTo(node2)) available.push([node1, node2]);
            }
        }
        if (!available.length) {
            if (config.warnings) console.warn('No more connections to be made!');
            return;
        }
        const [node1, node2] = available[Math.floor(Math.random() * available.length)];
        this.connect(node1, node2);
    }

    /**
     * Helper method: SUB_BACK_CONN mutation
     */
    subBackConnMutation() {
        const possible = this.connections.filter(conn =>
            conn.from.connections.out.length > 1 &&
            conn.to.connections.in.length > 1 &&
            this.nodes.indexOf(conn.from) > this.nodes.indexOf(conn.to)
        );
        if (!possible.length) {
            if (config.warnings) console.warn('No connections to remove!');
            return;
        }
        const randomConn = possible[Math.floor(Math.random() * possible.length)];
        this.disconnect(randomConn.from, randomConn.to);
    }

    /**
     * Helper method: SWAP_NODES mutation
     */
    swapNodesMutation(method) {
        if ((method.mutateOutput && this.nodes.length - this.input < 2) ||
            (!method.mutateOutput && this.nodes.length - this.input - this.output < 2)) {
            if (config.warnings) console.warn('No nodes that allow swapping of bias and activation function');
            return;
        }
        const index1 = Math.floor(Math.random() * (this.nodes.length - (method.mutateOutput ? 0 : this.output) - this.input) + this.input);
        const index2 = Math.floor(Math.random() * (this.nodes.length - (method.mutateOutput ? 0 : this.output) - this.input) + this.input);
        const node1 = this.nodes[index1];
        const node2 = this.nodes[index2];

        [node1.bias, node2.bias] = [node2.bias, node1.bias];
        [node1.squash, node2.squash] = [node2.squash, node1.squash];
    }

    /**
   * Serializes the network to JSON
   */
    toJSON() {
        const json = {
            nodes: [],
            connections: [],
            input: this.input,
            output: this.output,
            dropout: this.dropout,
        };

        // Set index property for each node
        this.nodes.forEach((node, i) => {
            node.index = i;
            json.nodes.push(node.toJSON());
            if (node.connections.self.weight !== 0) {
                const selfConn = node.connections.self.toJSON();
                selfConn.from = i;
                selfConn.to = i;
                selfConn.gater = node.connections.self.gater ? node.connections.self.gater.index : null;
                json.connections.push(selfConn);
            }
        });

        // Serialize all connections
        this.connections.forEach((conn) => {
            const connData = conn.toJSON();
            connData.from = conn.from.index;
            connData.to = conn.to.index;
            connData.gater = conn.gater ? conn.gater.index : null;
            json.connections.push(connData);
        });

        return json;
    }

    /**
     * Deserialize a JSON object to create a network instance
     */
    static fromJSON(json) {
        const network = new Network(json.input, json.output);
        network.dropout = json.dropout;
        network.nodes = json.nodes.map(Node.fromJSON);

        json.connections.forEach((connData) => {
            const connection = network.connect(
                network.nodes[connData.from],
                network.nodes[connData.to]
            )[0];
            connection.weight = connData.weight;
            if (connData.gater !== null) {
                network.gate(network.nodes[connData.gater], connection);
            }
        });

        return network;
    }

    /**
     * Exports the network structure to be compatible with d3 and webcola for graphing
     */
    graph(width, height) {
        let inputIndex = 0, outputIndex = 0;
        const json = {
            nodes: [],
            links: [],
            constraints: [
                { type: 'alignment', axis: 'x', offsets: [] },
                { type: 'alignment', axis: 'y', offsets: [] }
            ]
        };

        this.nodes.forEach((node, i) => {
            const typeOffset = node.type === 'input' ? inputIndex++ : outputIndex++;
            json.nodes.push({
                id: i,
                name: node.type === 'hidden' ? node.squash.name : node.type.toUpperCase(),
                activation: node.activation,
                bias: node.bias
            });

            if (node.type === 'input' || node.type === 'output') {
                const axisOffsets = node.type === 'input' ? 0 : -0.8 * height;
                const offsetX = typeOffset * 0.8 * (node.type === 'input' ? width / this.input : width / this.output);
                json.constraints[0].offsets.push({ node: i, offset: offsetX });
                json.constraints[1].offsets.push({ node: i, offset: axisOffsets });
            }
        });

        const connections = [...this.connections, ...this.selfconns];
        connections.forEach((conn) => {
            if (!conn.gater) {
                json.links.push({
                    source: this.nodes.indexOf(conn.from),
                    target: this.nodes.indexOf(conn.to),
                    weight: conn.weight
                });
            } else {
                const gaterNode = json.nodes.length;
                json.nodes.push({
                    id: gaterNode,
                    activation: conn.gater.activation,
                    name: 'GATE'
                });
                json.links.push(
                    { source: this.nodes.indexOf(conn.from), target: gaterNode, weight: 0.5 * conn.weight },
                    { source: gaterNode, target: this.nodes.indexOf(conn.to), weight: 0.5 * conn.weight },
                    { source: this.nodes.indexOf(conn.gater), target: gaterNode, weight: conn.gater.activation, gate: true }
                );
            }
        });

        return json;
    }

    /**
     * Create a standalone function of the network to be run without the library
     */
    standalone() {
        const squashes = this.nodes.map(node => node.squash.name);
        const functions = Array.from(new Set(squashes)).map(name => Node.squash[name].toString());
        const present = squashes.map(name => squashes.indexOf(name));

        const activations = this.nodes.map(node => node.activation);
        const states = this.nodes.map(node => node.state);
        const lines = [`for(let i = 0; i < input.length; i++) A[i] = input[i];`];

        this.nodes.forEach((node, i) => {
            if (node.type === 'output' || node.type === 'hidden') {
                const funcIndex = present[i];
                const incoming = node.connections.in.map(conn =>
                    `A[${conn.from.index}] * ${conn.weight} ${conn.gater ? ` * A[${conn.gater.index}]` : ''}`
                );

                if (node.connections.self.weight !== 0) {
                    const selfConn = node.connections.self;
                    incoming.push(`S[${i}] * ${selfConn.weight} ${selfConn.gater ? ` * A[${selfConn.gater.index}]` : ''}`);
                }

                lines.push(
                    `S[${i}] = ${incoming.join(' + ')} + ${node.bias};`,
                    `A[${i}] = F[${funcIndex}](S[${i}])${node.mask ? ' * ' + node.mask : ''};`
                );
            }
        });

        const output = this.nodes.slice(-this.output).map((_, i) => `A[${i}]`);
        return `var F = [${functions.join(',')}];\nvar A = [${activations}];\nvar S = [${states}];\nfunction activate(input) {\n${lines.join('\n')}\nreturn [${output.join(',')}];\n}`;
    }

    /**
     * Serializes the network's activations, states, and connections for efficient worker processing
     */
    serialize() {
        const squashes = [
            'LOGISTIC', 'TANH', 'IDENTITY', 'STEP', 'RELU', 'SOFTSIGN', 'SINUSOID',
            'GAUSSIAN', 'BENT_IDENTITY', 'BIPOLAR', 'BIPOLAR_SIGMOID', 'HARD_TANH',
            'ABSOLUTE', 'INVERSE', 'SELU'
        ];

        const activations = this.nodes.map(node => node.activation);
        const states = this.nodes.map(node => node.state);
        const connections = [this.input, this.output];

        this.nodes.forEach(node => {
            connections.push(node.index, node.bias, squashes.indexOf(node.squash.name), node.connections.self.weight, node.connections.self.gater ? node.connections.self.gater.index : -1);
            node.connections.in.forEach(conn => {
                connections.push(conn.from.index, conn.weight, conn.gater ? conn.gater.index : -1);
            });
            connections.push(-2);
        });

        return [activations, states, connections];
    }

    /**
     * Deserialize serialized data into a network instance
     */
    static deserialize(data) {
        const network = new Network(data[0], data[1]);
        network.nodes = data[2].map(nodeData => Node.deserialize(nodeData));
        network.connections = data[3].map(connData => Connection.deserialize(connData));
        return network;
    }

    /**
     * Train the given set to this network
     */
    train(set, options = {}) {
        if (set[0].input.length !== this.input || set[0].output.length !== this.output) {
            throw new Error('Dataset input/output size should be same as network input/output size!');
        }

        // Warning messages
        if (options.rate === undefined && config.warnings) {
            console.warn('Using default learning rate, please define a rate!');
        }
        if (options.iterations === undefined && config.warnings) {
            console.warn('No target iterations given, running until error is reached!');
        }

        // Read the options
        const targetError = options.error || 0.05;
        const cost = options.cost || methods.cost.MSE;
        const baseRate = options.rate || 0.3;
        const dropout = options.dropout || 0;
        const momentum = options.momentum || 0;
        const batchSize = options.batchSize || 1; // online learning
        const ratePolicy = options.ratePolicy || methods.rate.FIXED();

        const start = Date.now();

        if (batchSize > set.length) {
            throw new Error('Batch size must be smaller or equal to dataset length!');
        } else if (options.iterations === undefined && options.error === undefined) {
            throw new Error('At least one of the following options must be specified: error, iterations');
        }

        const maxIterations = options.iterations || 0; // 0 means until error
        const stopAtTargetError = options.error !== undefined;

        // Save to network
        this.dropout = dropout;

        let trainSet, testSet;
        if (options.crossValidate) {
            const numTrain = Math.ceil((1 - options.crossValidate.testSize) * set.length);
            trainSet = set.slice(0, numTrain);
            testSet = set.slice(numTrain);
        }

        // Loop the training process
        let currentRate = baseRate;
        let iteration = 0;
        let error = 1;

        while (error > targetError && (maxIterations === 0 || iteration < maxIterations)) {
            if (options.crossValidate && error <= options.crossValidate.testError) break;

            iteration++;
            currentRate = ratePolicy(baseRate, iteration);

            if (options.crossValidate) {
                this._trainSet(trainSet, batchSize, currentRate, momentum, cost);
                if (options.clear) this.clear();
                error = this.test(testSet, cost).error;
                if (options.clear) this.clear();
            } else {
                error = this._trainSet(set, batchSize, currentRate, momentum, cost);
                if (options.clear) this.clear();
            }

            if (options.shuffle) {
                for (let i = set.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [set[i], set[j]] = [set[j], set[i]];
                }
            }

            if (options.log && iteration % options.log === 0) {
                console.log('iteration', iteration, 'error', error, 'rate', currentRate);
            }

            if (options.schedule && iteration % options.schedule.iterations === 0) {
                options.schedule.function({ error, iteration });
            }
        }

        if (options.clear) this.clear();

        if (dropout) {
            this.nodes.forEach(node => {
                if (node.type === 'hidden' || node.type === 'constant') {
                    node.mask = 1 - this.dropout;
                }
            });
        }

        return {
            error,
            iterations: iteration,
            time: Date.now() - start
        };
    }

    /**
     * Performs one training epoch and returns the error
     * Private function used in this.train
     */
    _trainSet(set, batchSize, currentRate, momentum, costFunction) {
        let errorSum = 0;

        set.forEach((data, index) => {
            const { input, output: target } = data;
            const update = (index + 1) % batchSize === 0 || (index + 1) === set.length;

            const output = this.activate(input, true);
            this.propagate(currentRate, momentum, update, target);

            errorSum += costFunction(target, output);
        });

        return errorSum / set.length;
    }

    /**
     * Tests a set and returns the error and elapsed time
     */
    test(set, cost = methods.cost.MSE) {
        // Check if dropout is enabled, set correct mask
        if (this.dropout) {
            this.nodes.forEach(node => {
                if (node.type === 'hidden' || node.type === 'constant') {
                    node.mask = 1 - this.dropout;
                }
            });
        }

        let error = 0;
        const start = Date.now();

        set.forEach(({ input, output: target }) => {
            const output = this.noTraceActivate(input);
            error += cost(target, output);
        });

        error /= set.length;

        return {
            error,
            time: Date.now() - start
        };
    }

    /**
     * Evolves the network to reach a lower error on a dataset
     */
    async evolve(set, options = {}) {
        if (set[0].input.length !== this.input || set[0].output.length !== this.output) {
            throw new Error('Dataset input/output size should be same as network input/output size!');
        }

        // Set options and defaults
        let targetError = options.error ?? 0.05;
        const growth = options.growth ?? 0.0001;
        const cost = options.cost || methods.cost.MSE;
        const amount = options.amount || 1;

        let threads = options.threads;
        if (threads === undefined) {
            threads = (typeof window === 'undefined') ? require('os').cpus().length : navigator.hardwareConcurrency;
        }

        const start = Date.now();

        if (options.iterations === undefined && options.error === undefined) {
            throw new Error('At least one of the following options must be specified: error, iterations');
        } else if (options.error === undefined) {
            targetError = -1;
        } else if (options.iterations === undefined) {
            options.iterations = 0;
        }

        let fitnessFunction;
        if (threads === 1) {
            fitnessFunction = (genome) => {
                let score = 0;
                for (let i = 0; i < amount; i++) {
                    score -= genome.test(set, cost).error;
                }

                score -= (genome.nodes.length - genome.input - genome.output + genome.connections.length + genome.gates.length) * growth;
                return isNaN(score) ? -Infinity : score / amount;
            };
        } else {
            const converted = multi.serializeDataSet(set);

            const workers = [];
            for (let i = 0; i < threads; i++) {
                workers.push(
                    (typeof window === 'undefined')
                        ? new multi.workers.node.TestWorker(converted, cost)
                        : new multi.workers.browser.TestWorker(converted, cost)
                );
            }

            fitnessFunction = (population) => {
                return new Promise((resolve) => {
                    const queue = [...population];
                    let done = 0;

                    const startWorker = (worker) => {
                        if (!queue.length) {
                            if (++done === threads) resolve();
                            return;
                        }

                        const genome = queue.shift();

                        worker.evaluate(genome).then((result) => {
                            genome.score = -result;
                            genome.score -= (genome.nodes.length - genome.input - genome.output +
                                genome.connections.length + genome.gates.length) * growth;
                            genome.score = isNaN(parseFloat(result)) ? -Infinity : genome.score;
                            startWorker(worker);
                        });
                    };

                    workers.forEach(startWorker);
                });
            };

            options.fitnessPopulation = true;
        }

        // Initialize the NEAT instance
        options.network = this;
        const neat = new Neat(this.input, this.output, fitnessFunction, options);

        let error = -Infinity;
        let bestFitness = -Infinity;
        let bestGenome;

        while (error < -targetError && (options.iterations === 0 || neat.generation < options.iterations)) {
            const fittest = await neat.evolve();
            const fitness = fittest.score;
            error = fitness + (fittest.nodes.length - fittest.input - fittest.output + fittest.connections.length + fittest.gates.length) * growth;

            if (fitness > bestFitness) {
                bestFitness = fitness;
                bestGenome = fittest;
            }

            if (options.log && neat.generation % options.log === 0) {
                console.log('iteration', neat.generation, 'fitness', fitness, 'error', -error);
            }

            if (options.schedule && neat.generation % options.schedule.iterations === 0) {
                options.schedule.function({ fitness, error: -error, iteration: neat.generation });
            }
        }

        if (threads > 1) workers.forEach((worker) => worker.terminate());

        if (bestGenome) {
            this.nodes = bestGenome.nodes;
            this.connections = bestGenome.connections;
            this.selfconns = bestGenome.selfconns;
            this.gates = bestGenome.gates;

            if (options.clear) this.clear();
        }

        return {
            error: -error,
            iterations: neat.generation,
            time: Date.now() - start
        };
    }


}

/**
 * Convert a JSON object to a Network instance
 */
Network.fromJSON = (json) => {
    const network = new Network(json.input, json.output);
    network.dropout = json.dropout;
    network.nodes = [];
    network.connections = [];

    json.nodes.forEach((nodeData) => {
        network.nodes.push(Node.fromJSON(nodeData));
    });

    json.connections.forEach((conn) => {
        const connection = network.connect(network.nodes[conn.from], network.nodes[conn.to])[0];
        connection.weight = conn.weight;

        if (conn.gater !== null) {
            network.gate(network.nodes[conn.gater], connection);
        }
    });

    return network;
};


/**
 * Merge two networks into one
 */
Network.merge = (network1, network2) => {
    // Create a copy of the networks
    network1 = Network.fromJSON(network1.toJSON());
    network2 = Network.fromJSON(network2.toJSON());

    // Check if output and input sizes are the same
    if (network1.output !== network2.input) {
        throw new Error('Output size of network1 should be the same as the input size of network2!');
    }

    // Redirect all connections from network2 input to network1 output
    network2.connections.forEach(conn => {
        if (conn.from.type === 'input') {
            const index = network2.nodes.indexOf(conn.from);
            conn.from = network1.nodes[network1.nodes.length - 1 - index];
        }
    });

    // Remove input nodes of network2
    network2.nodes.splice(0, network2.input);

    // Change node types of network1's output nodes to 'hidden'
    network1.nodes.slice(-network1.output).forEach(node => {
        node.type = 'hidden';
    });

    // Merge nodes and connections of both networks
    network1.connections = [...network1.connections, ...network2.connections];
    network1.nodes = [...network1.nodes, ...network2.nodes];

    return network1;
};


/**
 * Create an offspring from two parent networks
 */
Network.crossOver = (network1, network2, equal) => {
    if (network1.input !== network2.input || network1.output !== network2.output) {
        throw new Error("Networks don't have the same input/output size!");
    }

    // Initialize offspring
    const offspring = new Network(network1.input, network2.output);
    offspring.connections = [];
    offspring.nodes = [];

    // Save scores and create a copy
    const score1 = network1.score || 0;
    const score2 = network2.score || 0;

    // Determine offspring node size
    let size;
    if (equal || score1 === score2) {
        const max = Math.max(network1.nodes.length, network2.nodes.length);
        const min = Math.min(network1.nodes.length, network2.nodes.length);
        size = Math.floor(Math.random() * (max - min + 1) + min);
    } else {
        size = score1 > score2 ? network1.nodes.length : network2.nodes.length;
    }

    // Rename some variables for easier reading
    const outputSize = network1.output;

    // Set indexes for quick reference
    network1.nodes.forEach((node, i) => { node.index = i; });
    network2.nodes.forEach((node, i) => { node.index = i; });

    // Assign nodes from parents to offspring
    for (let i = 0; i < size; i++) {
        let node;
        if (i < size - outputSize) {
            const random = Math.random();
            node = random >= 0.5 ? network1.nodes[i] : network2.nodes[i];
            const other = random < 0.5 ? network1.nodes[i] : network2.nodes[i];
            node = node || other;
        } else {
            node = Math.random() >= 0.5
                ? network1.nodes[network1.nodes.length + i - size]
                : network2.nodes[network2.nodes.length + i - size];
        }

        const newNode = new Node();
        newNode.bias = node.bias;
        newNode.squash = node.squash;
        newNode.type = node.type;

        offspring.nodes.push(newNode);
    }

    // Create connection gene maps
    const n1conns = {};
    const n2conns = {};

    const addConnectionsToMap = (network, connMap) => {
        network.connections.forEach(conn => {
            const data = {
                weight: conn.weight,
                from: conn.from.index,
                to: conn.to.index,
                gater: conn.gater ? conn.gater.index : -1
            };
            connMap[Connection.innovationID(data.from, data.to)] = data;
        });

        network.selfconns.forEach(conn => {
            const data = {
                weight: conn.weight,
                from: conn.from.index,
                to: conn.to.index,
                gater: conn.gater ? conn.gater.index : -1
            };
            connMap[Connection.innovationID(data.from, data.to)] = data;
        });
    };

    addConnectionsToMap(network1, n1conns);
    addConnectionsToMap(network2, n2conns);

    // Split common connection genes from disjoint/excess genes
    const connections = [];
    const keys1 = Object.keys(n1conns);
    const keys2 = new Set(Object.keys(n2conns));

    keys1.forEach((key) => {
        if (keys2.has(key)) {
            connections.push(Math.random() >= 0.5 ? n1conns[key] : n2conns[key]);
            keys2.delete(key);
        } else if (score1 >= score2 || equal) {
            connections.push(n1conns[key]);
        }
    });

    keys2.forEach((key) => {
        if (score2 >= score1 || equal) {
            connections.push(n2conns[key]);
        }
    });

    // Add connections to offspring
    connections.forEach((connData) => {
        if (connData.to < size && connData.from < size) {
            const from = offspring.nodes[connData.from];
            const to = offspring.nodes[connData.to];
            const conn = offspring.connect(from, to)[0];
            conn.weight = connData.weight;

            if (connData.gater !== -1 && connData.gater < size) {
                offspring.gate(offspring.nodes[connData.gater], conn);
            }
        }
    });

    return offspring;
};

```

 ## ../src\architecture\node.js

```
/* Import */
import methods from '../methods/methods.js';
import Connection from './connection.js';
import config from '../config.js';

export default Node;
 
class Node {
    constructor(type) {
        this.bias = (type === 'input') ? 0 : Math.random() * 0.2 - 0.1;
        this.squash = methods.activation.LOGISTIC;
        this.type = type || 'hidden';

        this.activation = 0;
        this.state = 0;
        this.old = 0;

        // Dùng cho dropout
        this.mask = 1;

        // Theo dõi momentum
        this.previousDeltaBias = 0;

        // Batch training
        this.totalDeltaBias = 0;

        this.connections = {
            in: [],
            out: [],
            gated: [],
            self: new Connection(this, this, 0)
        };

        // Dữ liệu cho backpropagation
        this.error = {
            responsibility: 0,
            projected: 0,
            gated: 0
        };
    }

    /**
     * Kích hoạt node
     */
    activate(input) {
        // Kiểm tra nếu có input
        if (typeof input !== 'undefined') {
            this.activation = input;
            return this.activation;
        }

        this.old = this.state;

        // Nguồn kích hoạt từ chính node
        this.state = this.connections.self.gain * this.connections.self.weight * this.state + this.bias;

        // Nguồn kích hoạt từ các kết nối
        for (let i = 0; i < this.connections.in.length; i++) {
            const connection = this.connections.in[i];
            this.state += connection.from.activation * connection.weight * connection.gain;
        }

        // Áp dụng hàm kích hoạt (squash)
        this.activation = this.squash(this.state) * this.mask;
        this.derivative = this.squash(this.state, true);

        // Cập nhật traces
        const nodes = [];
        const influences = [];

        for (let i = 0; i < this.connections.gated.length; i++) {
            const conn = this.connections.gated[i];
            const node = conn.to;

            const index = nodes.indexOf(node);
            if (index > -1) {
                influences[index] += conn.weight * conn.from.activation;
            } else {
                nodes.push(node);
                influences.push(
                    conn.weight * conn.from.activation + (node.connections.self.gater === this ? node.old : 0)
                );
            }

            // Điều chỉnh gain dựa trên activation của node
            conn.gain = this.activation;
        }

        for (let i = 0; i < this.connections.in.length; i++) {
            const connection = this.connections.in[i];

            // Elegibility trace
            connection.elegibility =
                this.connections.self.gain * this.connections.self.weight * connection.elegibility +
                connection.from.activation * connection.gain;

            // Extended trace
            for (let j = 0; j < nodes.length; j++) {
                const node = nodes[j];
                const influence = influences[j];

                const index = connection.xtrace.nodes.indexOf(node);

                if (index > -1) {
                    connection.xtrace.values[index] =
                        node.connections.self.gain *
                        node.connections.self.weight *
                        connection.xtrace.values[index] +
                        this.derivative * connection.elegibility * influence;
                } else {
                    // Nếu chưa tồn tại, có thể thông qua mutation
                    connection.xtrace.nodes.push(node);
                    connection.xtrace.values.push(this.derivative * connection.elegibility * influence);
                }
            }
        }

        return this.activation;
    }

    /**
     * Kích hoạt node mà không tính toán elegibility traces
     */
    noTraceActivate(input) {
        // Kiểm tra nếu có input
        if (typeof input !== 'undefined') {
            this.activation = input;
            return this.activation;
        }

        // Nguồn kích hoạt từ chính node
        this.state = this.connections.self.gain * this.connections.self.weight * this.state + this.bias;

        // Nguồn kích hoạt từ các kết nối
        for (let i = 0; i < this.connections.in.length; i++) {
            const connection = this.connections.in[i];
            this.state += connection.from.activation * connection.weight * connection.gain;
        }

        // Áp dụng hàm kích hoạt (squash)
        this.activation = this.squash(this.state);

        for (let i = 0; i < this.connections.gated.length; i++) {
            this.connections.gated[i].gain = this.activation;
        }

        return this.activation;
    }

    /**
     * Backpropagation lỗi, hay còn gọi là học
     */
    propagate(rate, momentum, update, target) {
        momentum = momentum || 0;
        rate = rate || 0.3;

        // Tích lũy lỗi
        let error = 0;

        // Node output nhận lỗi từ môi trường
        if (this.type === 'output') {
            this.error.responsibility = this.error.projected = target - this.activation;
        } else {
            // Các node khác tính toán trách nhiệm lỗi bằng backpropagation
            // Trách nhiệm lỗi từ tất cả các kết nối từ node này
            for (let i = 0; i < this.connections.out.length; i++) {
                const connection = this.connections.out[i];
                const node = connection.to;
                // Phương trình 21
                error += node.error.responsibility * connection.weight * connection.gain;
            }

            // Trách nhiệm lỗi dự đoán
            this.error.projected = this.derivative * error;

            // Trách nhiệm lỗi từ tất cả các kết nối được điều khiển bởi neuron này
            error = 0;

            for (let i = 0; i < this.connections.gated.length; i++) {
                const conn = this.connections.gated[i];
                const node = conn.to;
                let influence = node.connections.self.gater === this ? node.old : 0;

                influence += conn.weight * conn.from.activation;
                error += node.error.responsibility * influence;
            }

            // Trách nhiệm lỗi được điều khiển
            this.error.gated = this.derivative * error;

            // Trách nhiệm lỗi tổng
            this.error.responsibility = this.error.projected + this.error.gated;
        }

        if (this.type === 'constant') return;

        // Điều chỉnh tất cả các kết nối đầu vào của node
        for (let i = 0; i < this.connections.in.length; i++) {
            const connection = this.connections.in[i];

            let gradient = this.error.projected * connection.elegibility;

            for (let j = 0; j < connection.xtrace.nodes.length; j++) {
                const node = connection.xtrace.nodes[j];
                const value = connection.xtrace.values[j];
                gradient += node.error.responsibility * value;
            }

            // Điều chỉnh trọng số
            const deltaWeight = rate * gradient * this.mask;
            connection.totalDeltaWeight += deltaWeight;
            if (update) {
                connection.totalDeltaWeight += momentum * connection.previousDeltaWeight;
                connection.weight += connection.totalDeltaWeight;
                connection.previousDeltaWeight = connection.totalDeltaWeight;
                connection.totalDeltaWeight = 0;
            }
        }

        // Điều chỉnh bias
        const deltaBias = rate * this.error.responsibility;
        this.totalDeltaBias += deltaBias;
        if (update) {
            this.totalDeltaBias += momentum * this.previousDeltaBias;
            this.bias += this.totalDeltaBias;
            this.previousDeltaBias = this.totalDeltaBias;
            this.totalDeltaBias = 0;
        }
    }

    /**
     * Tạo kết nối từ node này đến node khác
     */
    connect(target, weight) {
        const connections = [];
        if (typeof target.bias !== 'undefined') {
            // Phải là một node
            if (target === this) {
                // Bật kết nối tự thân bằng cách đặt trọng số
                if (this.connections.self.weight !== 0) {
                    if (config.warnings) console.warn('Kết nối này đã tồn tại!');
                } else {
                    this.connections.self.weight = weight || 1;
                }
                connections.push(this.connections.self);
            } else if (this.isProjectingTo(target)) {
                throw new Error('Đã kết nối đến node này!');
            } else {
                const connection = new Connection(this, target, weight);
                target.connections.in.push(connection);
                this.connections.out.push(connection);

                connections.push(connection);
            }
        } else {
            // Nếu là một nhóm
            for (let i = 0; i < target.nodes.length; i++) {
                const connection = new Connection(this, target.nodes[i], weight);
                target.nodes[i].connections.in.push(connection);
                this.connections.out.push(connection);
                target.connections.in.push(connection);

                connections.push(connection);
            }
        }
        return connections;
    }

    /**
     * Ngắt kết nối node này với node khác
     */
    disconnect(node, twosided) {
        if (this === node) {
            this.connections.self.weight = 0;
            return;
        }

        for (let i = 0; i < this.connections.out.length; i++) {
            const conn = this.connections.out[i];
            if (conn.to === node) {
                this.connections.out.splice(i, 1);
                const j = conn.to.connections.in.indexOf(conn);
                conn.to.connections.in.splice(j, 1);
                if (conn.gater !== null) conn.gater.ungate(conn);
                break;
            }
        }

        if (twosided) {
            node.disconnect(this);
        }
    }

    /**
     * Làm cho node này điều khiển (gate) một kết nối
     */
    gate(connections) {
        if (!Array.isArray(connections)) {
            connections = [connections];
        }

        for (let i = 0; i < connections.length; i++) {
            const connection = connections[i];

            this.connections.gated.push(connection);
            connection.gater = this;
        }
    }

    /**
     * Loại bỏ việc điều khiển kết nối từ node này
     */
    ungate(connections) {
        if (!Array.isArray(connections)) {
            connections = [connections];
        }

        for (let i = connections.length - 1; i >= 0; i--) {
            const connection = connections[i];

            const index = this.connections.gated.indexOf(connection);
            this.connections.gated.splice(index, 1);
            connection.gater = null;
            connection.gain = 1;
        }
    }

    /**
     * Xóa ngữ cảnh của node
     */
    clear() {
        for (let i = 0; i < this.connections.in.length; i++) {
            const connection = this.connections.in[i];

            connection.elegibility = 0;
            connection.xtrace = {
                nodes: [],
                values: []
            };
        }

        for (let i = 0; i < this.connections.gated.length; i++) {
            const conn = this.connections.gated[i];
            conn.gain = 0;
        }

        this.error.responsibility = this.error.projected = this.error.gated = 0;
        this.old = this.state = this.activation = 0;
    }

    /**
     * Biến đổi (mutate) node với phương thức cho trước
     */
    mutate(method) {
        if (typeof method === 'undefined') {
            throw new Error('Chưa cung cấp phương thức biến đổi!');
        } else if (!(method.name in methods.mutation)) {
            throw new Error('Phương thức này không tồn tại!');
        }

        switch (method) {
            case methods.mutation.MOD_ACTIVATION:
                // Không thể cùng một hàm squash
                const index = method.allowed.indexOf(this.squash);
                const newSquash =
                    method.allowed[
                    (index + Math.floor(Math.random() * (method.allowed.length - 1)) + 1) %
                    method.allowed.length
                    ];
                this.squash = newSquash;
                break;
            case methods.mutation.MOD_BIAS:
                const modification = Math.random() * (method.max - method.min) + method.min;
                this.bias += modification;
                break;
        }
    }

    /**
     * Kiểm tra nếu node này đang kết nối tới node cho trước
     */
    isProjectingTo(node) {
        if (node === this && this.connections.self.weight !== 0) return true;

        for (let i = 0; i < this.connections.out.length; i++) {
            const conn = this.connections.out[i];
            if (conn.to === node) {
                return true;
            }
        }
        return false;
    }

    /**
     * Kiểm tra nếu node cho trước đang kết nối tới node này
     */
    isProjectedBy(node) {
        if (node === this && this.connections.self.weight !== 0) return true;

        for (let i = 0; i < this.connections.in.length; i++) {
            const conn = this.connections.in[i];
            if (conn.from === node) {
                return true;
            }
        }

        return false;
    }

    /**
     * Chuyển node thành một đối tượng JSON
     */
    toJSON() {
        return {
            bias: this.bias,
            type: this.type,
            squash: this.squash.name,
            mask: this.mask
        };
    }

    /**
     * Chuyển một đối tượng JSON thành node
     */
    static fromJSON(json) {
        const node = new Node();
        node.bias = json.bias;
        node.type = json.type;
        node.mask = json.mask;
        node.squash = methods.activation[json.squash];

        return node;
    }
}

```

 ## ../src\methods\activation.js

```
/*******************************************************************************
                                 ACTIVATION FUNCTIONS
*******************************************************************************/

// https://en.wikipedia.org/wiki/Activation_function
// https://stats.stackexchange.com/questions/115258/comprehensive-list-of-activation-functions-in-neural-networks-with-pros-cons

export default activation;
 
const activation = {
    LOGISTIC(x, derivate) {
        const fx = 1 / (1 + Math.exp(-x));
        if (!derivate) return fx;
        return fx * (1 - fx);
    },
    TANH(x, derivate) {
        if (derivate) return 1 - Math.pow(Math.tanh(x), 2);
        return Math.tanh(x);
    },
    IDENTITY(x, derivate) {
        return derivate ? 1 : x;
    },
    STEP(x, derivate) {
        return derivate ? 0 : x > 0 ? 1 : 0;
    },
    RELU(x, derivate) {
        if (derivate) return x > 0 ? 1 : 0;
        return x > 0 ? x : 0;
    },
    SOFTSIGN(x, derivate) {
        const d = 1 + Math.abs(x);
        if (derivate) return x / Math.pow(d, 2);
        return x / d;
    },
    SINUSOID(x, derivate) {
        if (derivate) return Math.cos(x);
        return Math.sin(x);
    },
    GAUSSIAN(x, derivate) {
        const d = Math.exp(-Math.pow(x, 2));
        if (derivate) return -2 * x * d;
        return d;
    },
    BENT_IDENTITY(x, derivate) {
        const d = Math.sqrt(Math.pow(x, 2) + 1);
        if (derivate) return x / (2 * d) + 1;
        return (d - 1) / 2 + x;
    },
    BIPOLAR(x, derivate) {
        return derivate ? 0 : x > 0 ? 1 : -1;
    },
    BIPOLAR_SIGMOID(x, derivate) {
        const d = 2 / (1 + Math.exp(-x)) - 1;
        if (derivate) return 0.5 * (1 + d) * (1 - d);
        return d;
    },
    HARD_TANH(x, derivate) {
        if (derivate) return x > -1 && x < 1 ? 1 : 0;
        return Math.max(-1, Math.min(1, x));
    },
    ABSOLUTE(x, derivate) {
        if (derivate) return x < 0 ? -1 : 1;
        return Math.abs(x);
    },
    INVERSE(x, derivate) {
        if (derivate) return -1;
        return 1 - x;
    },
    // https://arxiv.org/pdf/1706.02515.pdf
    SELU(x, derivate) {
        const alpha = 1.6732632423543772848170429916717;
        const scale = 1.0507009873554804934193349852946;
        const fx = x > 0 ? x : alpha * (Math.exp(x) - 1);
        if (derivate) {
            return x > 0 ? scale : (fx + alpha) * scale;
        }
        return fx * scale;
    }
};


```

 ## ../src\methods\connection.js

```


// Specifies in what manner two groups are connected
/* Export */
export default connection;

const connection = {
    ALL_TO_ALL: {
        name: 'OUTPUT',
    },
    ALL_TO_ELSE: {
        name: 'INPUT',
    },
    ONE_TO_ONE: {
        name: 'SELF',
    },
};


```

 ## ../src\methods\cost.js

```
/*******************************************************************************
                                   COST FUNCTIONS
*******************************************************************************/

// https://en.wikipedia.org/wiki/Loss_function
const cost = {
    // Cross entropy error
    CROSS_ENTROPY(target, output) {
        let error = 0;
        for (let i = 0; i < output.length; i++) {
            // Avoid negative and zero numbers, use 1e-15 http://bit.ly/2p5W29A
            error -= target[i] * Math.log(Math.max(output[i], 1e-15)) + (1 - target[i]) * Math.log(1 - Math.max(output[i], 1e-15));
        }
        return error / output.length;
    },
    // Mean Squared Error
    MSE(target, output) {
        let error = 0;
        for (let i = 0; i < output.length; i++) {
            error += Math.pow(target[i] - output[i], 2);
        }

        return error / output.length;
    },
    // Binary error
    BINARY(target, output) {
        let misses = 0;
        for (let i = 0; i < output.length; i++) {
            misses += Math.round(target[i] * 2) !== Math.round(output[i] * 2);
        }

        return misses;
    },
    // Mean Absolute Error
    MAE(target, output) {
        let error = 0;
        for (let i = 0; i < output.length; i++) {
            error += Math.abs(target[i] - output[i]);
        }

        return error / output.length;
    },
    // Mean Absolute Percentage Error
    MAPE(target, output) {
        let error = 0;
        for (let i = 0; i < output.length; i++) {
            error += Math.abs((output[i] - target[i]) / Math.max(target[i], 1e-15));
        }

        return error / output.length;
    },
    // Mean Squared Logarithmic Error
    MSLE(target, output) {
        let error = 0;
        for (let i = 0; i < output.length; i++) {
            error += Math.pow(Math.log(Math.max(target[i], 1e-15)) - Math.log(Math.max(output[i], 1e-15)), 2);
        }

        return error / output.length;
    },
    // Hinge loss, for classifiers
    HINGE(target, output) {
        let error = 0;
        for (let i = 0; i < output.length; i++) {
            error += Math.max(0, 1 - target[i] * output[i]);
        }

        return error / output.length;
    }
};

/* Export */
export default cost;

```

 ## ../src\methods\crossover.js

```
/*******************************************************************************
                                      CROSSOVER
*******************************************************************************/

// https://en.wikipedia.org/wiki/Crossover_(genetic_algorithm)
const crossover = {
    SINGLE_POINT: {
        name: 'SINGLE_POINT',
        config: [0.4],
    },
    TWO_POINT: {
        name: 'TWO_POINT',
        config: [0.4, 0.9],
    },
    UNIFORM: {
        name: 'UNIFORM',
    },
    AVERAGE: {
        name: 'AVERAGE',
    },
};

/* Export */
export default crossover;

```

 ## ../src\methods\gating.js

```
/*******************************************************************************
                                    GATING
*******************************************************************************/

// Specifies how to gate a connection between two groups of multiple neurons
const gating = {
    OUTPUT: {
        name: 'OUTPUT',
    },
    INPUT: {
        name: 'INPUT',
    },
    SELF: {
        name: 'SELF',
    },
};

/* Export */
export default gating;

```

 ## ../src\methods\methods.js

```
import activation from './activation.js';
import mutation from './mutation.js';
import selection from './selection.js';
import crossover from './crossover.js';
import cost from './cost.js';
import gating from './gating.js';
import connection from './connection.js';
import rate from './rate.js';

const methods = {
    activation,
    mutation,
    selection,
    crossover,
    cost,
    gating,
    connection,
    rate,
};

export default methods;

```

 ## ../src\methods\mutation.js

```
/* Import */
import activation from './activation.js';

/*******************************************************************************
                                      MUTATION
*******************************************************************************/

// https://en.wikipedia.org/wiki/mutation_(genetic_algorithm)
const mutation = {
    ADD_NODE: {
        name: 'ADD_NODE',
    },
    SUB_NODE: {
        name: 'SUB_NODE',
        keep_gates: true,
    },
    ADD_CONN: {
        name: 'ADD_CONN',
    },
    SUB_CONN: {
        name: 'REMOVE_CONN',
    },
    MOD_WEIGHT: {
        name: 'MOD_WEIGHT',
        min: -1,
        max: 1,
    },
    MOD_BIAS: {
        name: 'MOD_BIAS',
        min: -1,
        max: 1,
    },
    MOD_ACTIVATION: {
        name: 'MOD_ACTIVATION',
        mutateOutput: true,
        allowed: [
            activation.LOGISTIC,
            activation.TANH,
            activation.RELU,
            activation.IDENTITY,
            activation.STEP,
            activation.SOFTSIGN,
            activation.SINUSOID,
            activation.GAUSSIAN,
            activation.BENT_IDENTITY,
            activation.BIPOLAR,
            activation.BIPOLAR_SIGMOID,
            activation.HARD_TANH,
            activation.ABSOLUTE,
            activation.INVERSE,
            activation.SELU,
        ],
    },
    ADD_SELF_CONN: {
        name: 'ADD_SELF_CONN',
    },
    SUB_SELF_CONN: {
        name: 'SUB_SELF_CONN',
    },
    ADD_GATE: {
        name: 'ADD_GATE',
    },
    SUB_GATE: {
        name: 'SUB_GATE',
    },
    ADD_BACK_CONN: {
        name: 'ADD_BACK_CONN',
    },
    SUB_BACK_CONN: {
        name: 'SUB_BACK_CONN',
    },
    SWAP_NODES: {
        name: 'SWAP_NODES',
        mutateOutput: true,
    },
};

mutation.ALL = [
    mutation.ADD_NODE,
    mutation.SUB_NODE,
    mutation.ADD_CONN,
    mutation.SUB_CONN,
    mutation.MOD_WEIGHT,
    mutation.MOD_BIAS,
    mutation.MOD_ACTIVATION,
    mutation.ADD_GATE,
    mutation.SUB_GATE,
    mutation.ADD_SELF_CONN,
    mutation.SUB_SELF_CONN,
    mutation.ADD_BACK_CONN,
    mutation.SUB_BACK_CONN,
    mutation.SWAP_NODES,
];

mutation.FFW = [
    mutation.ADD_NODE,
    mutation.SUB_NODE,
    mutation.ADD_CONN,
    mutation.SUB_CONN,
    mutation.MOD_WEIGHT,
    mutation.MOD_BIAS,
    mutation.MOD_ACTIVATION,
    mutation.SWAP_NODES,
];

/* Export */
export default mutation;

```

 ## ../src\methods\rate.js

```
/*******************************************************************************
                                      RATE
*******************************************************************************/

// https://stackoverflow.com/questions/30033096/what-is-lr-policy-in-caffe/30045244
const rate = {
    FIXED() {
        return (baseRate, iteration) => baseRate;
    },
    STEP(gamma = 0.9, stepSize = 100) {
        return (baseRate, iteration) => baseRate * Math.pow(gamma, Math.floor(iteration / stepSize));
    },
    EXP(gamma = 0.999) {
        return (baseRate, iteration) => baseRate * Math.pow(gamma, iteration);
    },
    INV(gamma = 0.001, power = 2) {
        return (baseRate, iteration) => baseRate * Math.pow(1 + gamma * iteration, -power);
    }
};

/* Export */
export default rate;

```

 ## ../src\methods\selection.js

```
/*******************************************************************************
                                      SELECTION
*******************************************************************************/

// https://en.wikipedia.org/wiki/Selection_(genetic_algorithm)

const selection = {
    FITNESS_PROPORTIONATE: {
      name: 'FITNESS_PROPORTIONATE',
    },
    POWER: {
      name: 'POWER',
      power: 4,
    },
    TOURNAMENT: {
      name: 'TOURNAMENT',
      size: 5,
      probability: 0.5,
    },
  };
  
  /* Export */
  export default selection;
  
```

 ## ../src\multithreading\multi.js

```
/*******************************************************************************
                                MULTITHREADING
*******************************************************************************/

import workers from './workers/workers.js';

const multi = {
    /** Workers */
    workers,

    /** Serializes a dataset */
    serializeDataSet(dataSet) {
        const serialized = [dataSet[0].input.length, dataSet[0].output.length];

        for (let i = 0; i < dataSet.length; i++) {
            for (let j = 0; j < serialized[0]; j++) {
                serialized.push(dataSet[i].input[j]);
            }
            for (let j = 0; j < serialized[1]; j++) {
                serialized.push(dataSet[i].output[j]);
            }
        }

        return serialized;
    },

    /** Activate a serialized network */
    activateSerializedNetwork(input, A, S, data, F) {
        for (let i = 0; i < data[0]; i++) A[i] = input[i];
        for (let i = 2; i < data.length; i++) {
            const index = data[i++];
            const bias = data[i++];
            const squash = data[i++];
            const selfweight = data[i++];
            const selfgater = data[i++];

            S[index] = (selfgater === -1 ? 1 : A[selfgater]) * selfweight * S[index] + bias;

            while (data[i] !== -2) {
                S[index] += A[data[i++]] * data[i++] * (data[i++] === -1 ? 1 : A[data[i - 1]]);
            }
            A[index] = F[squash](S[index]);
        }

        const output = [];
        for (let i = A.length - data[1]; i < A.length; i++) output.push(A[i]);
        return output;
    },

    /** Deserializes a dataset to an array of arrays */
    deserializeDataSet(serializedSet) {
        const set = [];

        const sampleSize = serializedSet[0] + serializedSet[1];
        for (let i = 0; i < (serializedSet.length - 2) / sampleSize; i++) {
            const input = [];
            for (let j = 2 + i * sampleSize; j < 2 + i * sampleSize + serializedSet[0]; j++) {
                input.push(serializedSet[j]);
            }
            const output = [];
            for (let j = 2 + i * sampleSize + serializedSet[0]; j < 2 + i * sampleSize + sampleSize; j++) {
                output.push(serializedSet[j]);
            }
            set.push(input);
            set.push(output);
        }

        return set;
    },

    /** A list of compiled activation functions in a certain order */
    activations: [
        (x) => 1 / (1 + Math.exp(-x)),
        (x) => Math.tanh(x),
        (x) => x,
        (x) => (x > 0 ? 1 : 0),
        (x) => (x > 0 ? x : 0),
        (x) => x / (1 + Math.abs(x)),
        (x) => Math.sin(x),
        (x) => Math.exp(-Math.pow(x, 2)),
        (x) => (Math.sqrt(Math.pow(x, 2) + 1) - 1) / 2 + x,
        (x) => (x > 0 ? 1 : -1),
        (x) => 2 / (1 + Math.exp(-x)) - 1,
        (x) => Math.max(-1, Math.min(1, x)),
        (x) => Math.abs(x),
        (x) => 1 - x,
        (x) => {
            const a = 1.6732632423543772848170429916717;
            return (x > 0 ? x : a * (Math.exp(x) - 1)) * 1.0507009873554804934193349852946;
        },
    ],

    /** Test serialized dataset */
    testSerializedSet(set, cost, A, S, data, F) {
        // Calculate how many samples are in the set
        let error = 0;
        for (let i = 0; i < set.length; i += 2) {
            const output = this.activateSerializedNetwork(set[i], A, S, data, F);
            error += cost(set[i + 1], output);
        }

        return error / (set.length / 2);
    },
};

/* Export */
export default multi;

```

 ## ../src\multithreading\workers\workers.js

```
/*******************************************************************************
                                  WORKERS
*******************************************************************************/

// Import các module cần thiết
import TestWorkerNode from './node/testworker.js';
import TestWorkerBrowser from './browser/testworker.js';

const workers = {
    node: {
        TestWorker: TestWorkerNode,
    },
    browser: {
        TestWorker: TestWorkerBrowser,
    },
};

/** Export */
export default workers;

```

 ## ../src\multithreading\workers\browser\testworker.js

```
/* Import */
import multi from '../../multi.js';



class TestWorker {
    constructor(dataSet, cost) {
        const blob = new Blob([this._createBlobString(cost)]);
        this.url = window.URL.createObjectURL(blob);
        this.worker = new Worker(this.url);

        const data = { set: new Float64Array(dataSet).buffer };
        this.worker.postMessage(data, [data.set]);
    }

    evaluate(network) {
        return new Promise((resolve, reject) => {
            const serialized = network.serialize();

            const data = {
                activations: new Float64Array(serialized[0]).buffer,
                states: new Float64Array(serialized[1]).buffer,
                conns: new Float64Array(serialized[2]).buffer,
            };

            this.worker.onmessage = (e) => {
                const error = new Float64Array(e.data.buffer)[0];
                resolve(error);
            };

            this.worker.postMessage(data, [data.activations, data.states, data.conns]);
        });
    }

    terminate() {
        this.worker.terminate();
        window.URL.revokeObjectURL(this.url);
    }

    _createBlobString(cost) {
        const source = `
      const F = [${multi.activations.toString()}];
      const cost = ${cost.toString()};
      const multi = {
        deserializeDataSet: ${multi.deserializeDataSet.toString()},
        testSerializedSet: ${multi.testSerializedSet.toString()},
        activateSerializedNetwork: ${multi.activateSerializedNetwork.toString()}
      };

      let set;

      self.onmessage = function (e) {
        if (typeof e.data.set === 'undefined') {
          const A = new Float64Array(e.data.activations);
          const S = new Float64Array(e.data.states);
          const data = new Float64Array(e.data.conns);

          const error = multi.testSerializedSet(set, cost, A, S, data, F);

          const answer = { buffer: new Float64Array([error]).buffer };
          postMessage(answer, [answer.buffer]);
        } else {
          set = multi.deserializeDataSet(new Float64Array(e.data.set));
        }
      };`;

        return source;
    }
}

/* Export */
export default TestWorker;

```

 ## ../src\multithreading\workers\node\testworker.js

```
/* Import */
import cp from 'child_process';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

/*******************************************************************************
                                WEBWORKER
*******************************************************************************/

// Tạo __dirname trong ES6 modules
const __dirname = dirname(fileURLToPath(import.meta.url));

class TestWorker {
    constructor(dataSet, cost) {
        this.worker = cp.fork(path.join(__dirname, 'worker'));

        this.worker.send({ set: dataSet, cost: cost.name });
    }

    evaluate(network) {
        return new Promise((resolve, reject) => {
            const serialized = network.serialize();

            const data = {
                activations: serialized[0],
                states: serialized[1],
                conns: serialized[2],
            };

            this.worker.once('message', (e) => {
                resolve(e);
            });

            this.worker.send(data);
        });
    }

    terminate() {
        this.worker.kill();
    }
}

/* Export */
export default TestWorker;

```

 ## ../src\multithreading\workers\node\worker.js

```
import { multi, methods } from '../../../neataptic.js';

let set = [];
let cost;
const F = multi.activations;

process.on('message', (e) => {
  if (typeof e.set === 'undefined') {
    const { activations: A, states: S, conns: data } = e;
    
    const result = multi.testSerializedSet(set, cost, A, S, data, F);

    process.send(result);
  } else {
    cost = methods.cost[e.cost];
    set = multi.deserializeDataSet(e.set);
  }
});

```

 