/*******************************************************************************
                                 ACTIVATION FUNCTIONS
*******************************************************************************/

// https://en.wikipedia.org/wiki/Activation_function
// https://stats.stackexchange.com/questions/115258/comprehensive-list-of-activation-functions-in-neural-networks-with-pros-cons

export default activation;
 
const activation = {
    LOGISTIC(x, derivate) {
        const fx = 1 / (1 + Math.exp(-x));
        if (!derivate) return fx;
        return fx * (1 - fx);
    },
    TANH(x, derivate) {
        if (derivate) return 1 - Math.pow(Math.tanh(x), 2);
        return Math.tanh(x);
    },
    IDENTITY(x, derivate) {
        return derivate ? 1 : x;
    },
    STEP(x, derivate) {
        return derivate ? 0 : x > 0 ? 1 : 0;
    },
    RELU(x, derivate) {
        if (derivate) return x > 0 ? 1 : 0;
        return x > 0 ? x : 0;
    },
    SOFTSIGN(x, derivate) {
        const d = 1 + Math.abs(x);
        if (derivate) return x / Math.pow(d, 2);
        return x / d;
    },
    SINUSOID(x, derivate) {
        if (derivate) return Math.cos(x);
        return Math.sin(x);
    },
    GAUSSIAN(x, derivate) {
        const d = Math.exp(-Math.pow(x, 2));
        if (derivate) return -2 * x * d;
        return d;
    },
    BENT_IDENTITY(x, derivate) {
        const d = Math.sqrt(Math.pow(x, 2) + 1);
        if (derivate) return x / (2 * d) + 1;
        return (d - 1) / 2 + x;
    },
    BIPOLAR(x, derivate) {
        return derivate ? 0 : x > 0 ? 1 : -1;
    },
    BIPOLAR_SIGMOID(x, derivate) {
        const d = 2 / (1 + Math.exp(-x)) - 1;
        if (derivate) return 0.5 * (1 + d) * (1 - d);
        return d;
    },
    HARD_TANH(x, derivate) {
        if (derivate) return x > -1 && x < 1 ? 1 : 0;
        return Math.max(-1, Math.min(1, x));
    },
    ABSOLUTE(x, derivate) {
        if (derivate) return x < 0 ? -1 : 1;
        return Math.abs(x);
    },
    INVERSE(x, derivate) {
        if (derivate) return -1;
        return 1 - x;
    },
    // https://arxiv.org/pdf/1706.02515.pdf
    SELU(x, derivate) {
        const alpha = 1.6732632423543772848170429916717;
        const scale = 1.0507009873554804934193349852946;
        const fx = x > 0 ? x : alpha * (Math.exp(x) - 1);
        if (derivate) {
            return x > 0 ? scale : (fx + alpha) * scale;
        }
        return fx * scale;
    }
};

