"use client";

import { useEffect, useState, useCallback, useRef } from "react";

type MetaStatus = {
  connected: boolean;
  adAccountId?: string | null;
  adAccountName?: string | null;
  lastSyncedAt?: string | null;
  lastSyncError?: string | null;
  tokenExpired?: boolean;
};

type MetaAccount = { id: string; accountId: string; name: string };

export default function MetaConnect({
  productId,
  justConnected,
  connectError,
  onSynced,
}: {
  productId: string;
  justConnected: boolean;
  connectError: string | null;
  onSynced: () => void;
}) {
  const [status, setStatus] = useState<MetaStatus | null>(null);
  const [accounts, setAccounts] = useState<MetaAccount[] | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(connectError);
  const [selecting, setSelecting] = useState(false);
  const statusReq = useRef(0);

  const loadStatus = useCallback(() => {
    const reqId = ++statusReq.current;
    fetch(`/api/meta/status?productId=${productId}`)
      .then((r) => r.json())
      .then((data) => {
        if (reqId === statusReq.current) setStatus(data);
      });
  }, [productId]);

  const loadAccounts = useCallback(() => {
    setLoadingAccounts(true);
    fetch(`/api/meta/accounts?productId=${productId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setAccounts(data.accounts || []);
      })
      .finally(() => setLoadingAccounts(false));
  }, [productId]);

  useEffect(() => {
    loadStatus();
    setAccounts(null);
    setError(connectError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (justConnected) loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justConnected, productId]);

  // Sincroniza sozinho se já estiver conectado e a última sincronização foi
  // há mais de 1 hora (ou nunca aconteceu) — dá a sensação de "sempre
  // atualizado" sem depender só do cron diário.
  useEffect(() => {
    if (!status?.connected || !status.adAccountId) return;
    const last = status.lastSyncedAt ? new Date(status.lastSyncedAt).getTime() : 0;
    const staleMs = 60 * 60 * 1000;
    if (Date.now() - last > staleMs) {
      handleSync(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected, status?.adAccountId]);

  async function handleSync(silent = false) {
    if (!silent) setSyncing(true);
    try {
      const res = await fetch("/api/meta/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (!silent) setError(data.error);
      } else {
        onSynced();
      }
    } finally {
      loadStatus();
      if (!silent) setSyncing(false);
    }
  }

  async function handleSelectAccount(account: MetaAccount) {
    setSelecting(true);
    setError(null);
    try {
      const res = await fetch("/api/meta/select-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          adAccountId: account.id,
          adAccountName: account.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        if (data.warning) setError(data.warning);
        setAccounts(null);
        loadStatus();
        onSynced();
      }
    } finally {
      setSelecting(false);
    }
  }

  async function handleDisconnect() {
    await fetch("/api/meta/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    setAccounts(null);
    setStatus({ connected: false });
    onSynced();
  }

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "10px 14px",
        marginBottom: 12,
        fontSize: 13,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--text-muted)" }}>Meta Ads:</span>
          {!status ? (
            <span style={{ color: "var(--text-muted)" }}>carregando...</span>
          ) : !status.connected ? (
            <span style={{ color: "var(--text-muted)" }}>não conectado</span>
          ) : !status.adAccountId ? (
            <span style={{ color: "var(--warn)" }}>escolha a conta abaixo</span>
          ) : (
            <>
              <span style={{ fontWeight: 600 }}>{status.adAccountName}</span>
              {status.tokenExpired ? (
                <span style={{ color: "var(--danger)" }}>· sessão expirada, reconecte</span>
              ) : status.lastSyncedAt ? (
                <span style={{ color: "var(--text-muted)" }}>
                  · sincronizado {timeAgo(status.lastSyncedAt)}
                </span>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>· ainda não sincronizado</span>
              )}
            </>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {status?.connected && status.adAccountId && !status.tokenExpired && (
            <button onClick={() => handleSync(false)} disabled={syncing} style={smallBtn}>
              {syncing ? "Sincronizando..." : "Sincronizar agora"}
            </button>
          )}
          {status?.connected ? (
            <>
              {(status.tokenExpired || !status.adAccountId) && (
                <a href={`/api/meta/connect?productId=${productId}`} style={smallBtnLink}>
                  Reconectar
                </a>
              )}
              <button onClick={handleDisconnect} style={smallBtnGhost}>
                Desconectar
              </button>
            </>
          ) : (
            <a href={`/api/meta/connect?productId=${productId}`} style={smallBtnLink}>
              Conectar conta de anúncios
            </a>
          )}
        </div>
      </div>

      {loadingAccounts && (
        <div style={{ marginTop: 8, color: "var(--text-muted)" }}>Buscando contas de anúncio...</div>
      )}

      {accounts && accounts.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ color: "var(--text-muted)", marginBottom: 6 }}>
            Escolha qual conta de anúncios usar para este produto:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => handleSelectAccount(a)}
                disabled={selecting}
                style={{
                  textAlign: "left",
                  padding: "7px 10px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--bg-elevated)",
                  color: "var(--text)",
                }}
              >
                {a.name} <span style={{ color: "var(--text-muted)" }}>({a.accountId})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {accounts && accounts.length === 0 && (
        <div style={{ marginTop: 8, color: "var(--text-muted)" }}>
          Nenhuma conta de anúncios encontrada nesse login da Meta.
        </div>
      )}

      {error && (
        <div style={{ marginTop: 8, color: "var(--danger)" }}>{error}</div>
      )}
    </div>
  );
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "agora mesmo";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.round(hours / 24);
  return `há ${days}d`;
}

const smallBtn: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--bg-elevated)",
  color: "var(--text)",
  fontSize: 12,
};

const smallBtnGhost: React.CSSProperties = {
  ...smallBtn,
  color: "var(--text-muted)",
};

const smallBtnLink: React.CSSProperties = {
  ...smallBtn,
  background: "var(--accent)",
  color: "white",
  border: "none",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};
