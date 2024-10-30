/* Import */
import methods from '../methods/methods.js';
import Connection from './connection.js';
import config from '../config.js';

export default Node;
 
class Node {
    constructor(type) {
        this.bias = (type === 'input') ? 0 : Math.random() * 0.2 - 0.1;
        this.squash = methods.activation.LOGISTIC;
        this.type = type || 'hidden';

        this.activation = 0;
        this.state = 0;
        this.old = 0;

        // Dùng cho dropout
        this.mask = 1;

        // Theo dõi momentum
        this.previousDeltaBias = 0;

        // Batch training
        this.totalDeltaBias = 0;

        this.connections = {
            in: [],
            out: [],
            gated: [],
            self: new Connection(this, this, 0)
        };

        // Dữ liệu cho backpropagation
        this.error = {
            responsibility: 0,
            projected: 0,
            gated: 0
        };
    }

    /**
     * Kích hoạt node
     */
    activate(input) {
        // Kiểm tra nếu có input
        if (typeof input !== 'undefined') {
            this.activation = input;
            return this.activation;
        }

        this.old = this.state;

        // Nguồn kích hoạt từ chính node
        this.state = this.connections.self.gain * this.connections.self.weight * this.state + this.bias;

        // Nguồn kích hoạt từ các kết nối
        for (let i = 0; i < this.connections.in.length; i++) {
            const connection = this.connections.in[i];
            this.state += connection.from.activation * connection.weight * connection.gain;
        }

        // Áp dụng hàm kích hoạt (squash)
        this.activation = this.squash(this.state) * this.mask;
        this.derivative = this.squash(this.state, true);

        // Cập nhật traces
        const nodes = [];
        const influences = [];

        for (let i = 0; i < this.connections.gated.length; i++) {
            const conn = this.connections.gated[i];
            const node = conn.to;

            const index = nodes.indexOf(node);
            if (index > -1) {
                influences[index] += conn.weight * conn.from.activation;
            } else {
                nodes.push(node);
                influences.push(
                    conn.weight * conn.from.activation + (node.connections.self.gater === this ? node.old : 0)
                );
            }

            // Điều chỉnh gain dựa trên activation của node
            conn.gain = this.activation;
        }

        for (let i = 0; i < this.connections.in.length; i++) {
            const connection = this.connections.in[i];

            // Elegibility trace
            connection.elegibility =
                this.connections.self.gain * this.connections.self.weight * connection.elegibility +
                connection.from.activation * connection.gain;

            // Extended trace
            for (let j = 0; j < nodes.length; j++) {
                const node = nodes[j];
                const influence = influences[j];

                const index = connection.xtrace.nodes.indexOf(node);

                if (index > -1) {
                    connection.xtrace.values[index] =
                        node.connections.self.gain *
                        node.connections.self.weight *
                        connection.xtrace.values[index] +
                        this.derivative * connection.elegibility * influence;
                } else {
                    // Nếu chưa tồn tại, có thể thông qua mutation
                    connection.xtrace.nodes.push(node);
                    connection.xtrace.values.push(this.derivative * connection.elegibility * influence);
                }
            }
        }

        return this.activation;
    }

    /**
     * Kích hoạt node mà không tính toán elegibility traces
     */
    noTraceActivate(input) {
        // Kiểm tra nếu có input
        if (typeof input !== 'undefined') {
            this.activation = input;
            return this.activation;
        }

        // Nguồn kích hoạt từ chính node
        this.state = this.connections.self.gain * this.connections.self.weight * this.state + this.bias;

        // Nguồn kích hoạt từ các kết nối
        for (let i = 0; i < this.connections.in.length; i++) {
            const connection = this.connections.in[i];
            this.state += connection.from.activation * connection.weight * connection.gain;
        }

        // Áp dụng hàm kích hoạt (squash)
        this.activation = this.squash(this.state);

        for (let i = 0; i < this.connections.gated.length; i++) {
            this.connections.gated[i].gain = this.activation;
        }

        return this.activation;
    }

