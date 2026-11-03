# Continuar o desenvolvimento em outro PC

Este guia considera Windows e PowerShell. O GitHub armazena o código do projeto; o `.env`, os ambientes de execução e os bancos locais não acompanham o repositório.

## 1. Instalar os requisitos

- Git.
- Node.js 22.13 ou superior.
- Python 3.12 ou superior, disponível no terminal como `python`.
- PostgreSQL, incluindo os utilitários de linha de comando (`initdb`, `pg_ctl`, `createdb`, `pg_dump` e `pg_restore`).

## 2. Clonar e instalar o projeto

Execute no PowerShell:

```powershell
git clone https://github.com/LucasSalles02/ProjetoGuardioesdeSaquarema.git
cd ProjetoGuardioesdeSaquarema

npm.cmd ci
Copy-Item .env.example .env

python -m venv backend/.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
```

Copie o exemplo de ambiente somente na primeira configuração, para não substituir um `.env` já configurado. O uso de `npm.cmd` evita bloqueios de execução de scripts do PowerShell. Não é necessário ativar o ambiente virtual: os scripts do projeto reconhecem `backend/.venv`.

## 3. Preparar o PostgreSQL local isolado

Informe a pasta dos binários PostgreSQL, ajustando o caminho à versão instalada:

```powershell
$env:POSTGRES_BIN = 'C:\Program Files\PostgreSQL\17\bin'
npm.cmd run db:setup:local
npm.cmd run db:migrate
npm.cmd run db:check
```

O setup cria um cluster isolado em `.runtime/postgres-data`, escutando em `127.0.0.1:55432`, e grava uma conexão com senha própria no `.env`. Ele não substitui uma `DATABASE_URL` já configurada. O diretório de dados contém informações persistentes e deve ser preservado.

A variável `$env:POSTGRES_BIN` vale para o terminal atual. Defina-a novamente ao abrir outro terminal ou cadastre `POSTGRES_BIN` nas variáveis de ambiente do usuário no Windows. Como alternativa, disponibilize a distribuição portátil PostgreSQL em `.runtime/postgres/pgsql`, incluindo suas pastas de suporte; os scripts reconhecem esse caminho automaticamente.

Para iniciar ou parar o cluster sem apagar dados:

```powershell
npm.cmd run db:start
npm.cmd run db:stop
```

## 4. Escolher entre banco novo e dados existentes

Os passos anteriores preparam um banco novo. Usuários, senhas, solicitações, progresso e demais registros atuais não são transferidos pelo Git.

Para continuar com os dados do computador anterior, faça um backup do PostgreSQL ativo com `pg_dump` e restaure com `pg_restore` em uma base dedicada e vazia, antes de provisionar o administrador e iniciar a aplicação. Preserve uma cópia do backup e confira a restauração. Transfira o arquivo por um meio privado, sem publicá-lo no GitHub. Use as credenciais locais de cada ambiente, sem colocá-las em argumentos de terminal ou logs.

O SQLite antigo representa o estado anterior à migração e não contém as alterações posteriores no PostgreSQL. Não o use como backup atualizado.

As instruções de operação e validação do banco estão em [backend/README.md](../backend/README.md).

## 5. Provisionar o administrador de um banco novo

Preencha estas variáveis no `.env`, com valores próprios:

```dotenv
GUARDIOES_DE_SAQUAREMA_ADMIN_USERNAME='seu_usuario_admin'
GUARDIOES_DE_SAQUAREMA_ADMIN_PASSWORD='SUBSTITUA_POR_UMA_SENHA_PROPRIA'
GUARDIOES_DE_SAQUAREMA_ADMIN_EMAIL='seu_email@example.com'
GUARDIOES_DE_SAQUAREMA_ADMIN_NAME='Seu nome'
```

A senha administrativa exige de 12 a 256 caracteres. O nome de usuário aceita de 3 a 40 letras minúsculas, números, ponto, hífen e sublinhado. O email deve ser exclusivo.

```powershell
npm.cmd run admin:create
```

Remova as credenciais administrativas do `.env` após o provisionamento. Repetir o comando não altera a senha de uma conta existente. Se o banco foi restaurado, utilize as contas e senhas preservadas; o reset de acesso é realizado pelo administrador no painel.

## 6. Executar e verificar

```powershell
npm.cmd run dev
```

Mantenha o terminal aberto. O comando inicia o cluster local quando configurado, aguarda a API e inicia o frontend.

- Sistema: <http://localhost:5173>.
- Login administrativo: <http://localhost:5173/admin/login>.
- Saúde da API: <http://127.0.0.1:3333/api/health>.

Se houver erro de conexão, confira `DATABASE_URL` no `.env`, o caminho `POSTGRES_BIN` e a saída do terminal. Execute `npm.cmd run db:start` e `npm.cmd run db:check` para conferir o banco. O frontend depende da API ativa e da conexão PostgreSQL válida.

Verificações disponíveis:

```powershell
npm.cmd run lint
npm.cmd run test:backend
npm.cmd run build
```

Os testes do backend exigem PostgreSQL e usam schemas isolados. Consulte o README do backend para os requisitos do teste de restauração.

## 7. Alternar o trabalho entre os computadores

Antes de começar, confira se a pasta está sem alterações pendentes e atualize a branch:

```powershell
git status
git pull --ff-only
```

Ao terminar, revise os arquivos que serão enviados e publique as alterações:

```powershell
git status
git add .
git diff --cached --stat
git commit -m "Descrição das alterações"
git push
```

Se houver alterações locais antes do `pull`, salve-as em um commit ou guarde-as com `git stash` antes de atualizar. Se o Git informar que não pode avançar com `--ff-only`, revise a divergência entre os commits antes de integrar as mudanças.

O Git sincroniza o código. Os bancos locais de cada computador são independentes e não são sincronizados automaticamente. Após receber novas migrações, execute `npm.cmd run db:migrate` antes de continuar.

Nunca versione `.env`, backups ou dados de usuários. As exclusões correspondentes já estão no `.gitignore` do projeto.
