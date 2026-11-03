# Backend Python e PostgreSQL

A API ativa usa **Python 3.12+, FastAPI, Uvicorn e Psycopg 3**, mantendo os endpoints `/api`, os envelopes JSON em português e os tokens Bearer existentes. O frontend continua em React/JavaScript. As dependências resolvidas estão fixadas em `requirements-lock.txt`; FastAPI gerencia HTTP e ciclo de vida, Psycopg executa SQL parametrizado em transações. Não foi introduzido ORM.

Referências das bibliotecas: [FastAPI](https://fastapi.tiangolo.com/advanced/events/) e [Psycopg](https://www.psycopg.org/psycopg3/docs/basic/transactions.html).

## Estado da transição

- O backend padrão já é Python/PostgreSQL; Node/SQLite está disponível somente como legado explícito e referência dos testes de paridade.
- Foram importados e conferidos os registros das 12 tabelas de negócio existentes, preservando IDs, hashes, sessões, XP, conclusões e sessões de jogo em andamento.
- O SQLite original permanece em `backend/data/ecomar.sqlite`. A cópia consistente utilizada na importação fica em `backend/data/backups/`.
- A curva antiga de XP e o limite histórico de 80 atividades foram preservados nesta migração de tecnologia. EV02 e EV03 continuam pendentes no plano; não foram misturados à transição.
- A etapa posterior de controle administrativo acrescentou o perfil `GESTOR_ESCOLAR` e cadastro/consulta/desativação pelo administrador. Escolas, turmas institucionais e funções específicas de gestor continuam para uma próxima etapa.

## Preparar outro ambiente

Instale Python 3.12 ou superior e PostgreSQL. Crie um ambiente Python e instale o lockfile:

```sh
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
```

Em Linux/macOS, use `backend/.venv/bin/python`. O launcher procura `GUARDIOES_PYTHON`, depois o ambiente virtual e, no Windows, o runtime portátil local; caso contrário usa `python`/`python3` do sistema.

Configure uma base PostgreSQL dedicada em `.env`:

```dotenv
DATABASE_URL=postgresql://USUARIO:SENHA@127.0.0.1:55432/guardioes
HOST=127.0.0.1
PORT=3333
```

Os valores acima são marcadores, não credenciais reais. Não use prefixo `VITE_` para a conexão. A API exige PostgreSQL e falha claramente se a conexão estiver ausente; não há fallback silencioso para SQLite.

## Instância local isolada deste workspace

Foi preparado um runtime Python portátil oficial e um cluster PostgreSQL 17.11 em `.runtime/`, ignorados pelo Git. Nenhum serviço Windows ou instalação global foi criado. O cluster escuta somente `127.0.0.1:55432`, usa senha aleatória e autenticação SCRAM. A conexão está no `.env` local; a configuração auxiliar está em `.runtime/local-postgres.json`. Os segredos não são impressos.

`.runtime/postgres-data` contém o banco persistente local: não é cache descartável. Faça backup antes de mover ou remover esse diretório.

```sh
npm run db:start
npm run db:check
npm run dev
```

`npm run dev` inicia esse cluster se a conexão local estiver selecionada, depois a API Python e o Vite. O health check precisa confirmar Python e PostgreSQL antes de o frontend iniciar. `npm run db:stop` encerra o cluster; não apaga dados.

Para reconstruir uma instância local em outra máquina Windows, disponibilize os binários PostgreSQL em `.runtime/postgres/pgsql/bin` ou defina `POSTGRES_BIN` e execute `npm run db:setup:local`. Obtenha-os pela [distribuição indicada pelo PostgreSQL](https://www.postgresql.org/download/windows/). O setup cria uma senha própria e grava `DATABASE_URL` apenas se não houver uma conexão configurada. Os binários e pacotes de `.runtime/` não acompanham o repositório. O script usa caminhos curtos do Windows para evitar falhas do bootstrap em diretórios com acentos.

## Migrar a origem SQLite

Importe **antes de iniciar a API em uma base nova**: a inicialização da API sem dados cria conteúdo inicial, e o importador recusa mesclar bases não vazias.

```sh
npm run db:migrate
npm run db:import:sqlite -- --dry-run
npm run db:import:sqlite
```

Para outra origem: `npm run db:import:sqlite -- --source CAMINHO_DO_SQLITE`.

O importador abre a origem em modo somente leitura, faz uma cópia consistente com a API de backup SQLite (incluindo WAL confirmado), verifica integridade e grava tudo em uma transação PostgreSQL. Cada tabela é conferida por conteúdo, não somente quantidade. Em erro, toda a importação é revertida. Uma importação idêntica é reconhecida por digest e não duplica registros. Uma base com dados diferentes é recusada sem sobrescrita. O modo `--dry-run` cria a cópia de segurança e mostra contagens, mas não grava no PostgreSQL.

Migrações SQL versionadas ficam em `python/migrations`; o banco registra nome e checksum em `schema_migrations`. Arquivos já aplicados não devem ser alterados: crie uma nova migração. Papéis desconhecidos não são rebaixados automaticamente na inicialização da API Python.

A migração `002_user_management.sql` acrescenta situação ativa, data de desativação e os três papéis permitidos. Contas existentes permanecem ativas, com IDs, dados e progresso preservados.

## Administração e execução

Os comandos anteriores permanecem disponíveis, agora chamando Python:

```sh
npm run admin:create
npm run dev:backend
npm run dev:frontend
```

As variáveis `GUARDIOES_DE_SAQUAREMA_ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_EMAIL` e `ADMIN_NAME` são lidas com o mesmo prefixo; os aliases `ECOMAR_ADMIN_*` continuam válidos. O provisionamento do administrador inicial é idempotente, exige senha de 12–256 caracteres e não promove uma conta comum por email. O reset por CLI foi desabilitado: contas existentes são resetadas exclusivamente pelo fluxo autenticado de administrador, retornando ao CPF cadastrado. PBKDF2 legado e scrypt continuam verificáveis, sem solicitar senhas aos usuários durante a importação.

Rotas do frontend preservadas: `/login`, `/cadastro`, `/admin/login`, `/admin/dashboard` e `/gestao`. O health check `/api/health` inclui `runtime: python` e `database: postgresql`, com consulta real ao banco.

## Gerenciamento administrativo de usuários

Em `/admin/dashboard`, o administrador pode listar/buscar usuários, filtrar por perfil/situação, consultar detalhes, editar dados, confirmar desativação e resetar o acesso. O cadastro possui tela própria em `/admin/usuarios/novo`; a edição fica em `/admin/usuarios/{id}/editar`. Os formulários exigem nome, usuário único, email único, perfil, CPF único de 11 dígitos e data de nascimento válida em `DD/MM/AAAA`. O CPF é armazenado sem pontuação e com zeros à esquerda preservados; a data é um `DATE` no PostgreSQL, serializado em formato brasileiro nas APIs administrativas. A validação de CPF cobre o formato solicitado de 11 dígitos, sem consulta externa.

Não se define senha no cadastro nem na edição administrativa; tentativas de enviar campos de senha são recusadas. A senha inicial é o CPF, armazenado com hash scrypt, e `must_change_password` restringe o acesso até o titular criar sua nova senha. A nova senha exige 8–256 caracteres (12 no mínimo para ADMIN), confirmação e valor diferente do CPF. A conclusão invalida os tokens iniciais e emite uma nova sessão. CPF pode identificar a conta nos dois logins; email e usuário anteriores continuam aceitos nos respectivos fluxos. O cadastro não substitui a sessão do administrador.

Endpoints protegidos exclusivamente para administradores ativos:

| Método e rota | Operação |
| --- | --- |
| `GET /api/admin/users` | Listar contas, perfis e situação |
| `GET /api/admin/users/{id}` | Consultar detalhes sem dados de senha |
| `POST /api/admin/users` | Cadastrar usuário com um dos três perfis |
| `PATCH /api/admin/users/{id}` | Editar dados cadastrais, sem definir senha |
| `POST /api/admin/users/{id}/reset-password` | Retornar a senha inicial ao CPF e exigir troca |
| `PATCH /api/admin/users/{id}/deactivate` | Desativar conta e revogar todas as sessões |

Desativar preserva usuário, histórico, conquistas e progresso. A conta não pode entrar por nenhum dos logins nem usar tokens anteriores. O servidor verifica também a situação ativa a cada operação. Não é permitido desativar a própria conta administrativa; operações concorrentes de administradores são serializadas para manter ao menos um administrador ativo. O comando de provisionamento/reset não reativa contas desativadas. A confirmação da interface não substitui essas verificações no backend.

Edição e reset exigem administrador ativo com senha já definida. A própria conta administrativa não pode ser rebaixada por seu titular. Alteração de CPF/email/usuário/perfil revoga sessões; mudar CPF durante o primeiro acesso pendente também atualiza a senha inicial para o novo CPF. Depois de uma senha pessoal definida, editar CPF não altera essa senha. Reset não reativa contas desativadas. Contas antigas sem CPF/nascimento não são modificadas automaticamente: complete os dados antes de resetar. Edição de cadastro pelo antigo `/account/profile` é recusada, inclusive para administradores: use as rotas de administração. A alteração voluntária da própria senha, com senha atual, permanece separada do reset administrativo.

As migrações `003_cpf_first_access.sql` e `004_registration_requests.sql` adicionam CPF, nascimento, troca obrigatória e fila de solicitações, preservando dados e senhas existentes. Reativação, exclusão definitiva, vínculos institucionais e funções específicas de Gestão Escolar continuam fora desta etapa.

## Solicitações externas e primeiro acesso

`POST /api/auth/register` recebe dados sem senha e retorna **202 PENDING**, sem conta e sem token. A tela `/cadastro` informa que, após validação, a primeira senha será o CPF. Solicitações públicas sempre resultam em Aluno: campos de privilégio enviados pelo navegador não promovem ninguém. Pedidos com CPF/email/usuário já registrados ou pendentes são recusados.

A aba **Solicitações de cadastro** permite analisar dados, aprovar ou recusar, com motivo opcional. A aprovação cria uma única conta com senha inicial CPF e troca obrigatória; repetições e concorrência não duplicam usuários. Recusa preserva o pedido, sem criar conta; um novo pedido pode ser apresentado depois. Não há envio de email automático nesta etapa.

| Método e rota | Acesso |
| --- | --- |
| `GET /api/admin/registration-requests` | Administrador: listar solicitações e decisões |
| `POST /api/admin/registration-requests/{id}/approve` | Administrador: aprovar pedido |
| `POST /api/admin/registration-requests/{id}/reject` | Administrador: recusar pedido |
| `POST /api/auth/first-access/password` | Titular com sessão inicial restrita: definir sua senha |

Uma sessão com troca pendente só pode consultar `/auth/me`, sair ou definir sua senha inicial. As APIs educativas e administrativas retornam 403 até a conclusão. O frontend redireciona para `/primeiro-acesso`, mas a restrição é aplicada também no servidor. Reset e edição não ficam disponíveis nessa sessão inicial.

Validação da evolução de CPF e solicitações: **49 testes Python/PostgreSQL aprovados**, com aprovação/recusa, primeiro acesso restrito, troca obrigatória, edição e reset exclusivos da administração, CPF de 11 dígitos, datas brasileiras, revogação e preservação dos dados. Após os ajustes finais nos dados opcionais de escola/turma, os 20 testes desses fluxos foram executados novamente. Lint e build aprovados. As migrações foram aplicadas no banco local preservando contas, hashes, perfis e total de XP. Login administrativo existente, listagem e fila de solicitações foram conferidos pelo Vite; novas solicitações e usuários de teste ficaram em schemas temporários. A entrega do HTML das novas rotas foi validada; a navegação visual completa não foi repetida nesta etapa.

## Segurança transacional e operação

Cada requisição usa uma conexão e uma transação. Operações autenticadas serializam o acesso por usuário; recompensas repetidas/concorrentes não são concedidas duas vezes. Sessões duram oito horas e o perfil atual é verificado no banco. A API mantém o limite de 30 tentativas por IP em 15 minutos, local ao processo. Em produção com múltiplos workers, o contador precisa ser compartilhado antes de depender desse limite como proteção distribuída.

O Vite ignora os diretórios de runtime/dados no watcher e bloqueia acesso HTTP a `.runtime`, `.env`, ambientes virtuais e SQLite/backups. Isso evita tanto o erro de watcher em DLLs quanto a exposição dos arquivos locais. Logs da API não registram corpo, senhas, tokens nem URL de conexão.

O usuário do cluster isolado é proprietário para permitir migrações e testes. Para publicação, use credenciais e permissões de aplicação adequadas, backups periódicos e a configuração de operação prevista em EV15. A configuração local não representa uma implantação de produção.

## Testes e backup

```sh
npm run test:backend
npm run test:backend:legacy
npm run lint
```

Os testes Python usam **PostgreSQL real** em schemas aleatórios isolados, nunca truncam as tabelas públicas e não exigem reset do banco do projeto. `TEST_DATABASE_URL` pode apontar para um banco de testes dedicado. O teste de restauração cria e remove somente uma base com nome aleatório `test_restore_*`; esse teste exige permissão de criar base e os clientes `pg_dump`/`pg_restore` em `POSTGRES_BIN` ou no runtime local. Se esses binários não existirem, o teste informa explicitamente a razão da omissão.

Cobertura: autenticação, credenciais inválidas, duplicidade, logout, expiração, autorização, conteúdo, missões, aulas, conquistas, jogos, concorrência, PBKDF2, provisionamento/reset administrativo, importação idempotente, recusa de destino ocupado, rollback de erro, paridade de dez respostas de consulta com Node, inicialização HTTP e restauração de backup PostgreSQL.

Validação local concluída em 3 de novembro de 2026: **29 testes Python/PostgreSQL e 18 testes Node legados aprovados**, lint e compilação do frontend aprovados. O teste de restauração executou sem omissão. API direta e proxy do Vite responderam 200, inclusive em consultas autenticadas com sessão importada. Foram importados 3 usuários, 7 sessões, 6 atividades, 4 missões, 5 módulos, 15 aulas, 2 jogos de catálogo e os registros de conclusões, conquistas e jogos em andamento, sem criar contas de teste no banco real.

Avisos não bloqueantes observados: depreciação da integração `httpx`/TestClient na versão instalada do Starlette e base Browserslist antiga no build. As execuções passaram; esses avisos não foram ocultados. A homologação visual no navegador e a operação de produção não fazem parte dessa validação técnica.

Para backups de operação, use `pg_dump` e valide `pg_restore` em uma base separada. Informe a senha por ambiente/arquivo protegido, não em argumentos de terminal ou logs. O teste de restauração confere o conteúdo de todas as tabelas de negócio após o roundtrip.

## Reversão controlada

`npm run backend:legacy` inicia explicitamente a API Node/SQLite na mesma porta, depois de encerrar a API Python. Os testes antigos continuam em `backend/test` e o código antigo em `backend/src` como referência de transição.

Os antigos caminhos `backend/server.js` e `backend/createAdmin.js` são launchers de compatibilidade para Python. Os entrypoints Node/SQLite foram movidos para `backend/legacy/` para evitar gravações acidentais na origem ao usar os comandos conhecidos.

O SQLite preservado representa o estado da troca. **Novas gravações no PostgreSQL não são replicadas para ele.** Após essas gravações, voltar ao legado exige reconciliação/exportação planejada para não perder os dados novos. Não execute ambos disputando a porta 3333 e não trate a cópia SQLite como backup atualizado do PostgreSQL.

## Estrutura

```text
backend/
  run.py, manage.py
  requirements.txt, requirements-lock.txt
  python/
    migrations/001_initial.sql
    gds/
      app.py, routes.py, service.py
      database.py, import_sqlite.py, admin.py
      config.py, security.py, games.py, validation.py, time.py, errors.py
      data/seed.json, mission_validation.json
  tests/                        # suíte Python/PostgreSQL ativa
  src/, test/, legacy/           # legado Node/SQLite explícito
  server.js, createAdmin.js      # launchers compatíveis para Python
  data/ecomar.sqlite, backups/   # origem preservada e cópias locais
```
