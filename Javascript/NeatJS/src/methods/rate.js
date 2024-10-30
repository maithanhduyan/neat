/*******************************************************************************
                                      RATE
*******************************************************************************/

// https://stackoverflow.com/questions/30033096/what-is-lr-policy-in-caffe/30045244
const rate = {
    FIXED() {
        return (baseRate, iteration) => baseRate;
    },
    STEP(gamma = 0.9, stepSize = 100) {
        return (baseRate, iteration) => baseRate * Math.pow(gamma, Math.floor(iteration / stepSize));
    },
    EXP(gamma = 0.999) {
        return (baseRate, iteration) => baseRate * Math.pow(gamma, iteration);
    },
    INV(gamma = 0.001, power = 2) {
        return (baseRate, iteration) => baseRate * Math.pow(1 + gamma * iteration, -power);
    }
};

/* Export */
export default rate;
