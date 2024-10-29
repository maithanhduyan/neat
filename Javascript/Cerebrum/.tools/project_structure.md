# Cấu trúc Dự án như sau:

```
├── README.md
├── package.json
├── src
│   ├── BackpropNetwork.js
│   ├── Connection.js
│   ├── Gene.js
│   ├── Genome.js
│   ├── Helper.js
│   ├── Network.js
│   ├── NetworkVisualizer.js
│   ├── Neuroevolution.js
│   ├── Node.js
│   ├── Species.js
│   └── index.js
├── test
└── webpack.config.js
```

# Danh sách Các Tệp Dự án:

## ../webpack.config.js

```
// webpack.config.js
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: './src/index.js',
  output: {
    filename: 'cerebrum.bundle.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'cerebrum',
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
  optimization: {
    minimize: true,
  },
  resolve: {
    extensions: ['.js'],
  },
};

```

 ## ../src\BackpropNetwork.js

```
/**
 * Neural network that is optimized via backpropagation.
 */
import { Network } from './Network.js';

export class BackpropNetwork extends Network {
    constructor(config = {}) {
        super(config);
        this.inputData = {};
        this.targetData = {};
        this.learningRate = config.learningRate || 0.5;
        this.step = 0;
        this.totalErrorSum = 0;
        this.averageError = [];

        if (config.inputData) {
            this.setInputData(config.inputData);
        }
        if (config.targetData) {
            this.setTargetData(config.targetData);
        }
    }

    backpropagate() {
        this.step++;
        if (!this.inputData[this.step]) {
            this.averageError.push(this.totalErrorSum / this.step);
            this.totalErrorSum = 0;
            this.step = 0;
        }

        Object.entries(this.inputData[this.step]).forEach(([inputKey, value]) => {
            this.nodes[inputKey].value = value;
        });

        this.calculate();
        const currentTargetData = this.targetData[this.step];
        const totalError = this.getTotalError();
        this.totalErrorSum += totalError;

        const newWeights = {};

        this.outputs.forEach((outputID) => {
            const outputNode = this.nodes[outputID];
            outputNode.incomingConnections.forEach((connectionID) => {
                const hiddenToOutput = this.connections[connectionID];
                const deltaRuleResult = -(
                    currentTargetData[outputID] - outputNode.value
                ) * outputNode.value * (1 - outputNode.value) * this.nodes[hiddenToOutput.in].value;
                newWeights[hiddenToOutput.id] = hiddenToOutput.weight - this.learningRate * deltaRuleResult;
            });
        });

        this.hidden.forEach((hiddenID) => {
            const hiddenNode = this.nodes[hiddenID];
            hiddenNode.incomingConnections.forEach((connectionID) => {
                const inputToHidden = this.connections[connectionID];
                let total = 0;
                hiddenNode.outgoingConnections.forEach((outgoingID) => {
                    const outgoing = this.connections[outgoingID];
                    const outgoingNode = this.nodes[outgoing.out];
                    total += (-(
                        currentTargetData[outgoing.out] - outgoingNode.value
                    ) * outgoingNode.value * (1 - outgoingNode.value)) * outgoing.weight;
                });
                const outOverNet = hiddenNode.value * (1 - hiddenNode.value);
                const netOverWeight = this.nodes[inputToHidden.in].value;
                const result = total * outOverNet * netOverWeight;
                newWeights[inputToHidden.id] = inputToHidden.weight - this.learningRate * result;
            });
        });

        Object.entries(newWeights).forEach(([key, weight]) => {
            this.connections[key].weight = weight;
        });
    }

    addTarget(outputNodeID, target) {
        this.targetData[outputNodeID] = target;
    }

    setInputData(...args) {
        const dataSets = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        this.inputData = {};

        dataSets.forEach((data, i) => {
            const instance = {};
            data.forEach((value, j) => {
                instance[`INPUT:${j}`] = value;
            });
            this.inputData[i] = instance;
        });
    }

    setTargetData(...args) {
        const dataSets = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        this.targetData = {};

        dataSets.forEach((data, i) => {
            const instance = {};
            data.forEach((value, j) => {
                instance[`OUTPUT:${j}`] = value;
            });
            this.targetData[i] = instance;
        });
    }

    getTotalError() {
        return this.outputs.reduce((sum, outputID) => {
            const error = this.targetData[this.step][outputID] - this.nodes[outputID].value;
            return sum + (error ** 2) / 2;
        }, 0);
    }
}
```

 ## ../src\Connection.js

