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

