"use client";

import { useState, useEffect, useRef } from "react";
import { apiClient } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { Button, Spinner, Empty, Badge, inputCls } from "@/components/ui";

interface Evento {
  id: string;
  nombre: string;
  fecha: string;
  temporada: string;
  cerrado: boolean;
  puntajeMaximo?: number;
}
type Fila = { posicion: number; club: string; puntaje: number; penalizaciones?: number };

const MEDALLAS = ["🥇", "🥈", "🥉"];

export default function ProyeccionPage() {
  const { sesion, cargando } = useRequireAuth("admin");
  const rootRef = useRef<HTMLDivElement>(null);
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [temporadas, setTemporadas] = useState<string[]>([]);
  const [mode, setMode] = useState<"evento" | "temporada">("evento");
  const [eventoId, setEventoId] = useState("");
  const [temporada, setTemporada] = useState("");
  const [ranking, setRanking] = useState<Fila[] | null>(null);
  const [title, setTitle] = useState("");
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (sesion?.organizacionId) {
      apiClient
        .get<Evento[]>(`/organizaciones/${sesion.organizacionId}/eventos`)
        .then((evs) => {
          setEventos(evs);
          setTemporadas(Array.from(new Set(evs.map((e) => e.temporada))).sort().reverse());
        })
        .catch(() => setEventos([]));
    }
  }, [sesion]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /** Normaliza ranking de evento (puntaje) y de temporada (total) al mismo formato. */
  function toFila(r: { posicion: number; club: string; puntaje?: number; total?: number; penalizaciones?: number }): Fila {
    return {
      posicion: r.posicion,
      club: r.club,
      puntaje: r.puntaje ?? r.total ?? 0,
      penalizaciones: r.penalizaciones,
    };
  }

  async function cargarEvento(id: string) {
    if (!id) {
      setEventoId("");
      setRanking(null);
      return;
    }
    setEventoId(id);
    setRanking(null);
    const res = await apiClient.get<{ ranking: Fila[] }>(`/eventos/${id}/ranking`);
    setRanking(res.ranking.map((r) => toFila(r as Parameters<typeof toFila>[0])));
    const ev = eventos?.find((e) => e.id === id);
    setTitle(ev ? `${ev.nombre} · ${new Date(ev.fecha).toLocaleDateString("es")}` : "");
  }

  async function cargarTemporada(t: string) {
    if (!t) {
      setTemporada("");
      setRanking(null);
      return;
    }
    setTemporada(t);
    setRanking(null);
    const res = await apiClient.get<{ ranking: Fila[] }>(
      `/organizaciones/${sesion!.organizacionId}/temporadas/${t}/ranking`,
    );
    setRanking(res.ranking.map((r) => toFila(r as Parameters<typeof toFila>[0])));
    setTitle(`Temporada ${t}`);
  }

  function cambiarModo(m: "evento" | "temporada") {
    setMode(m);
    setRanking(null);
    setTitle("");
  }

  function pantallaCompleta() {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  }

  if (cargando || !sesion || !eventos) return <Spinner />;

  const [p1, p2, p3, ...resto] = ranking ?? [];

  const podiumCard = ({ posicion, club, puntaje, color, h, key }: { key: string; posicion: number; club: string; puntaje: number; color: string; h: string }) => (
    <div key={key} className={`flex flex-col items-center justify-end rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${h}`}>
      <div className="text-5xl">{MEDALLAS[posicion - 1] ?? `${posicion}º`}</div>
      <div className="mt-2 text-4xl font-black text-slate-800">{(puntaje ?? 0).toLocaleString("es")}</div>
      <div className="text-sm text-slate-400">puntos</div>
      <div className={`mt-3 w-full rounded-xl ${color} px-3 py-2 text-center text-lg font-bold text-white`}>{club}</div>
    </div>
  );

  return (
    <div ref={rootRef} className={`space-y-4 ${fullscreen ? "h-full overflow-y-auto bg-white p-6" : ""}`}>
      {/* Barra superior: selectores + pantalla completa */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="leading-tight">
          <div className="font-bold text-slate-800">Proyección de resultados</div>
          <div className="text-xs text-slate-500">Podio y posiciones para mostrar en pantalla</div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-xl border border-slate-200">
            <button
              onClick={() => cambiarModo("evento")}
              className={`px-3 py-1.5 text-xs font-medium ${mode === "evento" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Por evento
            </button>
            <button
              onClick={() => cambiarModo("temporada")}
              className={`px-3 py-1.5 text-xs font-medium ${mode === "temporada" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Por temporada
            </button>
          </div>
          {mode === "evento" ? (
            <select className={inputCls} value={eventoId} onChange={(e) => cargarEvento(e.target.value)}>
              <option value="">Elegí un evento…</option>
              {eventos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre} · {new Date(e.fecha).toLocaleDateString("es")} {e.cerrado ? "" : "(abierto)"}
                </option>
              ))}
            </select>
          ) : (
            <select className={inputCls} value={temporada} onChange={(e) => cargarTemporada(e.target.value)}>
              <option value="">Elegí una temporada…</option>
              {temporadas.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
          <Button variant="secondary" onClick={pantallaCompleta}>
            {fullscreen ? "Salir de pantalla" : "Pantalla completa"}
          </Button>
        </div>
      </div>

      {ranking ? (
        <div className="space-y-6">
          {ranking.length === 0 ? (
            <Empty>Sin resultados para mostrar.</Empty>
          ) : (
            <>
              <div>
                <div className="mb-3 text-center text-2xl font-bold text-slate-700">{title}</div>
                <div className="grid gap-3 md:grid-cols-3 md:items-end">
                  {[p2, p1, p3]
                    .filter((f): f is Fila => Boolean(f))
                    .map((f) =>
                      podiumCard({
                        key: f.club,
                        posicion: f.posicion,
                        club: f.club,
                        puntaje: f.puntaje,
                        color:
                          f.posicion === 1
                            ? "bg-amber-400"
                            : f.posicion === 2
                              ? "bg-slate-400"
                              : "bg-orange-400",
                        h: f.posicion === 1 ? "md:pt-10" : "md:pt-4",
                      }),
                    )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-3.5 font-semibold text-slate-800">
                  Resto de posiciones
                </div>
                <div className="divide-y divide-slate-100">
                  {resto.map((r) => (
                    <div key={r.posicion} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span className="font-medium text-slate-700">
                        <span className="mr-2 font-semibold">{r.posicion}º</span>
                        {r.club}
                      </span>
                      <span className="flex items-center gap-2">
                        {r.penalizaciones ? <Badge>{r.penalizaciones} pen.</Badge> : null}
                        <span className="font-semibold text-slate-800">{r.puntaje.toLocaleString("es")} pts</span>
                      </span>
                    </div>
                  ))}
                  {resto.length === 0 && <Empty>Solo hay {ranking.length} resultados.</Empty>}
                </div>
              </div>
            </>
          )}
        </div>
      ) : (
        <Empty>Elegí un evento o temporada para proyectar.</Empty>
      )}
    </div>
  );
}