```
/**
 * A connection, representing a biological synapse.
 */
export class Connection {
    constructor(inID, outID, weight = 1) {
        this.in = inID;
        this.out = outID;
        this.id = `${inID}:${outID}`;
        this.weight = weight;
    }
}
```

 ## ../src\Gene.js

```
/**
 * A gene containing the data for a single connection in the neural network.
 */
import {Connection} from './Connection.js'

export class Gene {
    constructor(inID, outID, weight = 1, innovation = 0, enabled = true) {
        this.innovation = innovation;
        this.in = inID;
        this.out = outID;
        this.weight = weight;
        this.enabled = enabled;
    }

    getConnection() {
        return new Connection(this.in, this.out, this.weight);
    }
}
```

 ## ../src\Genome.js

```
/**
 * A genome containing genes that will make up the neural network.
 */
import { Node } from './Node.js';
import { Network } from './Network.js';

export class Genome {
    constructor(inputNodes, outputNodes) {
        this.inputNodes = inputNodes;
        this.outputNodes = outputNodes;
        this.genes = [];
        this.fitness = -Number.MAX_VALUE;
        this.globalRank = 0;
        this.randomIdentifier = Math.random();
    }

    containsGene(inID, outID) {
        return this.genes.some((gene) => gene.in === inID && gene.out === outID);
    }

    getNetwork() {
        const network = new Network();
        network.createNodes(this.inputNodes, 0, this.outputNodes);
        this.genes.forEach((gene) => {
            if (gene.enabled) {
                if (!network.nodes[gene.in] && gene.in.includes("HIDDEN")) {
                    network.nodes[gene.in] = new Node(gene.in);
                    network.hidden.push(gene.in);
                }
                if (!network.nodes[gene.out] && gene.out.includes("HIDDEN")) {
                    network.nodes[gene.out] = new Node(gene.out);
                    network.hidden.push(gene.out);
                }
                network.addConnection(gene.in, gene.out, gene.weight);
            }
        });
        return network;
    }
}
```

 ## ../src\Helper.js

```
// Helper.js

// Helper functions
export const sigmoid = (t) => 1 / (1 + Math.exp(-t));

export const randomNumBetween = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

export const randomWeightedNumBetween = (min, max) => Math.floor(Math.pow(Math.random(), 2) * (max - min + 1) + min);

export const compareGenomesAscending = (genomeA, genomeB) => genomeA.fitness - genomeB.fitness;

export const compareGenomesDescending = (genomeA, genomeB) => genomeB.fitness - genomeA.fitness;

export const log = (text) => console.log(text);

```

 ## ../src\index.js

```
// src/index.js
export { Network } from './Network.js';
export { BackpropNetwork } from './BackpropNetwork.js';
export { Neuroevolution } from './Neuroevolution.js';
export { Node } from './Node.js';
export { Connection } from './Connection.js';
export { Gene } from './Gene.js';
export { Genome } from './Genome.js';
export { Species } from './Species.js';
export { NetworkVisualizer } from './NetworkVisualizer.js';
// Export các hàm trợ giúp nếu cần
export * from './Helper.js';
```

 ## ../src\Network.js

