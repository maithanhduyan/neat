import '../style.css'
import javascriptLogo from '/javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'

import methods from './methods/methods.js'
import Connection from './architecture/connection.js'
import architect from './architecture/architect.js'
import Network from './architecture/network.js'
import config from './config.js'
import Group from './architecture/group.js'
import Layer from './architecture/layer.js'
import Node from './architecture/node.js'
import Neat from './neat.js'
import multi from './multithreading/multi.js'

const NeatJS = {
    methods,
    Connection,
    architect:architect,
    Network,
    config,
    Group,
    Layer,
    Node,
    Neat,
    multi,
};

// 
export default NeatJS;

document.querySelector('#app').innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
      <img src="${javascriptLogo}" class="logo vanilla" alt="JavaScript logo" />
    </a>
    <h1>Hello Vite!</h1>
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <p class="read-the-docs">
      Click on the Vite logo to learn more
    </p>
  </div>
`

setupCounter(document.querySelector('#counter'))

// import { architect } from "./neataptic";

let network = new NeatJS.architect.Perceptron(2, 4, 1);
NeatJS.config.warnings = true;
// XOR 
const trainingSet = [
    { input: [0, 0], output: [0] },
    { input: [0, 1], output: [1] },
    { input: [1, 0], output: [1] },
    { input: [1, 1], output: [0] }];

// Train the XOR gate
network.train(trainingSet, {
    log: 1,
    iterations: 1000,
    error: 0.0001,
    rate: 0.2
});

console.log(`network.activate([0, 1]): ${network.activate([0, 1])}`);
