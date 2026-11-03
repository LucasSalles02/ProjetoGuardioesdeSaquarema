# Plano de evolução de Guardiões de Saquarema

## Direção do projeto

A proposta acadêmica passa a orientar a evolução funcional e técnica. O sistema já possui uma base utilizável para o aluno, mas ainda não implementa a Gestão Escolar Unificada. As maiores diferenças são o perfil de Gestor Escolar, os vínculos institucionais, os relatórios escolares, a progressão de dez níveis e a arquitetura prevista.

**Decisão posterior do usuário:** manter o frontend em React com JavaScript/JSX, sem conversão para TypeScript, e realizar a transição do backend para Python e do banco para PostgreSQL. Esta decisão prevalece sobre a escolha de TypeScript no documento acadêmico.

**Atualização da implementação:** a API ativa passou para Python/FastAPI e Psycopg/PostgreSQL. Os registros SQLite foram importados com conferência integral e cópia de segurança; uma sessão importada foi validada pelo proxy do Vite. O código Node/SQLite permanece somente como legado explícito para comparação e reversão controlada. Detalhes de instalação, testes e limitações de reversão estão no [guia do backend](../backend/README.md).

Este documento começou como análise e organiza o trabalho futuro. Na atualização de transição técnica, backend e banco foram migrados, mantendo os contratos existentes. Regras de XP e funcionalidades escolares não foram alteradas. Funcionalidade presente no código não significa requisito integralmente homologado.

Referência: `DOCUMENTAÇÃO_DE_SOFTWARE_GUARDIÕES_DE_SAQUAREMA.docx`, fornecida pelo usuário, especialmente capítulos 3 a 6 e 9, Quadros 1 a 5 e diagramas de casos de uso, classes e arquitetura. Conteúdo textual e imagens dos diagramas foram inspecionados; não foi feita revisão da paginação do Word. O arquivo original permanece inalterado.

Data da análise: 3 de novembro de 2026. SHA-256 da referência: `2FF10B49E89725B4FFF2A93F7D2664C5C38BEC624B9B3AA4484AC0AFDB242799`.

## Situação encontrada no código

| Área | Implementação atual | Destino após a decisão do usuário | Consequência |
| --- | --- | --- | --- |
| Frontend | React com JavaScript e JSX | React com JavaScript e JSX | Preservar a linguagem e adaptar somente a integração com a nova API |
| Backend | Python, FastAPI e Psycopg | Python | Transição aplicada; contratos REST/JSON preservados e comparados com Node |
| Dados | PostgreSQL; migrações SQL versionadas | PostgreSQL | Origem SQLite preservada e importada; backup/restauração e conferência de registros validados |
| Perfis | `USER` (Aluno), `GESTOR_ESCOLAR` e `ADMIN` | Aluno, Gestor Escolar e Administrador | Controle administrativo de cadastro, consulta e desativação implementado; funções escolares ainda pendentes |
| Instituições | `users.escola` e `users.turma` são textos editáveis | Escolas, turmas e vínculos autorizados | Textos atuais não podem servir como autorização institucional |
| Níveis | 500 XP por nível; sem teto | Dez níveis, máximo em 1.200 XP | Corrigir a regra central e as telas que a consomem |
| Administração | Cadastro/consulta/desativação de usuários e edição de conteúdo/missões | Gestão de usuários, vínculos e ciclo completo de conteúdo | Completar vínculos institucionais e ciclo de conteúdo |
| Avaliação | Testes automatizados de API e migração | Testes vinculados aos requisitos, heurísticas e SUS com adultos | Criar rastreabilidade e registrar avaliações reais |

FastAPI e Psycopg foram escolhidos e aplicados para a transição, com uma conexão/transação por requisição e migrações SQL com checksum. A conversão do frontend para TypeScript foi retirada por decisão do usuário. A documentação acadêmica deverá registrar JavaScript no frontend e refletir a implantação atual de Python/PostgreSQL, distinguindo essa entrega das funcionalidades escolares ainda futuras.

## Evidências principais