```
/**
 * The neural network, containing nodes and connections.
 */
import { Node } from './Node.js';
import { sigmoid } from './Helper.js';
import { Connection } from './Connection.js';

export class Network {
    constructor(config = {}) {
        this.nodes = {};
        this.inputs = [];
        this.hidden = [];
        this.outputs = [];
        this.connections = {};
        this.nodes.BIAS = new Node("BIAS", 1);

        const {
            inputNodes = 0,
            hiddenNodes = 0,
            outputNodes = 0,
            createAllConnections = false,
        } = config;

        this.createNodes(inputNodes, hiddenNodes, outputNodes);

        if (createAllConnections) {
            this.createAllConnections(true);
        }
    }

    createNodes(inputNum, hiddenNum, outputNum) {
        for (let i = 0; i < inputNum; i++) {
            this.addInput();
        }
        for (let j = 0; j < hiddenNum; j++) {
            this.addHidden();
        }
        for (let k = 0; k < outputNum; k++) {
            this.addOutput();
        }
    }

    addInput(value = 0) {
        const nodeID = `INPUT:${this.inputs.length}`;
        this.nodes[nodeID] = new Node(nodeID, value);
        this.inputs.push(nodeID);
    }

    addHidden() {
        const nodeID = `HIDDEN:${this.hidden.length}`;
        this.nodes[nodeID] = new Node(nodeID);
        this.hidden.push(nodeID);
    }

    addOutput() {
        const nodeID = `OUTPUT:${this.outputs.length}`;
        this.nodes[nodeID] = new Node(nodeID);
        this.outputs.push(nodeID);
    }

    getNodeByID(nodeID) {
        return this.nodes[nodeID];
    }

    getNode(type, index) {
        switch (type.toUpperCase()) {
            case "INPUT":
                return this.nodes[this.inputs[index]];
            case "HIDDEN":
                return this.nodes[this.hidden[index]];
            case "OUTPUT":
                return this.nodes[this.outputs[index]];
            default:
                return null;
        }
    }

    getConnection(connectionID) {
        return this.connections[connectionID];
    }

    calculate() {
        this.updateNodeConnections();
        this.hidden.forEach((hiddenNodeID) => this.calculateNodeValue(hiddenNodeID));
        this.outputs.forEach((outputNodeID) => this.calculateNodeValue(outputNodeID));
    }

    updateNodeConnections() {
        Object.values(this.nodes).forEach((node) => {
            node.incomingConnections = [];
            node.outgoingConnections = [];
        });

        Object.values(this.connections).forEach((connection) => {
            this.nodes[connection.in].outgoingConnections.push(connection.id);
            this.nodes[connection.out].incomingConnections.push(connection.id);
        });
    }

    calculateNodeValue(nodeID) {
        const node = this.nodes[nodeID];
        const sum = node.incomingConnections.reduce((acc, connectionID) => {
            const connection = this.connections[connectionID];
            return acc + this.nodes[connection.in].value * connection.weight;
        }, 0);
        node.value = sigmoid(sum);
    }

    addConnection(inID, outID, weight = 1) {
        const connectionID = `${inID}:${outID}`;
        this.connections[connectionID] = new Connection(inID, outID, weight);
    }

    createAllConnections(randomWeights = false) {
        const randomWeight = () => Math.random() * 4 - 2;

        this.inputs.forEach((inputID) => {
            this.hidden.forEach((hiddenID) => {
                const weight = randomWeights ? randomWeight() : 1;
                this.addConnection(inputID, hiddenID, weight);
            });
            const weight = randomWeights ? randomWeight() : 1;
            this.addConnection("BIAS", inputID, weight);
        });

        this.hidden.forEach((hiddenID) => {
            this.outputs.forEach((outputID) => {
                const weight = randomWeights ? randomWeight() : 1;
                this.addConnection(hiddenID, outputID, weight);
            });
            const weight = randomWeights ? randomWeight() : 1;
            this.addConnection("BIAS", hiddenID, weight);
        });
    }

    setNodeValue(nodeID, value) {
        this.nodes[nodeID].value = value;
    }

    setInputs(array) {
        array.forEach((value, index) => {
            this.nodes[this.inputs[index]].value = value;
        });
    }

    setMultipleNodeValues(valuesByID) {
        Object.entries(valuesByID).forEach(([key, value]) => {
            this.nodes[key].value = value;
        });
    }
}
```

 ## ../src\NetworkVisualizer.js

