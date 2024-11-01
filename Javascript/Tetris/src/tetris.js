
import AIController from "./aicontroller.js"


class Piece {
    constructor(shape, color) {
        this.shape = shape;
        this.color = color;
        this.position = { x: 3, y: 0 };
    }

    rotate() {
        this.shape = this.shape[0].map((_, index) =>
            this.shape.map(row => row[index]).reverse()
        );
    }
}

class Board {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = Array.from({ length: height }, () => Array(width).fill(0));
    }

    isInside(piece, offsetX = 0, offsetY = 0) {
        return piece.shape.every((row, y) =>
            row.every((value, x) => {
                const newX = piece.position.x + x + offsetX;
                const newY = piece.position.y + y + offsetY;
                return (
                    value === 0 ||
                    (this.isInBounds(newX, newY) && this.grid[newY][newX] === 0)
                );
            })
        );
    }

    isInBounds(x, y) {
        return x >= 0 && x < this.width && y >= 0 && y < this.height;
    }

    merge(piece) {
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.grid[piece.position.y + y][piece.position.x + x] = piece.color;
                }
            });
        });
    }

    clearRows() {
        const clearedRows = [];
        this.grid = this.grid.filter((row, y) => {
            if (row.every(cell => cell !== 0)) {
                clearedRows.push(y);
                return false;
            }
            return true;
        });

        while (this.grid.length < this.height) {
            this.grid.unshift(Array(this.width).fill(0));
        }
        return clearedRows.length;
    }
}
class Game {
    constructor(canvasId, isAIEnabled = false) {
        this.canvas = document.getElementById(canvasId);
        this.context = this.canvas.getContext('2d');

        // Thiết lập kích thước board và cell
        this.boardWidth = 10;
        this.boardHeight = 20;
        this.boardAreaWidth = this.canvas.width * 4 / 6; // Chiều rộng vùng Board
        this.canvas.height = this.boardAreaWidth * 2; // Chiều cao của canvas
        this.infoAreaWidth = this.boardAreaWidth / 2; // Chiều rộng vùng thông tin

        // Kích thước mỗi ô trong board, dựa trên chiều rộng và chiều cao
        this.cellSize = Math.min(this.boardAreaWidth / this.boardWidth, this.canvas.height / this.boardHeight);

        // Khởi tạo board và các biến trò chơi
        this.board = new Board(this.boardWidth, this.boardHeight);
        this.pieces = this.createPieces();
        this.currentPiece = this.randomPiece();
        this.nextPiece = this.randomPiece();
        this.interval = null;
        this.speed = 500;
        this.score = 0;
        this.isGameOver = false;
        this.isAIEnabled = isAIEnabled;
        this.start();
    }

    // Khởi tạo AI nếu được bật
    //Liên kết game với một genome
    setBrain(brain) {
        if (this.isAIEnabled) {
            this.brain = brain;
        }
    }

    // Lấy đầu vào từ trạng thái bảng
    getInputs() {
        const inputs = [];

        // Tổng chiều cao của các cột
        inputs.push(this.calculateTotalHeight());

        // Số hàng hoàn chỉnh
        inputs.push(this.calculateCompleteLines());

        // Số lỗ hổng trên bảng
        inputs.push(this.calculateHoles());

        // Độ gồ ghề của các cột
        inputs.push(this.calculateBumpiness());

        return inputs;
    }

    // Tính tổng chiều cao các cột
    calculateTotalHeight() {
        let totalHeight = 0;
        for (let x = 0; x < this.boardWidth; x++) {
            totalHeight += this.getColumnHeight(x);
        }
        return totalHeight;
    }

    // Tính số hàng đã hoàn chỉnh
    calculateCompleteLines() {
        let completeLines = 0;
        for (let y = 0; y < this.boardHeight; y++) {
            if (this.board.grid[y].every(cell => cell !== 0)) {
                completeLines += 1;
            }
        }
        return completeLines;
    }

