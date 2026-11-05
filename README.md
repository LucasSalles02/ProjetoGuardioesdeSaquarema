# Guardiões de Saquarema

Plataforma de educação ambiental com missões, trilhas de aprendizagem, jogos, conquistas e gestão de conteúdo. Frontend: React com JavaScript, React Router, Vite e Tailwind. Backend ativo: **Python, FastAPI e PostgreSQL**, com Psycopg e sem ORM. Requer Node.js **22.13+** para as ferramentas do frontend e Python **3.12+** para a API.

## Direção de evolução

A documentação acadêmica fornecida pelo usuário orienta as próximas entregas. O [plano de evolução](docs/PLANO_DE_EVOLUCAO.md) compara os 20 requisitos funcionais e as 20 regras de negócio com o código, organiza as lacunas por prioridade e registra critérios de aceite. O frontend permanece em React/JavaScript. A transição para Python/PostgreSQL está aplicada. Perfis e permissões, Unidades Escolares, contexto por sessão, etapas, turmas e vínculos de alunos estão implementados; a curva global de dez níveis ainda consta no plano de evolução.

## Executar

**Em outro PC, inclusive sem PostgreSQL configurado, siga primeiro o [guia completo de instalação](docs/CONFIGURACAO_EM_OUTRO_PC.md).** Ele cobre instalação do banco, ambiente Python, `.env`, migrações e administrador inicial. O GitHub contém o código e as migrações; dados e credenciais locais não são transferidos pelo Git. Consulte também a [operação do backend e importação](backend/README.md).

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

Defina valores próprios no ambiente local para `GUARDIOES_DE_SAQUAREMA_ADMIN_CPF`, `GUARDIOES_DE_SAQUAREMA_ADMIN_PASSWORD`, `GUARDIOES_DE_SAQUAREMA_ADMIN_EMAIL` e, opcionalmente, `GUARDIOES_DE_SAQUAREMA_ADMIN_NAME`.

O usuário aceita 3 a 40 letras minúsculas, números, ponto, hífen e sublinhado. A senha exige 12 a 256 caracteres. O email deve ser exclusivo.

Execute `npm run admin:create` somente para provisionar o administrador inicial. Repetir o comando não duplica a conta nem altera sua senha. O reset de contas existentes é realizado pelo administrador no painel: retorna ao CPF cadastrado, revoga sessões e exige uma nova senha no primeiro acesso. O antigo reset por variável de ambiente foi desabilitado. Remova as credenciais do ambiente após o provisionamento inicial.

No painel `/admin/dashboard`, a listagem centraliza a administração de usuários. O formulário de cadastro fica em `/admin/usuarios/novo`, e a edição abre em uma janela sobre a lista, também acessível em `/admin/usuarios/:userId/editar`. A visualização de dados usa uma janela semelhante. O administrador pode cadastrar, consultar, editar, desativar e resetar o acesso de Aluno (`USER`), Gestor Escolar (`GESTOR_ESCOLAR`) e Administrador (`ADMIN`). CPF de 11 dígitos e nascimento em `DD/MM/AAAA` são obrigatórios nos novos cadastros. O formulário não permite definir senhas: a primeira senha é o CPF, com troca obrigatória em `/primeiro-acesso`, antes de acessar qualquer funcionalidade.

O cadastro de usuários é exclusivo do administrador. `/cadastro` redireciona ao login e `POST /api/auth/register` retorna 403. A validação de solicitações foi removida; novos cadastros administrativos usam CPF como senha inicial com troca obrigatória. Edição de dados cadastrais e reset são exclusivos da administração. A desativação e o reset revogam sessões sem apagar histórico. Contas antigas mantêm suas senhas; complete CPF e nascimento na edição antes de resetar. A Gestão Escolar implementada está descrita em [Gestão de Turmas e Alunos](docs/GESTAO_TURMAS_E_ALUNOS.md).

## Dados e compatibilidade

O banco ativo é PostgreSQL, definido por `DATABASE_URL`. O SQLite de origem permanece em `backend/data/ecomar.sqlite`, e a importação criou cópia consistente em `backend/data/backups/`. IDs, hashes de senha, sessões, progresso e histórico foram preservados. Novas gravações vão somente para PostgreSQL.

