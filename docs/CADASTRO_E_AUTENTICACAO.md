# Cadastro por categoria e autenticação

Implementação baseada na seção 3.3, RF01–RF02, RN03–RN06 e RN34–RN39 do relatório técnico atualizado. A escolha de senha temporária por matrícula para alunos e CPF para profissionais é uma determinação do usuário nesta evolução; não é atribuída ao texto acadêmico como regra original.

| Categoria | Identificação de acesso | Senha inicial após cadastro ou reset |
| --- | --- | --- |
| Aluno | Matrícula | Matrícula, preservando zeros à esquerda |
| Gestor Escolar | CPF | CPF com 11 dígitos |
| Administrador | CPF | CPF com 11 dígitos |

Toda senha temporária exige substituição antes de acessar os módulos. A nova senha deve ser diferente da matrícula (aluno) ou CPF (profissional), com pelo menos 8 caracteres, ou 12 para administrador. O reset revoga as sessões existentes e não apaga dados, vínculos, XP ou histórico. A senha é armazenada por hash scrypt, sem credenciais em texto simples.

## Formulários

- **Aluno:** nome completo e matrícula obrigatória e única na plataforma, perfil de acesso compatível e vínculo com uma unidade ativa quando disponível. A turma continua sendo definida exclusivamente pelo Gestor Escolar. CPF e e-mail infantil não são exigidos nem solicitados pelo novo formulário. Data de nascimento é opcional, para situações em que seja necessária à identificação.
- **Responsáveis legais:** até três contatos opcionais, ligados ao aluno, sem contas próprias. Cada contato informado exige nome, parentesco/vínculo e ao menos e-mail ou telefone. O formulário orienta a coleta somente quando necessária às finalidades educacionais. Não são solicitados CPF, documentos ou informações sensíveis dos responsáveis.
- **Profissionais:** conta individual com nome completo, CPF, e-mail profissional e perfil compatível. Nascimento opcional. Os vínculos do gestor com escolas continuam sendo autorizados no gerenciamento de Unidades Escolares. Não há seção de responsáveis ou matrícula para profissionais.

As validações são aplicadas na API, além do formulário. A listagem administrativa distingue matrícula de aluno e CPF de profissional e sinaliza identificadores ausentes. Reset sem identificador é bloqueado até a correção. A visualização detalhada exibe contatos dos responsáveis somente a administradores autorizados; esses contatos não entram na sessão, na listagem geral ou nos relatórios pedagógicos.

## Registros existentes

A migração `012_role_specific_onboarding.sql` acrescenta matrícula ao cadastro da conta, independente do vínculo escolar atual, e copia as matrículas já registradas nos vínculos. Assim, desativar uma escola não elimina a matrícula necessária ao reset. A migração 013 e a API impedem novas matrículas duplicadas em toda a plataforma, inclusive entre escolas e contas inativas. Colisões legadas não bloqueiam a inicialização, mas o login ambíguo é recusado até a correção administrativa.

O hook Python executado por `db:migrate` e na inicialização é idempotente:

1. Alunos com troca de senha pendente e matrícula conhecida recebem o novo hash temporário baseado na matrícula e têm as sessões antigas revogadas.
2. Senhas pessoais já definidas são preservadas; o próximo reset usa a regra da categoria atual.
3. Alunos sem matrícula não recebem dados inventados; o administrador deve completar o cadastro antes do reset. Se ainda usavam senha temporária, o acesso fica bloqueado até a correção. A senha pessoal é preservada, mas a matrícula precisa ser preenchida para o novo login.
4. Profissionais continuam usando CPF. Registros antigos sem CPF precisam de complementação antes do reset. Login por nome de usuário ou e-mail não é mais aceito. Uma sessão administrativa aberta pode completar o CPF. Sem sessão, o provisionamento local pode completar o CPF explicitamente informado para um administrador ativo identificado pelo e-mail de cadastro, preservando sua senha e sem reativar contas.
5. E-mails e CPFs antigos não são apagados automaticamente. A adequação de retenção/exclusão é institucional. O formulário de aluno não exige sua repetição.

Alterar matrícula ou CPF de uma conta ainda em primeiro acesso atualiza a senha temporária e revoga suas sessões. Em conta com senha pessoal, a senha é preservada e o reset permanece uma ação separada. Mudar a categoria exige novo primeiro acesso pela regra da categoria de destino.

O importador SQLite preenche os novos campos com valores ausentes, sem fabricar matrícula ou contatos, preserva o histórico e executa a atualização de credenciais após verificar os dados importados.

## Privacidade

As orientações de privacidade ficam disponíveis no cadastro administrativo. O bloco foi retirado da tela de login conforme a solicitação posterior de simplificação visual. Elas refletem o relatório: finalidade educacional, necessidade e minimização, melhor interesse da criança, acesso por perfil/vínculo e encaminhamento de solicitações por intermédio da escola, com verificação de identidade ou representação e resposta em canal oficial.

O relatório cita a Lei nº 13.709/2018 e orientações da ANPD. O cadastro não constitui consentimento automático, não declara uma hipótese legal universal e não substitui a formalização da instituição responsável sobre autorizações, canais, retenção e exclusão. Não foram inventados dados de encarregado ou canais oficiais. Na prova de conceito, use apenas dados fictícios.

## Atualizar outro computador

Execute `npm.cmd run db:migrate` e reinicie a API antes de usar o novo frontend. Não copie `.env`, bancos ou dados pessoais para o GitHub. A nova migração e o hook fazem parte do código versionável.

## Identificação por nome completo

O nome completo substitui o antigo nome de usuário na interface. Nomes completos podem se repetir: não são credenciais de login. O campo legado `username` fica preservado internamente para compatibilidade dos dados, mas não é exigido em novos cadastros nem utilizado na autenticação. A tela comum separa Aluno (matrícula) de Gestor Escolar (CPF); a tela administrativa aceita somente CPF. Senhas pessoais existentes não são resetadas por essa alteração.
