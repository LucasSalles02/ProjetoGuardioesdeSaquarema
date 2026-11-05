# XP, níveis e conquistas

Regras implementadas a partir do Relatório Técnico atualizado, RF05–RF08 e RN21–RN33 (Quadro 4, páginas 20–21).

| Nível | XP acumulado |
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

A barra representa o avanço dentro do nível atual. No nível 10 fica em 100%, e o XP continua acumulando sem criar novos níveis. Sessão, progresso e relatórios escolares utilizam a mesma função em `gds/progression.py`.

Missões fáceis concedem 10 XP; médias, 20 XP; difíceis, 30 XP. O administrador seleciona a dificuldade pelo valor correspondente. A API e o banco rejeitam outros valores. A primeira conclusão diária continua sendo a única remunerada, considerando a data de Brasília.

Conquistas não concedem XP. A situação é calculada pelo nível alcançado e reflete imediatamente o XP existente. O relatório não define a quantidade, os nomes ou a distribuição das conquistas (seção 9); foi adotado um catálogo inicial de dez conquistas temáticas, uma por nível, em `backend/python/gds/data/seed.json`. A primeira está disponível ao alcançar o nível inicial, de 0 XP. Cada cartão informa nome, nível, XP necessário e situação, com ícone próprio e cadeado quando bloqueado.

O Administrador visualiza o catálogo inteiro, com todos os ícones coloridos, sem receber XP ou registros de conquistas por consultá-lo. Os relatórios escolares consultam as conquistas efetivamente alcançadas pelo aluno.

## Compatibilidade

A migração `011_documented_progression.sql` preserva XP acumulado, atividades e prêmios históricos. Ela ajusta somente recompensas futuras das missões: valores que já são 10/20/30 permanecem; demais valores até 40 tornam-se 10, até 60 tornam-se 20 e superiores tornam-se 30. O importador SQLite aplica a mesma conversão e continua verificando os registros importados. O administrador pode revisar as dificuldades no gerenciamento de conteúdo.

Prêmios antigos permanecem no histórico; o catálogo anterior deixa de determinar os desbloqueios atuais. Novos desbloqueios registram zero XP. Os valores e limites de recompensa de minigames ainda não são definidos numericamente pelo relatório; seus valores configuráveis existentes foram mantidos. O XP das aulas também foi preservado.

Execute `npm.cmd run db:migrate` ao atualizar outro computador. A documentação PDF não é necessária para executar a aplicação.
