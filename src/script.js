const board = document.getElementById("board");
let selectedPiece = null;
let currentTurn = "white";
let highlightedCells = [];

function createBoard() {
    board.innerHTML = "";
    for (let i = 0; i < 8; i++) {
        const row = document.createElement("div");
        row.classList.add("row");
        for (let j = 0; j < 8; j++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");
            cell.classList.add((i + j) % 2 === 0 ? "white" : "black");
            cell.dataset.i = i;
            cell.dataset.j = j;

            if (i < 3 && (i + j) % 2 !== 0) {
                addPiece(cell, "black", i, j);
            } else if (i > 4 && (i + j) % 2 !== 0) {
                addPiece(cell, "white", i, j);
            }
            row.appendChild(cell);
        }
        board.appendChild(row);
    }
}

function addPiece(cell, color, row, col) {
    const piece = document.createElement("div");
    piece.classList.add("piece", color);
    piece.dataset.color = color;
    piece.dataset.col = col;
    piece.dataset.row = row;
    cell.appendChild(piece);
}

function getCell(row, col) {
    return document.querySelector(`.cell[data-i="${row}"][data-j="${col}"]`);
}

function getPieceAt(row, col) {
    const cell = getCell(row, col);
    return cell ? cell.querySelector(".piece") : null;
}

function clearHighlights() {
    highlightedCells.forEach(cell => {
        cell.classList.remove("highlight");
        delete cell.dataset.captureRow;
        delete cell.dataset.captureCol;
    });
    highlightedCells = [];
}

function deselectPiece() {
    if (selectedPiece) {
        selectedPiece.classList.remove("selected");
        selectedPiece = null;
    }
    clearHighlights();
}

function getAvailableMoves(piece) {
    const row = parseInt(piece.dataset.row);
    const col = parseInt(piece.dataset.col);
    const color = piece.dataset.color;
    const isKing = piece.classList.contains("king");
    let directions = [];
    if (color === "white" || isKing) directions.push([-1, -1], [-1, 1]);
    if (color === "black" || isKing) directions.push([1, -1], [1, 1]);
    const moves = [];
    const captures = [];

    for (const [dr, dc] of directions) {
        const newRow = row + dr;
        const newCol = col + dc;
        if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) continue;
        const target = getPieceAt(newRow, newCol);
        if (!target) {
            moves.push({ row: newRow, col: newCol });
        } else if (target.dataset.color !== color) {
            const jumpRow = newRow + dr;
            const jumpCol = newCol + dc;
            if (jumpRow >= 0 && jumpRow <= 7 && jumpCol >= 0 && jumpCol <= 7 && !getPieceAt(jumpRow, jumpCol)) {
                captures.push({ row: jumpRow, col: jumpCol, captureRow: newRow, captureCol: newCol });
            }
        }
    }

    return captures.length > 0 ? { moves: captures, hasCapture: true } : { moves, hasCapture: false };
}

function playerHasCaptures(color) {
    const pieces = document.querySelectorAll(`.piece.${color}`);
    for (const p of pieces) {
        if (getAvailableMoves(p).hasCapture) return true;
    }
    return false;
}

function showMoves(piece) {
    const mustCapture = playerHasCaptures(piece.dataset.color);
    const { moves, hasCapture } = getAvailableMoves(piece);
    if (mustCapture && !hasCapture) return;
    for (const move of moves) {
        const cell = getCell(move.row, move.col);
        cell.classList.add("highlight");
        if (move.captureRow !== undefined) {
            cell.dataset.captureRow = move.captureRow;
            cell.dataset.captureCol = move.captureCol;
        }
        highlightedCells.push(cell);
    }
}

function removePiece(piece) {
    const cell = piece.parentElement;
    piece.remove();
    const explosion = document.createElement("img");
    explosion.src = "./media/explosion-gif.gif";
    explosion.classList.add("explosion");
    cell.appendChild(explosion);
    setTimeout(() => {
        explosion.remove();
        checkWin();
    }, 800);
}

function checkKing(piece) {
    const row = parseInt(piece.dataset.row);
    if (piece.dataset.color === "white" && row === 0) piece.classList.add("king");
    if (piece.dataset.color === "black" && row === 7) piece.classList.add("king");
}

function animateMove(piece, targetCell, callback) {
    const startRect = piece.getBoundingClientRect();
    targetCell.appendChild(piece);
    const endRect = piece.getBoundingClientRect();
    const dx = startRect.left - endRect.left;
    const dy = startRect.top - endRect.top;
    piece.style.transition = "none";
    piece.style.transform = `translate(${dx}px, ${dy}px)`;
    piece.offsetHeight;
    piece.style.transition = "transform 0.3s ease";
    piece.style.transform = "translate(0, 0)";
    piece.addEventListener("transitionend", function handler() {
        piece.removeEventListener("transitionend", handler);
        piece.style.transition = "";
        piece.style.transform = "";
        callback();
    });
}

function movePiece(piece, targetCell) {
    const newRow = parseInt(targetCell.dataset.i);
    const newCol = parseInt(targetCell.dataset.j);
    const captureRow = targetCell.dataset.captureRow;
    const captureCol = targetCell.dataset.captureCol;
    piece.dataset.row = newRow;
    piece.dataset.col = newCol;
    board.style.pointerEvents = "none";
    animateMove(piece, targetCell, () => {
        board.style.pointerEvents = "";
        let captured = false;
        if (captureRow !== undefined) {
            const capturedPiece = getPieceAt(parseInt(captureRow), parseInt(captureCol));
            if (capturedPiece) {
                removePiece(capturedPiece);
                captured = true;
            }
        }
        checkKing(piece);
        clearHighlights();
        if (captured && getAvailableMoves(piece).hasCapture) {
            selectedPiece = piece;
            piece.classList.add("selected");
            showMoves(piece);
            return;
        }
        deselectPiece();
        currentTurn = currentTurn === "white" ? "black" : "white";
    });
}

function checkWin() {
    const whites = document.querySelectorAll(".piece.white").length;
    const blacks = document.querySelectorAll(".piece.black").length;
    if (whites === 0) showWinMessage("Чёрные");
    else if (blacks === 0) showWinMessage("Белые");
}

function showWinMessage(winner) {
    const overlay = document.createElement("div");
    overlay.classList.add("win-overlay");
    const msg = document.createElement("div");
    msg.classList.add("win-message");
    msg.innerHTML = `
        <div>Победа!</div>
        <div style="margin-top:10px">${winner} выиграли!</div>
        <button id="restartBtn">Играть снова</button>
    `;
    overlay.appendChild(msg);
    document.body.appendChild(overlay);

    document.getElementById("restartBtn").addEventListener("click", () => {
        overlay.remove();
        currentTurn = "white";
        selectedPiece = null;
        highlightedCells = [];
        createBoard();
    });
}

board.addEventListener("click", (e) => {
    const target = e.target;

    if (target.classList.contains("piece") && target.dataset.color === currentTurn) {
        deselectPiece();
        selectedPiece = target;
        target.classList.add("selected");
        showMoves(target);
        return;
    }

    if (target.classList.contains("highlight") && selectedPiece) {
        movePiece(selectedPiece, target);
        return;
    }

    deselectPiece();
});

createBoard();
