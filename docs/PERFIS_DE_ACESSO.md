# Perfis de acesso

A administração de usuários inclui as abas Usuários e Perfis de acesso. Os perfis padrão Administrador, Gestão Escolar e Aluno são criados pela migração `005_access_profiles.sql`, sem alterar contas, senhas ou progresso existentes. Contas sem perfil personalizado usam o padrão correspondente ao seu papel anterior.

## Responsabilidades da documentação

Referência: `DOCUMENTAÇÃO_DE_SOFTWARE_GUARDIÕES_DE_SAQUAREMA.docx`, requisitos RF01–RF20 e regras RN01–RN15. O cadastro público continua desativado por decisão posterior do usuário.

| Perfil base | Módulos e ações | Escopo |
| --- | --- | --- |
| Administrador | Consultar, cadastrar, editar, desativar usuários e resetar acesso; consultar e criar perfis; editar perfis personalizados; cadastrar e editar conteúdos, aulas e missões; editar jogos; cadastrar unidades e autorizar gestores | Administração da plataforma, RF09–RF11 e RN09/RN11 |
| Gestão Escolar | Consultar as unidades autorizadas; consultar e organizar turmas; vincular e organizar alunos; consultar progresso individual, relatórios e consolidados | Exclusivamente escolas autorizadas, RF12/RF15–RF20 e RN02–RN08/RN14–RN15 |
| Aluno | Consultar conteúdos e concluir aulas; jogar; consultar e realizar missões; consultar o próprio progresso, histórico e conquistas | Dados próprios, RF02–RF08/RF14 e RN12 |

Gestão Escolar não pode criar, editar ou atribuir missões, nem modificar XP, níveis, conquistas ou histórico (RN09–RN10). O texto livre de escola/turma do cadastro não comprova vínculo institucional.

O cadastro de Unidades Escolares, a autorização de gestores e a consulta das próprias unidades estão implementados; veja [Unidades Escolares](UNIDADES_ESCOLARES.md). Turmas, vínculo de alunos, etapas, consulta individual e consolidado por turma estão descritos em [Gestão de Turmas e Alunos](GESTAO_TURMAS_E_ALUNOS.md). A exclusão de conteúdo continua identificada como **Previsto**. O catálogo não autoriza acesso a dados de escolas por si só: as consultas exigem também vínculo autorizado e unidade ativa.

## Perfis personalizados

O administrador cria um perfil com nome, descrição e perfil base, seleciona módulos e ações e o atribui no cadastro ou na edição de um usuário. A base limita o conjunto de permissões disponível. Perfis padrão permanecem protegidos para preservar a documentação; perfis personalizados podem ser editados, mantendo a base original. Selecionar uma ação de escrita exige também a consulta do respectivo módulo; cadastrar/editar usuários exige consultar perfis.

A API aplica a matriz em cada requisição. Consultas e botões da interface acompanham as permissões. Autenticação, troca obrigatória de senha e gerenciamento da própria senha permanecem disponíveis independentemente da matriz. Perfis sem os módulos educativos necessários à visão geral recebem uma página inicial com seus acessos disponíveis.

Alterar um perfil personalizado revoga as sessões dos usuários vinculados. Atribuir outro perfil também revoga as sessões do usuário. Ninguém pode alterar o próprio perfil administrativo em uso, conceder permissões superiores às próprias ou modificar contas com permissões superiores às suas. Deve permanecer pelo menos um administrador completo ativo.

Os códigos `ADMIN`, `GESTOR_ESCOLAR` e `USER` continuam sendo os papéis base; perfis personalizados são entidades separadas. A API de sessão acrescenta `profile_id`, `profile_name` e `permissions`; a listagem administrativa acrescenta identificação e nome do perfil.

Endpoints administrativos: `GET /api/admin/profiles`, `POST /api/admin/profiles` e `PATCH /api/admin/profiles/{id}`. A migração participa da importação e dos testes de backup/restauração; alterações futuras no catálogo padrão exigem uma nova migração, sem modificar migrações já aplicadas.

A permissão administrativa `institutions.update` inclui a delegação de `school_units.read` aos gestores, pois autorizar uma escola exige permitir sua consulta. Isso não transforma o administrador em gestor nem dispensa os vínculos escolares nas consultas de Gestão Escolar.
