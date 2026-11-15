# Meu DimDim

Finanças pessoais para web e Android: horas de serviço, salário, receitas e dívidas, e quanto sobra no fim do mês. React + TypeScript + Tailwind no front, Knex + Postgres (Supabase) na API, login pelo Supabase Auth.

## Funcionalidades

- **Conta e perfil** com e-mail confirmado por código, recuperação de senha (mesmo fluxo do Ritmo/health).
- **Renda**: valor da hora, salário fixo ou os dois. Meta de horas no mês (ex.: 80 ou 168).
- **Horas de serviço**: cronômetro salvo na conta (começa no celular e para no computador) ou lançamento manual (`7:30`, `7h30`, `7,5`). Cada registro guarda o valor da hora daquele momento.
- **Categorias infinitas** de despesa e de receita, com cor. Dá para arquivar sem perder o histórico.
- **Contas e cartões**: no cartão de crédito, compras a partir do dia de fechamento entram na fatura do mês seguinte.
- **Parcelado** (inclusive compra em andamento, ex.: “MAC 8/12” cria da 8ª à 12ª) e **conta fixa** todo mês (assinaturas, aluguel), que aparece como prevista até ser paga.
- **Pessoas**: “devo a fulano” / “fulano me deve”, saldo por pessoa somando todos os meses e botão de quitar tudo.
- **Resumo do mês**: sobra, receita × despesas, horas que faltam para a meta, sobra projetada se bater a meta, despesas por categoria, por conta/cartão e evolução de 6 meses. Cada despesa mostra quantas horas de trabalho custa.
- Modo claro/escuro, instalável como app pelo navegador (manifest) e Android via Capacitor.

## Estrutura

- `shared/finance.ts`: regras de dinheiro e horas (centavos inteiros, meses `AAAA-MM`), usadas pela API e pelo app. Testes em `tests/`.
- `db/migrations`: esquema Knex. RLS ligado sem políticas: as tabelas só são acessadas pela API.
- `api/index.ts`: única função da Vercel; `vercel.json` manda `/api/*` para ela. Rotas em `api/_lib/router.ts`, sempre filtradas pelo `user_id` do token.
- `src/`: app React. `store.tsx` (dados da conta e do mês, `useStore`), `navigation.tsx` (abas, `useNav`), `components/` (peças reutilizáveis), `hooks/useAction.ts` (salvar/excluir com carregando e erro) e `screens/<tela>/` com Início, Lançamentos, Horas, Pessoas e Ajustes.

## Rodar localmente

```sh
cp .env.example .env   # preencha com os dados do Supabase
npm install
npm run db:migrate     # cria as tabelas no Supabase
npm run dev            # front + /api no mesmo servidor do Vite
npm test
```

## Supabase

1. Crie o projeto. Em **Connect → Transaction pooler** copie a URL (porta 6543) para `DATABASE_URL`.
2. Em **Project Settings → API** copie a URL e a chave `anon` para `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` e `SUPABASE_URL`/`SUPABASE_ANON_KEY`.
3. `npm run db:migrate`.
4. E-mail (SMTP do Gmail, templates com código de 6 dígitos em `supabase/templates`): preencha o bloco "Admin local" do `.env` e rode `npm run auth:configure`.

## Vercel

1. Importe o repositório (framework: Vite).
2. Variáveis de ambiente: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` e, se for usar o app Android, `ALLOWED_ORIGINS=https://localhost,capacitor://localhost`.
3. Deploy. O front e a API saem no mesmo domínio.

## Android

O app abre o front embutido e chama a API publicada:

```sh
# no .env: VITE_API_URL=https://seu-app.vercel.app
npm run android:sync
npm run android:open
```
