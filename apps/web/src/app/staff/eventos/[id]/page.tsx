"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { Spinner, Empty, Alert, Badge, inputCls } from "@/components/ui";

interface Criterio {
  id: string;
  nombre: string;
  peso: number;
}
interface ClubEval {
  eventoClubId: string;
  clubId: string;
  club: string;
  esPrincipal: boolean;
}
interface Datos {
  eventoId: string;
  cerrado: boolean;
  criterios: Criterio[];
  clubes: ClubEval[];
}
interface Incidente {
  id: string;
  tipo: string;
  gravedad: string;
  descripcion: string;
  estado: string;
  createdAt: string;
  eventoClub?: { club: { id: string; nombre: string } | null } | null;
  usuario: { id: string; nombre: string | null; username: string };
}
interface Motivo {
  id: string;
  nombre: string;
  puntosDescuento: number;
}
interface Penalizacion {
  id: string;
  comentario: string | null;
  anulada: boolean;
  createdAt: string;
  motivo: Motivo;
  eventoClub: { club: { id: string; nombre: string } };
  usuario: { id: string; nombre: string | null; username: string };
}

export default function EvaluarEventoPage() {
  const { id } = useParams<{ id: string }>();
  const { cargando } = useRequireAuth("staff");
  const [datos, setDatos] = useState<Datos | null>(null);
  const [clubId, setClubId] = useState("");
  const [valores, setValores] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  // incidentes
  const [incidentes, setIncidentes] = useState<Incidente[]>([]);
  const [incForm, setIncForm] = useState({ tipo: "", gravedad: "media", descripcion: "", clubId: "" });
  // penalizaciones
  const [penalizaciones, setPenalizaciones] = useState<Penalizacion[]>([]);
  const [motivos, setMotivos] = useState<Motivo[]>([]);
  const [penForm, setPenForm] = useState({ motivoId: "", clubId: "", comentario: "" });

  useEffect(() => {
    apiClient.get<Datos>(`/eventos/${id}/clubes`).then((d) => {
      setDatos(d);
      const principal = d.clubes.find((c) => c.esPrincipal);
      if (principal) setClubId(principal.clubId);
    });
    apiClient.get<Incidente[]>(`/eventos/${id}/incidentes`).then(setIncidentes).catch(() => setIncidentes([]));
    apiClient.get<Penalizacion[]>(`/eventos/${id}/penalizaciones`).then(setPenalizaciones).catch(() => setPenalizaciones([]));
    apiClient.get<Motivo[]>(`/eventos/${id}/motivos-penalizacion`).then(setMotivos).catch(() => setMotivos([]));
  }, [id]);

  async function reportarIncidente(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post(`/eventos/${id}/incidentes`, {
        ...(incForm.clubId ? { clubId: incForm.clubId } : {}),
        tipo: incForm.tipo,
        gravedad: incForm.gravedad,
        descripcion: incForm.descripcion,
      });
      setIncForm({ tipo: "", gravedad: "media", descripcion: "", clubId: "" });
      setIncidentes(await apiClient.get<Incidente[]>(`/eventos/${id}/incidentes`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al reportar");
    }
  }

  async function aplicarPenalizacion(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post(`/eventos/${id}/clubes/${penForm.clubId}/penalizaciones`, {
        motivoId: penForm.motivoId,
        comentario: penForm.comentario || undefined,
      });
      setPenForm({ motivoId: "", clubId: "", comentario: "" });
      setPenalizaciones(await apiClient.get<Penalizacion[]>(`/eventos/${id}/penalizaciones`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al penalizar");
    }
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    if (!datos) return;
    try {
      await apiClient.post(`/eventos/${id}/evaluaciones`, {
        clubId,
        comentario: comentario || undefined,
        puntajes: datos.criterios.map((c) => ({ criterioId: c.id, valor: valores[c.id] ?? 0 })),
      });
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  if (cargando || !datos) return <Spinner />;

  const pesoSuma = datos.criterios.reduce((s, c) => s + c.peso, 0);

  return (
    <div>
      <Link href="/staff" className="mb-4 inline-block text-sm font-medium text-slate-500 hover:text-emerald-700">
        ← Mis eventos
      </Link>

      {/* Banner del evento */}
      <div className="mb-5 rounded-2xl border border-slate-200 border-l-4 border-l-emerald-600 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-bold text-slate-800">Evaluar evento</h1>
            <p className="text-sm text-slate-500">
              Puntajes del 0 al 100 por criterio · suma de pesos {pesoSuma}%
            </p>
          </div>
          <Badge tone={datos.cerrado ? "green" : "amber"}>
            {datos.cerrado ? "Evento cerrado" : "Evento en curso"}
          </Badge>
        </div>
      </div>

      {datos.cerrado ? (
        <Alert tone="amber">Las evaluaciones están cerradas. Solo lectura.</Alert>
      ) : null}
      {error ? <Alert>{error}</Alert> : null}
      {ok ? (
        <Alert tone="green">✓ Evaluación guardada. Podés editarla mientras el evento esté abierto.</Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Sidebar clubes */}
        <div className="self-start rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Clubes del evento ({datos.clubes.length})
          </div>
          <div className="space-y-1">
            {(datos.clubes ?? []).map((c) => (
              <button
                key={c.clubId}
                onClick={() => {
                  setClubId(c.clubId);
                  setOk(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${
                  clubId === c.clubId ? "bg-emerald-50 text-emerald-800" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="text-slate-400">👥</span>
                <span className="flex-1 truncate text-left">{c.club}</span>
                {c.esPrincipal ? (
                  <span className="text-[10px] font-bold text-emerald-600">PRINCIPAL</span>
                ) : (
                  <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                )}
              </button>
            ))}
            {(datos.clubes ?? []).length === 0 && <p className="px-2 py-2 text-sm text-slate-400">Sin clubes asignados.</p>}
          </div>
          <p className="mt-3 border-t border-slate-100 px-2 pt-3 text-[11px] leading-relaxed text-slate-400">
            Solo la evaluación del staff <b>principal</b> es la oficial. El punto ámbar indica club que aún
            necesitás calificar si sos principal.
          </p>
        </div>

        {/* Formulario */}
        {datos.clubes.length === 0 ? (
          <Empty>No tenés clubes asignados en este evento.</Empty>
        ) : (
          <form onSubmit={guardar} className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-slate-800">
                    {datos.clubes.find((c) => c.clubId === clubId)?.club ?? "Club"}
                  </h2>
                  {datos.clubes.find((c) => c.clubId === clubId)?.esPrincipal ? (
                    <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                      Eres el staff principal
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Evaluación de respaldo (no oficial)</span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {(datos.criterios ?? []).map((c) => (
                  <div key={c.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{c.nombre}</span>
                      <span className="text-xs text-slate-400">{c.peso}%</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={valores[c.id] ?? 0}
                        onChange={(ev) => setValores({ ...valores, [c.id]: Number(ev.target.value) })}
                        className="w-full accent-emerald-600"
                        disabled={datos.cerrado}
                      />
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={valores[c.id] ?? 0}
                        onChange={(ev) => setValores({ ...valores, [c.id]: Number(ev.target.value) })}
                        className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-center text-sm outline-none focus:border-emerald-500"
                        disabled={datos.cerrado}
                      />
                    </div>
                  </div>
                ))}
                {(datos.criterios ?? []).length === 0 && (
                  <p className="text-sm text-slate-400">El evento aún no tiene criterios.</p>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Comentario
                  </label>
                  <textarea
                    className="mt-1 min-h-[60px] w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-emerald-500"
                    placeholder="Observaciones…"
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    disabled={datos.cerrado}
                  />
                </div>

                <button
                  type="submit"
                  disabled={datos.cerrado}
                  className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Guardar evaluación
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Incidentes */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-slate-800">Reportar incidente</h2>
            <p className="text-sm text-slate-500">Obligatorio para todos los clubes a tu cargo.</p>
          </div>
          <Badge>{incidentes.length} reportado(s)</Badge>
        </div>
        <form onSubmit={reportarIncidente} className="grid gap-2 sm:grid-cols-4">
          <input
            className={inputCls}
            placeholder="Tipo (ej. Tardanza)"
            value={incForm.tipo}
            onChange={(e) => setIncForm({ ...incForm, tipo: e.target.value })}
            required
          />
          <select
            className={inputCls}
            value={incForm.gravedad}
            onChange={(e) => setIncForm({ ...incForm, gravedad: e.target.value })}
          >
            <option value="baja">Baja</option>
            <option value="media">Media</option>
            <option value="alta">Alta</option>
          </select>
          <select
            className={inputCls}
            value={incForm.clubId}
            onChange={(e) => setIncForm({ ...incForm, clubId: e.target.value })}
          >
            <option value="">Club (opcional)…</option>
            {(datos.clubes ?? []).map((c) => (
              <option key={c.clubId} value={c.clubId}>{c.club}</option>
            ))}
          </select>
          <input
            className={inputCls}
            placeholder="Descripción"
            value={incForm.descripcion}
            onChange={(e) => setIncForm({ ...incForm, descripcion: e.target.value })}
            required
          />
          <button
            type="submit"
            disabled={datos.cerrado}
            className="rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reportar incidente
          </button>
        </form>
        {incidentes.length > 0 && (
          <div className="mt-3 divide-y divide-slate-100">
            {incidentes.map((x) => (
              <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <b>{x.tipo}</b> · {x.descripcion}
                  {x.eventoClub?.club ? ` · ${x.eventoClub.club.nombre}` : ""}
                </span>
                <span className="flex items-center gap-2">
                  <Badge tone={x.gravedad === "alta" ? "red" : x.gravedad === "media" ? "amber" : "zinc"}>
                    {x.gravedad}
                  </Badge>
                  <span className="capitalize text-slate-400">{x.estado.replace("_", " ")}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Penalizaciones */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold text-slate-800">Aplicar penalización</h2>
            <p className="text-sm text-slate-500">Descuenta puntos al club en este evento.</p>
          </div>
          <Badge>{penalizaciones.length} aplicada(s)</Badge>
        </div>
        <form onSubmit={aplicarPenalizacion} className="grid gap-2 sm:grid-cols-4">
          <select
            className={inputCls}
            value={penForm.clubId}
            onChange={(e) => setPenForm({ ...penForm, clubId: e.target.value })}
            required
          >
            <option value="">Club…</option>
            {(datos.clubes ?? []).map((c) => (
              <option key={c.clubId} value={c.clubId}>{c.club}</option>
            ))}
          </select>
          <select
            className={inputCls}
            value={penForm.motivoId}
            onChange={(e) => setPenForm({ ...penForm, motivoId: e.target.value })}
            required
          >
            <option value="">Motivo…</option>
            {motivos.map((m) => (
              <option key={m.id} value={m.id}>{m.nombre} (−{m.puntosDescuento} pts)</option>
            ))}
          </select>
          <input
            className={inputCls + " sm:col-span-2"}
            placeholder="Comentario (opcional)"
            value={penForm.comentario}
            onChange={(e) => setPenForm({ ...penForm, comentario: e.target.value })}
          />
          <button
            type="submit"
            disabled={datos.cerrado}
            className="rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-4"
          >
            Aplicar penalización
          </button>
        </form>
        {penalizaciones.length > 0 && (
          <div className="mt-3 divide-y divide-slate-100">
            {penalizaciones.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <b>{p.motivo.nombre}</b> · {p.eventoClub.club.nombre}
                  {p.comentario ? ` — ${p.comentario}` : ""}
                </span>
                <span className="font-semibold text-rose-600">−{p.motivo.puntosDescuento} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}