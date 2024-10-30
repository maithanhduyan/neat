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
