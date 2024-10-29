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