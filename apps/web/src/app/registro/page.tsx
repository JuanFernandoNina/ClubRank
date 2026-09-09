"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient, storage } from "@/lib/api";
import { Alert, Button, Field, inputCls } from "@/components/ui";

export default function RegistroPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const data = await apiClient.post<{ token: string; usuario: { id: string; rol: string; organizacionId: string | null } }>(
        "/auth/registro",
        { nombre, username, password, nombreOrganizacion: org },
      );
      storage.token = data.token;
      storage.usuario = { ...data.usuario, nombre: null, username, rol: "admin", clubDirectorId: null };
      router.replace("/panel");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-emerald-50 to-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-700">Crear organización</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tu cuenta será Administrador de la nueva organización
          </p>
        </div>
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm"
        >
          <Field label="Tu nombre">
            <input className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </Field>
          <Field label="Nombre de organización">
            <input className={inputCls} value={org} onChange={(e) => setOrg(e.target.value)} required />
          </Field>
          <Field label="Usuario">
            <input className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} required />
          </Field>
          <Field label="Contraseña" hint="Mínimo 6 caracteres">
            <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error ? <Alert>{error}</Alert> : null}
          <Button type="submit" className="w-full" disabled={enviando}>
            {enviando ? "Creando…" : "Crear organización"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-emerald-700 underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}