| Código | Evidência |
| --- | --- |
| [001_initial.sql](../backend/python/migrations/001_initial.sql) | `users`, `sessions`, `stats`, `activities` e tabelas educativas migradas; ainda sem entidades de escola, turma ou vínculo de gestor |
| [database.py](../backend/python/gds/database.py) | Migrações versionadas sem rebaixamento automático de papéis; a normalização perigosa de `database.js` existe somente no legado Node |
| [service.py](../backend/python/gds/service.py) | `register` cria `USER`; `require_admin` protege administração; `update_profile` ainda aceita escola/turma como texto |
| [service.py](../backend/python/gds/service.py) | `stats` preserva os níveis de 500 XP sem limite; `history` preserva o limite de 80 atividades para manter paridade nesta transição |
| [routes.py](../backend/python/gds/routes.py) | Contratos de autenticação, aprendizado, jogos, missões e administração preservados; nenhuma funcionalidade escolar ou exclusão adicionada |
| [AppRoutes.jsx](../src/routes/AppRoutes.jsx) e [RouteGuards.jsx](../src/routes/RouteGuards.jsx) | Fluxos de aluno e administrador; nenhuma área de gestor |
| [UsersPanel.jsx](../src/components/admin/UsersPanel.jsx) e [user_management.py](../backend/python/gds/user_management.py) | Cadastro dos três perfis, consulta, filtros e desativação protegida; sem edição de perfil existente ou vínculos institucionais |
| [GestaoConteudo.jsx](../src/pages/GestaoConteudo.jsx) | Formulários de missões, módulos, aulas e jogos; existe ativação/desativação, sem exclusão explícita |
| [tests](../backend/tests) e [test legado](../backend/test) | Suíte Python/PostgreSQL ativa e regressões Node preservadas; importação, paridade e restauração testadas; ainda faltam gestão escolar e nova curva de XP |

## Matriz dos requisitos funcionais

Legenda: **Base presente** significa implementação identificada, ainda sujeita à homologação completa; **Parcial** significa que apenas parte do requisito está coberta; **Ausente** significa que não foi encontrada implementação; **Divergente** significa que existe comportamento incompatível com a proposta. A prioridade nesta tabela é a da documentação.

| ID | Requisito resumido | Prioridade | Situação | Trabalho restante |
| --- | --- | --- | --- | --- |
| RF01 | Cadastro e autenticação dos três perfis | Alta | Base presente | Administração cadastra Aluno, Gestor Escolar e Administrador; logins existentes preservados, sem nova área de gestor nesta etapa |
| RF02 | Conteúdos ambientais para o aluno | Alta | Base presente | Homologar acesso, compreensão, conteúdo local e estados de erro em Aprender/ModuloAprender |
| RF03 | Minigames ambientais | Alta | Base presente | Homologar memória e quebra-cabeça em dispositivos/navegadores previstos; não há quantidade adicional de jogos exigida |
| RF04 | Missões diárias e pontuação | Alta | Base presente | Homologar virada do dia, repetição sem prêmio duplicado e mensagens; preservar validação no backend |
| RF05 | Registro e exibição de XP | Alta | Base presente | Preservar saldo na nova progressão e nas migrações; verificar consistência entre telas e relatórios |
| RF06 | Progressão por XP | Alta | Divergente | Implementar RN16–RN20, teto no nível 10 e apresentação correta da evolução |
| RF07 | Conquistas desbloqueadas | Alta | Base presente | Revalidar conquista de nível 5 com a nova curva e definir tratamento de usuários antigos |
| RF08 | Progresso geral do aluno | Média | Base presente | Homologar indicadores, barra de nível e gráfico semanal; corrigir agregação limitada às últimas 80 atividades |
| RF09 | Cadastrar, editar e excluir conteúdo | Alta | Parcial | Definir e implementar exclusão/arquivamento explícito preservando histórico; desativar não comprova por si só o requisito de exclusão |
| RF10 | Gerenciar usuários e vínculos de gestores | Alta | Parcial | Cadastro, consulta e desativação de contas entregues; escolas e autorização/revogação de vínculos continuam pendentes |
| RF11 | Criar e editar missões | Alta | Base presente | Homologar criação, edição e permissões; manter autoria administrativa |
| RF12 | Relatórios escolares de progresso | Alta | Ausente | Consultas e telas restritas às escolas autorizadas; depender de vínculos e matrículas reais |
| RF13 | Feedback visual nas atividades | Alta | Base presente | Homologar feedback de missão, aula, jogo, conquista e mudança de nível; verificar acessibilidade |
| RF14 | Histórico de atividades | Média | Base presente | Preservar registros; separar paginação da lista e agregação dos indicadores |
| RF15 | Gestor cadastra e organiza turmas | Alta | Ausente | Entidade de turma com escola obrigatória, API e interface protegidas |
| RF16 | Gestor vincula alunos às turmas | Alta | Ausente | Vínculo único de turma por aluno, validação da escola e transferência consistente |
| RF17 | Gestor visualiza turmas e alunos | Alta | Ausente | Listagens com escopo institucional no backend |
| RF18 | Gestor acompanha aluno individual | Alta | Ausente | Consulta autorizada de XP, nível, conquistas e missões sem edição desses dados |
| RF19 | Consolidado por turma | Média | Ausente | Definir indicadores, calcular sobre a turma autorizada e exibir resultados consistentes |
| RF20 | Restrição por perfil e instituição | Alta | Parcial | Complementar USER/ADMIN com gestor e autorização por vínculo em todas as operações |