```
/**
 * A visualization of the neural network, showing all connections and nodes.
 */
export class NetworkVisualizer {
    constructor(config = {}) {
        this.canvas = config.canvas || "NetworkVisualizer";
        this.backgroundColor = config.backgroundColor || "#FFFFFF";
        this.nodeRadius = config.nodeRadius !== undefined ? config.nodeRadius : -1;
        this.nodeColor = config.nodeColor || "grey";
        this.positiveConnectionColor = config.positiveConnectionColor || "green";
        this.negativeConnectionColor = config.negativeConnectionColor || "red";
        this.connectionStrokeModifier = config.connectionStrokeModifier || 1;
    }

    drawNetwork(network) {
        const canv = document.getElementById(this.canvas);
        const ctx = canv.getContext("2d");
        let radius;

        ctx.fillStyle = this.backgroundColor;
        ctx.fillRect(0, 0, canv.width, canv.height);

        if (this.nodeRadius !== -1) {
            radius = this.nodeRadius;
        } else {
            radius = Math.min(canv.width, canv.height) / (Math.max(network.inputs.length, network.hidden.length, network.outputs.length, 3)) / 2.5;
        }

        const nodeLocations = {};
        const inputX = canv.width / 5;
        network.inputs.forEach((inputID, inputIndex) => {
            nodeLocations[inputID] = {
                x: inputX,
                y: (canv.height / network.inputs.length) * (inputIndex + 0.5),
            };
        });

        const hiddenX = canv.width / 2;
        network.hidden.forEach((hiddenID, hiddenIndex) => {
            nodeLocations[hiddenID] = {
                x: hiddenX,
                y: (canv.height / network.hidden.length) * (hiddenIndex + 0.5),
            };
        });

        const outputX = (canv.width / 5) * 4;
        network.outputs.forEach((outputID, outputIndex) => {
            nodeLocations[outputID] = {
                x: outputX,
                y: (canv.height / network.outputs.length) * (outputIndex + 0.5),
            };
        });

        nodeLocations.BIAS = { x: canv.width / 3, y: radius / 2 };

        Object.values(network.connections).forEach((connection) => {
            ctx.beginPath();
            ctx.moveTo(nodeLocations[connection.in].x, nodeLocations[connection.in].y);
            ctx.lineTo(nodeLocations[connection.out].x, nodeLocations[connection.out].y);
            ctx.strokeStyle = connection.weight > 0 ? this.positiveConnectionColor : this.negativeConnectionColor;
            ctx.lineWidth = Math.abs(connection.weight) * this.connectionStrokeModifier;
            ctx.lineCap = "round";
            ctx.stroke();
        });

        Object.entries(nodeLocations).forEach(([nodeKey, location]) => {
            const node = network.getNodeByID(nodeKey);
            ctx.beginPath();
            const nodeRadius = nodeKey === "BIAS" ? radius / 2.2 : radius;
            ctx.arc(location.x, location.y, nodeRadius, 0, 2 * Math.PI);
            ctx.fillStyle = this.backgroundColor;
            ctx.fill();
            ctx.strokeStyle = this.nodeColor;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.globalAlpha = node.value;
            ctx.fillStyle = this.nodeColor;
            ctx.fill();
            ctx.globalAlpha = 1;
        });
    }
}
```

 ## ../src\Neuroevolution.js

