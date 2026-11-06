# Destaques da tela inicial

O administrador acessa **Administração → Gerenciar missões, aulas e jogos → Destaques** (`/gestao?aba=destaques`). O cadastro começa vazio: a migração e a inicialização não criam destaques nem imagens de exemplo. A antiga URL `/admin/destaques` apenas redireciona para essa aba.

Cada destaque possui título, descrição, vínculo com um jogo, missão, trilha educativa (módulo) ou atividade (aula), imagem opcional, descrição acessível da imagem, cor, ordem e estado de publicação. Os menores números aparecem primeiro. O formulário oferece prévia antes de salvar e a exclusão solicita confirmação. Excluir um destaque preserva o conteúdo original.

Imagens podem ser enviadas em PNG, JPEG ou WebP (até 8 MB na seleção). O navegador reduz a maior dimensão para até 1.200 pixels, remove metadados pela conversão para canvas e otimiza o arquivo; a API aceita até 700 KB após a conversão. A imagem enviada fica no PostgreSQL junto ao destaque, sem depender de arquivos locais. Também é possível informar uma URL HTTPS: o navegador carrega a imagem sem enviar o referenciador. URLs externas dependem da disponibilidade do provedor. O texto alternativo é obrigatório quando há imagem. Use imagens ecológicas pertinentes ao conteúdo e sem dados pessoais dos alunos.

A seção aparece exclusivamente em Início, em um carrossel compacto à direita no desktop e empilhado em telas menores. Administração e Gestão Escolar não exibem o carrossel. As bolinhas representam os destaques publicados e disponíveis ao perfil; a bolinha ativa acompanha a navegação automática e manual. Setas e botão de pausa oferecem controle adicional. A rotação pausa ao passar o mouse, ao focar controles e quando a aba do navegador fica oculta. A preferência por movimento reduzido inicia o carrossel pausado e desliga as animações. Apenas conteúdos ativos e autorizados pelas permissões do usuário aparecem. Aulas também dependem do módulo ativo. Desativar um conteúdo oculta sua divulgação automaticamente; ao reativá-lo, destaques ainda publicados voltam a aparecer. Rascunhos permanecem apenas no gerenciamento. Os vínculos levam ao conteúdo específico, incluindo a aula, missão ou jogo dentro de sua página.

## Banco e permissões

A migração `014_home_highlights.sql` cria `home_highlights` sem registros e acrescenta ao perfil padrão Administrador as permissões `highlights.read`, `highlights.create`, `highlights.update` e `highlights.delete`. Perfis personalizados podem recebê-las pelo gerenciamento de perfis, respeitando o limite de delegação. As ações de escrita exigem também leitura. Alunos e gestores não podem administrar destaques.

A migração `015_highlight_settings.sql` adiciona `home_highlight_settings`, com um intervalo global padrão de **8 segundos**. A aba Destaques permite salvar um número inteiro de 2 a 300 segundos, com permissão `highlights.update`. O mesmo valor é retornado pela API e usado em todos os slides, sem duração individual por destaque. A configuração atual é carregada ao abrir a tela inicial.

Execute `npm.cmd run db:migrate` em instalações existentes e reinicie a API. O início normal da API também aplica migrações pendentes. Recarregue a plataforma para atualizar as permissões da sessão. Backups PostgreSQL devem incluir `home_highlights` e `home_highlight_settings`, incluindo as imagens enviadas.

## API

- `GET /api/highlights`: destaques disponíveis ao usuário autenticado, filtrados por publicação, estado do conteúdo e permissões.
- `GET /api/admin/highlights`: todos os destaques e catálogo de conteúdos vinculáveis; exige `highlights.read`.
- `PATCH /api/admin/highlights/settings`: salva `{ "interval_seconds": 8 }`; exige `highlights.update`.
- `POST /api/admin/highlights`: cria; exige `highlights.create`.
- `PATCH /api/admin/highlights/{id}`: edita a configuração completa; exige `highlights.update`.
- `DELETE /api/admin/highlights/{id}`: exclui apenas o destaque; exige `highlights.delete`.

Campos de escrita: `title`, `description`, `target_kind` (`game`, `mission`, `module`, `lesson`), `target_id`, `module_id` (somente aulas), `image`, `image_alt`, `color` (`blue`, `green`, `yellow`, `red`), `active` (booleano) e `sort_order` (inteiro de 0 a 9.999). A API valida novamente o vínculo, a imagem, os tamanhos e as permissões; não aceita destinos arbitrários. Configurações novas começam como rascunho.
