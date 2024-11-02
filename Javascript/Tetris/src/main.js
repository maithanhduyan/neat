import Game from './tetris.js';

"use strict"; // Toàn bộ file này sẽ ở chế độ strict mode

class GameGeneration {

    constructor() {
        this.gameIds = []; // Mảng lưu trữ các ID của các canvas
        this.games = []; // Mảng để lưu các đối tượng game
        this.container = null; // Tham chiếu đến container chứa các canvas
        this.init();
    }

    init() {
        // Tạo container để chứa các dòng
        const container = document.createElement('div');
        container.id = 'container'; // Đặt id cho container
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        document.body.appendChild(container);

        // Tạo 10 dòng, mỗi dòng chứa 5 thẻ canvas
        for (let row = 0; row < 10; row++) {
            // Tạo một hàng (dòng) để chứa 5 canvas
            const rowDiv = document.createElement('div');
            rowDiv.style.display = 'flex';

            for (let col = 0; col < 5; col++) {
                const canvasId = `game${row * 5 + col}`; // Tạo ID duy nhất cho mỗi canvas
                const canvas = this._createGameCanvas(canvasId);
                rowDiv.appendChild(canvas);
                this.gameIds.push(canvasId); // Lưu trữ ID của canvas vào mảng
            }

            container.appendChild(rowDiv); // Thêm dòng vào container chính
        }

    }

    start(neat) {
        // Khởi tạo game Tetris cho mỗi canvas sau khi tất cả canvas đã được tạo
        for (let i = 0; i < this.gameIds.length; i++) {
            const game = new Game(this.gameIds[i], true); // Khởi tạo game vói AI
            game.setBrain(neat.population[i]);
            this.games.push(game); // Lưu đối tượng game vào mảng
        }

        // Tăng tốc games
        this.increaseSpeedForAllGames(600);

        // Thực hiện các bước di chuyển của AI cho mỗi game sau mỗi 100ms
        // this.aiInterval = setInterval(() => this.runAIMove(), this.games[0].speed);
    }

    runAIMove() {
        this.games.forEach((game, i) => {
            const inputs = game.getInputs(); // Lấy đầu vào từ game
            const outputs = game.brain.activate(inputs); // Tính toán đầu ra từ mạng neuron
            game.makeMove(outputs); // Thực hiện hành động dựa trên đầu ra của mạng neuron
        });
    }

    _createGameCanvas(id) {
        const canvas = document.createElement('canvas');
        canvas.width = 150;
        // canvas.height = 300; // Đặt chiều cao canvas
        canvas.id = id;
        canvas.style.border = '1px solid black';
        canvas.style.margin = '5px'; // Thêm khoảng cách giữa các canvas
        return canvas;
    }

    increaseSpeedForAllGames(speed = 100) {
        this.games.forEach(game => {
            game.speed -= speed; // Giảm thời gian cập nhật, tăng tốc độ game
            clearInterval(game.interval); // Xóa interval hiện tại
            game.interval = setInterval(() => game.update(), game.speed); // Cài đặt lại interval với tốc độ mới
        });
    }

    checkGameOver() {
        let allGameOver = 0;
        for (let i = 0; i < this.games.length; i++) {
            if (this.games[i].isGameOver) {
                allGameOver++;
            }
        }
        if (allGameOver === this.games.length) {
            this.reset();
            return true;
        }
        return false;
    }

    reset() {
        // Tìm và xóa container có id là 'container'
        const container = document.getElementById('container');
        if (container) {
            container.remove(); // Xóa container và tất cả các phần tử con bên trong
        }
        clearInterval(this.aiInterval); // Dừng AI khi reset
    }

}

class NetGraph {
    constructor(network) {
        this.network = network; // Mạng neuron để vẽ
        this.canvas = document.createElement('canvas'); // Tạo canvas
        this.canvas.id = 'netGraph'
        this.canvas.width = 400;
        this.canvas.height = 400;
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d'); // Ngữ cảnh vẽ
        this.nodePositions = {}; // Lưu trữ vị trí của các node

        this.init();
    }

