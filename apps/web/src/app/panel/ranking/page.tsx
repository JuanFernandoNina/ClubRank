"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { Card, CardHeader, Button, Spinner, Empty, Badge, PageHeader } from "@/components/ui";

interface Evento {
  id: string;
  nombre: string;
  fecha: string;
  temporada: string;
  cerrado: boolean;
  puntajeMaximo: number;
}
interface FilaRanking {
  posicion: number;
  club: string;
  puntaje: number;
}
interface FilaRankingApi {
  posicion: number;
  club: string;
  puntaje?: number;
  total?: number;
}
const normalizar = (r: FilaRankingApi): FilaRanking => ({ posicion: r.posicion, club: r.club, puntaje: r.puntaje ?? r.total ?? 0 });

export default function RankingPage() {
  const { sesion, cargando } = useRequireAuth("admin");
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [temporada, setTemporada] = useState<string>("");
  const [ranking, setRanking] = useState<FilaRanking[] | null>(null);
  const [rankingsEvento, setRankingsEvento] = useState<Record<string, FilaRanking[]>>({});

  useEffect(() => {
    if (sesion?.organizacionId) {
      apiClient.get<Evento[]>(`/organizaciones/${sesion.organizacionId}/eventos`).then(setEventos).catch(() => setEventos([]));
    }
  }, [sesion]);

  async function cargarTemporada(t: string) {
    setTemporada(t);
    if (!t) return setRanking(null);
    const res = await apiClient.get<{ ranking: FilaRankingApi[] }>(
      `/organizaciones/${sesion!.organizacionId}/temporadas/${t}/ranking`,
    );
    setRanking(res.ranking.map(normalizar));
  }

  async function verRankingEvento(e: Evento) {
    const res = await apiClient.get<{ ranking: FilaRankingApi[] }>(`/eventos/${e.id}/ranking`);
    setRankingsEvento((prev) => ({ ...prev, [e.id]: res.ranking.map(normalizar) }));
  }

  if (cargando || !sesion || !eventos) return <Spinner />;

  const temporadas = Array.from(new Set(eventos.map((e) => e.temporada))).sort().reverse();

  return (
    <div className="space-y-6">
      <PageHeader title="Rankings" subtitle="Puntaje oficial de cada club y acumulado por temporada" />

      <Card>
        <CardHeader
          title="Ranking de temporada"
          subtitle="Suma de puntajes netos (principal − penalizaciones) de eventos cerrados"
        />
        <div className="space-y-4 p-4">
          <div className="flex flex-wrap gap-2">
            {temporadas.map((t) => (
              <Button key={t} variant={temporada === t ? "primary" : "secondary"} onClick={() => cargarTemporada(t)}>
                {t}
              </Button>
            ))}
            {temporadas.length === 0 && <span className="text-sm text-slate-500">Aún no hay temporadas.</span>}
          </div>
          {ranking ? (
            <ol className="space-y-1">
              {ranking.map((r) => (
                <li
                  key={r.posicion}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span>
                    <span className="mr-2 font-semibold">{r.posicion}º</span>
                    {r.club}
                  </span>
                  <span className="font-semibold">{r.puntaje.toLocaleString("es")} pts</span>
                </li>
              ))}
              {ranking.length === 0 && <Empty>Sin eventos cerrados para esta temporada.</Empty>}
            </ol>
          ) : (
            <p className="text-sm text-slate-400">Seleccioná una temporada.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Ranking por evento" subtitle="Puntaje oficial (evaluación del principal)" />
        <div className="divide-y divide-slate-100">
          {eventos.map((e) => {
            const rk = rankingsEvento[e.id];
            return (
              <div key={e.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{e.nombre}</span>
                    <span className="ml-2 text-xs text-slate-500">
                      {new Date(e.fecha).toLocaleDateString("es")} · {e.temporada}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={e.cerrado ? "green" : "amber"}>{e.cerrado ? "Cerrado" : "Abierto"}</Badge>
                    <Button variant="secondary" onClick={() => verRankingEvento(e)}>
                      Ranking
                    </Button>
                    <Link href={`/panel/eventos/${e.id}`}>
                      <Button variant="ghost">Detalle</Button>
                    </Link>
                  </div>
                </div>
                {rk ? (
                  <ol className="mt-2 grid gap-1 sm:grid-cols-2">
                    {rk.map((r) => (
                      <li key={r.posicion} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-xs">
                        <span>
                          {r.posicion}º {r.club}
                        </span>
                        <b>{r.puntaje} pts</b>
                      </li>
                    ))}
                    {rk.length === 0 && <span className="text-xs text-slate-400">Sin resultados aún.</span>}
                  </ol>
                ) : null}
              </div>
            );
          })}
          {eventos.length === 0 && <Empty>No hay eventos.</Empty>}
        </div>
      </Card>
    </div>
  );
}