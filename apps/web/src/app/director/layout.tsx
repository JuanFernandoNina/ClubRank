"use client";

import { ReactNode } from "react";
import { useRequireAuth } from "@/lib/auth";
import { AppMark, Spinner } from "@/components/ui";

export default function DirectorLayout({ children }: { children: ReactNode }) {
  const { sesion, cargando } = useRequireAuth("director");

  if (cargando || !sesion) return <Spinner />;

  const nombre = sesion.nombre ?? sesion.username;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-lg font-black text-white">
              D
            </div>
            <div>
              <div className="font-bold text-slate-800">Panel de Director</div>
              <div className="text-xs text-slate-400">{nombre}</div>
            </div>
          </div>
          <a href="/login" className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-100">
            Salir
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 lg:px-6">{children}</main>
    </div>
  );
}