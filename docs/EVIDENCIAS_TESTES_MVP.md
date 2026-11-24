# Evidências dos testes do MVP — material para o apêndice

## Identificação da execução

**Data da execução integral** 15/11/2026, horário de Brasília.

**Commit Git histórico testado** `14b423afd4294f0345394bca3e2c5c7e5cd5aa7a`.

**Versão do projeto** 0.1.0.

**Ambiente** execução local isolada no Windows, utilizando dados fictícios e PostgreSQL destinado aos testes. A base exclusiva foi `test_qa_mvp_dabc7389df0a4f6fac0a918afa4a4a84`, com schemas temporários por caso. A base foi removida ao encerrar a validação.

**Início do comando integral** `2026-11-15T17:17:04.341865-03:00`.

**Fim do comando integral** `2026-11-15T17:24:19.873050-03:00`.

**Duração do comando integral** 435,531 segundos. O resumo interno do Pytest registrou 433,42 segundos. Os valores correspondem a medições distintas presentes nos registros originais.

Este arquivo consolida os registros preservados da validação realizada em 15/11/2026. A consolidação documental de 24/11/2026 utiliza esses resultados históricos. Os trechos de terminal são transcrições dos arquivos de evidência originais. Os identificadores Git históricos são mantidos como identificação da execução, mesmo após a limpeza posterior do histórico de `docs`.

## Preparação do ambiente registrada

O diretório de trabalho dos comandos foi `C:\Users\USER\Desktop\PFC`.

A ferramenta de cobertura foi instalada no ambiente Python de testes pelo comando registrado na execução original.

```powershell
C:\Users\USER\Desktop\PFC\backend\.venv\Scripts\python.exe -m pip install pytest-cov
```

A preparação do banco isolado foi iniciada pelo comando original abaixo. O script criou a base exclusiva e encaminhou as credenciais locais por variáveis de ambiente.

```powershell
C:\Users\USER\Desktop\PFC\backend\.venv\Scripts\python.exe C:\Users\USER\Documents\Lucas\qa_run.py preflight
```

Trecho preservado do script que realizou a preparação e o isolamento. As credenciais de conexão não foram incluídas neste registro.

```python
state_path = OUT/'ambiente-isolado.json'
if state_path.exists():
    state = json.loads(state_path.read_text())
else:
    state = {'database':'test_qa_mvp_'+uuid.uuid4().hex}
    with psycopg.connect(database_url(),autocommit=True) as db:
        db.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(state['database'])))
    state_path.write_text(json.dumps(state),encoding='utf-8')
assert state['database'].startswith('test_qa_mvp_') and len(state['database']) == 44
test_url = make_conninfo(database_url(),dbname=state['database'])
env = {**os.environ,'TEST_DATABASE_URL':test_url,'DATABASE_URL':test_url,'PYTHONUTF8':'1','PYTHONIOENCODING':'utf-8','PYTHONUNBUFFERED':'1','COVERAGE_FILE':str(OUT/'coverage.data')}
```

Antes do congelamento final, as dependências do frontend foram reinstaladas pelo comando original a seguir.

```powershell
npm.cmd ci --ignore-scripts
```

Saída original da instalação final.

```text

added 223 packages, and audited 225 packages in 51s

50 packages are looking for funding
  run `npm fund` for details

2 vulnerabilities (1 moderate, 1 high)

To address all issues (including breaking changes), run:
  npm audit fix --force

Run `npm audit` for details.
```

## Identificação original do commit

Os nomes de autor e responsável foram omitidos deste trecho após a atualização da autoria do repositório para Lucas Salles. O identificador, as datas e a mensagem abaixo são os registros históricos originais.

```text
commit 14b423afd4294f0345394bca3e2c5c7e5cd5aa7a
AuthorDate: Sun Nov 15 17:16:56 2026 -0300
CommitDate: Sun Nov 15 17:16:56 2026 -0300

    Corrige recursos de importacao e dependencias antes da validacao final
```

## Execução integral do Pytest e medição de cobertura