```

/**
 * Creates and optimizes neural networks via neuroevolution, using the Neuroevolution of Augmenting Topologies method.
 */
import { Genome } from './Genome.js';
import { Species } from './Species.js';
import { Gene } from './Gene.js';
import {
    randomNumBetween,
    randomWeightedNumBetween,
    compareGenomesDescending,
    log,
} from './Helper.js';


export class Neuroevolution {
    constructor(config = {}) {
        this.genomes = [];
        this.populationSize = config.populationSize || 100;
        this.mutationRates = {
            createConnection: 0.05,
            createNode: 0.02,
            modifyWeight: 0.15,
            enableGene: 0.05,
            disableGene: 0.1,
            createBias: 0.1,
            weightMutationStep: 2,
            ...config.mutationRates,
        };
        this.inputNodes = config.inputNodes || 0;
        this.outputNodes = config.outputNodes || 0;
        this.elitism = config.elitism !== undefined ? config.elitism : true;
        this.deltaDisjoint = config.deltaDisjoint || 2;
        this.deltaWeights = config.deltaWeights || 0.4;
        this.deltaThreshold = config.deltaThreshold || 2;
        this.hiddenNodeCap = config.hiddenNodeCap || 10;
        this.fitnessFunction = config.fitnessFunction || ((network) => {
            log("ERROR: Fitness function not set");
            return -1;
        });
        this.globalInnovationCounter = 1;
        this.currentGeneration = 0;
        this.species = [];
        this.newInnovations = {};
    }

    createInitialPopulation() {
        this.genomes = Array.from({ length: this.populationSize }, () => {
            const genome = this.linkMutate(new Genome(this.inputNodes, this.outputNodes));
            return genome;
        });
        this.mutate();
    }

    mutate() {
        this.genomes.forEach((genome) => {
            let network = genome.getNetwork();

            if (Math.random() < this.mutationRates.createConnection) {
                this.linkMutate(genome);
            }

            if (Math.random() < this.mutationRates.createNode && genome.genes.length > 0 && network.hidden.length < this.hiddenNodeCap) {
                const geneIndex = randomNumBetween(0, genome.genes.length - 1);
                const gene = genome.genes[geneIndex];

                if (gene.enabled && gene.in.includes("INPUT") && gene.out.includes("OUTPUT")) {
                    let newNum = 0;
                    while (genome.genes.some((g) => g.in.includes(`HIDDEN:${newNum}`) || g.out.includes(`HIDDEN:${newNum}`))) {
                        newNum++;
                    }

                    if (newNum < this.hiddenNodeCap) {
                        const nodeName = `HIDDEN:${newNum}`;
                        genome.genes[geneIndex].enabled = false;
                        genome.genes.push(new Gene(gene.in, nodeName, 1, this.globalInnovationCounter++));
                        genome.genes.push(new Gene(nodeName, gene.out, gene.weight, this.globalInnovationCounter++));
                        network = genome.getNetwork();
                    }
                }
            }

            if (Math.random() < this.mutationRates.createBias) {
                if (Math.random() > 0.5 && network.inputs.length > 0) {
                    const inputIndex = randomNumBetween(0, network.inputs.length - 1);
                    if (!network.getConnection(`BIAS:${network.inputs[inputIndex]}`)) {
                        genome.genes.push(new Gene("BIAS", network.inputs[inputIndex]));
                    }
                } else if (network.hidden.length > 0) {
                    const hiddenIndex = randomNumBetween(0, network.hidden.length - 1);
                    if (!network.getConnection(`BIAS:${network.hidden[hiddenIndex]}`)) {
                        genome.genes.push(new Gene("BIAS", network.hidden[hiddenIndex]));
                    }
                }
            }

            genome.genes = genome.genes.map((gene) => this.pointMutate(gene));
        });
    }

    linkMutate(genome) {
        const network = genome.getNetwork();
        let inNode;
        let outNode;

        if (Math.random() < 1 / 3 || network.hidden.length <= 0) {
            inNode = network.inputs[randomNumBetween(0, network.inputs.length - 1)];
            outNode = network.outputs[randomNumBetween(0, network.outputs.length - 1)];
        } else if (Math.random() < 2 / 3) {
            inNode = network.inputs[randomNumBetween(0, network.inputs.length - 1)];
            outNode = network.hidden[randomNumBetween(0, network.hidden.length - 1)];
        } else {
            inNode = network.hidden[randomNumBetween(0, network.hidden.length - 1)];
            outNode = network.outputs[randomNumBetween(0, network.outputs.length - 1)];
        }

        if (!genome.containsGene(inNode, outNode)) {
            const newGene = new Gene(inNode, outNode, Math.random() * 2 - 1);

            const innovationKey = `${newGene.in}:${newGene.out}`;
            if (this.newInnovations[innovationKey] === undefined) {
                this.newInnovations[innovationKey] = this.globalInnovationCounter++;
                newGene.innovation = this.newInnovations[innovationKey];
            } else {
                newGene.innovation = this.newInnovations[innovationKey];
            }
            genome.genes.push(newGene);
        }

        return genome;
    }

    pointMutate(gene) {
        if (Math.random() < this.mutationRates.modifyWeight) {
            gene.weight += Math.random() * this.mutationRates.weightMutationStep * 2 - this.mutationRates.weightMutationStep;
        }
        if (Math.random() < this.mutationRates.enableGene) {
            gene.enabled = true;
        }
        if (Math.random() < this.mutationRates.disableGene) {
            gene.enabled = false;
        }
        return gene;
    }

    crossover(firstGenome, secondGenome) {
        const child = new Genome(firstGenome.inputNodes, firstGenome.outputNodes);
        const firstInnovationNumbers = firstGenome.genes.reduce((acc, gene, index) => {
            acc[gene.innovation] = index;
            return acc;
        }, {});

        const secondInnovationNumbers = secondGenome.genes.reduce((acc, gene, index) => {
            acc[gene.innovation] = index;
            return acc;
        }, {});

        firstGenome.genes.forEach((gene) => {
            let geneToClone;
            if (secondInnovationNumbers[gene.innovation] !== undefined) {
                geneToClone = Math.random() < 0.5 ? gene : secondGenome.genes[secondInnovationNumbers[gene.innovation]];
            } else {
                geneToClone = gene;
            }
            child.genes.push(new Gene(geneToClone.in, geneToClone.out, geneToClone.weight, geneToClone.innovation, geneToClone.enabled));
        });

        secondGenome.genes.forEach((gene) => {
            if (firstInnovationNumbers[gene.innovation] === undefined) {
                child.genes.push(new Gene(gene.in, gene.out, gene.weight, gene.innovation, gene.enabled));
            }
        });

        return child;
    }

    evolve() {
        this.currentGeneration++;
        this.newInnovations = {};
        this.genomes.sort(compareGenomesDescending);
        const children = [];
        this.speciate();
        this.cullSpecies();
        this.calculateSpeciesAvgFitness();

        const totalAvgFitness = this.species.reduce((sum, species) => sum + species.averageFitness, 0);

        this.species.forEach((species) => {
            const childrenToMake = Math.floor((species.averageFitness / totalAvgFitness) * this.populationSize);
            if (childrenToMake > 0) {
                children.push(species.genomes[0]); // Elitism
            }
            for (let i = 0; i < childrenToMake - 1; i++) {
                children.push(this.makeBaby(species));
            }
        });

        while (children.length < this.populationSize) {
            const randomSpecies = this.species[randomNumBetween(0, this.species.length - 1)];
            children.push(this.makeBaby(randomSpecies));
        }

        this.genomes = [...children];
        this.mutate();
        this.speciate();
        log(this.species.length);
    }

    speciate() {
        this.species = [];

        this.genomes.forEach((genome) => {
            let placed = false;
            for (const species of this.species) {
                if (this.isSameSpecies(genome, species.genomes[0])) {
                    species.genomes.push(genome);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                const newSpecies = new Species();
                newSpecies.genomes.push(genome);
                this.species.push(newSpecies);
            }
        });
    }

    cullSpecies(remaining) {
        this.species = this.species.filter((species) => {
            species.cull(remaining);
            return species.genomes.length > 0;
        });
    }

    calculateSpeciesAvgFitness() {
        this.species.forEach((species) => species.calculateAverageFitness());
    }

    makeBaby(species) {
        const mum = species.genomes[randomWeightedNumBetween(0, species.genomes.length - 1)];
        const dad = species.genomes[randomWeightedNumBetween(0, species.genomes.length - 1)];
        return this.crossover(mum, dad);
    }

    calculateFitnesses() {
        this.genomes.forEach((genome) => {
            genome.fitness = this.fitnessFunction(genome.getNetwork());
        });
    }

    getCompatibility(genomeA, genomeB) {
        let disjoint = 0;
        let totalWeight = 0;

        const aInnovations = new Set(genomeA.genes.map((gene) => gene.innovation));
        const bInnovations = new Map(genomeB.genes.map((gene) => [gene.innovation, gene]));

        genomeA.genes.forEach((gene) => {
            if (bInnovations.has(gene.innovation)) {
                totalWeight += Math.abs(gene.weight - bInnovations.get(gene.innovation).weight);
            } else {
                disjoint++;
            }
        });

        genomeB.genes.forEach((gene) => {
            if (!aInnovations.has(gene.innovation)) {
                disjoint++;
            }
        });

        const n = Math.max(genomeA.genes.length, genomeB.genes.length);
        return (this.deltaDisjoint * disjoint) / n + (this.deltaWeights * totalWeight) / n;
    }

    isSameSpecies(genomeA, genomeB) {
        return this.getCompatibility(genomeA, genomeB) < this.deltaThreshold;
    }

    getElite() {
        this.genomes.sort(compareGenomesDescending);
        return this.genomes[0];
    }
}

```

 ## ../src\Node.js

```
/**
 * A node, representing a biological neuron.
 */
export class Node {
    constructor(ID, val = 0) {
        this.id = ID;
        this.incomingConnections = [];
        this.outgoingConnections = [];
        this.value = val;
        this.bias = 0;
    }
}
```

 ## ../src\Species.js

```
/**
 * A species of genomes that contains genomes which closely resemble one another, enough so that they are able to breed.
 */
import { compareGenomesDescending } from './Helper.js';

export class Species {
    constructor() {
        this.genomes = [];
        this.averageFitness = 0;
    }

    cull(remaining = Math.ceil(this.genomes.length / 2)) {
        this.genomes.sort(compareGenomesDescending);
        this.genomes = this.genomes.slice(0, remaining);
    }

    calculateAverageFitness() {
        const totalFitness = this.genomes.reduce((sum, genome) => sum + genome.fitness, 0);
        this.averageFitness = totalFitness / this.genomes.length;
    }
}
```

 