Resumo de cobertura de código: **10 requisitos com base presente, 3 parciais, 6 ausentes e 1 divergente**. Essa contagem não representa percentual de conclusão, esforço restante nem aprovação de qualidade.

## Matriz das regras de negócio

| Regra | Situação e ação necessária |
| --- | --- |
| RN01 | Base presente: três perfis cadastráveis pela administração; `USER` identifica Aluno e `GESTOR_ESCOLAR` identifica Gestor Escolar |
| RN02 | Ausente: gestor com um ou mais vínculos escolares autorizados |
| RN03 | Ausente: criação/edição de turma somente em escola autorizada |
| RN04 | Ausente: chave obrigatória da turma para escola válida |
| RN05 | Ausente: organização de matrículas somente em escola autorizada |
| RN06 | Ausente: listagens de turmas/alunos isoladas por escola |
| RN07 | Ausente: consulta individual restrita à escola autorizada |
| RN08 | Ausente: consolidados por turma restritos ao mesmo escopo |
| RN09 | Parcial: missões já exigem ADMIN; acrescentar testes negativos com gestor e não criar atribuição de missões para ele |
| RN10 | Parcial: não existe API pública de edição de XP; garantir que novas rotas do gestor sejam somente leitura para XP, nível, conquistas e histórico |
| RN11 | Parcial: conteúdo e missões presentes; gestão geral de usuários e vínculos incompleta |
| RN12 | Base presente: recompensas e histórico registrados no backend; revalidar transações e idempotência após evolução |
| RN13 | Parcial: contas individuais existem, mas falta o fluxo individual de provisionamento de cada profissional gestor |
| RN14 | Ausente: aplicar vínculo institucional na autorização, inclusive com IDs e parâmetros adulterados |
| RN15 | Ausente: aluno em uma única turma válida, pertencente a uma escola cadastrada |
| RN16 | Divergente: substituir cálculo ilimitado por tabela de dez níveis |
| RN17 | Divergente: incrementos de 100 XP até atingir o nível 5 |
| RN18 | Divergente: incrementos de 150 XP do nível 5 ao 9 |
| RN19 | Divergente: incremento de 200 XP do nível 9 ao 10 |
| RN20 | Divergente: impedir que o nível ultrapasse 10, sem reduzir o XP acumulado |

## Requisitos de qualidade e validação acadêmica

Os identificadores Q01–Q07 abaixo são locais a este plano; a documentação agrupa os requisitos por categoria, sem esses IDs.