A suíte integral foi executada em um único comando. A cobertura de linhas e ramos foi medida na mesma execução.

```powershell
npm.cmd run test:backend -- -p no:cacheprovider --tb=short --basetemp C:\Users\USER\Documents\Lucas\validacao-mvp\tmp-final-02 --junitxml C:\Users\USER\Documents\Lucas\validacao-mvp\junit-backend.xml --cov=backend/python/gds --cov-branch --cov-report=term-missing --cov-report=xml:C:\Users\USER\Documents\Lucas\validacao-mvp\coverage.xml --cov-report=json:C:\Users\USER\Documents\Lucas\validacao-mvp\coverage.json --cov-report=html:C:\Users\USER\Documents\Lucas\validacao-mvp\cobertura-html
```

O comando foi disparado pelo procedimento original abaixo.

```powershell
C:\Users\USER\Desktop\PFC\backend\.venv\Scripts\python.exe C:\Users\USER\Documents\Lucas\qa_run.py final
```

Registro original de início, fim, duração e código de saída.

```json
{
  "command": [
    "npm.cmd",
    "run",
    "test:backend",
    "--",
    "-p",
    "no:cacheprovider",
    "--tb=short",
    "--basetemp",
    "C:\\Users\\USER\\Documents\\Lucas\\validacao-mvp\\tmp-final-02",
    "--junitxml",
    "C:\\Users\\USER\\Documents\\Lucas\\validacao-mvp\\junit-backend.xml",
    "--cov=backend/python/gds",
    "--cov-branch",
    "--cov-report=term-missing",
    "--cov-report=xml:C:\\Users\\USER\\Documents\\Lucas\\validacao-mvp\\coverage.xml",
    "--cov-report=json:C:\\Users\\USER\\Documents\\Lucas\\validacao-mvp\\coverage.json",
    "--cov-report=html:C:\\Users\\USER\\Documents\\Lucas\\validacao-mvp\\cobertura-html"
  ],
  "start_utc": "2026-11-15T20:17:04.341865+00:00",
  "end_utc": "2026-11-15T20:24:19.873050+00:00",
  "duration_seconds": 435.531,
  "exit_code": 0
}
```

### Saída original completa do terminal do backend

