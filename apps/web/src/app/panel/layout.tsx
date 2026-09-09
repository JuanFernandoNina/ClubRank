"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cerrarSesion, useRequireAuth } from "@/lib/auth";
import { Spinner } from "@/components/ui";

const NAV = [
  { href: "/panel", label: "Dashboard" },
  { href: "/panel/clubes", label: "Clubes" },
  { href: "/panel/usuarios", label: "Usuarios" },
  { href: "/panel/eventos", label: "Eventos" },
  { href: "/panel/ranking", label: "Rankings" },
  { href: "/panel/proyeccion", label: "Proyección" },
  { href: "/panel/incidentes", label: "Incidentes" },
  { href: "/panel/penalizaciones", label: "Penalizaciones" },
];

export default function PanelLayout({ children }: { children: ReactNode }) {
  const { sesion, cargando } = useRequireAuth("admin");
  const pathname = usePathname();

  if (cargando || !sesion) return <Spinner />;

  const nombre = sesion.nombre ?? sesion.username;

  const pill = (href: string) =>
    `block rounded-xl px-3 py-2.5 ${
      href === "/panel" ? pathname === "/panel" : pathname.startsWith(href)
        ? "bg-emerald-600 text-white"
        : "text-slate-600 hover:bg-slate-100"
    }`;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar escritorio */}
      <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-lg font-black text-white">
            C
          </div>
          <div className="leading-tight">
            <div className="font-bold text-slate-800">ClubRank</div>
            <div className="text-[11px] text-slate-400">Panel de Admin</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2 text-sm font-medium">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={pill(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
              {nombre.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-sm font-medium text-slate-700">{nombre}</div>
              <div className="text-[11px] uppercase tracking-wide text-emerald-700">Admin</div>
            </div>
            <button
              onClick={cerrarSesion}
              className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* Barra superior móvil */}
      <div className="flex w-full flex-col lg:hidden">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-black text-white">
              C
            </div>
            <span className="font-bold text-slate-800">ClubRank</span>
          </div>
          <button
            onClick={cerrarSesion}
            className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-rose-600"
          >
            Salir
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                item.href === "/panel" ? pathname === "/panel" : pathname.startsWith(item.href)
                  ? "bg-emerald-600 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hidden items-center justify-end border-b border-slate-200 bg-white px-6 py-3 lg:flex">
          <span className="text-xs text-slate-500">{nombre}</span>
          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
            Admin
          </span>
        </div>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}