Os aliases `ECOMAR_ADMIN_*` continuam aceitos quando a variável correspondente `GUARDIOES_DE_SAQUAREMA_*` não está definida. A conexão ativa usa somente `DATABASE_URL`; `ECOMAR_DB_PATH` pertence ao backend legado. O antigo `ECOMAR_ADMIN_EMAILS` não concede privilégios.

A chave persistente `ecomar:auth-token:v1` foi preservada para manter sessões existentes. O evento interno de expiração usa o novo nome e está centralizado em `src/config/auth.js`. Dados históricos que possam existir no localStorage não são apagados pela remoção dos módulos locais sem uso.

Novas senhas usam scrypt; hashes PBKDF2 existentes continuam válidos. Sessões expiram em oito horas e são revogadas no logout e na redefinição de senha. Sem rede, o logout limpa o token local, mas a revogação remota depende da API. O limite de 30 tentativas por IP em 15 minutos permanece local ao processo.

As contas administrativas existentes são preservadas. Revise contas criadas pela versão antiga que promovia automaticamente o primeiro cadastro.

## Organização e validação

As rotas estão em `src/routes`, as páginas em `src/pages`, a tela reutilizável de login em `src/components/LoginScreen.jsx` e a API ativa em `backend/python/gds`. O código Node em `backend/src` é legado explícito para regressão e reversão controlada. Veja [operação, migração e testes do backend](backend/README.md).

Consulte [o relatório técnico](docs/REVISAO_TECNICA.md) para a estrutura anterior e atual, arquivos removidos, decisões de compatibilidade, testes executados e pendências.

## Perfis de acesso

Em Administração > Gerenciar Usuários e Perfis, a aba **Perfis de acesso** permite consultar Administrador, Gestão Escolar e Aluno, criar perfis personalizados e definir módulos/ações. Atribua o perfil no cadastro ou na edição do usuário. A API verifica as permissões em cada requisição. Consulte [a matriz e as regras de delegação](docs/PERFIS_DE_ACESSO.md); recursos escolares identificados como previstos continuam pendentes.

## Unidades Escolares

Em Administração > Gerenciar Unidades Escolares, cadastre o nome da unidade e autorize seus gestores. O ID é gerado automaticamente. Antes de entrar, o gestor escolhe uma unidade autorizada em `/selecionar-unidade`. A página inicial e o perfil exibem a unidade ativa; o menu do perfil permite trocar para outra unidade vinculada. A seleção é validada pela API e mantida por sessão. Consulte [campos do diagrama e regras de autorização](docs/UNIDADES_ESCOLARES.md).

## Gestão de Turmas e Alunos

O gestor acessa **Gestão > Gestão de Turmas e Alunos** na unidade ativa, cadastra turmas por etapa, vincula/transfere alunos e consulta progresso e consolidados sem editar XP. O administrador define escola e matrícula no cadastro do aluno e mantém as **Etapas Escolares** ao lado de Perfis de acesso, com padrões do 2º ao 6º ano. Consulte [fluxos, autorização e integridade](docs/GESTAO_TURMAS_E_ALUNOS.md).

## Desativação e saída

Unidades Escolares possui abas de ativas e desativadas. Desativar exige confirmação dos efeitos: alunos ficam sem unidade/turma, gestores perdem a autorização e os contextos da unidade são limpos; contas e progresso são preservados. Todo botão **Sair** solicita confirmação em qualquer perfil. XP e nível do perfil suspenso são exibidos somente para Aluno.

Na Gestão de Turmas e Alunos, o Administrador acessa qualquer unidade somente para consulta. Criar/editar turmas e vincular/transferir alunos entre turmas são operações exclusivas do Gestor Escolar, protegidas na API e pela migração `010_admin_classes_read_only.sql`.

XP e conquistas seguem a progressão de dez níveis do relatório atualizado, com nível máximo aos 1.200 XP. Consulte [as regras e a compatibilidade dos dados](docs/XP_NIVEIS_E_CONQUISTAS.md); execute as migrações ao atualizar.

Cadastro e acesso por categoria: alunos usam matrícula no login e como senha temporária; gestores e administradores usam CPF no login e como senha temporária. Veja [cadastro, privacidade e migração de contas existentes](docs/CADASTRO_E_AUTENTICACAO.md).
