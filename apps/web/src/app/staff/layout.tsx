"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { useRequireAuth } from "@/lib/auth";
import { AppMark, Spinner, Badge } from "@/components/ui";

export default function StaffLayout({ children }: { children: ReactNode }) {
  const { sesion, cargando } = useRequireAuth("staff");

  if (cargando || !sesion) return <Spinner />;

  const nombre = sesion.nombre ?? sesion.username;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <AppMark letra="S" titulo="Panel de Staff" subtitulo={nombre} />
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="green">{sesion.nombre ?? sesion.username}</Badge>
            <a href="/login" className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-rose-600">
              Salir
            </a>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}