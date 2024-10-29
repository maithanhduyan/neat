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