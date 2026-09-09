"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { PageHeader, Spinner, Empty, Badge } from "@/components/ui";

interface MisEvento {
  id: string;
  nombre: string;
  fecha: string;
  cerrado: boolean;
  temporada: string;
  clubes: { id: string; nombre: string; esPrincipal: boolean }[];
}

export default function StaffInicio() {
  const { cargando } = useRequireAuth("staff");
  const [eventos, setEventos] = useState<MisEvento[] | null>(null);

  useEffect(() => {
    apiClient.get<MisEvento[]>("/staff/eventos").then(setEventos).catch(() => setEventos([]));
  }, []);

  if (cargando || !eventos) return <Spinner />;

  const abiertos = eventos.filter((e) => !e.cerrado);
  const cerrados = eventos.filter((e) => e.cerrado);

  return (
    <div>
      <PageHeader title="Mis eventos" subtitle="Evaluaciones asignadas a tu usuario" />

      {eventos.length === 0 && (
        <Empty>No tenés eventos asignados. Tu Administrador debe asignarte clubes.</Empty>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {[...abiertos, ...cerrados].map((e) => (
          <Link
            key={e.id}
            href={`/staff/eventos/${e.id}`}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-slate-800">{e.nombre}</h3>
              <Badge tone={e.cerrado ? "green" : "amber"}>{e.cerrado ? "Cerrado" : "Abierto"}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              {new Date(e.fecha).toLocaleDateString("es")} · Temporada {e.temporada}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {e.clubes.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-100 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600"
                >
                  {c.nombre}
                  {c.esPrincipal ? (
                    <span className="font-bold text-emerald-600">PRINCIPAL</span>
                  ) : null}
                </span>
              ))}
            </div>
            <div className="mt-4 flex-1"></div>
            <span className="rounded-lg bg-emerald-600 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700">
              Evaluar evento
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}