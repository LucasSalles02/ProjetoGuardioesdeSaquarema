# Guardiões de Saquarema

Plataforma de educação ambiental com missões, trilhas de aprendizagem, jogos, conquistas e gestão de conteúdo. Frontend: React com JavaScript, React Router, Vite e Tailwind. Backend ativo: **Python, FastAPI e PostgreSQL**, com Psycopg e sem ORM. Requer Node.js **22.13+** para as ferramentas do frontend e Python **3.12+** para a API.

## Direção de evolução

A documentação acadêmica fornecida pelo usuário orienta as próximas entregas. O [plano de evolução](docs/PLANO_DE_EVOLUCAO.md) compara os 20 requisitos funcionais e as 20 regras de negócio com o código, organiza as lacunas por prioridade e registra critérios de aceite. O frontend permanece em React/JavaScript. A transição técnica para Python/PostgreSQL foi aplicada; Gestão Escolar Unificada e a nova progressão de dez níveis continuam no backlog.

## Executar

No workspace atual, a instância PostgreSQL local e a importação já foram preparadas. Para instalar em outra máquina, siga primeiro a [configuração do backend e importação](backend/README.md), incluindo as dependências Python e `DATABASE_URL`.

```sh
npm ci
npm run dev
```

No PowerShell com scripts bloqueados, use `npm.cmd` em vez de `npm`. O comando `dev` inicia a API, aguarda `/api/health` e inicia o Vite. A interface fica normalmente em http://localhost:5173 e a API em http://127.0.0.1:3333. Mantenha o terminal aberto.

Serviços separados: `npm run dev:backend` e `npm run dev:frontend`. Verificações: `npm run lint`, `npm run test:backend` e `npm run build`. O build gera `dist/`, que deve permanecer fora do versionamento. `npm run preview` não substitui a configuração de produção.

## Ambiente

Copie `.env.example` para `.env` se precisar alterar os padrões. Nunca versione `.env` nem coloque segredos em variáveis com prefixo `VITE_`.

| Variável | Uso |
| --- | --- |
| `PORT` | Porta da API; padrão `3333` |
| `HOST` | Endereço de escuta da API; padrão `127.0.0.1` |
| `API_PROXY_TARGET` | Destino alternativo do proxy `/api` do Vite |
| `DATABASE_URL` | Conexão PostgreSQL da API Python |
| `GUARDIOES_PYTHON` | Executável Python alternativo, opcional |
| `VITE_API_URL` | Base da API no navegador; padrão `/api` |

O proxy usa IPv4 explícito e acompanha `PORT`. Em produção, publique `dist/` com fallback para `index.html` e encaminhe `/api` à API por HTTPS.

## Administrador

Defina valores próprios no ambiente local para `GUARDIOES_DE_SAQUAREMA_ADMIN_USERNAME`, `GUARDIOES_DE_SAQUAREMA_ADMIN_PASSWORD`, `GUARDIOES_DE_SAQUAREMA_ADMIN_EMAIL` e, opcionalmente, `GUARDIOES_DE_SAQUAREMA_ADMIN_NAME`.

O usuário aceita 3 a 40 letras minúsculas, números, ponto, hífen e sublinhado. A senha exige 12 a 256 caracteres. O email deve ser exclusivo.

Execute `npm run admin:create` somente para provisionar o administrador inicial. Repetir o comando não duplica a conta nem altera sua senha. O reset de contas existentes é realizado pelo administrador no painel: retorna ao CPF cadastrado, revoga sessões e exige uma nova senha no primeiro acesso. O antigo reset por variável de ambiente foi desabilitado. Remova as credenciais do ambiente após o provisionamento inicial.

No painel `/admin/dashboard`, as abas **Usuários** e **Solicitações de cadastro** organizam a administração. O formulário de cadastro fica em `/admin/usuarios/novo`, e a edição em `/admin/usuarios/:userId/editar`. O administrador pode cadastrar, consultar, editar, desativar e resetar o acesso de Aluno (`USER`), Gestor Escolar (`GESTOR_ESCOLAR`) e Administrador (`ADMIN`). CPF de 11 dígitos e nascimento em `DD/MM/AAAA` são obrigatórios nos novos cadastros. O formulário não permite definir senhas: a primeira senha é o CPF, com troca obrigatória em `/primeiro-acesso`, antes de acessar qualquer funcionalidade.

O cadastro público em `/cadastro` envia uma solicitação, sem criar conta nem sessão. Após aprovação administrativa, é criada uma conta de Aluno com senha inicial igual ao CPF; a página informa esse fluxo. Edição de dados cadastrais e reset são exclusivos da administração. A desativação e o reset revogam sessões sem apagar histórico. Contas antigas mantêm suas senhas; complete CPF e nascimento na edição antes de resetar. As funções específicas de Gestão Escolar permanecem para uma próxima etapa.

## Dados e compatibilidade

O banco ativo é PostgreSQL, definido por `DATABASE_URL`. O SQLite de origem permanece em `backend/data/ecomar.sqlite`, e a importação criou cópia consistente em `backend/data/backups/`. IDs, hashes de senha, sessões, progresso e histórico foram preservados. Novas gravações vão somente para PostgreSQL.

Os aliases `ECOMAR_ADMIN_*` continuam aceitos quando a variável correspondente `GUARDIOES_DE_SAQUAREMA_*` não está definida. A conexão ativa usa somente `DATABASE_URL`; `ECOMAR_DB_PATH` pertence ao backend legado. O antigo `ECOMAR_ADMIN_EMAILS` não concede privilégios.

A chave persistente `ecomar:auth-token:v1` foi preservada para manter sessões existentes. O evento interno de expiração usa o novo nome e está centralizado em `src/config/auth.js`. Dados históricos que possam existir no localStorage não são apagados pela remoção dos módulos locais sem uso.

Novas senhas usam scrypt; hashes PBKDF2 existentes continuam válidos. Sessões expiram em oito horas e são revogadas no logout e na redefinição de senha. Sem rede, o logout limpa o token local, mas a revogação remota depende da API. O limite de 30 tentativas por IP em 15 minutos permanece local ao processo.

As contas administrativas existentes são preservadas. Revise contas criadas pela versão antiga que promovia automaticamente o primeiro cadastro.

## Organização e validação

As rotas estão em `src/routes`, as páginas em `src/pages`, a tela reutilizável de login em `src/components/LoginScreen.jsx` e a API ativa em `backend/python/gds`. O código Node em `backend/src` é legado explícito para regressão e reversão controlada. Veja [operação, migração e testes do backend](backend/README.md).

Consulte [o relatório técnico](docs/REVISAO_TECNICA.md) para a estrutura anterior e atual, arquivos removidos, decisões de compatibilidade, testes executados e pendências.
