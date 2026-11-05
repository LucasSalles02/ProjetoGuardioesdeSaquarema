# Gestão de Turmas e Alunos

Gestores acessam Gestão → Gestão de Turmas e Alunos na unidade ativa. A seleção inicial de unidade usa uma janela compacta sobre a estrutura do sistema, com fundo desfocado e bloqueado. Nenhum dado escolar é carregado antes da seleção; a troca pelo perfil descarta os formulários e consultas anteriores.

Administradores também acessam Gestão pela navegação ou pelo painel administrativo. Ao abrir o módulo, escolhem qualquer unidade cadastrada, sem necessidade de vínculo de gestor, exclusivamente para consultar turmas, alunos e indicadores. Cadastrar/editar turmas e vincular/transferir alunos entre turmas são ações exclusivas do Gestor Escolar, mesmo que permissões antigas ainda existam no banco ou no navegador. As consultas continuam restritas à unidade ativa e às permissões de leitura; selecionar uma unidade não concede ações ausentes no perfil. A seleção administrativa exige `institutions.read`. A administração geral de contas e conteúdos continua global e não exige selecionar uma escola.

O menu lateral do perfil Gestão Escolar apresenta somente **Início → Gestão → Conta**, respeitando as permissões de gerenciamento.

## Fluxo de cadastro e organização

1. O administrador cadastra e autoriza gestores em Unidades Escolares.
2. Em Gerenciar Usuários e Perfis, o administrador cria a conta de Aluno, escolhe sua unidade e informa a matrícula. A matrícula preserva zeros à esquerda e é única na plataforma para permitir login sem ambiguidade.
3. Em Etapas Escolares, ao lado de Perfis de acesso, o administrador mantém o catálogo de etapas. Os padrões são 2º, 3º, 4º, 5º e 6º ano. Uma etapa inativa deixa de ser oferecida a novas turmas, preservando as turmas existentes.
4. O gestor seleciona a unidade, cadastra a turma com identificação e etapa e vincula os alunos já cadastrados nessa escola.
5. Transferir um aluno substitui a turma anterior na mesma unidade. Somente a administração pode transferir o vínculo institucional para outra unidade; nesse caso, o aluno aguarda a definição da turma na unidade de destino.

Contas antigas e contas ainda sem alocação escolar não recebem vínculos inferidos de campos em texto livre. Antes de concluir o vínculo à turma, aparecem como **Aguardando turma** na unidade designada pela administração. A chave única por aluno impede duas turmas simultâneas. O fluxo não concede ao gestor a criação de contas, edição cadastral, reset de acesso ou gerenciamento de perfis.

## Critérios da documentação atendidos pelo módulo

| Referência | Implementação |
| --- | --- |
| RF15, RN03–RN04 | Cadastro e edição de turmas com escola obrigatória derivada da sessão e etapa cadastrada |
| RF16, RN05/RN15 | Vínculo e transferência entre turmas; um vínculo atual por aluno; turma e aluno devem pertencer à unidade ativa |
| RF17, RN06 | Listagens de turmas e alunos restritas à escola selecionada |
| RF18, RN07/RN10 | Progresso individual, conquistas e atividades recentes somente para leitura |
| RF12/RF19, RN08 | Consolidado por turma com alunos ativos, XP total/médio, missões e aulas concluídas |
| RN09/RN11 | Missões e administração geral continuam exclusivas da administração |
| RF20, RN02/RN14 | Permissão de ação, vínculo autorizado e unidade da sessão verificados no servidor, inclusive com IDs e parâmetros adulterados |

O cadastro de turma corresponde a `Turma.id` e `Turma.identificacao` do diagrama, acrescido da etapa solicitada pelo usuário. `Aluno.matricula` é mantida no cadastro da conta e no vínculo escolar, com sincronização nas edições administrativas. Não foram acrescentadas alterações à curva global de XP nesta entrega: a consulta exibe os valores e níveis utilizados atualmente pela plataforma.

## Integridade e preservação

A migração `008_classes_and_school_stages.sql` cria `school_stages`, `school_classes`, `student_school_memberships` e `class_enrollment_events`. Uma chave estrangeira composta impede que o vínculo aponte para uma turma de outra escola. A identificação de turma é única por unidade; a mesma identificação pode existir em escolas diferentes.

As transferências são transacionais e registram o vínculo anterior e o novo, sem apagar XP, conquistas, missões ou atividades. Erros não deixam alterações parciais. As operações de escrita escolar e administrativa compartilham a serialização necessária para evitar conflitos de transferência e cadastro. Não há exclusão definitiva de etapas, turmas ou progresso pelo gestor.

A visualização administrativa de usuários lista os vínculos institucionais reais: todas as unidades autorizadas para um gestor; unidade, matrícula e turma atual para um aluno. Os textos históricos `escola` e `turma` não são usados como autorização. A API da conta de aluno prioriza o vínculo institucional quando existente.

## API

- `GET/POST /api/admin/school-stages` e `PATCH /api/admin/school-stages/{id}`: catálogo administrativo de etapas, com permissões `school_stages.read/create/update`.
- `GET /api/school-management/stages`: etapas ativas disponíveis para o gestor.
- `GET/POST /api/school-management/classes` e `PATCH /api/school-management/classes/{id}`: consulta, cadastro e edição de turmas com permissões `classes.read/create/update`.
- `GET /api/school-management/students` e `PATCH /api/school-management/students/{id}/class`: alunos da unidade e vínculo de turma, com permissões `enrollments.read/update`.
- `GET /api/school-management/students/{id}/progress`: consulta individual, com `school_progress.read`.
- `GET /api/school-management/classes/{id}/summary`: consolidado de turma, com `school_progress.reports`.

Os endpoints do gestor exigem contexto escolar validado. O corpo de cadastro de turma não aceita `school_id`; o vínculo de aluno aceita somente `class_id`. O administrador atribui `school_id` e `registration_number` pelo cadastro/edição de usuário, exigindo a permissão de vínculos institucionais.

A migração `010_admin_classes_read_only.sql` retira `classes.create`, `classes.update` e `enrollments.update` de todos os perfis com base Administrador. O catálogo, a API de sessão e os formulários não oferecem essas ações ao administrador. A administração continua podendo criar e atribuir perfis de Gestor com essas permissões, sem poder executá-las. O cadastro administrativo de contas, vínculos institucionais e etapas permanece separado da organização de turmas.

Desde a migração 012, a matrícula do aluno permanece na conta quando uma unidade é desativada, permitindo o reset sem recriar vínculo institucional. Consulte [as regras de cadastro e autenticação](CADASTRO_E_AUTENTICACAO.md).