    /**
     * Backpropagation lỗi, hay còn gọi là học
     */
    propagate(rate, momentum, update, target) {
        momentum = momentum || 0;
        rate = rate || 0.3;

        // Tích lũy lỗi
        let error = 0;

        // Node output nhận lỗi từ môi trường
        if (this.type === 'output') {
            this.error.responsibility = this.error.projected = target - this.activation;
        } else {
            // Các node khác tính toán trách nhiệm lỗi bằng backpropagation
            // Trách nhiệm lỗi từ tất cả các kết nối từ node này
            for (let i = 0; i < this.connections.out.length; i++) {
                const connection = this.connections.out[i];
                const node = connection.to;
                // Phương trình 21
                error += node.error.responsibility * connection.weight * connection.gain;
            }

            // Trách nhiệm lỗi dự đoán
            this.error.projected = this.derivative * error;

            // Trách nhiệm lỗi từ tất cả các kết nối được điều khiển bởi neuron này
            error = 0;

            for (let i = 0; i < this.connections.gated.length; i++) {
                const conn = this.connections.gated[i];
                const node = conn.to;
                let influence = node.connections.self.gater === this ? node.old : 0;

                influence += conn.weight * conn.from.activation;
                error += node.error.responsibility * influence;
            }

            // Trách nhiệm lỗi được điều khiển
            this.error.gated = this.derivative * error;

            // Trách nhiệm lỗi tổng
            this.error.responsibility = this.error.projected + this.error.gated;
        }

        if (this.type === 'constant') return;

        // Điều chỉnh tất cả các kết nối đầu vào của node
        for (let i = 0; i < this.connections.in.length; i++) {
            const connection = this.connections.in[i];

            let gradient = this.error.projected * connection.elegibility;

            for (let j = 0; j < connection.xtrace.nodes.length; j++) {
                const node = connection.xtrace.nodes[j];
                const value = connection.xtrace.values[j];
                gradient += node.error.responsibility * value;
            }

            // Điều chỉnh trọng số
            const deltaWeight = rate * gradient * this.mask;
            connection.totalDeltaWeight += deltaWeight;
            if (update) {
                connection.totalDeltaWeight += momentum * connection.previousDeltaWeight;
                connection.weight += connection.totalDeltaWeight;
                connection.previousDeltaWeight = connection.totalDeltaWeight;
                connection.totalDeltaWeight = 0;
            }
        }

        // Điều chỉnh bias
        const deltaBias = rate * this.error.responsibility;
        this.totalDeltaBias += deltaBias;
        if (update) {
            this.totalDeltaBias += momentum * this.previousDeltaBias;
            this.bias += this.totalDeltaBias;
            this.previousDeltaBias = this.totalDeltaBias;
            this.totalDeltaBias = 0;
        }
    }

    /**
     * Tạo kết nối từ node này đến node khác
     */
    connect(target, weight) {
        const connections = [];
        if (typeof target.bias !== 'undefined') {
            // Phải là một node
            if (target === this) {
                // Bật kết nối tự thân bằng cách đặt trọng số
                if (this.connections.self.weight !== 0) {
                    if (config.warnings) console.warn('Kết nối này đã tồn tại!');
                } else {
                    this.connections.self.weight = weight || 1;
                }
                connections.push(this.connections.self);
            } else if (this.isProjectingTo(target)) {
                throw new Error('Đã kết nối đến node này!');
            } else {
                const connection = new Connection(this, target, weight);
                target.connections.in.push(connection);
                this.connections.out.push(connection);

                connections.push(connection);
            }
        } else {
            // Nếu là một nhóm
            for (let i = 0; i < target.nodes.length; i++) {
                const connection = new Connection(this, target.nodes[i], weight);
                target.nodes[i].connections.in.push(connection);
                this.connections.out.push(connection);
                target.connections.in.push(connection);

                connections.push(connection);
            }
        }
        return connections;
    }

