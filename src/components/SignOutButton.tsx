"use client";

import { signOut } from "next-auth/react";

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      style={{
        background: "transparent",
        border: "1px solid var(--border)",
        color: "var(--text-muted)",
        padding: "6px 14px",
        borderRadius: 8,
        fontSize: 13,
      }}
    >
      Sair
    </button>
  );
}
