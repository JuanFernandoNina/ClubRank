"use client";

import { ReactNode } from "react";

/** Logo cuadrado con letra + nombre + subtítulo (estilo ScoreUp). */
export function AppMark({ letra = "C", titulo = "ClubRank", subtitulo }: { letra?: string; titulo?: string; subtitulo?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-lg font-black text-white">
        {letra}
      </div>
      <div className="leading-tight">
        <div className="font-bold text-slate-800">{titulo}</div>
        {subtitulo ? <div className="text-[11px] text-slate-400">{subtitulo}</div> : null}
      </div>
    </div>
  );
}

/** Encabezado de página: título grande + subtítulo gris. */
export function PageHeader({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

/** Tarjeta de métrica (número grande + etiqueta). */
export function StatCard({ valor, etiqueta, color = "text-slate-800" }: { valor: ReactNode; etiqueta: ReactNode; color?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`text-2xl font-bold ${color}`}>{valor}</div>
      <div className="mt-1 text-xs font-medium text-slate-500">{etiqueta}</div>
    </div>
  );
}

export function AppShell({
  title,
  acciones,
  children,
}: {
  title: ReactNode;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4">
        <AppMark letra="C" titulo="ClubRank" />
        <div className="flex-1">{title}</div>
        {acciones}
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400">
        ClubRank · App web responsive (futura app nativa sobre la misma API)
      </footer>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
      <div>
        <h2 className="font-semibold text-slate-800">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  type = "button",
  className = "",
  disabled,
  onClick,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const base =
    "inline-flex items-center justify-center gap-1 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const styles: Record<string, string> = {
    primary: "bg-emerald-600 text-white shadow hover:bg-emerald-700",
    secondary: "border border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
    danger: "bg-rose-600 text-white hover:bg-rose-500",
    ghost: "text-slate-400 hover:bg-slate-50 hover:text-rose-600",
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

export const inputCls =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500";

export function Badge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "red" | "amber" | "blue" | "zinc" }) {
  const t: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-800",
    red: "bg-rose-100 text-rose-800",
    amber: "bg-amber-100 text-amber-800",
    blue: "bg-sky-100 text-sky-800",
    zinc: "bg-slate-100 text-slate-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${t[tone]}`}>
      {children}
    </span>
  );
}

export function Alert({ children, tone = "red" }: { children: ReactNode; tone?: "red" | "green" | "amber" }) {
  const t: Record<string, string> = {
    red: "border-rose-200 bg-rose-50 text-rose-800",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${t[tone]}`}>{children}</div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-10 text-sm text-slate-400">
      Cargando…
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
      {children}
    </div>
  );
}