class AIController {
    constructor(game) {
        this.game = game;
    }

    // Hàm đánh giá bảng để tìm trạng thái tối ưu
    evaluateBoard(board) {
        const totalHeight = this.calculateTotalHeight(board);
        const completeLines = this.calculateCompleteLines(board);
        const holes = this.calculateHoles(board);
        const bumpiness = this.calculateBumpiness(board);

        // Sử dụng công thức heuristic cơ bản để đánh giá trạng thái
        return -0.5 * totalHeight + 0.8 * completeLines - 0.3 * holes - 0.2 * bumpiness;
    }

    calculateTotalHeight(board) {
        let totalHeight = 0;
        for (let x = 0; x < board.width; x++) {
            let colHeight = 0;
            for (let y = 0; y < board.height; y++) {
                if (board.grid[y][x] !== 0) {
                    colHeight = board.height - y;
                    break;
                }
            }
            totalHeight += colHeight;
        }
        return totalHeight;
    }

    calculateCompleteLines(board) {
        let completeLines = 0;
        for (let y = 0; y < board.height; y++) {
            if (board.grid[y].every(cell => cell !== 0)) {
                completeLines += 1;
            }
        }
        return completeLines;
    }

    calculateHoles(board) {
        let holes = 0;
        for (let x = 0; x < board.width; x++) {
            let blockFound = false;
            for (let y = 0; y < board.height; y++) {
                if (board.grid[y][x] !== 0) {
                    blockFound = true;
                } else if (blockFound && board.grid[y][x] === 0) {
                    holes += 1;
                }
            }
        }
        return holes;
    }

    calculateBumpiness(board) {
        let bumpiness = 0;
        for (let x = 0; x < board.width - 1; x++) {
            const colHeight1 = this.getColumnHeight(board, x);
            const colHeight2 = this.getColumnHeight(board, x + 1);
            bumpiness += Math.abs(colHeight1 - colHeight2);
        }
        return bumpiness;
    }

    getColumnHeight(board, x) {
        for (let y = 0; y < board.height; y++) {
            if (board.grid[y][x] !== 0) {
                return board.height - y;
            }
        }
        return 0;
    }

    // Tìm hành động tốt nhất dựa trên đánh giá
    findBestMove() {
        let bestScore = -Infinity;
        let bestMove = { rotation: 0, translation: 0 };

        // Thử mọi khả năng xoay và di chuyển
        for (let rotation = 0; rotation < 4; rotation++) {
            for (let translation = -5; translation <= 5; translation++) {
                const score = this.evaluateMove(rotation, translation);
                if (score > bestScore) {
                    bestScore = score;
                    bestMove = { rotation, translation };
                }
            }
        }
        return bestMove;
    }

    evaluateMove(rotation, translation) {
        const simulatedGame = this.simulateGameState(rotation, translation);
        return this.evaluateBoard(simulatedGame.board);
    }

    simulateGameState(rotation, translation) {
        // Tạo một bản sao cơ bản của trạng thái trò chơi
        const simulatedBoard = JSON.parse(JSON.stringify(this.game.board.grid));
        const simulatedPiece = JSON.parse(JSON.stringify(this.game.currentPiece));

        // Áp dụng xoay và dịch chuyển cho bản sao
        for (let i = 0; i < rotation; i++) this.rotatePiece(simulatedPiece, simulatedBoard);
        this.translatePiece(simulatedPiece, translation, simulatedBoard);

        // Rơi khối xuống và khóa vào vị trí
        this.dropPiece(simulatedPiece, simulatedBoard);

        return { board: { grid: simulatedBoard } }; // Trả về trạng thái bảng đã mô phỏng
    }

    rotatePiece(piece, board) {
        const originalShape = piece.shape;
        piece.rotate();
        if (!this.isInsideBoard(piece, board)) {
            piece.shape = originalShape; // Hủy xoay nếu vượt ngoài board
        }
    }

    translatePiece(piece, direction, board) {
        const newPosition = piece.position.x + direction;
        if (newPosition >= 0 && newPosition < board[0].length) {
            piece.position.x = newPosition;
        }
    }

    dropPiece(piece, board) {
        while (this.isInsideBoard(piece, board, 0, 1)) {
            piece.position.y += 1;
        }
        piece.position.y -= 1;
        this.lockPiece(piece, board);
    }

    lockPiece(piece, board) {
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    board[piece.position.y + y][piece.position.x + x] = piece.color;
                }
            });
        });
    }

    isInsideBoard(piece, board, offsetX = 0, offsetY = 0) {
        return piece.shape.every((row, y) =>
            row.every((value, x) => {
                const newX = piece.position.x + x + offsetX;
                const newY = piece.position.y + y + offsetY;
                return (
                    value === 0 ||
                    (newY >= 0 &&
                        newY < board.length &&
                        newX >= 0 &&
                        newX < board[0].length &&
                        board[newY][newX] === 0)
                );
            })
        );
    }


    // Hàm để AI thực hiện hành động
    makeMove() {
        const bestMove = this.findBestMove();
        for (let i = 0; i < bestMove.rotation; i++) this.game.rotate();
        this.game.move(bestMove.translation);
        this.game.drop();
    }
}

export default AIController;