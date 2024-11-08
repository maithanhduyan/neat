// activation_functions.rs
mod activation_functions {
    pub fn sigmoid(x: f64) -> f64 {
        1.0 / (1.0 + (-x).exp())
    }
}

// simple_rng.rs
mod simple_rng {
    pub struct SimpleRng {
        seed: u64,
    }

    impl SimpleRng {
        pub fn new(seed: u64) -> Self {
            SimpleRng { seed }
        }

        pub fn next_f64(&mut self) -> f64 {
            // Linear Congruential Generator (LCG)
            self.seed = (1664525 * self.seed + 1013904223) % (1 << 32);
            (self.seed as f64) / (u32::MAX as f64)
        }

        pub fn gen_range(&mut self, min: f64, max: f64) -> f64 {
            min + (max - min) * self.next_f64()
        }
    }
}

// neural_network.rs
mod neural_network {
    use crate::activation_functions::sigmoid;
    use crate::simple_rng::SimpleRng;

    pub struct NeuralNetwork {
        input_size: usize,
        hidden_size: usize,
        weights_input_hidden: Vec<Vec<f64>>,
        weights_hidden_output: Vec<f64>,
        bias_hidden: Vec<f64>,
        bias_output: f64,
        learning_rate: f64,
    }

    impl NeuralNetwork {
        pub fn new(input_size: usize, hidden_size: usize, learning_rate: f64) -> Self {
            let mut nn = NeuralNetwork {
                input_size,
                hidden_size,
                weights_input_hidden: vec![vec![0.0; input_size]; hidden_size],
                weights_hidden_output: vec![0.0; hidden_size],
                bias_hidden: vec![0.0; hidden_size],
                bias_output: 0.0,
                learning_rate,
            };
            nn.initialize_weights();
            nn
        }

        fn initialize_weights(&mut self) {
            let mut rng = SimpleRng::new(42); // Fixed seed for reproducibility

            for i in 0..self.hidden_size {
                for j in 0..self.input_size {
                    self.weights_input_hidden[i][j] = rng.gen_range(-1.0, 1.0);
                }
                self.bias_hidden[i] = rng.gen_range(-1.0, 1.0);
            }

            for i in 0..self.hidden_size {
                self.weights_hidden_output[i] = rng.gen_range(-1.0, 1.0);
            }
            self.bias_output = rng.gen_range(-1.0, 1.0);
        }

        pub fn train(&mut self, inputs: &Vec<Vec<f64>>, targets: &Vec<f64>, epochs: usize) {
            for _ in 0..epochs {
                for (input, target) in inputs.iter().zip(targets.iter()) {
                    // Forward pass
                    let hidden_inputs: Vec<f64> = self
                        .weights_input_hidden
                        .iter()
                        .map(|weights| {
                            weights
                                .iter()
                                .zip(input.iter())
                                .map(|(w, i)| w * i)
                                .sum::<f64>()
                        })
                        .zip(self.bias_hidden.iter())
                        .map(|(sum, bias)| sum + bias)
                        .collect();

                    let hidden_outputs: Vec<f64> =
                        hidden_inputs.iter().map(|&x| sigmoid(x)).collect();

                    let final_input: f64 = hidden_outputs
                        .iter()
                        .zip(self.weights_hidden_output.iter())
                        .map(|(h, w)| h * w)
                        .sum::<f64>()
                        + self.bias_output;

                    let final_output = sigmoid(final_input);

                    // Error calculation
                    let output_error = target - final_output;

                    // Backpropagation
                    let output_delta = output_error * final_output * (1.0 - final_output);

                    let hidden_errors: Vec<f64> = self
                        .weights_hidden_output
                        .iter()
                        .map(|&w| w * output_delta)
                        .collect();

                    let hidden_deltas: Vec<f64> = hidden_errors
                        .iter()
                        .zip(hidden_outputs.iter())
                        .map(|(&error, &output)| error * output * (1.0 - output))
                        .collect();

                    // Update weights and biases
                    for i in 0..self.hidden_size {
                        self.weights_hidden_output[i] +=
                            self.learning_rate * output_delta * hidden_outputs[i];
                    }
                    self.bias_output += self.learning_rate * output_delta;

                    for i in 0..self.hidden_size {
                        for j in 0..self.input_size {
                            self.weights_input_hidden[i][j] +=
                                self.learning_rate * hidden_deltas[i] * input[j];
                        }
                        self.bias_hidden[i] += self.learning_rate * hidden_deltas[i];
                    }
                }
            }
        }

        pub fn predict(&self, input: &Vec<f64>) -> f64 {
            let hidden_inputs: Vec<f64> = self
                .weights_input_hidden
                .iter()
                .map(|weights| {
                    weights
                        .iter()
                        .zip(input.iter())
                        .map(|(w, i)| w * i)
                        .sum::<f64>()
                })
                .zip(self.bias_hidden.iter())
                .map(|(sum, bias)| sum + bias)
                .collect();

            let hidden_outputs: Vec<f64> = hidden_inputs.iter().map(|&x| sigmoid(x)).collect();

            let final_input: f64 = hidden_outputs
                .iter()
                .zip(self.weights_hidden_output.iter())
                .map(|(h, w)| h * w)
                .sum::<f64>()
                + self.bias_output;

            sigmoid(final_input)
        }
    }
}

// main.rs
fn main() {
    use neural_network::NeuralNetwork;

    // Training data for XOR
    let inputs = vec![
        vec![0.0, 0.0],
        vec![0.0, 1.0],
        vec![1.0, 0.0],
        vec![1.0, 1.0],
    ];

    let targets = vec![0.0, 1.0, 1.0, 0.0];

    let mut nn = NeuralNetwork::new(2, 2, 0.5);

    nn.train(&inputs, &targets, 10000);

    println!("Testing the trained network:");
    for input in &inputs {
        let output = nn.predict(input);
        println!("Input: {:?} => Output: {:.4}", input, output);
    }
}
