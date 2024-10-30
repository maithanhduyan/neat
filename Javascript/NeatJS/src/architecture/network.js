
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
