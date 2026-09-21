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

2. **Backend com API** (`src/app/api/*`) em Next.js, salvando em SQLite via Prisma. Suporta
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

### 2. Configurar variáveis de ambiente

Já existe um `.env` com valores padrão para teste local:

- `ADMIN_USER=admin`
- `ADMIN_PASSWORD=admin123`

**Troque essas credenciais antes de expor o projeto fora da sua máquina.**

### 3. Criar o banco de dados SQLite

```bash
npx prisma db push
```

Isso cria o arquivo `prisma/dev.db` com as tabelas.

### 4. Rodar o servidor

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) — você será redirecionado para o
login. Entre com `admin` / `admin123`.

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

## Próximos passos (quando quiser subir pra produção)

- Trocar `ADMIN_USER`/`ADMIN_PASSWORD` por algo forte e gerar um novo `NEXTAUTH_SECRET`.
- Trocar o SQLite por Postgres (Prisma facilita: troca o `provider` no
  `prisma/schema.prisma` e a `DATABASE_URL`, roda `npx prisma migrate dev`).
- Hospedar em algo como Vercel/Railway/Fly.io e apontar `data-api` do script para o domínio
  de produção.
