# Trackfy

Ferramenta própria de rastreamento de funil/vendas (estilo Utmify) para produtos low ticket.

## O que tem aqui

1. **Script de rastreamento** (`public/track.js`) — cole em qualquer página de vendas ou
   checkout. Dispara automaticamente `click` (assim que o script carrega) e `page_view`
   (quando a página termina de carregar), e expõe `window.trackfy('initiate_checkout')` e
   `window.trackfy('purchase', { value, payment_method, status, tax })` para você chamar
   manualmente. Cada evento carrega `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`,
   `ad_account` (opcional, via `?ad_account=` na URL) e um `session_id` persistido em
   `localStorage`, para seguir a mesma pessoa do clique até a compra.

2. **Backend com API** (`src/app/api/*`) em Next.js, salvando em Postgres via Prisma. Suporta
   vários produtos/ofertas ao mesmo tempo — cada evento é associado a um produto pelo campo
   `data-product` do script.

3. **Dashboard com login** (`/dashboard`, protegido por NextAuth) com:
   - **Resumo**: Faturamento Líquido, Gastos com anúncios, ROAS, Lucro, Vendas Pendentes,
     ROI, Margem de Lucro, Vendas Reembolsadas, Reembolso %, ARPU, Imposto, Chargeback % e um
     gráfico de Vendas por Pagamento (Pix / Cartão / Boleto / Outros).
   - **Funil**: Cliques → Page View → Initiate Checkout → Vendas, com número absoluto e
     porcentagem em relação ao topo (a % só cai, nunca sobe).
   - Filtros de período (hoje / 7 dias / 30 dias / personalizado), conta de anúncio,
     plataforma (`utm_source`) e campanha (`utm_campaign`).
   - Campo para lançar manualmente o gasto com anúncio do período/campanha selecionado — os
     cards de Resumo (ROAS, Lucro, ROI, custo por venda etc.) são calculados automaticamente
     a partir disso.

## Rodando local

### 1. Instalar dependências

```bash
npm install
```

### 2. Ter um banco Postgres

O projeto usa Postgres (necessário para rodar na Vercel — veja a seção **Deploy na Vercel**
abaixo). Para desenvolvimento local, a forma mais rápida é criar um banco **gratuito** no
[Neon](https://neon.tech) (ou usar o mesmo banco que você já criou na Vercel, se já tiver
feito o deploy — ver abaixo): crie a conta, crie um projeto, copie a "Connection string".

### 3. Configurar variáveis de ambiente

Edite o `.env` (já existe um com valores de exemplo):

```bash
DATABASE_URL="postgresql://..."   # cole a connection string do Neon aqui
ADMIN_USER="paiva"
ADMIN_PASSWORD="Kaiklindo1234"
```

**Troque essas credenciais antes de expor o projeto fora da sua máquina.**

### 4. Criar as tabelas no banco

```bash
npx prisma db push
```

### 5. Rodar o servidor

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) — você será redirecionado para o
login. Entre com `paiva` / `Kaiklindo1234`.

## Testando o funil ponta a ponta (sem precisar da sua página real ainda)

O projeto já inclui 3 páginas de demonstração que simulam uma jornada completa:

