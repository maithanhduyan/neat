import activation from './activation.js';
import mutation from './mutation.js';
import selection from './selection.js';
import crossover from './crossover.js';
import cost from './cost.js';
import gating from './gating.js';
import connection from './connection.js';
import rate from './rate.js';

/*******************************************************************************
                                  METHODS
*******************************************************************************/

const methods = {
  activation,
  mutation,
  selection,
  crossover: crossover,
  cost,
  gating,
  connection,
  rate,
};

/** Export */
export default methods;