| ID | Categoria e meta da referência | Situação atual | Evidência que falta produzir |
| --- | --- | --- | --- |
| Q01 | Usabilidade para 7–11 anos | Interface educativa presente; adequação não demonstrada | Avaliação heurística e SUS com adultos, tarefas, respostas reais e tratamento dos achados |
| Q02 | Páginas em menos de 3 segundos; jogos fluidos | Sem medição reproduzível localizada | Definir dispositivo, rede e medida de carregamento; executar e registrar tempos e fluidez |
| Q03 | Celular/tablet/computador e contraste acessível | Classes responsivas presentes; sem homologação completa | Verificar teclado, foco, nomes acessíveis, mensagens, contraste e tamanhos de tela |
| Q04 | Proteção de dados, sessão e previsão de consentimento parental | Hash, sessões e autorização básica presentes; consentimento não modelado | Projetar ciclo de consentimento, minimização, acesso, retenção e operação; validação especializada antes de uso real |
| Q05 | Modularidade e atualização de conteúdo | Organização atual serve como base | Preservar separação de responsabilidades e contratos durante migração e novos domínios |
| Q06 | React e navegadores modernos; referência originalmente previa TypeScript | React/JavaScript mantido; Python/PostgreSQL aplicados | Testar Chrome, Firefox, Edge e Safari e atualizar a referência para JavaScript |
| Q07 | 99% de disponibilidade no período letivo | Sem infraestrutura/medição de produção localizada | Definir janela escolar, hospedagem, monitoramento, backups e restauração; medir a disponibilidade real |

O capítulo 6 prevê prova de conceito com equipe e avaliadores adultos. O capítulo 9 deixa a validação com crianças como trabalho futuro sujeito às condições ali descritas. O planejamento mantém essa separação e usa contas/dados sintéticos nos testes técnicos. Não há declaração de conformidade jurídica ou de usabilidade decorrente apenas desta leitura.

## Progressão a implementar

| Nível | XP acumulado mínimo |
| --- | --- |
| 1 | 0 |
| 2 | 100 |
| 3 | 200 |
| 4 | 300 |
| 5 | 400 |
| 6 | 550 |
| 7 | 700 |
| 8 | 850 |
| 9 | 1.000 |
| 10 | 1.200 |

A verificação original em SQLite em memória confirmou: com 100 XP o código mantém nível 1; com 400 XP mantém nível 1; com 1.200 XP retorna nível 3; com 5.000 XP retorna nível 11. Essa regra foi preservada na API Python durante a transição. A regra documentada espera, respectivamente, níveis 2, 5, 10 e 10.

A correção deverá preservar XP e conquistas já registradas. Também deverá definir a barra como progresso dentro da faixa ou outra apresentação explicitamente acordada; a documentação fixa os limiares, mas não o cálculo da barra. No nível máximo, a interface não deve anunciar um nível 11. As telas afetadas incluem Dashboard, MeuProgresso, Conquistas e Sidebar. Avaliar separadamente a concessão retroativa de conquistas para evitar alterações silenciosas de saldo.

## Modelo institucional proposto

As estruturas a seguir são uma proposta de implementação, não entidades já existentes:

- Escola: identificador estável, nome e estado de atividade.
- Turma: identificador estável, escola obrigatória e identificação; ano letivo e regra de nomes precisam ser definidos.
- Gestor: conta individual com papel próprio, sem privilégios de ADMIN.
- Vínculo gestor–escola: relação com autorização e possibilidade de revogação; gestor pode ter mais de uma escola.
- Matrícula/vínculo de aluno: uma única turma atual por aluno, com validação da escola; definir como preservar o histórico de transferências.
- Consentimento: representar a previsão exigida pela referência, com estado e evidências adequados ao fluxo que vier a ser definido.

`users.turma` e `users.escola` não devem ser convertidos automaticamente em permissões. A migração precisa produzir um relatório de correspondência: valores consistentes, duplicados, ambíguos e sem vínculo. Durante a transição, contas sem correspondência ficam pendentes de regularização, sem receber acesso institucional por aproximação textual. A meta final é cumprir RN15 para todos os alunos ativos.

## Backlog executável

Prioridade de execução: **P0** prepara contratos, preservação e autorização; **P1** entrega a aderência funcional; **P2** consolida indicadores e homologação. Não são estimativas de prazo nem substituem a prioridade dos RFs.

