// Legacy Node/SQLite entrypoint. Use only for explicit rollback.
import { createGuardioesDeSaquaremaServer } from "../src/httpApp.js";

const port = Number(process.env.PORT || 3333);
const server = createGuardioesDeSaquaremaServer();

server.on("error", (error) => {
  console.error(`Falha ao iniciar API (${error.code}) na porta ${port}.`);
  server.service.close();
  process.exit(1);
});
server.listen(port, process.env.HOST || "127.0.0.1", () => {
  console.log(`Guardiões de Saquarema backend rodando em http://${process.env.HOST || "127.0.0.1"}:${server.address().port}`);
});

function shutdown() {
  server.close(() => {
    server.service.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
