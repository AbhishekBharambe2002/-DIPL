"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const callback = useSearchParams().get("callbackUrl") || "/app";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signIn("credentials", { identifier, password, redirect: false });
      if (result?.error) {
        setError("Those credentials are not recognised.");
        return;
      }
      router.replace(callback.startsWith("/") && !callback.startsWith("//") ? callback : "/app");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    "mt-1.5 w-full border border-paper-300 bg-paper-50 px-3 py-3 text-[16px] lg:text-[14px] text-ink-900 outline-none placeholder:text-ink-400 focus:border-ink-700";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="admin-id" className="label">
          Administrator ID or email
        </label>
        <input
          id="admin-id"
          autoComplete="username"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className={inputCls}
          placeholder="admin"
        />
      </div>
      <div>
        <label htmlFor="admin-pass" className="label">
          Password
        </label>
        <input
          id="admin-pass"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputCls}
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-[13px] text-neg">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full justify-center py-2.5 disabled:opacity-60"
      >
        {loading ? "Signing in…" : "Enter control room"}
      </button>
      <p className="text-[12px] text-ink-400 leading-relaxed">
        Demo access · ID <span className="tnum font-medium text-ink-700">admin</span> · password{" "}
        <span className="tnum font-medium text-ink-700">admin</span>
      </p>
    </form>
  );
}