| ID | Prioridade | Entrega | Dependências | Critério de aceite |
| --- | --- | --- | --- | --- |
| EV01 | P0 | Consolidar decisões e contratos REST/JSON; escolher framework Python e acesso a dados; registrar limites da prova de conceito | Nenhuma | Decisões registradas; payloads, erros, papéis e estratégia de migração definidos; sem substituição abrupta da API |
| EV02 | P1 | Corrigir níveis RN16–RN20 e apresentação | Decisão sobre barra e retroatividade em EV01 | Todos os limiares testados; nível 10 com XP excedente; XP antigo preservado; telas e conquistas coerentes |
| EV03 | P1 | Corrigir agregação de progresso/histórico | Contrato de indicadores de EV01 | Semana calculada sobre todas as atividades pertinentes; lista paginada/limitada sem truncar o total; teste com mais de 80 registros |
| EV04 | P0 | Manter React/JavaScript e preparar a integração com a API Python | EV01; verificação integrada com EV06 | Cliente REST compatível com os contratos acordados; sem conversão para TypeScript; lint, build e fluxos atuais preservados |
| EV05 | P0 | Implementar persistência PostgreSQL e migrações versionadas | EV01 | Importação de cópia do SQLite com IDs, hashes, XP, histórico e relacionamentos preservados; reconciliação e restauração testadas |
| EV06 | P0 | Migrar API de negócio para Python preservando comportamento | EV01, EV05; EV02/03 incorporados quando concluídos | Contrato equivalente; autenticação, sessões, conteúdo, jogos e recompensas passam nos testes de paridade; proxy e comando de desenvolvimento documentados |
| EV07 | P0 | Modelar escola/turma, terceiro perfil e vínculos; migrar textos legados | EV05, EV06 | Papéis válidos não são rebaixados ao reiniciar; escola obrigatória por turma; vínculo único atual por aluno; ambiguidades reportadas sem perder dados |
| EV08 | P1 | Completar administração de contas, escolas e vínculos | EV07 | ADMIN provisiona gestor e autoriza/revoga escolas; cadastro público não cria privilégios; revogação impede novas operações imediatamente |
| EV09 | P1 | Entregar área do gestor e gestão de turmas/alunos | EV07, EV08 | RF15–RF17 operantes; cada operação valida perfil e escola no backend; alterar URLs/IDs não amplia acesso |
| EV10 | P1 | Relatório individual e consulta escolar | EV09, EV02, EV03 | RF12/RF18 com XP, nível, conquistas e missões corretos; gestor não edita progresso e não consulta outra escola |
| EV11 | P2 | Consolidado por turma | EV10 e definição dos indicadores | RF19 com cálculos conferidos em turmas vazias e com alunos; sem duplicação por múltiplos vínculos de gestor |
| EV12 | P1 | Completar exclusão/arquivamento explícito de conteúdo | EV06 e política de histórico | RF09 homologado: item indisponível para novas atividades sem apagar conclusões, XP e referências históricas |
| EV13 | P0 para desenho; P1 para entrega | Implementar previsão de consentimento e tratamento de dados exigidos na proposta | Desenho em EV01; implementação sobre EV07 | Fluxo e estados definidos e testados; dados sintéticos na prova de conceito; nenhuma alegação de conformidade sem avaliação adequada |
| EV14 | P2 | Homologar qualidade e avaliação acadêmica | Entregas funcionais e EV13 | Casos RF/RN rastreados; medições de desempenho; testes acessíveis/responsivos; heurísticas e SUS com adultos documentados |
| EV15 | P2 | Preparar operação e entrega | EV06, EV14 | Configuração reproduzível; CI; backups/restauração; monitoramento e medição da janela escolar; documentação de execução e resultados |

EV02 e EV03 permanecem correções independentes na API Python, com testes de regressão para as mudanças de regra. O desenho de consentimento e autorização começa desde EV01; não fica adiado para depois da exposição de dados. O novo domínio escolar será construído sobre Python/PostgreSQL.

Atualização das entregas técnicas: EV04 foi atendido preservando React/JavaScript e validando a integração; EV05 e EV06 foram implementados e validados no ambiente local com dados importados, testes de paridade e restauração PostgreSQL. A homologação visual e a implantação de produção permanecem em EV14/EV15. EV02, EV03 e o domínio escolar continuam pendentes. As decisões de produto listadas em EV01 ainda devem ser fechadas conforme a entrega dependente.

