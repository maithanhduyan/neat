import { multi, methods } from '../../../neataptic.js';

let set = [];
let cost;
const F = multi.activations;

process.on('message', (e) => {
  if (typeof e.set === 'undefined') {
    const { activations: A, states: S, conns: data } = e;
    
    const result = multi.testSerializedSet(set, cost, A, S, data, F);

    process.send(result);
  } else {
    cost = methods.cost[e.cost];
    set = multi.deserializeDataSet(e.set);
  }
});
