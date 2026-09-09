"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient, storage } from "@/lib/api";
import { Alert, Button, Field, inputCls } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const data = await apiClient.post<{ token: string; usuario: { id: string; nombre: string | null; username: string; rol: "admin" | "staff" | "director"; organizacionId: string | null; clubDirectorId: string | null } }>(
        "/auth/login",
        { username, password },
      );
      storage.token = data.token;
      storage.usuario = data.usuario;
      router.replace(
        data.usuario.rol === "admin"
          ? "/panel"
          : data.usuario.rol === "staff"
            ? "/staff"
            : "/director",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-700">ClubRank</h1>
          <p className="mt-1 text-sm text-slate-500">
            Plataforma de clubes, eventos y rankings
          </p>
        </div>
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm"
        >
          <Field label="Usuario">
            <input
              className={inputCls}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </Field>
          <Field label="Contraseña">
            <input
              className={inputCls}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
          {error ? <Alert>{error}</Alert> : null}
          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? "Ingresando…" : "Iniciar sesión"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          ¿No tienes cuenta?{" "}
          <Link href="/registro" className="font-medium text-emerald-700 underline">
            Crea una organización
          </Link>
        </p>
      </div>
    </div>
  );
}