```text

> guardioes-de-saquarema@0.1.0 test:backend
> node --env-file-if-exists=.env scripts/backend.js test -p no:cacheprovider --tb=short --basetemp C:\Users\USER\Documents\Lucas\validacao-mvp\tmp-final-02 --junitxml C:\Users\USER\Documents\Lucas\validacao-mvp\junit-backend.xml --cov=backend/python/gds --cov-branch --cov-report=term-missing --cov-report=xml:C:\Users\USER\Documents\Lucas\validacao-mvp\coverage.xml --cov-report=json:C:\Users\USER\Documents\Lucas\validacao-mvp\coverage.json --cov-report=html:C:\Users\USER\Documents\Lucas\validacao-mvp\cobertura-html

============================= test session starts =============================
platform win32 -- Python 3.15.2, pytest-9.2.0, pluggy-1.7.0
rootdir: C:\Users\USER\Desktop\PFC\backend
configfile: pytest.ini
plugins: anyio-4.16.0, cov-7.1.0
collected 225 items

backend\tests\test_access_profiles.py ...................                [  8%]
backend\tests\test_activity_rewards.py ...................               [ 16%]
backend\tests\test_api.py ...................                            [ 25%]
backend\tests\test_content_icons.py ...........                          [ 30%]
backend\tests\test_guardian_permissions.py .                             [ 30%]
backend\tests\test_highlights.py .......                                 [ 33%]
backend\tests\test_identity_login.py .......                             [ 36%]
backend\tests\test_migration.py .........                                [ 40%]
backend\tests\test_progression.py ....................                   [ 49%]
backend\tests\test_registration.py .......                               [ 52%]
backend\tests\test_restore.py .                                          [ 53%]
backend\tests\test_role_onboarding.py ............                       [ 58%]
backend\tests\test_school_context.py .........                           [ 62%]
backend\tests\test_school_deactivation.py ...........                    [ 67%]
backend\tests\test_school_management.py .................                [ 75%]
backend\tests\test_school_transfers.py ...............                   [ 81%]
backend\tests\test_schools.py .....................                      [ 91%]
backend\tests\test_startup.py .                                          [ 91%]
backend\tests\test_temporary_credentials.py ......                       [ 94%]
backend\tests\test_user_management.py .............                      [100%]

============================== warnings summary ===============================
backend\.venv\Lib\site-packages\fastapi\testclient.py:1
  C:\Users\USER\Desktop\PFC\backend\.venv\Lib\site-packages\fastapi\testclient.py:1: StarletteDeprecationWarning: Using `httpx` with `starlette.testclient` is deprecated; install `httpx2` instead.
    from starlette.testclient import TestClient as TestClient  # noqa

-- Docs: https://docs.pytest.org/en/stable/how-to/capture-warnings.html
- generated xml file: C:\Users\USER\Documents\Lucas\validacao-mvp\junit-backend.xml -
=============================== tests coverage ================================
_______________ coverage: platform win32, python 3.15.2-final-0 _______________

Name                                      Stmts   Miss Branch BrPart  Cover   Missing
-------------------------------------------------------------------------------------
backend\python\gds\__init__.py                0      0      0      0   100%
backend\python\gds\access.py                137      9     98     12    91%   45, 57->63, 71->exit, 87, 96, 98, 100, 110, 112, 118, 122, 140->142
backend\python\gds\admin.py                  32      4     12      4    82%   17, 19, 22, 32
backend\python\gds\app.py                   105      7     14      0    94%   52-53, 115-120
backend\python\gds\config.py                 12      4      2      0    57%   15-18
backend\python\gds\content_icons.py           8      0      4      0   100%
backend\python\gds\daily_missions.py         32      1     14      1    96%   26
backend\python\gds\database.py               29      1      8      1    95%   21
backend\python\gds\errors.py                  7      0      0      0   100%
backend\python\gds\games.py                  70      5     26      5    90%   30, 33, 35, 37, 72
backend\python\gds\highlights.py            103      4     42      0    97%   81-82, 90-91
backend\python\gds\identity.py               28      1     10      1    95%   31
backend\python\gds\import_sqlite.py          91      5     44      6    92%   31, 77->75, 85, 87, 89, 102
backend\python\gds\onboarding.py             36      1     14      1    96%   32
backend\python\gds\progression.py            13      0      0      0   100%
backend\python\gds\routes.py                 45      1     32      1    97%   117
backend\python\gds\school_management.py     175     14     86     11    90%   29, 33, 36, 38, 49, 147, 154-155, 158, 164-166, 172, 177
backend\python\gds\schools.py               142      8     66      6    93%   14-15, 27, 49, 72, 81, 145, 167
backend\python\gds\security.py               36      4     10      4    83%   39, 52, 54, 56
backend\python\gds\service.py               359     17    116     13    94%   71, 82->92, 88-89, 90->92, 111-112, 132, 154, 157, 169, 256, 296, 398, 400, 408, 461-462, 464
backend\python\gds\time.py                   13      0      0      0   100%
backend\python\gds\transfers.py             120     10     44     11    87%   15, 22, 24, 37, 82, 100, 102, 110, 114, 130, 139->141
backend\python\gds\user_management.py       144     13     70     12    87%   45, 51, 60, 69, 76, 86, 94, 115, 126-127, 149, 164, 170
backend\python\gds\validation.py             32      2     16      2    92%   14, 31
-------------------------------------------------------------------------------------
TOTAL                                      1769    111    728     91    92%
Coverage HTML written to dir C:\Users\USER\Documents\Lucas\validacao-mvp\cobertura-html
Coverage XML written to file C:\Users\USER\Documents\Lucas\validacao-mvp\coverage.xml
Coverage JSON written to file C:\Users\USER\Documents\Lucas\validacao-mvp\coverage.json
================= 225 passed, 1 warning in 433.42s (0:07:13) ==================
```

## Resultados registrados