    // Khởi tạo các vị trí cho node và thiết lập layout cho mạng
    init() {
        // Tính toán số lượng node trong từng lớp
        const inputLayerSize = this.network.nodes.filter(node => node.type === 'input').length;
        const hiddenLayerSize = this.network.nodes.filter(node => node.type === 'hidden').length;
        const outputLayerSize = this.network.nodes.filter(node => node.type === 'output').length;

        // Thiết lập các vị trí x cho các lớp
        this.layerX = {
            'input': this.canvas.width * 0.1,
            'hidden': this.canvas.width * 0.5,
            'output': this.canvas.width * 0.9
        };

        // Sắp xếp và lưu vị trí cho từng node trong các lớp
        this.network.nodes.forEach((node, index) => {
            const layer = node.type;
            const layerSize = layer === 'input' ? inputLayerSize : layer === 'hidden' ? hiddenLayerSize : outputLayerSize;
            const y = (this.canvas.height / (layerSize + 1)) * (index + 1);
            const x = this.layerX[layer];

            // Lưu lại vị trí node để vẽ kết nối sau
            this.nodePositions[node.id] = { x, y };
        });
    }

    // Phương thức để vẽ các node và kết nối
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height); // Xóa canvas trước khi vẽ

        // Vẽ các kết nối
        this.network.connections.forEach(connection => {
            if (connection.enabled) { // Chỉ vẽ các kết nối đang hoạt động
                const fromPos = this.nodePositions[connection.from];
                const toPos = this.nodePositions[connection.to];

                this.ctx.beginPath();
                this.ctx.moveTo(fromPos.x, fromPos.y);
                this.ctx.lineTo(toPos.x, toPos.y);
                this.ctx.lineWidth = Math.abs(connection.weight) * 2; // Độ dày đường theo trọng số
                this.ctx.strokeStyle = connection.weight > 0 ? 'green' : 'red'; // Màu sắc: xanh (trọng số dương), đỏ (trọng số âm)
                this.ctx.stroke();
            }
        });

        // Vẽ các node
        this.network.nodes.forEach(node => {
            const pos = this.nodePositions[node.id];
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2); // Vẽ node dưới dạng vòng tròn
            this.ctx.fillStyle = node.type === 'input' ? 'green' : node.type === 'output' ? 'red' : 'blue';
            this.ctx.fill();
            this.ctx.stroke();
        });
    }

    // Phương thức cập nhật mạng, nếu cần thiết
    update(network) {
        this.network = network;
        // Thực hiện bất kỳ cập nhật nào nếu có, sau đó vẽ lại mạng
        this.draw();
    }

    clear() {
        // Tìm và xóa container có id là 'netGraph'
        const container = document.getElementById('netGraph');
        if (container) {
            container.remove(); // Xóa container và tất cả các phần tử con bên trong
        }
    }
}

///////////////////////////////////////////////////////
const AI_NUM = 50;
const ELITISM_NUM = 0.1 * AI_NUM; // 10%
const { Neat } = window.neataptic;

const neat = new Neat(20, 4, null, { // Đảm bảo neat được khởi tạo trước khi gọi endGeneration
    mutation: neataptic.methods.mutation.ALL,
    popsize: AI_NUM,
    elitism: ELITISM_NUM,
    mutationRate: 0.5,
    network: new neataptic.architect.Perceptron(20, 15, 4) // 6 input, 12 hidden, 4 output
});

// Khởi tạo một thế hệ mới
let gg;
let bestGenome = neat.population[0];
// let netGraph = new NetGraph(bestGenome);

function startGeneration() {
    // console.log(` Thế hệ thứ: ${neat.generation}`);

    //
    gg = new GameGeneration();
    gg.start(neat);
    //

    // Bắt đầu game
    const gameOverInterval = setInterval(() => {
        if (gg.checkGameOver()) {
            clearInterval(gameOverInterval);// stop timer
            console.log("All Game Over!");
            neat.sort();
            console.log(`Điểm cao nhất của thế hệ này là: ${neat.population[0].score} `);
            bestGenome = neat.population[0];
            console.log(bestGenome);
            endGeneration();
        }
    }, 100);
}

// Kết thúc một thế hệ
function endGeneration() {

    // sắp xếp các genome có điểm cao
    neat.sort();
    // Cập nhật dân số cho thế hệ tiếp theo
    const newPopulation = neat.population.slice(0, neat.elitism);
    while (newPopulation.length < neat.popsize) {
        newPopulation.push(neat.getOffspring());
    }

    // Khởi tạo thế hệ mới 
    neat.population = newPopulation;
    neat.mutate(); // Đột biến
    neat.generation++; // Đếm thứ tự tăng dần qua các thế hệ 

    startGeneration();
}

// Start Loop
document.addEventListener("DOMContentLoaded", function () {
    // Mã JavaScript ở đây sẽ được thực thi khi tài liệu đã sẵn sàng.
    console.log("Document Ready!");
    startGeneration();
});

