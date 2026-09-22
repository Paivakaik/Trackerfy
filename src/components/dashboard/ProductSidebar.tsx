"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";

export default function ProductSidebar({
  products,
  selectedId,
  onSelect,
  onCreated,
  onDeleted,
}: {
  products: Product[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreated: (p: Product) => void;
  onDeleted: (id: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(p: Product) {
    const sure = window.confirm(
      `Excluir "${p.name}"? Isso apaga também todo o histórico de eventos, gasto e a conexão de anúncios desse produto. Essa ação não pode ser desfeita.`
    );
    if (!sure) return;

    setDeletingId(p.id);
    try {
      const res = await fetch(`/api/products?id=${p.id}`, { method: "DELETE" });
      if (res.ok) onDeleted(p.id);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "erro ao criar produto");
        return;
      }
      onCreated(data.product);
      setName("");
      setSlug("");
      setCreating(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 14,
        height: "fit-content",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600 }}>
          PRODUTOS
        </span>
        <button
          onClick={() => setCreating((v) => !v)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--accent)",
            fontSize: 18,
            lineHeight: 1,
          }}
          title="Novo produto"
        >
          +
        </button>
      </div>

      {creating && (
        <form
          onSubmit={handleCreate}
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: 10,
            marginBottom: 10,
          }}
        >
          <input
            placeholder="Nome do produto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={miniInput}
          />
          <input
            placeholder="slug (opcional)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={miniInput}
          />
          {error && (
            <div style={{ color: "var(--danger)", fontSize: 12, marginBottom: 6 }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={saving}
            style={{
              width: "100%",
              padding: "7px 0",
              borderRadius: 6,
              border: "none",
              background: "var(--accent)",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {saving ? "Criando..." : "Criar"}
          </button>
        </form>
      )}

      {products.length === 0 && !creating && (
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Nenhum produto ainda. Clique em + para criar o primeiro.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {products.map((p) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              borderRadius: 8,
              border: "1px solid transparent",
              background: p.id === selectedId ? "var(--bg-elevated)" : "transparent",
              borderColor: p.id === selectedId ? "var(--border)" : "transparent",
            }}
          >
            <button
              onClick={() => onSelect(p.id)}
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: "left",
                padding: "9px 10px",
                background: "transparent",
                border: "none",
                color: p.id === selectedId ? "var(--text)" : "var(--text-muted)",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>{p.slug}</div>
            </button>
            <button
              onClick={() => handleDelete(p)}
              disabled={deletingId === p.id}
              title="Excluir produto"
              style={{
                flexShrink: 0,
                background: "transparent",
                border: "none",
                color: "var(--text-muted)",
                padding: "0 10px",
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              {deletingId === p.id ? "…" : "🗑"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const miniInput: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginBottom: 8,
  padding: "7px 9px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--bg-card)",
  color: "var(--text)",
  outline: "none",
  fontSize: 13,
};
