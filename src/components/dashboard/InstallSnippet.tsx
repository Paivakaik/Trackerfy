"use client";

import { useState } from "react";

export default function InstallSnippet({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const snippet = `<script
  src="${origin}/track.js"
  data-product="${slug}"
  data-api="${origin}/api/track"
></script>`;

  const checkoutSnippet = `<button onclick="trackfy('initiate_checkout')">Comprar agora</button>`;
  const purchaseSnippet = `<script>
  // Chame na página de obrigado/confirmação, com o valor da venda.
  // payment_method, status e tax são opcionais:
  trackfy('purchase', {
    value: 97.00,
    payment_method: 'pix',   // 'pix' | 'card' | 'boleto' | 'other' (padrão: 'other')
    status: 'paid',          // 'paid' | 'pending' | 'refunded' | 'chargeback' (padrão: 'paid')
    tax: 4.85,                // opcional: valor de imposto dessa venda
  });
</script>`;
  const adAccountSnippet = `<!-- Para o filtro "Conta de Anúncio", marque o link do seu anúncio com ?ad_account=nome-da-conta -->
https://sua-pagina.com/?utm_source=facebook&utm_campaign=teste1&ad_account=conta-01`;

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 18,
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--text)",
          fontWeight: 600,
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          justifyContent: "space-between",
        }}
      >
        <span>Como instalar o script neste produto</span>
        <span style={{ color: "var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 14 }}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 0 }}>
            1. Cole no {"<head>"} da página de vendas e da página de checkout (pageview e clique
            são automáticos):
          </p>
          <CodeBlock code={snippet} />
          <button onClick={copy} style={copyBtn}>
            {copied ? "Copiado ✓" : "Copiar snippet"}
          </button>

          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 18 }}>
            2. Para registrar o clique em "comprar" (Initiate Checkout), adicione{" "}
            <code style={inlineCode}>onclick="trackfy('initiate_checkout')"</code> no botão, ou
            chame manualmente:
          </p>
          <CodeBlock code={checkoutSnippet} />

          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 18 }}>
            3. Na página de obrigado/confirmação de compra, dispare o evento de venda com o
            valor:
          </p>
          <CodeBlock code={purchaseSnippet} />

          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 18 }}>
            4. (opcional) Sem integração com o gateway de pagamento, reembolsos e chargebacks
            não são detectados automaticamente — se o seu checkout já sabe o status real, passe
            no <code style={inlineCode}>status</code> acima. Para o filtro de{" "}
            <b>Conta de Anúncio</b>, adicione <code style={inlineCode}>ad_account</code> como
            parâmetro na URL do seu anúncio:
          </p>
          <CodeBlock code={adAccountSnippet} />
        </div>
      )}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 12,
        overflowX: "auto",
        fontSize: 12.5,
        lineHeight: 1.6,
        color: "var(--accent-2)",
        margin: 0,
      }}
    >
      {code}
    </pre>
  );
}

const inlineCode: React.CSSProperties = {
  background: "var(--bg-elevated)",
  padding: "2px 6px",
  borderRadius: 4,
  fontSize: 12.5,
};

const copyBtn: React.CSSProperties = {
  marginTop: 8,
  padding: "7px 14px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--bg-elevated)",
  color: "var(--text)",
  fontSize: 12.5,
};
