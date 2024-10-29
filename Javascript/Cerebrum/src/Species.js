/**
 * A species of genomes that contains genomes which closely resemble one another, enough so that they are able to breed.
 */
import { compareGenomesDescending } from './Helper.js';

export class Species {
    constructor() {
        this.genomes = [];
        this.averageFitness = 0;
    }

    cull(remaining = Math.ceil(this.genomes.length / 2)) {
        this.genomes.sort(compareGenomesDescending);
        this.genomes = this.genomes.slice(0, remaining);
    }

    calculateAverageFitness() {
        const totalFitness = this.genomes.reduce((sum, genome) => sum + genome.fitness, 0);
        this.averageFitness = totalFitness / this.genomes.length;
    }
}