1. [http://localhost:3000/demo/index.html?utm_source=facebook&utm_medium=cpc&utm_campaign=teste1](http://localhost:3000/demo/index.html?utm_source=facebook&utm_medium=cpc&utm_campaign=teste1)
   (página de vendas — dispara `click` e `page_view`)
2. Clique em "Quero comprar agora" → vai para o checkout (dispara `initiate_checkout`)
3. Clique em "Confirmar pagamento" → vai para a página de obrigado (dispara `purchase` com
   valor R$ 97,00)

Depois disso, abra o dashboard e selecione o produto **demo-produto** — o funil deve
mostrar 1 em cada etapa. Repita o fluxo várias vezes (inclusive abandonando em etapas
diferentes) para ver os números e porcentagens mudarem.

Para testar os cards de Resumo com cenários diferentes, acesse a página de obrigado
diretamente com parâmetros:

- `/demo/obrigado.html?method=pix&status=paid` — venda paga via Pix
- `/demo/obrigado.html?method=boleto&status=pending` — aparece em "Vendas Pendentes"
- `/demo/obrigado.html?status=refunded` — aparece em "Vendas Reembolsadas" e no % de Reembolso
- `/demo/obrigado.html?status=chargeback` — aparece no % de Chargeback

## Instalando na sua página de vendas de verdade

No dashboard, dentro de cada produto, clique em **"Como instalar o script neste produto"**
para ver o snippet exato (com o slug do produto já preenchido) e copiar para colar na sua
página.

Resumo:

```html
<script
  src="http://localhost:3000/track.js"
  data-product="nome-do-seu-produto"
  data-api="http://localhost:3000/api/track"
></script>
```

- `page_view` e `click` são automáticos.
- No botão de comprar: `onclick="trackfy('initiate_checkout')"`.
- Na página de obrigado:
  ```js
  trackfy('purchase', {
    value: 97.00,
    payment_method: 'pix',   // 'pix' | 'card' | 'boleto' | 'other' (padrão: 'other')
    status: 'paid',          // 'paid' | 'pending' | 'refunded' | 'chargeback' (padrão: 'paid')
    tax: 4.85,                 // opcional
  });
  ```

Você não precisa cadastrar o produto manualmente antes — ele é criado automaticamente no
banco na primeira vez que um evento chega com aquele `data-product`. Mas também dá para
criar produtos antecipadamente pelo botão **+** na barra lateral do dashboard.

### Sobre status de pagamento (pendente/reembolsado/chargeback)

Sem integração com o gateway de pagamento (Hotmart, Kiwify, Stripe etc.), o Trackfy não
sabe sozinho quando uma venda paga vira reembolso ou chargeback dias depois — isso
normalmente chega por webhook do gateway. Por enquanto, `status` só reflete o que você
manda no momento da compra (ex: `pending` para boleto ainda não compensado). Se você quiser,
dá para eu adicionar depois um endpoint de webhook para o seu gateway atualizar o status
automaticamente.

## Sobre a etapa "Cliques" do funil

Como o script só roda nas páginas que você controla (vendas/checkout), não existe uma
camada externa de clique em anúncio antes disso. Por isso "Clique" aqui é definido como o
instante em que o script começa a executar (o mais cedo possível no carregamento da
página), e "Page View" é quando a página termina de carregar. A diferença entre os dois
mostra visitantes que abriram a página mas saíram antes dela carregar por completo. Se
você já usa um link de redirecionamento/cloaker antes da página de vendas, dá para me
pedir para conectar essa camada como uma etapa de clique "de verdade" depois.

## Deploy na Vercel

O projeto (repositório [Paivakaik/Trackerfy](https://github.com/Paivakaik/Trackerfy)) já
está conectado à Vercel, mas o primeiro deploy falha (`404: DEPLOYMENT_NOT_FOUND`) porque
faltam as variáveis de ambiente — sem elas, o build quebra logo no `prisma generate`. Para
corrigir:

### 1. Criar o banco Postgres

No painel da Vercel, dentro do projeto **Trackerfy**: aba **Storage** → **Create Database**
→ **Postgres** (é o Neon por baixo dos panos, tem plano gratuito). Depois de criado, a
Vercel já oferece para conectar automaticamente ao projeto — aceite. Isso cria a variável
`DATABASE_URL` sozinha (às vezes com outro nome, tipo `POSTGRES_PRISMA_URL` — se for o
caso, copie o valor dela para uma variável chamada exatamente `DATABASE_URL`, que é o nome
que o `prisma/schema.prisma` espera).

### 2. Configurar as demais variáveis de ambiente

Ainda no projeto, aba **Settings → Environment Variables**, adicione (para o ambiente
Production, e Preview se quiser testar branches):

| Nome | Valor |
|---|---|
| `ADMIN_USER` | `paiva` |
| `ADMIN_PASSWORD` | `Kaiklindo1234` |
| `NEXTAUTH_SECRET` | gere um valor com `openssl rand -base64 32` (ou peça pra mim) |
| `NEXTAUTH_URL` | `https://trackerfy-eight.vercel.app` (ou o domínio final do projeto) |

`DATABASE_URL` já deve estar lá pelo passo 1.

### 3. Criar as tabelas no banco de produção

Com o `DATABASE_URL` de produção também no seu `.env` local (ou exportado no terminal),
rode uma vez:

```bash
npx prisma db push
```

Isso cria as tabelas no banco Postgres que a Vercel vai usar.

### 4. Rodar o deploy de novo

Aba **Deployments** → nos três pontinhos do último deploy (o que falhou) → **Redeploy**.
Ou simplesmente faça um novo `git push` — qualquer commit novo na branch `main` já dispara
um deploy automático.

Depois disso, `https://trackerfy-eight.vercel.app` deve abrir a tela de login normalmente,
com `paiva` / `Kaiklindo1234`.

### 5. Apontar o script de rastreamento pra produção

Depois que o site estiver no ar, troque `data-api` e `src` no snippet de instalação (veja
"Como instalar o script neste produto" no dashboard) para o domínio de produção em vez de
`localhost:3000`.
