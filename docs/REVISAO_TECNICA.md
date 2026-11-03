# Revisão técnica — Guardiões de Saquarema

Revisão realizada em 3 de novembro de 2026. Escopo: limpeza, organização e renomeação, mantendo regras de negócio, rotas, autenticação, banco e apresentação visual.

## Diagnóstico

- Frontend: React 18, React Router 7, Vite 5, Tailwind 3 e lucide-react. JavaScript com módulos ES; não há TypeScript.
- Backend: HTTP, crypto e SQLite nativos do Node; sem Express, ORM ou serviço de banco externo.
- Componentes, páginas, contexto, layouts, cliente REST, jogos e validações já estavam separados de forma útil. Essa arquitetura foi mantida.
- `App.jsx` concentrava providers, rotas e guardas de acesso.
- As telas comum e administrativa de login duplicavam praticamente todo o formulário e a apresentação.
- Três módulos locais sem consumidores ativos duplicavam autenticação e progresso já tratados pela API.
- O backend importava conteúdo inicial diretamente de `src/data`, misturando a propriedade dos dados.
- `dist/` continha HTML, CSS e JavaScript gerados já versionados. `.gitignore` não remove retroativamente arquivos rastreados.
- `Nova pasta.zip` contém uma versão anterior do frontend. Foi inspecionado sem extração e preservado como possível material histórico ou acadêmico.
- As dependências de execução e build possuem uso; os pacotes de tipos auxiliam o editor. Nenhuma dependência foi removida ou atualizada.

## Estrutura anterior e reorganizada

| Antes | Depois |
| --- | --- |
| `src/App.jsx`: providers, rotas e guardas | `src/App.jsx`: providers; `src/routes/AppRoutes.jsx`: rotas; `src/routes/RouteGuards.jsx`: guardas |
| Duas telas com formulário de login completo | `src/components/LoginScreen.jsx` compartilhado; páginas mantidas como adaptadores |
| `src/data/seedData.js`: turmas e conteúdo inicial | `src/data/turmas.js` e `backend/src/data/seedData.js` |
| `backend/src/ecoMarService.js` | `backend/src/guardioesDeSaquaremaService.js` |
| Configuração de ambiente espalhada | `backend/src/config.js`: leitura das variáveis atuais e aliases legados |
| Evento e chave de sessão em serviços/contexto | `src/config/auth.js`: constantes compartilhadas pelo frontend |
| Módulos locais antigos em `src/services` | Removidos após verificar referências |
| Build antigo em `dist/` | Artefatos removidos; regeneráveis com `npm run build` e ignorados pelo Git |

```text
backend/
  createAdmin.js
  server.js
  data/ecomar.sqlite             # dado persistente preservado
  src/
    config.js
    data/seedData.js
    database.js
    guardioesDeSaquaremaService.js
    errors.js, games.js, httpApp.js, security.js, time.js, validators.js
  test/
    api.test.js
    config.test.js
src/
  App.jsx, main.jsx, index.css
  components/                   # inclui LoginScreen, PageShell e Sidebar
  config/auth.js
  context/AuthContext.jsx
  data/turmas.js
  layouts/AppLayout.jsx
  pages/                        # páginas e URLs preservadas
  routes/AppRoutes.jsx, RouteGuards.jsx
  services/api.js, apiClient.js
scripts/dev.js
docs/REVISAO_TECNICA.md
README.md, .env.example, .gitignore
```

## Remoções e renomeações

Removidos `src/services/localData.js`, `src/services/localStore.js` e `src/services/security.js`: a pesquisa de imports mostrou que apenas se referenciavam entre si e não eram usados pelo aplicativo, testes ativos ou scripts. Nenhum dado do navegador foi apagado.

`src/data/seedData.js` foi dividido conforme a responsabilidade dos consumidores, com imports atualizados. Seu conteúdo útil foi preservado.

O serviço foi renomeado para `GuardioesDeSaquaremaService` e a fábrica HTTP para `createGuardioesDeSaquaremaServer`, incluindo os consumidores e testes. O nome npm passou a `guardioes-de-saquarema` no manifesto e lockfile. Título, descrição HTML, textos administrativos, logs, conteúdo de conquistas, identificador do health check e prefixo de diretórios temporários usam o novo nome.