A execução integral do backend compreendeu **225 casos automatizados parametrizados**, distribuídos em **20 módulos**, com **225 aprovações, nenhuma reprovação, nenhum erro e nenhum teste ignorado**. O código de saída foi 0. A duração total do comando foi **435,531 segundos**.

A cobertura medida foi de **93,73% das linhas executáveis** e **86,68% dos ramos**. Foram executadas 1658 de 1769 linhas e 631 de 728 ramos. O índice combinado de linhas e ramos foi de **91,67%**, exibido de forma arredondada como 92% na tabela do terminal. A instrumentação abrangeu o pacote `backend/python/gds`.

O terminal registrou uma advertência de depreciação do uso de httpx com Starlette TestClient. Essa advertência consta integralmente na transcrição acima.

### Casos por módulo

| Arquivo de testes | Casos aprovados |
| --- | --- |
| `test_access_profiles.py` | 19 |
| `test_activity_rewards.py` | 19 |
| `test_api.py` | 19 |
| `test_content_icons.py` | 11 |
| `test_guardian_permissions.py` | 1 |
| `test_highlights.py` | 7 |
| `test_identity_login.py` | 7 |
| `test_migration.py` | 9 |
| `test_progression.py` | 20 |
| `test_registration.py` | 7 |
| `test_restore.py` | 1 |
| `test_role_onboarding.py` | 12 |
| `test_school_context.py` | 9 |
| `test_school_deactivation.py` | 11 |
| `test_school_management.py` | 17 |
| `test_school_transfers.py` | 15 |
| `test_schools.py` | 21 |
| `test_startup.py` | 1 |
| `test_temporary_credentials.py` | 6 |
| `test_user_management.py` | 13 |
| **Total** | **225** |

## Verificações complementares do frontend

Foram aprovados três testes de funções de permissão, a compilação de produção e a análise estática com ESLint. Os comandos e registros a seguir foram executados separadamente da suíte integral Pytest.

### Testes de funções de permissão

Comando original.

```powershell
node --test --test-reporter=tap frontend/tests/permissions.test.js
```

Registro original da execução.

```json
{
  "command": [
    "node",
    "--test",
    "--test-reporter=tap",
    "frontend/tests/permissions.test.js"
  ],
  "start_utc": "2026-11-15T20:24:19.876331+00:00",
  "end_utc": "2026-11-15T20:24:20.138228+00:00",
  "duration_seconds": 0.262,
  "exit_code": 0
}
```

Saída original do terminal.

```text
TAP version 13
# Subtest: permissões exigem concessão explícita
ok 1 - permissões exigem concessão explícita
  ---
  duration_ms: 1.178
  type: 'test'
  ...
# Subtest: administrador pode delegar operações escolares aos gestores
ok 2 - administrador pode delegar operações escolares aos gestores
  ---
  duration_ms: 0.2239
  type: 'test'
  ...
# Subtest: rotas de conteúdos e transferências exigem as permissões correspondentes
ok 3 - rotas de conteúdos e transferências exigem as permissões correspondentes
  ---
  duration_ms: 1.0637
  type: 'test'
  ...
1..3
# tests 3
# suites 0
# pass 3
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 142.941
```

### Compilação de produção

Comando original.

```powershell
npm.cmd run build
```

Registro original da execução.

```json
{
  "command": [
    "npm.cmd",
    "run",
    "build"
  ],
  "start_utc": "2026-11-15T20:24:20.139502+00:00",
  "end_utc": "2026-11-15T20:24:28.148872+00:00",
  "duration_seconds": 8.009,
  "exit_code": 0
}
```

Saída original do terminal.

```text

> guardioes-de-saquarema@0.1.0 build
> npm run build --workspace frontend


> @guardioes/frontend@0.1.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 1819 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                            1.10 kB │ gzip:   0.59 kB
dist/assets/index-CBr9PwsE.css            74.97 kB │ gzip:  14.99 kB
dist/assets/SchoolTransfers-CmQdJOaT.js   14.14 kB │ gzip:   4.32 kB
dist/assets/GestaoConteudo-CLcITIF7.js    36.84 kB │ gzip:  10.40 kB
dist/assets/index-CK_-RfaE.js            469.18 kB │ gzip: 130.95 kB
✓ built in 5.44s
```

