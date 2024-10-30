/* Import */
import multi from '../../multi.js';



class TestWorker {
    constructor(dataSet, cost) {
        const blob = new Blob([this._createBlobString(cost)]);
        this.url = window.URL.createObjectURL(blob);
        this.worker = new Worker(this.url);

        const data = { set: new Float64Array(dataSet).buffer };
        this.worker.postMessage(data, [data.set]);
    }

    evaluate(network) {
        return new Promise((resolve, reject) => {
            const serialized = network.serialize();

            const data = {
                activations: new Float64Array(serialized[0]).buffer,
                states: new Float64Array(serialized[1]).buffer,
                conns: new Float64Array(serialized[2]).buffer,
            };

            this.worker.onmessage = (e) => {
                const error = new Float64Array(e.data.buffer)[0];
                resolve(error);
            };

            this.worker.postMessage(data, [data.activations, data.states, data.conns]);
        });
    }

    terminate() {
        this.worker.terminate();
        window.URL.revokeObjectURL(this.url);
    }

    _createBlobString(cost) {
        const source = `
      const F = [${multi.activations.toString()}];
      const cost = ${cost.toString()};
      const multi = {
        deserializeDataSet: ${multi.deserializeDataSet.toString()},
        testSerializedSet: ${multi.testSerializedSet.toString()},
        activateSerializedNetwork: ${multi.activateSerializedNetwork.toString()}
      };

      let set;

      self.onmessage = function (e) {
        if (typeof e.data.set === 'undefined') {
          const A = new Float64Array(e.data.activations);
          const S = new Float64Array(e.data.states);
          const data = new Float64Array(e.data.conns);

          const error = multi.testSerializedSet(set, cost, A, S, data, F);

          const answer = { buffer: new Float64Array([error]).buffer };
          postMessage(answer, [answer.buffer]);
        } else {
          set = multi.deserializeDataSet(new Float64Array(e.data.set));
        }
      };`;

        return source;
    }
}

/* Export */
export default TestWorker;
