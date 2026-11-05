export default function PrivacyNotice() {
  return <details className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
    <summary className="cursor-pointer text-sm font-black text-emerald-900">Privacidade e proteção de dados</summary>
    <div className="mt-3 space-y-2 text-xs leading-relaxed text-emerald-950">
      <p>Os dados são utilizados para identificação, organização escolar, contato institucional e acompanhamento educacional. A coleta deve se limitar ao necessário e observar o melhor interesse da criança, conforme a seção 3.3 e as regras RN34–RN39 do relatório do projeto, que remetem à Lei nº 13.709/2018 (LGPD) e às orientações da ANPD.</p>
      <p>O cadastro de alunos é feito pelo administrador, sem exigir CPF ou e-mail infantil. Contatos de responsáveis legais, quando necessários, ficam vinculados ao aluno e não criam contas de acesso.</p>
      <p>O acesso aos dados respeita os perfis e os vínculos institucionais autorizados. Senhas são armazenadas por hash e devem ser substituídas no primeiro acesso após cadastro ou reset.</p>
      <p>Para solicitar acesso, correção ou exclusão, quando aplicáveis, procure a escola. A instituição deve verificar a identidade ou representação e responder pelo seu canal oficial.</p>
      <p>A instituição responsável deve definir e informar as hipóteses legais, autorizações aplicáveis, canais oficiais e prazos de retenção e exclusão. O preenchimento do cadastro não substitui a verificação institucional nem registra consentimento automático.</p>
      <p>Durante a prova de conceito, utilize somente dados fictícios. Não inclua documentos, informações sensíveis ou dados adicionais em campos de texto livre.</p>
    </div>
  </details>;
}
