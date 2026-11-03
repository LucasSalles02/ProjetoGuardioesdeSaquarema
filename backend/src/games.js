import { randomInt } from "node:crypto";
import { badRequest } from "./errors.js";

export const MEMORY_XP = 70;
export const PUZZLE_XP = 90;

const MEMORY_PAIRS = [
  "Oceano",
  "Reciclagem",
  "Lagoa",
  "Tartaruga",
  "Energia",
  "Coleta",
];

const SOLVED_BOARD = [1, 2, 3, 4, 5, 6, 7, 8, 0];

export function createMemoryState(xpReward = MEMORY_XP) {
  const cards = shuffle(
    MEMORY_PAIRS.flatMap((symbol, index) => [
      { id: `m${index}a`, symbol, matched: false },
      { id: `m${index}b`, symbol, matched: false },
    ]),
  );

  return {
    cards,
    flippedIds: [],
    moves: 0,
    completed: false,
    xpReward,
  };
}

export function publicMemoryState(state) {
  return {
    type: "memory",
    moves: state.moves,
    completed: state.completed,
    xpReward: state.xpReward,
    cards: state.cards.map((card) => ({
      id: card.id,
      matched: card.matched,
      visible: card.matched || state.flippedIds.includes(card.id),
      symbol: card.matched || state.flippedIds.includes(card.id) ? card.symbol : null,
    })),
  };
}

export function flipMemoryCard(state, cardId) {
  if (state.completed) {
    return { state, event: { completed: true, matched: false, mismatch: false } };
  }

  let next = {
    ...state,
    cards: state.cards.map((card) => ({ ...card })),
    flippedIds: [...state.flippedIds],
  };

  if (next.flippedIds.length === 2) {
    next.flippedIds = [];
  }

  const card = next.cards.find((item) => item.id === cardId);
  if (!card) {
    throw badRequest("Carta nao encontrada.");
  }

  if (card.matched) {
    throw badRequest("Essa carta ja foi encontrada.");
  }

  if (next.flippedIds.includes(cardId)) {
    throw badRequest("Escolha outra carta para formar o par.");
  }

  next.flippedIds.push(cardId);

  let matched = false;
  let mismatch = false;

  if (next.flippedIds.length === 2) {
    next.moves += 1;
    const [firstId, secondId] = next.flippedIds;
    const first = next.cards.find((item) => item.id === firstId);
    const second = next.cards.find((item) => item.id === secondId);

    if (first.symbol === second.symbol) {
      first.matched = true;
      second.matched = true;
      next.flippedIds = [];
      matched = true;
    } else {
      mismatch = true;
    }
  }

  next.completed = next.cards.every((item) => item.matched);

  return {
    state: next,
    event: {
      completed: next.completed,
      matched,
      mismatch,
    },
  };
}

export function createPuzzleState(xpReward = PUZZLE_XP) {
  let board = [...SOLVED_BOARD];

  for (let index = 0; index < 45; index += 1) {
    const moves = validPuzzleTiles(board);
    const tile = moves[randomInt(moves.length)];
    board = moveTileOnBoard(board, tile);
  }

  if (isSolvedBoard(board)) {
    board = moveTileOnBoard(board, validPuzzleTiles(board)[0]);
  }

  return {
    board,
    moves: 0,
    completed: false,
    xpReward,
  };
}

export function publicPuzzleState(state) {
  return {
    type: "puzzle",
    board: state.board,
    moves: state.moves,
    completed: state.completed,
    xpReward: state.xpReward,
  };
}

export function movePuzzleTile(state, tileValue) {
  if (state.completed) {
    return { state, event: { completed: true } };
  }

  const tile = Number(tileValue);
  const validTiles = validPuzzleTiles(state.board);

  if (!validTiles.includes(tile)) {
    throw badRequest("Movimento invalido para o quebra-cabeca.");
  }

  const board = moveTileOnBoard(state.board, tile);
  const completed = isSolvedBoard(board);

  return {
    state: {
      ...state,
      board,
      moves: state.moves + 1,
      completed,
    },
    event: { completed },
  };
}

function validPuzzleTiles(board) {
  const blankIndex = board.indexOf(0);
  const row = Math.floor(blankIndex / 3);
  const col = blankIndex % 3;
  const candidates = [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ];

  return candidates
    .filter(([nextRow, nextCol]) => nextRow >= 0 && nextRow < 3 && nextCol >= 0 && nextCol < 3)
    .map(([nextRow, nextCol]) => board[nextRow * 3 + nextCol]);
}

function moveTileOnBoard(board, tile) {
  const next = [...board];
  const blankIndex = next.indexOf(0);
  const tileIndex = next.indexOf(tile);
  next[blankIndex] = tile;
  next[tileIndex] = 0;
  return next;
}

function isSolvedBoard(board) {
  return board.every((value, index) => value === SOLVED_BOARD[index]);
}

function shuffle(items) {
  const next = [...items];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1);
    [next[index], next[target]] = [next[target], next[index]];
  }

  return next;
}
