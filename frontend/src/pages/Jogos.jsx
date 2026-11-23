import { useEffect, useState } from "react";
import { Brain, Check, Gamepad2, Loader2, Play, Puzzle, Star, Trophy, Waves } from "lucide-react";
import PageShell from "../components/PageShell";
import GameStage from "../components/GameStage";
import MarineSymbol, { marineSymbol, marineSymbols } from "../components/MarineSymbol";
import { jogos as jogosAPI } from "../services/api";
import { can } from "../services/permissions";
import { useAuth } from "../context/AuthContext";
import { useReward } from "../context/RewardContext";
import useContentAnchor from "../hooks/useContentAnchor";

export default function Jogos() {
  const { user, atualizarUsuario } = useAuth();
  const { celebrate } = useReward();
  const [catalogo, setCatalogo] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [activeGame, setActiveGame] = useState(null);
  const [memory, setMemory] = useState(null);
  const [puzzle, setPuzzle] = useState(null);
  const [busy, setBusy] = useState(false);
  const mismatch = memory?.jogo.cards.filter((card) => card.visible && !card.matched).length === 2;
  useContentAnchor(!carregando);

  useEffect(() => {
    let active = true;
    const refresh = () =>
      jogosAPI
        .listar()
        .then(({ jogos }) => {
          if (active) setCatalogo(jogos);
        })
        .catch(() => {
          if (active) setFeedback("Não foi possível atualizar os jogos.");
        })
        .finally(() => {
          if (active) setCarregando(false);
        });
    refresh();
    const timer = setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    if (!mismatch) return;
    const timer = setTimeout(
      () =>
        setMemory((current) => ({
          ...current,
          jogo: {
            ...current.jogo,
            cards: current.jogo.cards.map((card) =>
              card.matched ? card : { ...card, visible: false, symbol: null },
            ),
          },
        })),
      1100,
    );
    return () => clearTimeout(timer);
  }, [mismatch]);

  function updateAllowance(id, allowance) {
    if (allowance)
      setCatalogo((items) =>
        items.map((item) => (item.id === id ? { ...item, ...allowance } : item)),
      );
  }

  async function start(id, restart = false) {
    if (busy) return;
    setFeedback("");
    const existing = id === "memory" ? memory : puzzle;
    if (!restart && existing && !existing.jogo.completed) {
      setActiveGame(id);
      return;
    }
    setBusy(true);
    try {
      const result =
        id === "memory" ? await jogosAPI.iniciarMemoria() : await jogosAPI.iniciarPuzzle();
      if (id === "memory") setMemory(result);
      else setPuzzle(result);
      updateAllowance(id, result.recompensas);
      setActiveGame(id);
    } catch (error) {
      setFeedback(error.message || "Não foi possível iniciar o jogo.");
    } finally {
      setBusy(false);
    }
  }

  async function play(value) {
    const current = activeGame === "memory" ? memory : puzzle;
    if (busy || !current || current.jogo.completed || (activeGame === "memory" && mismatch)) return;
    setBusy(true);
    setFeedback("");
    try {
      const result =
        activeGame === "memory"
          ? await jogosAPI.virarCarta(current.sessionId, value)
          : await jogosAPI.moverPeca(current.sessionId, value);
      if (activeGame === "memory") setMemory(result);
      else setPuzzle(result);
      updateAllowance(activeGame, result.recompensas);
      celebrate(result, "Mergulho concluído!");
      if (result.usuario) atualizarUsuario(result.usuario);
      if (result.jogo.completed)
        setFeedback(
          result.xpGanho > 0
            ? `Você conquistou +${result.xpGanho} XP!`
            : "Muito bem! O XP disponível para este jogo hoje já foi recebido. Você pode continuar jogando!",
        );
    } catch (error) {
      setFeedback(error.message || "Não foi possível registrar a jogada.");
    } finally {
      setBusy(false);
    }
  }

  const current = activeGame === "memory" ? memory : puzzle;
  const activeMeta = catalogo.find((game) => game.id === activeGame);
  const completed = current?.jogo.completed;
  return (
    <PageShell
      title="Jogos"
      description="Mergulhe em desafios de memória e lógica com os amigos do fundo do mar."
    >
      {!activeGame && feedback && (
        <p
          role="status"
          className="mb-5 rounded-2xl border border-cyan-200 bg-white p-4 text-sm font-bold text-sky-900"
        >
          {feedback}
        </p>
      )}
      {carregando ? (
        <div role="status" aria-label="Carregando jogos" className="grid gap-5 md:grid-cols-2">
          {[0, 1].map((index) => (
            <div key={index} className="h-80 animate-pulse rounded-3xl bg-white/70" />
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {catalogo.map((game) => {
            const isMemory = game.id === "memory";
            const session = isMemory ? memory : puzzle;
            const Icon = isMemory ? Brain : Puzzle;
            return (
              <article
                id={`jogo-${game.id}`}
                tabIndex={-1}
                key={game.id}
                className="ocean-game-card overflow-hidden rounded-3xl border border-cyan-200 bg-white"
              >
                <div
                  className={`game-preview ${isMemory ? "game-preview--memory" : "game-preview--puzzle"}`}
                  aria-hidden="true"
                >
                  {isMemory ? (
                    <div className="grid grid-cols-3 gap-3">
                      {marineSymbols.map((item) => (
                        <span
                          key={item.label}
                          className="preview-sea-tile"
                          style={{ backgroundColor: item.color }}
                        >
                          {item.drawing}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {["🐢", "🐟", "🪸", "🐚", "🐙", "⭐", "🦀", "🐬", ""].map(
                        (drawing, index) => (
                          <span
                            key={index}
                            className={`preview-sea-tile ${!drawing ? "opacity-30" : ""}`}
                          >
                            {drawing}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                </div>
                <div className="p-5 sm:p-6">
                  <h2 className="flex items-center gap-2 text-xl font-black text-sky-950">
                    <Icon size={24} className="text-teal-600" aria-hidden="true" />
                    {game.titulo}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {isMemory
                      ? "Encontre os pares de animais e tesouros marinhos. Observe, vire as cartas e descubra seus amigos!"
                      : "Deslize as peças marinhas até colocar os números na ordem. Cada movimento é uma nova descoberta!"}
                  </p>
                  <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black text-amber-900">
                    <Star size={15} className="fill-amber-400" aria-hidden="true" />
                    {game.rewardsRemaining === 0
                      ? "XP de hoje já recebido"
                      : `+${game.xpRecompensa} XP por partida recompensada`}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-sky-800">
                    {game.rewardedToday}/{game.dailyRewardLimit} partidas recompensadas hoje. Jogue
                    quantas vezes quiser!
                  </p>
                  <button
                    type="button"
                    disabled={busy || !can(user, "games.play")}
                    onClick={() => start(game.id)}
                    className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-700 px-4 py-3 font-black text-white hover:bg-sky-800 disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Play size={20} aria-hidden="true" />
                    )}
                    {session && !session.jogo.completed ? "Continuar partida" : "Iniciar jogo"}
                  </button>
                </div>
              </article>
            );
          })}
          {!catalogo.length && (
            <p className="rounded-3xl bg-white p-8 text-center font-bold text-sky-900">
              Novos desafios aparecerão aqui quando estiverem disponíveis.
            </p>
          )}
        </div>
      )}
      {activeGame && current && (
        <GameStage
          title={activeMeta?.titulo || "Aventura no oceano"}
          busy={busy}
          onClose={() => {
            setActiveGame(null);
            setFeedback("");
          }}
          onRestart={() => start(activeGame, true)}
        >
          <div className="game-stage-status">
            <span className="inline-flex items-center gap-2">
              <Gamepad2 size={19} aria-hidden="true" />
              {current.jogo.moves} jogadas
            </span>
            <span className="inline-flex items-center gap-2">
              {completed ? (
                <Trophy size={19} aria-hidden="true" />
              ) : (
                <Waves size={19} aria-hidden="true" />
              )}
              {completed
                ? "Desafio concluído!"
                : activeGame === "memory"
                  ? `${current.jogo.cards.filter((card) => card.matched).length / 2} de 6 pares`
                  : "Ordene de 1 a 8"}
            </span>
          </div>
          {activeGame === "memory" ? (
            <div className="ocean-memory-board" aria-label="Cartas do jogo da memória">
              {current.jogo.cards.map((card, index) => {
                const symbol = marineSymbol(card.symbol);
                return (
                  <button
                    type="button"
                    key={card.id}
                    onClick={() => play(card.id)}
                    disabled={busy || mismatch || card.visible || completed}
                    aria-label={
                      card.visible
                        ? `${symbol.label}${card.matched ? ", par encontrado" : ""}`
                        : `Revelar carta ${index + 1}`
                    }
                    className={`ocean-memory-card ${card.visible ? "is-revealed" : ""} ${card.matched ? "is-matched" : ""}`}
                    style={{ "--sea-card-color": symbol.color }}
                  >
                    <span className="ocean-card-front" aria-hidden="true">
                      <Waves />
                      <span className="card-bubble" />
                    </span>
                    <span className="ocean-card-back">
                      {card.visible && <MarineSymbol symbol={card.symbol} />}
                      {card.matched && (
                        <Check
                          size={17}
                          className="absolute right-2 top-2 text-emerald-700"
                          aria-hidden="true"
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="ocean-puzzle-board" aria-label="Quebra-cabeça marinho">
              {current.jogo.board.map((tile, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => play(tile)}
                  disabled={busy || !tile || completed}
                  aria-label={tile ? `Mover peça ${tile}` : "Espaço vazio"}
                  className={`ocean-puzzle-tile ${!tile ? "is-empty" : ""}`}
                  style={{ "--tile-color": ["#ccfbf1", "#dbeafe", "#fef3c7", "#ede9fe"][tile % 4] }}
                >
                  {Boolean(tile) && (
                    <>
                      <span aria-hidden="true" className="puzzle-animal">
                        {["", "🐢", "🐟", "🪸", "🐚", "🐙", "⭐", "🦀", "🐬"][tile]}
                      </span>
                      <span className="puzzle-number">{tile}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="game-stage-message" role="status">
            {feedback ||
              (mismatch
                ? "Observe os desenhos e tente outro par!"
                : completed
                  ? "Você cuidou muito bem deste desafio!"
                  : activeGame === "memory"
                    ? "Vire duas cartas e encontre os desenhos iguais."
                    : "Toque em uma peça ao lado do espaço vazio para movê-la.")}
          </div>
          {completed && (
            <button
              type="button"
              onClick={() => {
                setActiveGame(null);
                setFeedback("");
              }}
              className="mx-auto flex min-h-11 items-center gap-2 rounded-2xl bg-sky-700 px-5 py-3 text-sm font-bold text-white"
            >
              Explorar outros jogos
              <Play size={17} aria-hidden="true" />
            </button>
          )}
        </GameStage>
      )}
    </PageShell>
  );
}
