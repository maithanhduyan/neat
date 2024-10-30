/*******************************************************************************
                                  WORKERS
*******************************************************************************/

// Import các module cần thiết
import TestWorkerNode from './node/testworker.js';
import TestWorkerBrowser from './browser/testworker.js';

const workers = {
    node: {
        TestWorker: TestWorkerNode,
    },
    browser: {
        TestWorker: TestWorkerBrowser,
    },
};

/** Export */
export default workers;
