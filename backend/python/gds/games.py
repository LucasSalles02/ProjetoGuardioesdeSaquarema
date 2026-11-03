import secrets
import math

from .errors import ApiError

MEMORY_XP, PUZZLE_XP = 70, 90
SOLVED = [1, 2, 3, 4, 5, 6, 7, 8, 0]


def memory_state(xp):
    cards = [{"id": f"m{i}{suffix}", "symbol": symbol, "matched": False}
             for i, symbol in enumerate(["Oceano", "Reciclagem", "Lagoa", "Tartaruga", "Energia", "Coleta"])
             for suffix in ["a", "b"]]
    secrets.SystemRandom().shuffle(cards)
    return {"cards": cards, "flippedIds": [], "moves": 0, "completed": False, "xpReward": xp}


def public_memory(state):
    return {"type": "memory", **{key: state[key] for key in ["moves", "completed", "xpReward"]},
            "cards": [{**card, "visible": card["matched"] or card["id"] in state["flippedIds"],
                       "symbol": card["symbol"] if card["matched"] or card["id"] in state["flippedIds"] else None}
                      for card in state["cards"]]}


def flip(state, card_id):
    event = {"completed": state["completed"], "matched": False, "mismatch": False}
    if state["completed"]:
        return event
    if len(state["flippedIds"]) == 2:
        state["flippedIds"] = []
    card = next((card for card in state["cards"] if card["id"] == card_id), None)
    if not card:
        raise ApiError("Carta nao encontrada.")
    if card["matched"]:
        raise ApiError("Essa carta ja foi encontrada.")
    if card_id in state["flippedIds"]:
        raise ApiError("Escolha outra carta para formar o par.")
    state["flippedIds"].append(card_id)
    if len(state["flippedIds"]) == 2:
        state["moves"] += 1
        pair = [card for card in state["cards"] if card["id"] in state["flippedIds"]]
        if pair[0]["symbol"] == pair[1]["symbol"]:
            for card in pair:
                card["matched"] = True
            state["flippedIds"] = []
            event["matched"] = True
        else:
            event["mismatch"] = True
    state["completed"] = all(card["matched"] for card in state["cards"])
    event["completed"] = state["completed"]
    return event


def valid_tiles(board):
    row, col = divmod(board.index(0), 3)
    return [board[r * 3 + c] for r, c in [(row-1, col), (row+1, col), (row, col-1), (row, col+1)]
            if 0 <= r < 3 and 0 <= c < 3]


def move_tile(board, tile):
    result = list(board)
    a, b = result.index(0), result.index(tile)
    result[a], result[b] = result[b], result[a]
    return result


def puzzle_state(xp):
    board = list(SOLVED)
    for _ in range(45):
        board = move_tile(board, secrets.choice(valid_tiles(board)))
    if board == SOLVED:
        board = move_tile(board, valid_tiles(board)[0])
    return {"board": board, "moves": 0, "completed": False, "xpReward": xp}


def public_puzzle(state):
    return {"type": "puzzle", **state}


def move(state, tile):
    if state["completed"]:
        return {"completed": True}
    try:
        number = float(tile)
        if not math.isfinite(number) or number != int(number):
            raise ValueError
        tile = int(number)
    except (TypeError, ValueError, OverflowError):
        raise ApiError("Movimento invalido para o quebra-cabeca.") from None
    if tile not in valid_tiles(state["board"]):
        raise ApiError("Movimento invalido para o quebra-cabeca.")
    state["board"] = move_tile(state["board"], tile)
    state["moves"] += 1
    state["completed"] = state["board"] == SOLVED
    return {"completed": state["completed"]}
