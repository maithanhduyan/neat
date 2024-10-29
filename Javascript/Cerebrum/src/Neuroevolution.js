
/**
 * Creates and optimizes neural networks via neuroevolution, using the Neuroevolution of Augmenting Topologies method.
 */
import { Genome } from './Genome.js';
import { Species } from './Species.js';
import { Gene } from './Gene.js';
import {
    randomNumBetween,
    randomWeightedNumBetween,
    compareGenomesDescending,
    log,
} from './Helper.js';


export class Neuroevolution {
    constructor(config = {}) {
        this.genomes = [];
        this.populationSize = config.populationSize || 100;
        this.mutationRates = {
            createConnection: 0.05,
            createNode: 0.02,
            modifyWeight: 0.15,
            enableGene: 0.05,
            disableGene: 0.1,
            createBias: 0.1,
            weightMutationStep: 2,
            ...config.mutationRates,
        };
        this.inputNodes = config.inputNodes || 0;
        this.outputNodes = config.outputNodes || 0;
        this.elitism = config.elitism !== undefined ? config.elitism : true;
        this.deltaDisjoint = config.deltaDisjoint || 2;
        this.deltaWeights = config.deltaWeights || 0.4;
        this.deltaThreshold = config.deltaThreshold || 2;
        this.hiddenNodeCap = config.hiddenNodeCap || 10;
        this.fitnessFunction = config.fitnessFunction || ((network) => {
            log("ERROR: Fitness function not set");
            return -1;
        });
        this.globalInnovationCounter = 1;
        this.currentGeneration = 0;
        this.species = [];
        this.newInnovations = {};
    }

    createInitialPopulation() {
        this.genomes = Array.from({ length: this.populationSize }, () => {
            const genome = this.linkMutate(new Genome(this.inputNodes, this.outputNodes));
            return genome;
        });
        this.mutate();
    }

    mutate() {
        this.genomes.forEach((genome) => {
            let network = genome.getNetwork();

            if (Math.random() < this.mutationRates.createConnection) {
                this.linkMutate(genome);
            }

            if (Math.random() < this.mutationRates.createNode && genome.genes.length > 0 && network.hidden.length < this.hiddenNodeCap) {
                const geneIndex = randomNumBetween(0, genome.genes.length - 1);
                const gene = genome.genes[geneIndex];

                if (gene.enabled && gene.in.includes("INPUT") && gene.out.includes("OUTPUT")) {
                    let newNum = 0;
                    while (genome.genes.some((g) => g.in.includes(`HIDDEN:${newNum}`) || g.out.includes(`HIDDEN:${newNum}`))) {
                        newNum++;
                    }

                    if (newNum < this.hiddenNodeCap) {
                        const nodeName = `HIDDEN:${newNum}`;
                        genome.genes[geneIndex].enabled = false;
                        genome.genes.push(new Gene(gene.in, nodeName, 1, this.globalInnovationCounter++));
                        genome.genes.push(new Gene(nodeName, gene.out, gene.weight, this.globalInnovationCounter++));
                        network = genome.getNetwork();
                    }
                }
            }

            if (Math.random() < this.mutationRates.createBias) {
                if (Math.random() > 0.5 && network.inputs.length > 0) {
                    const inputIndex = randomNumBetween(0, network.inputs.length - 1);
                    if (!network.getConnection(`BIAS:${network.inputs[inputIndex]}`)) {
                        genome.genes.push(new Gene("BIAS", network.inputs[inputIndex]));
                    }
                } else if (network.hidden.length > 0) {
                    const hiddenIndex = randomNumBetween(0, network.hidden.length - 1);
                    if (!network.getConnection(`BIAS:${network.hidden[hiddenIndex]}`)) {
                        genome.genes.push(new Gene("BIAS", network.hidden[hiddenIndex]));
                    }
                }
            }

            genome.genes = genome.genes.map((gene) => this.pointMutate(gene));
        });
    }

    linkMutate(genome) {
        const network = genome.getNetwork();
        let inNode;
        let outNode;

        if (Math.random() < 1 / 3 || network.hidden.length <= 0) {
            inNode = network.inputs[randomNumBetween(0, network.inputs.length - 1)];
            outNode = network.outputs[randomNumBetween(0, network.outputs.length - 1)];
        } else if (Math.random() < 2 / 3) {
            inNode = network.inputs[randomNumBetween(0, network.inputs.length - 1)];
            outNode = network.hidden[randomNumBetween(0, network.hidden.length - 1)];
        } else {
            inNode = network.hidden[randomNumBetween(0, network.hidden.length - 1)];
            outNode = network.outputs[randomNumBetween(0, network.outputs.length - 1)];
        }

        if (!genome.containsGene(inNode, outNode)) {
            const newGene = new Gene(inNode, outNode, Math.random() * 2 - 1);

            const innovationKey = `${newGene.in}:${newGene.out}`;
            if (this.newInnovations[innovationKey] === undefined) {
                this.newInnovations[innovationKey] = this.globalInnovationCounter++;
                newGene.innovation = this.newInnovations[innovationKey];
            } else {
                newGene.innovation = this.newInnovations[innovationKey];
            }
            genome.genes.push(newGene);
        }

        return genome;
    }

