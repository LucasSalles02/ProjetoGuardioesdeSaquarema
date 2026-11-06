# Unidades Escolares

O submódulo Administração → Gerenciar Unidades Escolares cadastra, consulta e edita escolas e suas autorizações de gestores. Após autenticar e definir sua senha, o gestor escolhe uma unidade autorizada antes de entrar no sistema. A página inicial passa a mostrar somente a unidade selecionada.

## Correspondência com o diagrama de classes

Referência: Figura do Diagrama de Classes em `DOCUMENTAÇÃO_DE_SOFTWARE_GUARDIÕES_DE_SAQUAREMA.docx`, classe Escola e associação VinculoGestorEscola. A imagem embutida foi inspecionada para esta implementação.

| Classe | Atributos no diagrama | Implementação |
| --- | --- | --- |
| Escola | `id: int`, `nome: string` | `schools.id`, inteiro gerado automaticamente, e `schools.name`, nome obrigatório |
| VinculoGestorEscola | `id: int`, `autorizado: bool` | `school_manager_links.id` e `authorized`, com referências à escola e à conta do gestor |

Datas de atualização e identificação do administrador responsável são metadados de operação. Não foram inventados campos de endereço, CNPJ, telefone ou código INEP, ausentes na classe Escola da referência.

Um gestor pode ser vinculado a várias escolas, conforme o pedido do usuário e RN02. Uma escola pode ter vários gestores com contas individuais (RN13). Ao desmarcar um gestor, o vínculo permanece armazenado com autorização falsa; autorizá-lo novamente reutiliza o mesmo identificador. O ID da escola não é editável.

## Regras de acesso

- Somente administradores com as permissões apropriadas podem cadastrar, consultar e editar unidades.
- Vínculos são atribuídos somente a contas ativas com papel base `GESTOR_ESCOLAR`.
- O gestor precisa da permissão `school_units.read` e de um vínculo autorizado com a escola. Ambos são conferidos na API, sem aceitar um ID de gestor informado pelo navegador.
- Consultar uma escola alheia por ID retorna 404, sem revelar dados da unidade. Alunos não acessam a listagem escolar.
- Revogar um vínculo retira o acesso na próxima requisição. Não é necessário encerrar a sessão do gestor para essa revogação.
- Desativar a conta ou alterar seu papel para fora de Gestão Escolar também revoga os vínculos na mesma transação.
- Escola e turma em texto livre no cadastro do usuário não concedem acesso institucional.
- Não há exclusão definitiva de unidades. Turmas, matrícula e acompanhamento estão descritos em [Gestão de Turmas e Alunos](GESTAO_TURMAS_E_ALUNOS.md).

## Desativação de unidades

A administração dispõe das abas **Unidades ativas** e **Unidades desativadas**. A ação Desativar exige `institutions.deactivate` e apresenta uma confirmação com os efeitos completos. A requisição `PATCH /api/admin/schools/{id}/deactivate` aceita somente `{"confirm": true}`.

A migração `009_school_deactivation.sql` acrescenta a situação da unidade e o registro de auditoria `school_deactivations`. Em uma única transação, a desativação:

- Marca a unidade como inativa e registra data e administrador responsável.
- Retira os vínculos escolares e de turma dos alunos, limpa os textos históricos de escola/turma e preserva as matrículas e vínculos anteriores na auditoria.
- Revoga as autorizações dos gestores e limpa todas as sessões que estavam com essa unidade selecionada.
- Preserva contas, senhas, XP, conquistas, atividades, etapas e turmas. Outras unidades e seus vínculos permanecem intactos.

Unidades desativadas continuam disponíveis para consulta administrativa, sem edição, e saem das opções de atribuição de aluno e de seleção de contexto de administrador/gestor. A API rejeita tentativas de selecionar a unidade ou de atribuir novos alunos a ela. A repetição da desativação não duplica a auditoria. Na aba Unidades desativadas, **Reativar** permite tornar a unidade ativa novamente, mesmo sem gestores. A ação exige `institutions.update` e `PATCH /api/admin/schools/{id}/reactivate` com `{"confirm": true}`. Vínculos de gestores, alunos e turmas anteriores não são restaurados automaticamente; novos vínculos precisam ser definidos explicitamente. A auditoria das desativações é preservada.

## Permissões e API

O perfil padrão Administrador recebe `institutions.read`, `institutions.create` e `institutions.update`. O perfil padrão Gestão Escolar recebe `school_units.read`. Perfis personalizados preservam a configuração anterior e podem receber essas permissões explicitamente pela administração, dentro dos limites da base.

| Endpoint | Ação |
| --- | --- |
| `GET /api/admin/schools` | Consultar unidades e total de gestores autorizados |
| `GET /api/admin/schools/managers` | Consultar candidatos de Gestão Escolar |
| `GET /api/admin/schools/{id}` | Consultar cadastro e vínculos, inclusive revogados |
| `POST /api/admin/schools` | Cadastrar unidade; autorizar gestores exige também `institutions.update` |
| `PATCH /api/admin/schools/{id}` | Editar nome e conjunto de gestores autorizados |
| `GET /api/school-units` | Listar somente unidades autorizadas ao gestor autenticado |
| `GET /api/school-units/{id}` | Consultar uma unidade com validação de autorização |
| `GET /api/school-context` | Consultar a unidade ativa e as unidades disponíveis para seleção |
| `POST /api/school-context` | Selecionar uma unidade autorizada nesta sessão |
| `GET /api/school-current` | Consultar os dados da unidade ativa, validando o contexto |

