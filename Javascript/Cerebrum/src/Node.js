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