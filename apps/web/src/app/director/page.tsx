"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { Spinner, Empty, Badge } from "@/components/ui";

interface Resultado {
  eventoId: string;
  evento: string;
  fecha: string;
  cerrado: boolean;
  puntaje: number;
  penalizaciones: number;
}
interface ClubInfo {
  id: string;
  nombre: string;
  miembros: { id: string; nombre: string }[];
}
interface FilaRanking {
  posicion: number;
  clubId: string;
  club: string;
  total: number;
  penalizaciones: number;
}

export default function DirectorResultados() {
  const { sesion, cargando } = useRequireAuth("director");
  const [resultados, setResultados] = useState<Resultado[] | null>(null);
  const [club, setClub] = useState<ClubInfo | null>(null);
  const [miPosicion, setMiPosicion] = useState<FilaRanking | null>(null);

  useEffect(() => {
    apiClient.get<Resultado[]>("/director/resultados").then(setResultados).catch(() => setResultados([]));
    apiClient.get<ClubInfo>("/director/club").then(setClub).catch(() => setClub(null));
  }, []);

  useEffect(() => {
    if (!sesion?.organizacionId || resultados === null) return;
    const temporada = new Date().getFullYear().toString();
    apiClient
      .get<{ ranking: FilaRanking[] }>(`/organizaciones/${sesion.organizacionId}/temporadas/${temporada}/ranking`)
      .then((r) => {
        const fila = r.ranking.find((f) => f.clubId === club?.id) ?? null;
        setMiPosicion(fila);
      })
      .catch(() => setMiPosicion(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion, resultados, club]);

  if (cargando || !resultados) return <Spinner />;

  const todosCerrados = resultados.length > 0 && resultados.every((r) => r.cerrado);
  const total = resultados.filter((r) => r.cerrado).reduce((s, r) => s + r.puntaje, 0);

  const medal = (pos: number) => (pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : `${pos}°`);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{club?.nombre ?? "Mi club"}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {club?.miembros.length ?? 0} miembro(s) · Resultados {resultados.length > 0 ? "de tus eventos" : "por evento"}
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-800">Posición en el ranking de temporada</h2>
        {miPosicion ? (
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-black text-amber-400">{medal(miPosicion.posicion)}</div>
              <div className="text-xs text-slate-400">posición</div>
            </div>
            <div className="flex-1">
              {todosCerrados ? (
                <>
                  <div className="text-3xl font-bold text-emerald-700">{miPosicion.total} pts</div>
                  <div className="mt-1 text-sm text-slate-400">
                    Bruto: {miPosicion.total + miPosicion.penalizaciones} · Penalizaciones:{" "}
                    {miPosicion.penalizaciones > 0 ? `−${miPosicion.penalizaciones}` : "0"}
                  </div>
                </>
              ) : (
                <div className="text-xl font-semibold text-slate-400">
                  Se revela al cerrar los eventos
                </div>
              )}
              {!todosCerrados && (
                <div className="mt-1 text-xs text-slate-400">
                  La posición es provisional hasta que finalice la temporada.
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Tu club aún no tiene puntuaciones registradas en la temporada actual.
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-800">Resultados por evento</h2>
        </div>
        {resultados.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">Tu club aún no tiene eventos realizados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-xs uppercase tracking-wide text-slate-500">Evento</th>
                  <th className="px-4 py-2 text-xs uppercase tracking-wide text-slate-500">Fecha</th>
                  <th className="px-4 py-2 text-xs uppercase tracking-wide text-slate-500">Estado</th>
                  <th className="px-4 py-2 text-right text-xs uppercase tracking-wide text-slate-500">Puntaje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resultados.map((r) => (
                  <tr key={r.eventoId}>
                    <td className="px-4 py-2.5 font-medium text-slate-700">{r.evento}</td>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(r.fecha).toLocaleDateString("es")}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={r.cerrado ? "green" : "amber"}>{r.cerrado ? "Cerrado" : "Preliminar"}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {r.cerrado ? (
                        <span className="font-semibold text-slate-800">
                          {r.puntaje} pts
                          {r.penalizaciones > 0 ? (
                            <span className="ml-1 text-xs font-medium text-rose-600">(−{r.penalizaciones})</span>
                          ) : null}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">Se revela al cerrar</span>
                      )}
                    </td>
                  </tr>
                ))}
                {todosCerrados ? (
                  <tr className="bg-slate-50">
                    <td className="px-4 py-2.5 font-semibold text-slate-700" colSpan={3}>
                      Total (eventos cerrados)
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{total} pts</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}