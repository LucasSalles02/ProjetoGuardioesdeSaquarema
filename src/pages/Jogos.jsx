import { useEffect, useState } from "react";
import { Brain, Gamepad2, Loader2, Puzzle, RotateCcw, Trophy } from "lucide-react";
import PageShell from "../components/PageShell";
import { jogos as jogosAPI } from "../services/api";
import { can } from "../services/permissions";
import { useAuth } from "../context/AuthContext";
import useContentAnchor from "../hooks/useContentAnchor";

export default function Jogos() {
  const { user, atualizarUsuario } = useAuth();
  const [catalogo, setCatalogo] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [carregando, setCarregando] = useState(true);
  useContentAnchor(!carregando);

  const [memoriaId, setMemoriaId] = useState("");
  const [memoria, setMemoria] = useState(null);
  const [memoriaBusy, setMemoriaBusy] = useState("");

  const [puzzleId, setPuzzleId] = useState("");
  const [puzzle, setPuzzle] = useState(null);
  const [puzzleBusy, setPuzzleBusy] = useState(false);

  useEffect(() => {
    jogosAPI.listar()
      .then(({ jogos }) => setCatalogo(jogos))
      .catch(() => setFeedback("Nao foi possivel carregar os jogos."))
      .finally(() => setCarregando(false));
  }, []);

  const iniciarMemoria = async () => {
    setFeedback("");
    setMemoriaBusy("start");
    try {
      const result = await jogosAPI.iniciarMemoria();
      setMemoriaId(result.sessionId);
      setMemoria(result.jogo);
    } catch (error) {
      setFeedback(error.message || "Nao foi possivel iniciar o jogo da memoria.");
    } finally {
      setMemoriaBusy("");
    }
  };

  const virarCarta = async (cardId) => {
    if (!memoriaId || memoriaBusy || memoria?.completed) return;
    setFeedback("");
    setMemoriaBusy(cardId);
    try {
      const result = await jogosAPI.virarCarta(memoriaId, cardId);
      setMemoria(result.jogo);
      if (result.usuario) atualizarUsuario(result.usuario);
      if (result.xpGanho > 0) {
        setFeedback(`Jogo da memoria completo: +${result.xpGanho} XP.`);
      }
    } catch (error) {
      setFeedback(error.message || "Nao foi possivel virar essa carta.");
    } finally {
      setMemoriaBusy("");
    }
  };

  const iniciarPuzzle = async () => {
    setFeedback("");
    setPuzzleBusy(true);
    try {
      const result = await jogosAPI.iniciarPuzzle();
      setPuzzleId(result.sessionId);
      setPuzzle(result.jogo);
    } catch (error) {
      setFeedback(error.message || "Nao foi possivel iniciar o quebra-cabeca.");
    } finally {
      setPuzzleBusy(false);
    }
  };

  const moverPeca = async (tile) => {
    if (!puzzleId || puzzleBusy || puzzle?.completed || tile === 0) return;
    setFeedback("");
    setPuzzleBusy(true);
    try {
      const result = await jogosAPI.moverPeca(puzzleId, tile);
      setPuzzle(result.jogo);
      if (result.usuario) atualizarUsuario(result.usuario);
      if (result.xpGanho > 0) {
        setFeedback(`Quebra-cabeca completo: +${result.xpGanho} XP.`);
      }
    } catch (error) {
      setFeedback(error.message || "Movimento invalido.");
    } finally {
      setPuzzleBusy(false);
    }
  };

  const memoryMeta = catalogo.find((jogo) => jogo.id === "memory");
  const puzzleMeta = catalogo.find((jogo) => jogo.id === "puzzle");

  return (
    <PageShell
      title="Jogos"
      description="Mini desafios validados pelo backend para treinar memoria, logica e temas ambientais."
    >
      {feedback ? (
        <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800">
          {feedback}
        </div>
      ) : null}

      {carregando ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="h-96 animate-pulse rounded-3xl bg-white/70" />
          <div className="h-96 animate-pulse rounded-3xl bg-white/70" />
        </div>
      ) : (
        <div className="adaptive-game-grid grid gap-5">
          <section id="jogo-memory" tabIndex={-1} className="game-card sea-card rounded-3xl p-4 sm:p-5">
            <GameHeader
              icon={Brain}
              title={memoryMeta?.titulo || "Jogo da memoria"}
              description={memoryMeta?.descricao || "Encontre os pares ambientais."}
              xp={memoryMeta?.xpRecompensa || 70}
              action={(
                <button
                  type="button"
                  onClick={iniciarMemoria}
                  disabled={!can(user, "games.play") || memoriaBusy === "start"}
                  className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-2.5 text-sm font-black text-white hover:bg-sky-600 disabled:opacity-60"
                >
                  {memoriaBusy === "start" ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}
                  {memoria ? "Reiniciar" : "Iniciar"}
                </button>
              )}
            />

            {memoria ? (
              <>
                <div className="memory-board mt-5 grid gap-2 sm:gap-3">
                  {memoria.cards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => virarCarta(card.id)}
                      disabled={!can(user, "games.play") || Boolean(memoriaBusy) || card.matched || memoria.completed}
                      className={`flex min-w-0 aspect-[4/3] items-center justify-center rounded-2xl border px-2 text-center text-sm font-black transition ${
                        card.visible
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-sky-100 bg-sky-500 text-white hover:bg-sky-600"
                      } disabled:cursor-not-allowed disabled:opacity-80`}
                    >
                      {memoriaBusy === card.id ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : (card.symbol || "?")}
                    </button>
                  ))}
                </div>
                <GameFooter moves={memoria.moves} completed={memoria.completed} />
              </>
            ) : (
              <EmptyGame icon={Gamepad2} text="Inicie uma sessao para revelar as cartas." />
            )}
          </section>

          <section id="jogo-puzzle" tabIndex={-1} className="game-card sea-card rounded-3xl p-4 sm:p-5">
            <GameHeader
              icon={Puzzle}
              title={puzzleMeta?.titulo || "Quebra-cabeca 3x3"}
              description={puzzleMeta?.descricao || "Ordene as pecas no tabuleiro."}
              xp={puzzleMeta?.xpRecompensa || 90}
              action={(
                <button
                  type="button"
                  onClick={iniciarPuzzle}
                  disabled={!can(user, "games.play") || puzzleBusy}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {puzzleBusy ? <Loader2 className="animate-spin" size={16} aria-hidden="true" /> : <RotateCcw size={16} aria-hidden="true" />}
                  {puzzle ? "Reiniciar" : "Iniciar"}
                </button>
              )}
            />

            {puzzle ? (
              <>
                <div className="mx-auto mt-5 grid max-w-sm grid-cols-3 gap-3">
                  {puzzle.board.map((tile, index) => (
                    <button
                      key={`${tile}-${index}`}
                      type="button"
                      onClick={() => moverPeca(tile)}
                      disabled={!can(user, "games.play") || puzzleBusy || tile === 0 || puzzle.completed}
                      className={`flex aspect-square items-center justify-center rounded-2xl text-2xl font-black transition ${
                        tile === 0
                          ? "border-2 border-dashed border-slate-300 bg-slate-50 text-transparent"
                          : "bg-gradient-to-br from-cyan-500 to-blue-700 text-white shadow-sm hover:-translate-y-0.5"
                      } disabled:cursor-not-allowed disabled:hover:translate-y-0`}
                    >
                      {tile}
                    </button>
                  ))}
                </div>
                <GameFooter moves={puzzle.moves} completed={puzzle.completed} />
              </>
            ) : (
              <EmptyGame icon={Puzzle} text="Inicie uma sessao e clique nas pecas vizinhas ao espaco vazio." />
            )}
          </section>
        </div>
      )}
    </PageShell>
  );
}

function GameHeader({ icon: Icon, title, description, xp, action }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          <Icon size={24} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-xl font-black text-blue-950">{title}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">{description}</p>
          <span className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
            +{xp} XP
          </span>
        </div>
      </div>
      {action}
    </div>
  );
}

function GameFooter({ moves, completed }) {
  return (
    <div className="mt-5 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-black text-slate-700">Jogadas: {moves}</span>
      {completed ? (
        <span className="inline-flex items-center gap-2 text-sm font-black text-emerald-700">
          <Trophy size={16} aria-hidden="true" />
          Concluido
        </span>
      ) : (
        <span className="text-sm font-bold text-slate-500">Em andamento</span>
      )}
    </div>
  );
}

function EmptyGame({ icon: Icon, text }) {
  return (
    <div className="mt-5 flex min-h-72 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-sky-700">
          <Icon size={28} aria-hidden="true" />
        </div>
        <p className="text-sm font-bold text-slate-600">{text}</p>
      </div>
    </div>
  );
}
