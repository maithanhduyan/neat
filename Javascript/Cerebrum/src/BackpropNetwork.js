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