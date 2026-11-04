# Continuar o desenvolvimento em outro PC

Este guia considera Windows e PowerShell. O GitHub armazena o código do projeto; o `.env`, os ambientes de execução e os bancos locais não acompanham o repositório.

O outro computador pode começar sem PostgreSQL configurado. Instale os requisitos abaixo antes de iniciar a API. Não copie `.runtime/postgres-data`, `.venv`, `node_modules` ou o `.env` deste computador para o clone novo: recrie o ambiente com seus próprios caminhos e credenciais. Para levar dados, use backup lógico conforme a seção 4.

## 1. Instalar os requisitos

- Git.
- Node.js 22.13 ou superior.
- Python 3.12 ou superior, disponível no terminal como `python`.
- PostgreSQL, incluindo os utilitários de linha de comando (`initdb`, `pg_ctl`, `createdb`, `pg_dump` e `pg_restore`).

Para instalar PostgreSQL, use a [página oficial para Windows](https://www.postgresql.org/download/windows/), que oferece o instalador EDB e os binários compactados. No instalador, inclua **PostgreSQL Server** e **Command Line Tools**. O pgAdmin é opcional para trabalhar neste projeto; StackBuilder não é necessário para os scripts fornecidos. Anote a pasta instalada, por exemplo `C:\Program Files\PostgreSQL\18\bin`.

O instalador pode criar uma instância Windows na porta 5432. O roteiro abaixo cria uma instância separada do projeto em 55432, sem usar ou alterar o banco dessa instância do instalador. Não informe a senha do usuário `postgres` no Git nem no código.

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

No `.env` local recém-criado, descomente e ajuste `POSTGRES_BIN` para a pasta dos binários PostgreSQL:

```dotenv
POSTGRES_BIN='C:/Program Files/PostgreSQL/18/bin'
```

Antes do primeiro setup, deixe `DATABASE_URL` comentada como no exemplo: o script gera a conexão com senha própria. Depois execute:

```powershell
npm.cmd run db:setup:local
npm.cmd run db:migrate
npm.cmd run db:check
```

O setup cria um cluster isolado em `.runtime/postgres-data`, escutando em `127.0.0.1:55432`, e grava uma conexão com senha própria no `.env`. Ele não substitui uma `DATABASE_URL` já configurada. O diretório de dados contém informações persistentes e deve ser preservado.

Os comandos `db:setup:local`, `db:start`, `db:stop`, `dev` e os comandos do backend leem o `.env`; não é necessário definir novamente o caminho a cada terminal. Como alternativa, disponibilize a distribuição portátil PostgreSQL em `.runtime/postgres/pgsql`, incluindo suas pastas de suporte; os scripts reconhecem esse caminho automaticamente. Não inicie o projeto com uma versão diferente do PostgreSQL sobre um cluster de dados antigo; use backup/restauração para mudar a versão.

Para iniciar ou parar o cluster sem apagar dados:

```powershell
npm.cmd run db:start
npm.cmd run db:stop
```

## 4. Escolher entre banco novo e dados existentes

Os passos anteriores preparam um banco novo. As migrações `001` a `009` criam também os perfis padrão Administrador, Gestão Escolar e Aluno e as etapas do 2º ao 6º ano. Unidades, turmas, alunos, gestores, vínculos e progresso reais não acompanham o Git e precisam ser cadastrados ou restaurados.

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

Em um banco novo, crie as unidades, os gestores e os alunos pelo administrador. Autorize os gestores nas unidades e atribua unidade/matrícula aos alunos. Não há cadastro público. Administradores e gestores podem abrir Gestão para selecionar uma unidade e organizar turmas e alunos; o gestor só vê as escolas autorizadas para sua conta.

## 6. Executar e verificar

```powershell
npm.cmd run dev
```

Mantenha o terminal aberto. O comando inicia o cluster local quando configurado, aguarda a API e inicia o frontend.

- Sistema: <http://localhost:5173>.
- Login administrativo: <http://localhost:5173/admin/login>.
- Saúde da API: <http://127.0.0.1:3333/api/health>.

Se houver erro de conexão, confira `DATABASE_URL` no `.env`, o caminho `POSTGRES_BIN` e a saída do terminal. Execute `npm.cmd run db:start` e `npm.cmd run db:check` para conferir o banco. O frontend depende da API ativa e da conexão PostgreSQL válida.

Se a porta 3333 estiver ocupada por outra aplicação, altere `PORT` no `.env` para uma porta livre, como 3334. O proxy do frontend acompanha essa configuração. Não copie o valor da conexão deste computador: o novo setup deve gerar a própria `DATABASE_URL`. Sem PostgreSQL disponível é possível executar `npm.cmd run lint` e `npm.cmd run build`; login e funcionalidades dependentes de dados exigem a API e o banco ativos.

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
