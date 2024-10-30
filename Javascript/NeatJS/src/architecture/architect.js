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