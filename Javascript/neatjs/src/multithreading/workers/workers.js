/*******************************************************************************
                                  WORKERS
*******************************************************************************/
// import { TestWorker as _node } from './node/testworker';
import  TestWorker  from './browser/testworker';
let workers = {
  node: {
    // TestWorker: _node
  },
  browser: {
    TestWorker: TestWorker
  }
};

/** Export */
export default workers;