    // Tính số lượng lỗ hổng
    calculateHoles() {
        let holes = 0;
        for (let x = 0; x < this.boardWidth; x++) {
            let blockFound = false;
            for (let y = 0; y < this.boardHeight; y++) {
                if (this.board.grid[y][x] !== 0) {
                    blockFound = true;
                } else if (blockFound && this.board.grid[y][x] === 0) {
                    holes += 1;
                }
            }
        }
        return holes;
    }

    // Tính độ gồ ghề giữa các cột
    calculateBumpiness() {
        let bumpiness = 0;
        for (let x = 0; x < this.boardWidth - 1; x++) {
            const colHeight1 = this.getColumnHeight(x);
            const colHeight2 = this.getColumnHeight(x + 1);
            bumpiness += Math.abs(colHeight1 - colHeight2);
        }
        return bumpiness;
    }

    // Tính chiều cao của một cột
    getColumnHeight(x) {
        for (let y = 0; y < this.boardHeight; y++) {
            if (this.board.grid[y][x] !== 0) {
                return this.boardHeight - y;
            }
        }
        return 0;
    }

    createPieces() {
        return [
            { shape: [[1, 1, 1, 1]], color: 'cyan' },
            { shape: [[1, 1], [1, 1]], color: 'yellow' },
            { shape: [[0, 1, 0], [1, 1, 1]], color: 'purple' },
            { shape: [[1, 0, 0], [1, 1, 1]], color: 'blue' },
            { shape: [[0, 0, 1], [1, 1, 1]], color: 'orange' },
            { shape: [[1, 1, 0], [0, 1, 1]], color: 'red' },
            { shape: [[0, 1, 1], [1, 1, 0]], color: 'green' }
        ];
    }

    randomPiece() {
        if (!this.nextPiece) {
            this.nextPiece = this.createPieces()[Math.floor(Math.random() * this.pieces.length)];
        }
        const piece = this.nextPiece;
        this.nextPiece = this.createPieces()[Math.floor(Math.random() * this.pieces.length)];
        return new Piece(piece.shape, piece.color);
    }

    start() {
        this.interval = setInterval(() => this.update(), this.speed);
        if (!this.isAIEnabled) {
            document.addEventListener('keydown', event => this.handleInput(event));
        }
        this.updateDisplay();
    }

    updateDisplay() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawBoard();
        this.drawInfoArea();