    pointMutate(gene) {
        if (Math.random() < this.mutationRates.modifyWeight) {
            gene.weight += Math.random() * this.mutationRates.weightMutationStep * 2 - this.mutationRates.weightMutationStep;
        }
        if (Math.random() < this.mutationRates.enableGene) {
            gene.enabled = true;
        }
        if (Math.random() < this.mutationRates.disableGene) {
            gene.enabled = false;
        }
        return gene;
    }

    crossover(firstGenome, secondGenome) {
        const child = new Genome(firstGenome.inputNodes, firstGenome.outputNodes);
        const firstInnovationNumbers = firstGenome.genes.reduce((acc, gene, index) => {
            acc[gene.innovation] = index;
            return acc;
        }, {});

        const secondInnovationNumbers = secondGenome.genes.reduce((acc, gene, index) => {
            acc[gene.innovation] = index;
            return acc;
        }, {});

        firstGenome.genes.forEach((gene) => {
            let geneToClone;
            if (secondInnovationNumbers[gene.innovation] !== undefined) {
                geneToClone = Math.random() < 0.5 ? gene : secondGenome.genes[secondInnovationNumbers[gene.innovation]];
            } else {
                geneToClone = gene;
            }
            child.genes.push(new Gene(geneToClone.in, geneToClone.out, geneToClone.weight, geneToClone.innovation, geneToClone.enabled));
        });

        secondGenome.genes.forEach((gene) => {
            if (firstInnovationNumbers[gene.innovation] === undefined) {
                child.genes.push(new Gene(gene.in, gene.out, gene.weight, gene.innovation, gene.enabled));
            }
        });

        return child;
    }

    evolve() {
        this.currentGeneration++;
        this.newInnovations = {};
        this.genomes.sort(compareGenomesDescending);
        const children = [];
        this.speciate();
        this.cullSpecies();
        this.calculateSpeciesAvgFitness();

        const totalAvgFitness = this.species.reduce((sum, species) => sum + species.averageFitness, 0);

        this.species.forEach((species) => {
            const childrenToMake = Math.floor((species.averageFitness / totalAvgFitness) * this.populationSize);
            if (childrenToMake > 0) {
                children.push(species.genomes[0]); // Elitism
            }
            for (let i = 0; i < childrenToMake - 1; i++) {
                children.push(this.makeBaby(species));
            }
        });

        while (children.length < this.populationSize) {
            const randomSpecies = this.species[randomNumBetween(0, this.species.length - 1)];
            children.push(this.makeBaby(randomSpecies));
        }

        this.genomes = [...children];
        this.mutate();
        this.speciate();
        log(this.species.length);
    }

    speciate() {
        this.species = [];

        this.genomes.forEach((genome) => {
            let placed = false;
            for (const species of this.species) {
                if (this.isSameSpecies(genome, species.genomes[0])) {
                    species.genomes.push(genome);
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                const newSpecies = new Species();
                newSpecies.genomes.push(genome);
                this.species.push(newSpecies);
            }
        });
    }

    cullSpecies(remaining) {
        this.species = this.species.filter((species) => {
            species.cull(remaining);
            return species.genomes.length > 0;
        });
    }

    calculateSpeciesAvgFitness() {
        this.species.forEach((species) => species.calculateAverageFitness());
    }

    makeBaby(species) {
        const mum = species.genomes[randomWeightedNumBetween(0, species.genomes.length - 1)];
        const dad = species.genomes[randomWeightedNumBetween(0, species.genomes.length - 1)];
        return this.crossover(mum, dad);
    }

    calculateFitnesses() {
        this.genomes.forEach((genome) => {
            genome.fitness = this.fitnessFunction(genome.getNetwork());
        });
    }

    getCompatibility(genomeA, genomeB) {
        let disjoint = 0;
        let totalWeight = 0;

        const aInnovations = new Set(genomeA.genes.map((gene) => gene.innovation));
        const bInnovations = new Map(genomeB.genes.map((gene) => [gene.innovation, gene]));

        genomeA.genes.forEach((gene) => {
            if (bInnovations.has(gene.innovation)) {
                totalWeight += Math.abs(gene.weight - bInnovations.get(gene.innovation).weight);
            } else {
                disjoint++;
            }
        });

        genomeB.genes.forEach((gene) => {
            if (!aInnovations.has(gene.innovation)) {
                disjoint++;
            }
        });

        const n = Math.max(genomeA.genes.length, genomeB.genes.length);
        return (this.deltaDisjoint * disjoint) / n + (this.deltaWeights * totalWeight) / n;
    }

    isSameSpecies(genomeA, genomeB) {
        return this.getCompatibility(genomeA, genomeB) < this.deltaThreshold;
    }

    getElite() {
        this.genomes.sort(compareGenomesDescending);
        return this.genomes[0];
    }
}