    /**
     * Ngắt kết nối node này với node khác
     */
    disconnect(node, twosided) {
        if (this === node) {
            this.connections.self.weight = 0;
            return;
        }

        for (let i = 0; i < this.connections.out.length; i++) {
            const conn = this.connections.out[i];
            if (conn.to === node) {
                this.connections.out.splice(i, 1);
                const j = conn.to.connections.in.indexOf(conn);
                conn.to.connections.in.splice(j, 1);
                if (conn.gater !== null) conn.gater.ungate(conn);
                break;
            }
        }

        if (twosided) {
            node.disconnect(this);
        }
    }

    /**
     * Làm cho node này điều khiển (gate) một kết nối
     */
    gate(connections) {
        if (!Array.isArray(connections)) {
            connections = [connections];
        }

        for (let i = 0; i < connections.length; i++) {
            const connection = connections[i];

            this.connections.gated.push(connection);
            connection.gater = this;
        }
    }

    /**
     * Loại bỏ việc điều khiển kết nối từ node này
     */
    ungate(connections) {
        if (!Array.isArray(connections)) {
            connections = [connections];
        }

        for (let i = connections.length - 1; i >= 0; i--) {
            const connection = connections[i];

            const index = this.connections.gated.indexOf(connection);
            this.connections.gated.splice(index, 1);
            connection.gater = null;
            connection.gain = 1;
        }
    }

    /**
     * Xóa ngữ cảnh của node
     */
    clear() {
        for (let i = 0; i < this.connections.in.length; i++) {
            const connection = this.connections.in[i];

            connection.elegibility = 0;
            connection.xtrace = {
                nodes: [],
                values: []
            };
        }

        for (let i = 0; i < this.connections.gated.length; i++) {
            const conn = this.connections.gated[i];
            conn.gain = 0;
        }

        this.error.responsibility = this.error.projected = this.error.gated = 0;
        this.old = this.state = this.activation = 0;
    }

    /**
     * Biến đổi (mutate) node với phương thức cho trước
     */
    mutate(method) {
        if (typeof method === 'undefined') {
            throw new Error('Chưa cung cấp phương thức biến đổi!');
        } else if (!(method.name in methods.mutation)) {
            throw new Error('Phương thức này không tồn tại!');
        }

        switch (method) {
            case methods.mutation.MOD_ACTIVATION:
                // Không thể cùng một hàm squash
                const index = method.allowed.indexOf(this.squash);
                const newSquash =
                    method.allowed[
                    (index + Math.floor(Math.random() * (method.allowed.length - 1)) + 1) %
                    method.allowed.length
                    ];
                this.squash = newSquash;
                break;
            case methods.mutation.MOD_BIAS:
                const modification = Math.random() * (method.max - method.min) + method.min;
                this.bias += modification;
                break;
        }
    }

    /**
     * Kiểm tra nếu node này đang kết nối tới node cho trước
     */
    isProjectingTo(node) {
        if (node === this && this.connections.self.weight !== 0) return true;

        for (let i = 0; i < this.connections.out.length; i++) {
            const conn = this.connections.out[i];
            if (conn.to === node) {
                return true;
            }
        }
        return false;
    }

    /**
     * Kiểm tra nếu node cho trước đang kết nối tới node này
     */
    isProjectedBy(node) {
        if (node === this && this.connections.self.weight !== 0) return true;

        for (let i = 0; i < this.connections.in.length; i++) {
            const conn = this.connections.in[i];
            if (conn.from === node) {
                return true;
            }
        }

        return false;
    }

    /**
     * Chuyển node thành một đối tượng JSON
     */
    toJSON() {
        return {
            bias: this.bias,
            type: this.type,
            squash: this.squash.name,
            mask: this.mask
        };
    }

    /**
     * Chuyển một đối tượng JSON thành node
     */
    static fromJSON(json) {
        const node = new Node();
        node.bias = json.bias;
        node.type = json.type;
        node.mask = json.mask;
        node.squash = methods.activation[json.squash];

        return node;
    }
}
