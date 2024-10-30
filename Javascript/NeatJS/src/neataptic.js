/* Import */
import methods from './methods/methods.js';
import Connection from './architecture/connection.js';
import architect from './architecture/architect.js';
import Network from './architecture/network.js';
import config from './config.js';
import Group from './architecture/group.js';
import Layer from './architecture/layer.js';
import Node from './architecture/node.js';
import Neat from './neat.js';
import multi from './multithreading/multi.js';

/* Create the Neataptic object */
const Neataptic = {
    methods,
    Connection,
    architect,
    Network,
    config,
    Group,
    Layer,
    Node,
    Neat,
    multi,
};

/* Export */
export default Neataptic;

/* Optional: Attach Neataptic to the global window object if running in a browser */
if (typeof window !== 'undefined') {
    window.Neataptic = Neataptic;
}
