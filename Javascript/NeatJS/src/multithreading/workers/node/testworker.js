/* Import */
import cp from 'child_process';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

/*******************************************************************************
                                WEBWORKER
*******************************************************************************/

// Tạo __dirname trong ES6 modules
const __dirname = dirname(fileURLToPath(import.meta.url));

class TestWorker {
    constructor(dataSet, cost) {
        this.worker = cp.fork(path.join(__dirname, 'worker'));

        this.worker.send({ set: dataSet, cost: cost.name });
    }

    evaluate(network) {
        return new Promise((resolve, reject) => {
            const serialized = network.serialize();

            const data = {
                activations: serialized[0],
                states: serialized[1],
                conns: serialized[2],
            };

            this.worker.once('message', (e) => {
                resolve(e);
            });

            this.worker.send(data);
        });
    }

    terminate() {
        this.worker.kill();
    }
}

/* Export */
export default TestWorker;
