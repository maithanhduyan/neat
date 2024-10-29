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