A migração `006_school_units.sql` cria as entidades sem modificar as migrações anteriores. Nomes duplicados são recusados; erros de validação não deixam alterações parciais no cadastro ou nos vínculos. A suíte verifica isolamento por escola, revogação, reautorização, perfis restritos e backup/restauração com unidades e vínculos.

## Unidade ativa por sessão

A migração `007_session_school_context.sql` acrescenta `sessions.school_id`. Cada novo login começa sem seleção, mesmo quando o gestor possui uma única unidade. Recarregar a página conserva a seleção da mesma sessão, após nova validação dos vínculos. Logins distintos podem manter unidades ativas diferentes.

Administradores podem selecionar qualquer unidade ao entrar no módulo Gestão, com `institutions.read` e as permissões de consulta necessárias. Nesse módulo, o acesso administrativo é somente de leitura; alterações de turmas e vínculos de turma são exclusivas dos gestores. Não é criado um vínculo de gestor para o administrador. Gestores continuam vendo somente as unidades autorizadas; alunos não podem selecionar contexto escolar. A seleção administrativa é opcional fora da Gestão e também pode ser trocada pelo perfil flutuante.

A tela `/selecionar-unidade` permite escolher apenas unidades autorizadas, atualizar a lista e sair. Sem unidades ou sem permissão, o gestor permanece nessa etapa com a orientação de procurar a administração. A troca também está disponível no perfil flutuante, que exibe o nome da unidade aberta. Trocar a unidade retorna ao início e recria o conteúdo da área para descartar dados e formulários anteriores.

A API valida a unidade ativa antes de fornecer dados escolares. Mesmo uma outra escola autorizada ao gestor não pode ser consultada como dado de trabalho sem antes trocar o contexto. A lista de unidades para seleção, autenticação e troca de senha são operações anteriores ao contexto; turmas e relatórios usam a mesma validação institucional.

## Etapas e organização de turmas

O cadastro de etapas está em **Administrador → Gerenciar Unidades Escolares → Etapas Escolares**. A aba reutiliza o cadastro existente: etapas continuam compartilhadas pelas unidades, sem duplicação de registros ou alteração das turmas já vinculadas. As permissões `school_stages.read/create/update` permanecem as mesmas. Um perfil com acesso somente às etapas pode abrir o módulo sem receber acesso aos cadastros de unidades. Usuários e Perfis contém apenas seus respectivos gerenciamentos.

Em **Gestão → Gestão de Turmas e Alunos**, a aba **Turmas** apresenta a lista da unidade ativa. Selecionar uma turma abre `/gestao-escolar/turmas/{id}`, com os alunos atualmente alocados, pesquisa e consolidado pedagógico. **Todos os alunos** (`/gestao-escolar/alunos`) preserva a pesquisa por nome/matrícula, o filtro por turma e o progresso individual e acrescenta a consulta de cadastro.

Somente gestores com `enrollments.update` podem organizar alunos. **Acrescentar alunos à turma** oferece os alunos ativos da unidade sem turma; é possível selecionar até 200 por operação. Alunos já alocados usam **Transferir de turma**, com destino restrito a outra turma da mesma unidade. **Remover da turma** solicita confirmação e limpa apenas a turma: escola, matrícula, dados cadastrais, XP, conquistas e histórico são preservados. O administrador usa as mesmas listas, detalhes, cadastros e relatórios, sem ações de escrita.

- `POST /api/school-management/classes/{id}/students`, com `{"student_ids":["id-aluno"]}`: alocação em lote. Exige `enrollments.update`, gestor e contexto válido. Todos os alunos devem estar ativos, sem turma e na unidade atual; qualquer conflito rejeita toda a operação, sem alocação parcial.
- `PATCH /api/school-management/students/{id}/class`, com `{"class_id":null,"expected_class_id":123}`: remove a turma. Um destino numérico aloca/transfere. O campo opcional `expected_class_id` protege contra alterações simultâneas: se a turma atual mudou, retorna HTTP 409 e exige atualizar a lista.
- `GET /api/school-management/students/{id}/record`: consulta cadastral com `enrollments.read`, contexto ativo e aluno da mesma unidade. Retorna nome, matrícula, nascimento, perfil, situação, datas cadastrais, escola, turma, etapa e contatos dos responsáveis. Nunca retorna credenciais de autenticação. Os contatos são de uso institucional restrito.

Todas as mudanças de turma usam `student_school_memberships` e registram `class_enrollment_events`. As telas atualizam a mesma fonte de alunos e os totais das turmas; não existem vínculos paralelos. Esta reorganização não exige nova migração nem recadastramento dos alunos existentes.

O cabeçalho `X-School-Id` confirma o contexto esperado pelo navegador; ele não concede autorização nem substitui o valor armazenado na sessão. Um contexto divergente retorna 409 com `UNIDADE_DESATUALIZADA`. A ausência ou revogação da unidade retorna 409 com `UNIDADE_OBRIGATORIA`; a interface atualiza o contexto e exige nova seleção. Erros ao selecionar uma unidade não autorizada preservam a seleção anterior. Respostas iniciadas no contexto anterior são descartadas pelo cliente.
