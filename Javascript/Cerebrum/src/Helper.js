// Helper.js

// Helper functions
export const sigmoid = (t) => 1 / (1 + Math.exp(-t));

export const randomNumBetween = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

export const randomWeightedNumBetween = (min, max) => Math.floor(Math.pow(Math.random(), 2) * (max - min + 1) + min);

export const compareGenomesAscending = (genomeA, genomeB) => genomeA.fitness - genomeB.fitness;

export const compareGenomesDescending = (genomeA, genomeB) => genomeB.fitness - genomeA.fitness;

export const log = (text) => console.log(text);
