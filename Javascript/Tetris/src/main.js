import Game from './tetris.js';

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
        this.increaseSpeedForAllGames(500);

        // Thực hiện các bước di chuyển của AI cho mỗi game sau mỗi 100ms
        this.aiInterval = setInterval(() => this.runAIMove(), 100);
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
        canvas.height = 300; // Đặt chiều cao canvas
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
///////////////////////////////////////////////////////
const AI_NUM = 50;
const ELITISM_NUM = 0.1 * AI_NUM; // 10%
const { Neat, architect } = window.neataptic;

const neat = new Neat(20, 40, null, { // Đảm bảo neat được khởi tạo trước khi gọi endGeneration
    mutation: neataptic.methods.mutation.ALL,
    popsize: AI_NUM,
    elitism: ELITISM_NUM,
    mutationRate: 0.3,
    network: new neataptic.architect.Perceptron(20, 40, 4) // 6 input, 12 hidden, 4 output
});

// Khởi tạo một thế hệ mới
let gg;
function startGeneration() {
    console.log(` Thế hệ thứ: ${neat.generation}`);
    gg = new GameGeneration();
    gg.start(neat);
    const gameOverInterval = setInterval(() => {
        if (gg.checkGameOver()) {
            clearInterval(gameOverInterval);
            console.log("All Game Over!");
            neat.sort();
            console.log(`Điểm cao nhất của thế hệ này là: ${neat.population[0].score} `);
            
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
startGeneration();