Os artefatos antigos rastreados eram `dist/index.html`, `dist/assets/index-5sw9OnGA.css` e `dist/assets/index-DFNgeVC1.js`. A pasta é descartável e o build gera novos arquivos; as exclusões devem entrar no próximo commit junto com `.gitignore` para encerrar seu rastreamento. Nenhum teste útil, migração ou dado persistente foi removido.

## Compatibilidade intencional

- `backend/data/ecomar.sqlite` conserva o caminho para preservar os dados cadastrados.
- `ecomar:auth-token:v1` conserva a chave no sessionStorage para preservar sessões.
- `ECOMAR_*` aparece nos aliases de configuração, em testes de compatibilidade e na documentação dessas exceções. As variáveis recomendadas usam `GUARDIOES_DE_SAQUAREMA_*`.
- O ZIP histórico e os registros existentes no banco não passaram por substituição textual.
- Não há novas tabelas, funcionalidades, alterações de permissões ou mudanças nas regras de XP.

## Otimizações

Eliminada a duplicação entre as telas de login, mantendo as classes visuais, os campos adequados, mensagens, carregamento e redirecionamentos. A separação das rotas facilita manutenção sem alterar URLs. O backend deixa de depender da árvore de código frontend para carregar seu conteúdo inicial. Foi removido um argumento não utilizado de `persistGameState`, com atualização dos dois consumidores. O cliente HTTP recebeu formatação mais legível sem alterar o tratamento de erros.

Não foram feitas otimizações especulativas de SQL, mudanças de algoritmo ou divisões amplas do serviço de negócio. Essa classe ainda concentra vários domínios e pode ser dividida gradualmente em outro ciclo, com testes de regressão específicos.

## Validação

- `npm ls --depth=0`: dependências instaladas e resolvidas, sem itens ausentes. Uma instalação limpa não foi repetida; não houve mudança na árvore de versões.
- `npm run lint`: aprovado.
- `npm run test:backend`: **18 testes aprovados**, incluindo cadastro, login, credenciais inválidas, duplicidade, logout, autorização, sessão expirada, jogos, progresso, conteúdo administrativo, inicialização real da API, provisionamento com variáveis novas e antigas, precedência de configuração e preservação de usuários, hashes e progresso numa migração temporária.
- `npm run build`: aprovado fora do sandbox. O esbuild não consegue ler os diretórios necessários dentro do sandbox deste ambiente.
- `npm run dev`: API e Vite iniciaram juntos fora do sandbox. A API respondeu com `guardioes-de-saquarema-backend` e o proxy `/api/health` do Vite respondeu **200**.
- `/login`, `/admin/login` e `/admin/dashboard`: entrega HTTP da SPA com **200** e título novo. Isso comprova o fallback e a entrega do HTML, sem substituir a validação de navegação autenticada no navegador.
- Checagem estática de imports relativos: **82 imports relativos em 41 arquivos JavaScript/JSX, sem referências ausentes**.
- Validação visual e navegação autenticada no navegador: não concluídas. O host de acesso ao navegador estava indisponível; a tentativa alternativa foi interrompida porque a ferramenta não conseguiu determinar a URL atual do Chrome com segurança. Não houve novas tentativas de automação da interface após a interrupção.
- Cadastro e login administrativo foram validados pelos testes HTTP em bancos temporários. Nenhuma conta de teste foi criada no banco real do projeto.

## Revisão manual e próximo ciclo

Preservados para revisão manual: `Nova pasta.zip`, pelo valor histórico possível; o banco já versionado, por conter os dados do sistema; e os perfis administrativos criados antes da correção da promoção automática. A remoção do ZIP ou mudança de armazenamento do banco precisa de uma decisão sobre retenção e backup.

Recomenda-se concluir o teste visual local das duas telas de login, do painel e da navegação autenticada; manter os artefatos de build fora dos próximos commits; e planejar separações pequenas dos domínios hoje concentrados no serviço backend. O build avisou que os dados do Browserslist estão antigos; nenhuma atualização foi aplicada nesta revisão.
