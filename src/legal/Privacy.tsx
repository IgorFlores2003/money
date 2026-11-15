import { useEffect, useState, type ReactNode } from "react";
import { RiArrowLeftLine, RiCloseLine, RiMoneyDollarCircleLine } from "react-icons/ri";

/** Quem responde pelos dados (controlador, art. 5º, VI, da LGPD) e canal do titular. */
export const CONTROLLER = {
  name: "Igor Flores Bento",
  email: "igorfb2003@gmail.com",
};
/** Mude a versão sempre que o texto mudar: o aceite no cadastro guarda qual foi aceita. */
export const PRIVACY_VERSION = "2026-11-16";
const UPDATED = "16 de novembro de 2026";
export const PRIVACY_PATH = "/privacidade";

/** Link que abre a política por cima da tela atual (não perde o que foi digitado). */
export function PrivacyLink({ className = "", children = "Política de Privacidade" }: { className?: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`underline ${className}`} onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && <Privacy onClose={() => setOpen(false)} />}
    </>
  );
}

/**
 * Política de Privacidade (LGPD — Lei 13.709/2018). Sem `onClose` é a página pública
 * /privacidade (link para o Google Play); com `onClose`, abre por cima do app.
 */
export default function Privacy({ onClose }: { onClose?: () => void }) {
  useEffect(() => {
    if (!onClose) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  const mail = <a className="font-medium text-brand-700 underline" href={`mailto:${CONTROLLER.email}`}>{CONTROLLER.email}</a>;
  return (
    <div
      className={onClose ? "fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-page" : "min-h-dvh bg-page"}
      role={onClose ? "dialog" : undefined}
      aria-modal={onClose ? true : undefined}
      aria-label="Política de Privacidade"
    >
      <div className="mx-auto max-w-2xl px-4 pt-[calc(24px+env(safe-area-inset-top))] pb-[calc(48px+env(safe-area-inset-bottom))]">
        {onClose ? (
          <button type="button" className="btn-ghost -ml-3 mb-4 inline-flex" onClick={onClose}>
            <RiCloseLine className="size-5" /> Fechar
          </button>
        ) : (
          <a href="/" className="btn-ghost -ml-3 mb-4 inline-flex">
            <RiArrowLeftLine className="size-5" /> Voltar ao app
          </a>
        )}
        <article className="card flex flex-col gap-6 text-[15px] leading-relaxed text-ink-700">
          <header>
            <p className="mb-3 flex items-center gap-2 text-lg font-bold text-ink-900">
              <RiMoneyDollarCircleLine className="size-6 text-brand-600" /> Meu DimDim
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">Política de Privacidade</h1>
            <p className="mt-1 text-sm text-ink-500">Última atualização: {UPDATED}</p>
          </header>

          <p>
            Esta política explica quais dados pessoais o Meu DimDim (site e aplicativo Android) trata, por que, com quem
            são compartilhados e como você exerce seus direitos, conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº
            13.709/2018).
          </p>

          <Section title="1. Quem é o responsável">
            <p>
              O controlador dos seus dados é <strong>{CONTROLLER.name}</strong>, pessoa física responsável pelo Meu
              DimDim. Para qualquer assunto sobre privacidade, inclusive como encarregado (art. 41 da LGPD), escreva para{" "}
              {mail}.
            </p>
          </Section>

          <Section title="2. Quais dados tratamos">
            <List
              items={[
                <><strong>Cadastro:</strong> nome, e-mail e senha. A senha é guardada apenas como hash (bcrypt) pelo serviço de autenticação; ninguém, nem nós, consegue lê-la.</>,
                <><strong>Renda e trabalho:</strong> valor da hora, salário, meta de horas, registros de horas trabalhadas e o cronômetro.</>,
                <><strong>Lançamentos:</strong> despesas e receitas (valor, descrição, data, categoria, conta ou cartão, parcelas, contas fixas) que você mesmo digita. Não pedimos número de cartão, conta bancária nem CPF.</>,
                <><strong>Fotos para lançamento:</strong> se você usar “Lançar por foto”, a imagem (planilha, extrato, nota) é enviada para leitura automática. Ela não é guardada no Meu DimDim: só os lançamentos que você confirmar são salvos.</>,
                <><strong>Pessoas citadas por você:</strong> nomes que você informa em “devo a alguém” / “alguém me deve”.</>,
                <><strong>Dados técnicos:</strong> a sessão de login e a preferência de tema ficam guardadas no seu aparelho. Os provedores de hospedagem registram dados de acesso (como IP, data e hora) por segurança.</>,
              ]}
            />
            <p>Não usamos cookies de rastreamento, anúncios nem ferramentas de análise de comportamento.</p>
          </Section>

          <Section title="3. Para que usamos e com qual base legal">
            <List
              items={[
                <><strong>Criar e manter sua conta e mostrar seus cálculos</strong> (sobra do mês, horas, saldos por pessoa): execução do contrato de uso do app (art. 7º, V).</>,
                <><strong>Ler fotos que você envia e sugerir lançamentos</strong> para você conferir: execução do contrato (art. 7º, V), só quando você escolhe usar o recurso.</>,
                <><strong>Enviar códigos de confirmação e de recuperação de senha por e-mail:</strong> execução do contrato (art. 7º, V).</>,
                <><strong>Proteger o serviço contra acessos indevidos e fraudes:</strong> legítimo interesse (art. 7º, IX) e exercício regular de direitos (art. 7º, VI).</>,
                <><strong>Nomes de terceiros que você informa:</strong> são usados só para o seu controle pessoal, dentro da sua conta, e nunca para contatar essas pessoas. Ao informá-los, você declara que tem legitimidade para isso.</>,
              ]}
            />
            <p>Seus dados não são vendidos, alugados nem usados para publicidade.</p>
          </Section>

          <Section title="4. Com quem compartilhamos">
            <p>Apenas com os fornecedores necessários para o app funcionar, que tratam os dados em nosso nome (operadores):</p>
            <List
              items={[
                <><strong>Supabase</strong>: banco de dados e login.</>,
                <><strong>Vercel</strong>: hospedagem do site e da API.</>,
                <><strong>Google (Gmail)</strong>: envio dos e-mails com códigos.</>,
                <><strong>Google (Gemini)</strong>: leitura das fotos enviadas em “Lançar por foto”. Pelos termos do Google para esse serviço, o conteúdo enviado pode ser analisado pelo Google, inclusive para melhorar os produtos dele. Por isso, evite fotos com dados que você não queira compartilhar (como número completo de cartão ou documentos). O recurso é opcional.</>,
              ]}
            />
            <p>Também podemos fornecer dados se uma lei ou ordem de autoridade competente exigir.</p>
          </Section>

          <Section title="5. Transferência internacional">
            <p>
              Os servidores desses fornecedores ficam nos Estados Unidos. A transferência é feita com base nas garantias
              contratuais e de segurança oferecidas por eles (art. 33 da LGPD) e é necessária para prestar o serviço que
              você contratou.
            </p>
          </Section>

          <Section title="6. Como protegemos">
            <List
              items={[
                "Toda comunicação é criptografada (HTTPS/TLS), inclusive a conexão com o banco de dados, que confere o certificado do servidor.",
                "Cada conta só acessa os próprios dados: toda consulta é filtrada pelo seu usuário, e o banco bloqueia acesso direto de fora da API.",
                "Senhas guardadas só como hash; e-mail confirmado por código antes do primeiro acesso.",
                "No Android, os dados do app não vão para backups na nuvem nem são copiados para outro aparelho.",
              ]}
            />
            <p>Nenhum sistema é 100% seguro. Se houver um incidente com risco relevante, avisaremos você e a ANPD.</p>
          </Section>

          <Section title="7. Por quanto tempo guardamos">
            <p>
              Enquanto sua conta existir. Ao excluir a conta, todos os seus dados são apagados do banco na hora, de forma
              definitiva. Cópias de segurança automáticas dos fornecedores e registros de acesso podem permanecer por
              tempo limitado (em geral até 30 dias) até serem sobrescritos, ou pelo prazo que a lei exigir.
            </p>
          </Section>

          <Section title="8. Seus direitos (art. 18 da LGPD)">
            <List
              items={[
                <><strong>Confirmação e acesso:</strong> em Ajustes → Privacidade e dados → “Baixar meus dados”.</>,
                <><strong>Portabilidade:</strong> o mesmo arquivo, em formato aberto (JSON).</>,
                <><strong>Correção:</strong> edite perfil, lançamentos, horas, categorias e contas a qualquer momento no app.</>,
                <><strong>Eliminação:</strong> em Ajustes → Privacidade e dados → “Excluir minha conta”, sem precisar falar com ninguém.</>,
                <><strong>Informação</strong> sobre com quem compartilhamos (seção 4), <strong>oposição</strong>, <strong>revisão</strong> e <strong>revogação</strong> do consentimento: pelo e-mail {CONTROLLER.email}.</>,
              ]}
            />
            <p>
              Respondemos pedidos por e-mail em até 15 dias. Você também pode reclamar à Autoridade Nacional de Proteção
              de Dados (ANPD), em gov.br/anpd.
            </p>
          </Section>

          <Section title="9. Menores de idade">
            <p>O Meu DimDim é destinado a maiores de 18 anos. Não coletamos dados de crianças e adolescentes de propósito.</p>
          </Section>

          <Section title="10. Mudanças nesta política">
            <p>
              Se esta política mudar, a data acima será atualizada e, em mudanças importantes, avisaremos no app ou por
              e-mail.
            </p>
          </Section>

          <p className="border-t border-line pt-4 text-sm text-ink-500">Dúvidas: {mail}</p>
        </article>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