Atualização de controle administrativo de perfis, solicitada como etapa própria: a parte de contas de EV07/EV08 foi implementada com os três perfis, cadastro, listagem, consulta individual e desativação. A migração 002 mantém contas existentes ativas e preserva dados; contas desativadas têm sessões revogadas e não autenticam. Autodesativação administrativa e perda concorrente do último administrador são bloqueadas. Foram aprovados 42 testes, lint e build. Não foram acrescentados vínculos institucionais, funções específicas de gestor ou novas áreas por perfil. RF10 e EV07/EV08 continuam parciais por esses vínculos ainda pendentes.

Evolução posterior solicitada pelo usuário: CPF único de 11 dígitos e nascimento em formato brasileiro; cadastro administrativo em tela própria; edição sem definição de senha e reset exclusivo por administrador; senha inicial CPF com acesso restrito até troca obrigatória. O cadastro público passou a solicitação de Aluno, analisada em aba administrativa, sem conta/sessão antes de aprovação. Aprovação cria a conta com senha inicial CPF; recusa preserva o pedido sem criar usuário. Migrações 003/004 aplicadas com preservação das contas e senhas anteriores. A suíte foi ampliada para 49 testes aprovados. As entidades escolares e funções específicas dos perfis continuam pendentes.

## Sequência de entregas

1. **Definir a base**: EV01 e desenho de EV13. Fechar ambiguidades, contratos, critérios e preservação.
2. **Corrigir a gamificação existente**: EV02 e EV03, com testes de regressão na base atual.
3. **Alinhar a arquitetura**: concluído no ambiente local; frontend JavaScript preservado em EV04, dados PostgreSQL em EV05 e API Python em EV06, com paridade verificada antes da troca.
4. **Construir o núcleo escolar**: EV07, EV08, EV09 e implementação de EV13.
5. **Concluir os fluxos da proposta**: EV10, EV11 e EV12.
6. **Homologar e preparar a entrega**: EV14 e EV15, com relatórios reais de avaliação.

Não foram atribuídas datas, horas ou responsáveis sem conhecer a disponibilidade da equipe. Cada entrega deve ser pequena, revisável e acompanhada de evidência de aceite.

## Cenários de teste que faltam

| Grupo | Cenários essenciais | Rastreabilidade |
| --- | --- | --- |
| Níveis | Limite imediatamente abaixo, exato e acima de cada faixa; 1.199/1.200/1.201 XP; XP alto sem nível 11; múltiplos níveis numa recompensa | RF05–RF07; RN16–RN20 |
| Gestores | Contas individuais; um gestor com duas escolas; gestor sem vínculo; revogação com sessão já existente | RF01, RF10, RF20; RN01, RN02, RN13, RN14 |
| Isolamento | Escola A não acessa listagem, aluno, turma ou relatório da B; testar IDs conhecidos e payloads alterados; ADMIN permitido | RF12, RF15–RF20; RN03–RN08, RN14 |
| Matrículas | Turma sem escola rejeitada; segundo vínculo atual rejeitado ou transferência atômica; migração de texto ambíguo não concede acesso | RF15, RF16; RN04, RN05, RN15 |
| Somente leitura | Gestor não altera XP, nível, conquistas, histórico ou missões por nenhuma API | RF11, RF20; RN09, RN10 |
| Relatórios | Turma vazia; aluno sem atividade; soma e média definidas; mudança de turma; semana com mais de 80 atividades | RF08, RF12, RF14, RF18, RF19 |
| Conteúdo | Criar, editar e excluir/arquivar; item retirado não aceita conclusão nova; histórico anterior permanece | RF02, RF09; RN11, RN12 |
| Migração de arquitetura | Login com hash antigo/atual; política de sessões; mesmas recompensas; timezone diário; igualdade de IDs e saldos | RF01–RF14; RN12 |
| Qualidade | Falha de rede explícita; teclado e foco; telas móveis; navegadores; tempos acordados; jogos; SUS e heurísticas com adultos | Q01–Q07; capítulo 6 |

Os testes Node atuais são ativos de regressão. Na migração para Python, preservar os cenários e separar os testes de contrato HTTP daqueles que hoje manipulam diretamente SQLite ou `server.service`; estes últimos precisam ser adaptados, não simplesmente apagados.

