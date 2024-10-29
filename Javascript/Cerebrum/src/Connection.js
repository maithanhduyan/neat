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