### Análise estática com ESLint

Comando original.

```powershell
npm.cmd run lint
```

Registro original da execução.

```json
{
  "command": [
    "npm.cmd",
    "run",
    "lint"
  ],
  "start_utc": "2026-11-15T20:24:28.150514+00:00",
  "end_utc": "2026-11-15T20:24:30.923194+00:00",
  "duration_seconds": 2.772,
  "exit_code": 0
}
```

Saída original do terminal.

```text

> guardioes-de-saquarema@0.1.0 lint
> npm run lint --workspace frontend


> @guardioes/frontend@0.1.0 lint
> eslint .
```

## Ambiente efetivamente registrado

```json
{
  "python": "3.15.2 (tags/v3.15.2:5e58eaa, Oct 25 2026, 17:27:03) [MSC v.1951 64 bit (AMD64)]",
  "platform": "win32",
  "database": "test_qa_mvp_dabc7389df0a4f6fac0a918afa4a4a84",
  "commit": "14b423afd4294f0345394bca3e2c5c7e5cd5aa7a",
  "version": "0.1.0",
  "postgresql": "PostgreSQL 18.6 on x86_64-windows, compiled by msvc-19.44.35229, 64-bit",
  "packages": [
    "annotated-doc==0.0.5",
    "annotated-types==0.8.0",
    "anyio==4.16.0",
    "certifi==2026.10.23",
    "click==8.5.0",
    "colorama==0.4.6",
    "coverage==7.17.3",
    "fastapi==0.162.0",
    "h11==0.16.0",
    "httpcore==1.0.9",
    "httpx==0.28.1",
    "idna==3.20",
    "iniconfig==2.3.1",
    "opentelemetry-api==1.45.2",
    "packaging==26.3",
    "pillow==13.0.0",
    "pluggy==1.7.0",
    "psycopg==3.3.7",
    "psycopg-binary==3.3.7",
    "pydantic==2.14.2",
    "pydantic_core==2.50.2",
    "Pygments==2.21.0",
    "pypdf==6.21.4",
    "pytest==9.2.0",
    "pytest-cov==7.1.0",
    "python-dotenv==1.2.4",
    "starlette==1.10.0",
    "typing-inspection==0.4.4",
    "typing_extensions==4.16.0",
    "tzdata==2026.6",
    "uvicorn==0.54.0"
  ],
  "node": "v26.13.0",
  "npm": "11.20.0"
}
```

## Limites e uso das evidências no apêndice

Os resultados referem-se à versão e à data identificadas neste arquivo. A contagem de 225 casos provém da execução integral final e do JUnit original. Os três testes do frontend foram contabilizados separadamente. A validação visual no navegador, acessibilidade, compatibilidade, usabilidade e desempenho não foram aprovados por esta execução. A instalação registrou dois alertas de dependências, apresentados na saída original.

As transcrições completas do backend, da instalação final e das verificações do frontend estão reunidas neste arquivo. Ele constitui o arquivo único de evidências disponível em `docs/EVIDENCIAS_TESTES_MVP.md` no repositório. Os caminhos de saída impressos pelo terminal são os caminhos históricos utilizados no laboratório em 15/11/2026.

## Correspondência após a limpeza do histórico de docs

O commit histórico testado será relacionado abaixo ao identificador equivalente obtido após a remoção de `docs` do histórico. A verificação de correspondência compara os arquivos externos a `docs` entre cada commit original e seu equivalente reescrito.

**Commit equivalente após a limpeza de docs e a atualização da autoria** `d939e7cc0af49a974ed4ea723d75543c9b03e543`.

Foram comparados os arquivos externos a `docs` em todos os 9 commits reescritos. Os hashes dos arquivos externos a essa pasta permaneceram equivalentes em cada versão correspondente. A limpeza posterior não constitui uma nova execução de testes.