## Definições a fechar antes das entregas dependentes

- **Perfis internos**: manter `USER` como aluno ou migrar para `ALUNO`; qual identificador representa Gestor Escolar. O nome do papel não substitui autorização por vínculo.
- **Acesso do aluno**: o cadastro atual exige email; definir identificação adequada à prova de conceito e matrícula indicada no diagrama, sem presumir que toda criança possui email.
- **Cardinalidade do diagrama**: o texto RN02 admite uma ou mais escolas por gestor, mas a associação direta GestorEscolar–Escola do diagrama indica `1` em ambas as extremidades. Adotar RN02 como base deste plano e corrigir o diagrama para concordar com o vínculo múltiplo autorizado.
- **Turmas e transferências**: definir identificação/ano letivo, aluno aguardando regularização e como preservar histórico após troca de turma/escola.
- **Relatórios**: definir período, métricas e se o progresso será atribuído à turma atual ou à turma da atividade. Exportar PDF/CSV não é exigência expressa da referência.
- **Exclusão de conteúdo**: homologar se o aceite de RF09 exige exclusão lógica com trilha e como tratar referências anteriores; simples toggle atual não encerra a decisão.
- **Conquistas**: confirmar recompensas e retroatividade da nova curva. O documento fixa os níveis, mas não detalha todos os critérios de badges e valores das atividades.
- **Sessões na migração**: decidir manutenção ou expiração controlada de sessões, sem transportar senhas em texto puro e sem rebaixar papéis válidos.
- **Qualidade**: fixar dispositivos, rede, medida dos três segundos, janela escolar dos 99% e participantes adultos da avaliação.
- **Documentação acadêmica**: atualizar objetivos, requisito de tecnologia, arquitetura, Quadro 5 e prototipação para refletir JavaScript no frontend, inclusive a figura de arquitetura; manter Python/PostgreSQL como destino. Completar capítulos de Resultados, Impacto e Considerações Finais com evidências reais; corrigir remissões das figuras e a duplicação de frase em Prototipação. Não inventar resultados de SUS ou participação de crianças. O Word original não foi editado nesta atualização.

Ranking, chat, aplicativo nativo, novos minigames, notificações, exportação de relatórios e vários tipos de profissional gestor não foram adicionados ao escopo obrigatório: a referência não os exige. A Gestão Escolar permanece unificada para professores, coordenação e direção, com contas individuais.

## Verificações da análise original

- Leitura dos requisitos, regras, tecnologias e capítulos de avaliação da referência, além dos diagramas extraídos.
- Inspeção do schema, API, serviços, páginas, rotas, configurações e testes do projeto atual.
- Reprodução da divergência de XP exclusivamente em SQLite em memória, com conta sintética e sem expor credenciais.
- `npm run lint`: aprovado nesta análise.
- `npm run test:backend`: 18 testes executados e aprovados nesta análise, sem falhas.
- Build, execução de navegadores, avaliações de usabilidade, desempenho e disponibilidade não foram repetidos nesta etapa de planejamento. Resultados de rodadas anteriores não substituem esses aceites.

## Como manter o plano

Validação da atualização de transição: 29 testes Python/PostgreSQL e 18 testes legados aprovados; lint e build aprovados; importação das 12 tabelas de negócio com conferência integral; restauração PostgreSQL em base isolada aprovada; API e proxy testados com sessão importada. A conta e os dados de teste ficaram em bancos/schemas temporários, separados da base do projeto. Consulte o guia do backend para os avisos não bloqueantes e limites de reversão.

Em cada ciclo, selecionar um item EV, apontar os RF/RN/Q afetados e registrar o aceite. Atualizar a matriz apenas depois de implementação e verificação; manter distinção entre código presente, teste automatizado e homologação humana. Novas mudanças de escopo devem ser documentadas, sem atribuí-las retroativamente ao texto acadêmico.

Próxima ação recomendada após a transição: fechar em EV01 as decisões de barra/retroatividade e corrigir a curva de níveis em EV02. Para o gestor, definir o escopo institucional e as entidades de EV07; a API Python já evita o rebaixamento automático de papéis, mas ainda não implementa o novo perfil.