        // Kiểm tra và hiển thị "Game Over" nếu game đã kết thúc
        if (this.isGameOver) {
            this.drawGameOver();
        }
    }

    drawBoard() {
        // Vẽ board ở phần bên trái của canvas
        this.context.fillStyle = "white";
        this.context.fillRect(0, 0, this.boardAreaWidth, this.canvas.height);

        // Vẽ các khối trong board
        this.board.grid.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell !== 0) {
                    this.context.fillStyle = cell;
                    this.context.fillRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                    this.context.strokeRect(x * this.cellSize, y * this.cellSize, this.cellSize, this.cellSize);
                }
            });
        });

        // Vẽ khối hiện tại
        this.drawPiece(this.currentPiece);
    }

    drawPiece(piece) {
        this.context.fillStyle = piece.color;
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.context.fillRect(
                        (piece.position.x + x) * this.cellSize,
                        (piece.position.y + y) * this.cellSize,
                        this.cellSize,
                        this.cellSize
                    );
                    this.context.strokeRect(
                        (piece.position.x + x) * this.cellSize,
                        (piece.position.y + y) * this.cellSize,
                        this.cellSize,
                        this.cellSize
                    );
                }
            });
        });
    }

    drawInfoArea() {
        // Vẽ khu vực thông tin ở bên phải của canvas
        const infoStartX = this.boardAreaWidth;

        // Đặt màu nền cho vùng thông tin
        this.context.fillStyle = "lightgray";
        this.context.fillRect(infoStartX, 0, this.infoAreaWidth, this.canvas.height);

        // Vẽ thông tin điểm số và tốc độ
        this.context.fillStyle = "black";
        this.context.font = "8px Arial";
        this.context.fillText(`Score: ${this.score}`, infoStartX + 10, 30);
        this.context.fillText(`Speed: ${500 / this.speed}`, infoStartX + 10, 60);

        // Vẽ khối tiếp theo
        this.context.fillText("Next Piece:", infoStartX + 10, 100);
        this.drawNextPiece(infoStartX + 10, 120);
    }

    drawNextPiece(startX, startY) {
        this.nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    this.context.fillStyle = this.nextPiece.color;
                    this.context.fillRect(
                        startX + x * this.cellSize,
                        startY + y * this.cellSize,
                        this.cellSize,
                        this.cellSize
                    );
                    this.context.strokeRect(
                        startX + x * this.cellSize,
                        startY + y * this.cellSize,
                        this.cellSize,
                        this.cellSize
                    );
                }
            });
        });
    }

    handleInput(event) {
        switch (event.key) {
            case 'ArrowLeft':
                this.move(-1);
                break;
            case 'ArrowRight':
                this.move(1);
                break;
            case 'ArrowDown':
                this.drop();
                break;
            case 'ArrowUp':
                this.rotate();
                break;
        }
    }

    move(direction) {
        if (this.board.isInside(this.currentPiece, direction, 0)) {
            this.currentPiece.position.x += direction;
        }
    }

    rotate() {
        const originalShape = this.currentPiece.shape;
        this.currentPiece.rotate();
        if (!this.board.isInside(this.currentPiece)) {
            this.currentPiece.shape = originalShape;
        }
    }

    drop() {
        if (this.board.isInside(this.currentPiece, 0, 1)) {
            this.currentPiece.position.y += 1;
        } else {
            this.lockPiece();
        }
    }

    lockPiece() {
        this.board.merge(this.currentPiece);
        const clearedRows = this.board.clearRows();
        this.increaseScore(clearedRows);
        this.currentPiece = this.randomPiece();

        // Kiểm tra nếu game over
        if (!this.board.isInside(this.currentPiece)) {
            this.isGameOver = true;
            clearInterval(this.interval);
            this.drawGameOver(); // Vẽ thông báo Game Over
        }
    }

    drawGameOver() {
        this.context.fillStyle = "rgba(0, 0, 0, 0.5)"; // Màu nền mờ cho thông báo
        this.context.fillRect(0, 0, this.boardAreaWidth, this.canvas.height);

        this.context.fillStyle = "white";
        this.context.font = `${this.cellSize * 1.5}px Arial`;
        this.context.textAlign = "center";
        this.context.fillText("Game Over", this.boardAreaWidth / 2, this.canvas.height / 2);

        this.context.font = `${this.cellSize * 0.8}px Arial`;
        this.context.fillText("Press F5 to Restart", this.boardAreaWidth / 2, this.canvas.height / 2 + this.cellSize * 2);
    }

    // Cập nhật điểm số cho genome khi trò chơi kết thúc
    endGame() {
        this.isGameOver = true;
        if (this.brain) {
            this.brain.score = this.score; // Gán điểm số của trò chơi cho genome
        }
    }
    
    // Kiểm tra xem game có kết thúc không
    checkGameOver() {
        // Logic kiểm tra nếu game over
        return this.isGameOver;
    }

    increaseScore(clearedRows) {
        this.score += clearedRows;
        if (clearedRows > 0 && this.score % 500 === 0) {
            this.speed *= 0.1;
            clearInterval(this.interval);
            this.interval = setInterval(() => this.update(), this.speed);
        }

        if (this.checkGameOver()) {
            this.endGame(); // Kết thúc trò chơi nếu điều kiện game over đạt
        }

        this.updateDisplay();
    }

    update() {
        this.drop();
        this.updateDisplay();
    }

    // AI thực hiện một nước đi dựa trên đầu ra của mạng neuron
    makeMove(output) {
        const [moveLeft, moveRight, rotate, drop] = output;

        if (moveLeft > 0.5) this.move(-1);
        if (moveRight > 0.5) this.move(1);
        if (rotate > 0.5) this.rotate();
        if (drop > 0.5) this.drop();
    }
}


export default Game;