# Responsividade da interface

O layout considera a largura disponível no conteúdo, inclusive quando o menu lateral do desktop está aberto. Não altera permissões, autenticação ou regras escolares.

- Menu lateral a partir de 1.024 px, aberto por padrão e recolhível. Abaixo disso, um botão abre o menu em gaveta, com foco contido pelo diálogo nativo, fechamento por Escape e devolução do foco ao botão de abertura. A gaveta fecha ao selecionar um destino ou ampliar a janela para desktop.
- Perfil suspenso em um cabeçalho que reserva espaço para o nome completo. O conteúdo expandido possui rolagem própria e limite de altura baseado na área visível.
- Grades de cartões, indicadores, conteúdos e jogos calculadas pela largura disponível. O jogo da memória adapta a quantidade de colunas à largura do próprio cartão.
- Tabelas de usuários e alunos transformadas em cartões identificados por campo quando seu contêiner fica estreito. As colunas permanecem visíveis em telas largas e a região conserva suporte à navegação pelo teclado.
- Janelas com largura e altura limitadas à área visível, textos longos com quebra e formulários sem larguras mínimas que forcem a página para os lados.
- Controles de toque com área mínima de 44 px em telas pequenas, campos com texto de 16 px e respeito às áreas seguras de dispositivos com recortes de tela. O zoom do navegador permanece habilitado.
- As animações continuam respeitando a preferência por movimento reduzido.

## Conferência visual de aceite

Além do lint e do build, conferir no navegador os tamanhos 320×568, 390×844, 768×1024, 1024×768, 1366×768 e 1920×1080, além de orientação horizontal e zoom de 200%.

Em cada perfil, verificar login, menu, perfil suspenso, módulos disponíveis, formulários e confirmações. No administrador, incluir usuários, responsáveis, perfis, etapas, escolas e conteúdo; no gestor, seleção de unidade, turmas, alunos e relatórios; no aluno, missões, aulas, conquistas, progresso e os dois jogos.

Usar nomes completos e de unidades longos para verificar quebra de texto. No menu e nas janelas, conferir Tab, Shift+Tab, Escape, restauração do foco e rolagem com teclado virtual aberto. Não usar dados pessoais reais para criar cenários de teste.

Nesta entrega, lint e build foram executados. A conferência visual automatizada não pôde ser concluída porque o host de acesso ao navegador estava indisponível; os cenários acima permanecem como roteiro de homologação visual.
