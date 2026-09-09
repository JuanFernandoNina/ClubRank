"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { Card, Spinner, StatCard, Badge } from "@/components/ui";

interface Club {
  id: string;
  nombre: string;
  _count: { miembros: number };
}
interface Evento {
  id: string;
  nombre: string;
  fecha: string;
  lugar: string | null;
  tipo: string | null;
  temporada: string;
  cerrado: boolean;
  puntajeMaximo: number;
}
interface FilaRanking {
  posicion: number;
  club: string;
  total: number;
  puntaje?: number;
}

export default function Dashboard() {
  const { sesion, cargando } = useRequireAuth("admin");
  const [clubes, setClubes] = useState<Club[] | null>(null);
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [ranking, setRanking] = useState<FilaRanking[]>([]);

  useEffect(() => {
    if (!sesion?.organizacionId) return;
    const org = sesion.organizacionId;
    apiClient.get<Club[]>(`/organizaciones/${org}/clubes`).then(setClubes).catch(() => setClubes([]));
    apiClient.get<Evento[]>(`/organizaciones/${org}/eventos`).then(setEventos).catch(() => setEventos([]));
    apiClient
      .get<{ ranking: FilaRanking[] }>(`/organizaciones/${org}/temporadas/${new Date().getFullYear()}/ranking`)
      .then((r) => setRanking(r.ranking.slice(0, 8)))
      .catch(() => setRanking([]));
  }, [sesion]);

  if (cargando || !sesion || !clubes || !eventos) return <Spinner />;

  const hoy = new Date();
  const totalMiembros = clubes.reduce((s, c) => s + (c._count.miembros ?? 0), 0);
  const abiertos = eventos.filter((e) => !e.cerrado);
  const pasados = eventos
    .filter((e) => new Date(e.fecha) <= hoy)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 5);
  const proximos = eventos
    .filter((e) => new Date(e.fecha) > hoy)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .slice(0, 4);

  const fmtFecha = (f: string) => new Date(f).toLocaleDateString("es", { day: "numeric", month: "short" });

  // datos del gráfico: puntos por club en la temporada actual
  const chartData = ranking.map((r) => ({ ...r, puntos: r.total ?? r.puntaje ?? 0 }));
  const maxPts = Math.max(1, ...chartData.map((r) => r.puntos));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Hola, bienvenido de nuevo</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Organización · Temporada {eventos[0]?.temporada ?? "2026"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard valor={clubes.length} etiqueta="Clubes" />
        <StatCard valor={totalMiembros} etiqueta="Miembros registrados" />
        <StatCard valor={abiertos.length} etiqueta="Eventos abiertos" color="text-amber-600" />
        <StatCard
          valor={eventos.reduce((s, e) => s + (e.puntajeMaximo ?? 0), 0)}
          etiqueta="Puntaje total en juego"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">
                Puntos por club · Temporada {new Date().getFullYear()}
              </h2>
              <Link href="/panel/ranking" className="text-xs font-medium text-emerald-700 hover:underline">
                Ver ranking →
              </Link>
            </div>
            {chartData.length === 0 ? (
              <p className="text-sm text-slate-400">Sin eventos cerrados en la temporada.</p>
            ) : (
              <div className="space-y-3">
                {chartData.map((r) => (
                  <div key={r.club}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        <span className="mr-1.5 text-xs font-semibold text-slate-400">{r.posicion}º</span>
                        {r.club}
                      </span>
                      <span className="font-semibold text-slate-800">{r.puntos.toLocaleString("es")} pts</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{ width: `${Math.round((r.puntos / maxPts) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Eventos recientes</h2>
              <Link href="/panel/eventos" className="text-xs font-medium text-emerald-700 hover:underline">
                Ver todos →
              </Link>
            </div>
            {pasados.length === 0 ? (
              <p className="text-sm text-slate-400">No hay eventos pasados todavía.</p>
            ) : (
              pasados.map((e) => (
                <div key={e.id} className="mb-2 flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5">
                  <div>
                    <div className="text-sm font-medium text-slate-700">{e.nombre}</div>
                    <div className="text-xs text-slate-400">{fmtFecha(e.fecha)} · {e.lugar ?? "Sin lugar"}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Puntaje máx</div>
                    <div className="text-sm font-semibold text-slate-700">{e.puntajeMaximo} pts</div>
                  </div>
                </div>
              ))
            )}
          </Card>
        </div>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Próximos eventos</h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              {proximos.length}
            </span>
          </div>
          {proximos.length === 0 ? (
            <p className="text-sm text-slate-400">No hay eventos próximos.</p>
          ) : (
            proximos.map((e) => (
              <Link
                key={e.id}
                href={`/panel/eventos/${e.id}`}
                className="mb-2 flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 transition hover:bg-slate-50"
              >
                <div>
                  <div className="text-sm font-medium text-slate-700">{e.nombre}</div>
                  <div className="text-xs text-slate-400 capitalize">{e.tipo ?? "evento"} · {e.lugar ?? "Sin lugar"}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={e.cerrado ? "green" : "amber"}>{e.cerrado ? "Cerrado" : "Abierto"}</Badge>
                  <span className="text-xs font-semibold text-emerald-700">{fmtFecha(e.fecha)}</span>
                </div>
              </Link>
            ))
          )}
        </Card>
      </div>
    </div>
  );
}