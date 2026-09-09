"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import {
  Card,
  CardHeader,
  Button,
  inputCls,
  Spinner,
  Empty,
  Alert,
  PageHeader,
} from "@/components/ui";
import Link from "next/link";

interface Criterio {
  id: string;
  nombre: string;
  peso: number;
}
interface Club {
  id: string;
  nombre: string;
}
interface Usuario {
  id: string;
  username: string;
  nombre: string | null;
  rol: "staff" | "director" | "admin";
  clubDirector?: { id: string; nombre: string } | null;
}
interface Detalle {
  id: string;
  nombre: string;
  fecha: string;
  lugar: string | null;
  temporada: string;
  cerrado: boolean;
  puntajeMaximo: number;
  criterios: Criterio[];
  clubes?: {
    id: string;
    clubId: string;
    club: Club;
    principal: { id: string; nombre: string | null; username: string } | null;
    asignaciones: { usuario: { id: string; nombre: string | null; username: string; rol: string } }[];
  }[];
}
interface Pendiente {
  clubId: string;
  club: string;
  staffPrincipal?: string;
  motivo: string;
}
interface Credencial {
  id: string;
  username: string;
  rol: string;
  clubId: string;
  esPrincipal: boolean;
  password?: string;
}
interface FilaRanking {
  posicion: number;
  club: string;
  puntaje: number;
}

export default function EventoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const { sesion, cargando } = useRequireAuth("admin");
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pendientes, setPendientes] = useState<Pendiente[] | null>(null);
  const [cargandoPendientes, setCargandoPendientes] = useState(true);
  const [ranking, setRanking] = useState<FilaRanking[] | null>(null);

  // criterios
  const [criterio, setCriterio] = useState({ nombre: "", peso: "30" });
  // clubes a asignar
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [clubBusqueda, setClubBusqueda] = useState("");
  // accesos
  const [accesos, setAccesos] = useState<Credencial[] | null>(null);
  const [accesoForm, setAccesoForm] = useState({ nombre: "", username: "", rol: "staff", clubId: "" });
  const [usuariosOrg, setUsuariosOrg] = useState<Usuario[]>([]);
  const [usuarioBusqueda, setUsuarioBusqueda] = useState("");

  useEffect(() => {
    if (sesion?.organizacionId) {
      apiClient.get<Club[]>(`/organizaciones/${sesion.organizacionId}/clubes`).then(setClubes).catch(() => setClubes([]));
      apiClient
        .get<Usuario[]>(`/auth/organizaciones/${sesion.organizacionId}/usuarios`)
        .then(setUsuariosOrg)
        .catch(() => setUsuariosOrg([]));
      recargar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sesion]);

  useEffect(() => {
    if (!detalle) return;
    apiClient
      .get<Pendiente[]>(`/eventos/${detalle.id}/pendientes`)
      .then((p) => {
        setPendientes(p);
        setCargandoPendientes(false);
      })
      .catch(() => {
        setPendientes([]);
        setCargandoPendientes(false);
      });
    apiClient
      .get<{ ranking: FilaRanking[] }>(`/eventos/${detalle.id}/ranking`)
      .then((r) => setRanking(r.ranking))
      .catch(() => setRanking([]));
  }, [detalle]);

  async function recargar() {
    try {
      setDetalle(await apiClient.get<Detalle>(`/eventos/${id}`));
      setInfo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function agregarCriterio(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post(`/eventos/${id}/criterios`, { nombre: criterio.nombre, peso: Number(criterio.peso) });
      setCriterio({ nombre: "", peso: "30" });
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function asignarClubes() {
    setError(null);
    try {
      await apiClient.post(`/eventos/${id}/clubes`, { clubIds: seleccionados });
      setSeleccionados([]);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function generarAccesos(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setAccesos(null);
    try {
      const ya = detalle!.clubes ?? [];
      const ec = ya.find((x) => x.clubId === accesoForm.clubId);
      if (!accesoForm.clubId) throw new Error("Elegí un club");
      const res = await apiClient.post<Credencial[]>(`/eventos/${id}/generar-accesos`, [
        {
          nombre: accesoForm.nombre,
          username: accesoForm.username,
          rol: accesoForm.rol,
          clubId: accesoForm.clubId,
          esPrincipal: accesoForm.rol === "staff" ? true : false,
        },
      ]);
      setAccesos(res);
      setAccesoForm({ nombre: "", username: "", rol: "staff", clubId: "" });
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function cerrar() {
    setError(null);
    try {
      await apiClient.post(`/eventos/${id}/cerrar`);
      await recargar();
    } catch (err) {
      const m = err instanceof Error ? err.message : "Error";
      setError(m);
      // Puede contener "pendientes" embebido
      try {
        const data = JSON.parse(m);
        if (data.message) {
          const pend = data.pendientes as Pendiente[];
          setError(`${data.message}: ${pend.map((p) => `${p.club} (${p.motivo})`).join(", ")}`);
        }
      } catch {
        /* mensaje plano */
      }
    }
  }

  async function reabrir() {
    setError(null);
    try {
      await apiClient.post(`/eventos/${id}/reabrir`);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function designarPrincipal(clubId: string, staffId: string) {
    if (!staffId) return;
    setError(null);
    await apiClient.patch(`/eventos/${id}/clubes/${clubId}/principal`, { staffPrincipalId: staffId });
    await recargar();
  }

  if (cargando || !sesion || !detalle) return <Spinner />;

  const sumaPesos = detalle.criterios.reduce((s, c) => s + c.peso, 0);

  const terminoClub = clubBusqueda.trim().toLowerCase();
  const clubesFiltrados = clubes.filter((c) => !terminoClub || c.nombre.toLowerCase().includes(terminoClub));
  const sinAsignar = clubesFiltrados.filter((c) => !(detalle.clubes ?? []).some((x) => x.clubId === c.id));
  const todosVisibles = sinAsignar.length > 0 && sinAsignar.every((c) => seleccionados.includes(c.id));

  const terminoUsuario = usuarioBusqueda.trim().toLowerCase();
  const usuariosFiltrados = usuariosOrg.filter(
    (u) =>
      u.rol !== "admin" &&
      (!terminoUsuario ||
        u.nombre?.toLowerCase().includes(terminoUsuario) ||
        u.username.toLowerCase().includes(terminoUsuario)),
  );

  return (
    <div className="space-y-6">
      <Link href="/panel/eventos" className="mb-4 inline-block text-sm font-medium text-slate-500 hover:text-emerald-700">
        ← Volver a eventos
      </Link>

      <PageHeader
        title={detalle.nombre}
        subtitle={
          <>
            {new Date(detalle.fecha).toLocaleDateString("es")} · {detalle.lugar ?? "Sin lugar"} · Temporada {detalle.temporada} · Puntaje máximo <b>{detalle.puntajeMaximo} pts</b>
          </>
        }
      >
        {detalle.cerrado ? (
          <Button variant="ghost" onClick={reabrir}>
            Reabrir evento
          </Button>
        ) : (
          <Button variant="danger" onClick={cerrar}>
            Cerrar evaluaciones
          </Button>
        )}
      </PageHeader>

      {error ? <Alert>{error}</Alert> : null}
      {info ? <Alert tone="green">{info}</Alert> : null}

      {!detalle.cerrado ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <Card>
              <CardHeader
                title="Criterios de evaluación"
                subtitle={
                  sumaPesos === 100
                    ? "Suma de pesos = 100% ✓"
                    : `Suma actual: ${sumaPesos}% (debe ser 100% para cerrar)`
                }
              />
              <div className="divide-y divide-slate-100">
                {detalle.criterios.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span>{c.nombre}</span>
                    <span className="font-semibold">{c.peso}%</span>
                  </div>
                ))}
                {detalle.criterios.length === 0 && <Empty>Sin criterios</Empty>}
              </div>
              <form onSubmit={agregarCriterio} className="flex gap-2 border-t border-slate-100 p-4">
                <input className={inputCls} placeholder="Nombre del criterio" value={criterio.nombre} onChange={(e) => setCriterio({ ...criterio, nombre: e.target.value })} required />
                <input className={inputCls + " w-20"} type="number" min="1" max="100" value={criterio.peso} onChange={(e) => setCriterio({ ...criterio, peso: e.target.value })} required />
                <Button type="submit">Agregar</Button>
              </form>
            </Card>

            <Card>
              <CardHeader
                title="Clubes participantes"
                subtitle={`${detalle.clubes?.length ?? 0} asignado(s)`}
              />
              <div className="space-y-3 p-4">
                <input
                  className={inputCls + " w-full"}
                  placeholder="Buscar club…"
                  value={clubBusqueda}
                  onChange={(e) => setClubBusqueda(e.target.value)}
                />
                {sinAsignar.length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setSeleccionados(todosVisibles ? seleccionados.filter((s) => !sinAsignar.some((c) => c.id === s)) : [...new Set([...seleccionados, ...sinAsignar.map((c) => c.id)])])
                    }
                  >
                    {todosVisibles ? "Quitar selección visible" : `Agregar todos (${sinAsignar.length})`}
                  </Button>
                )}
                <div className="flex flex-wrap gap-2">
                  {clubesFiltrados.map((c) => {
                    const asignado = (detalle.clubes ?? []).some((x) => x.clubId === c.id);
                    const sel = seleccionados.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        disabled={asignado}
                        onClick={() =>
                          setSeleccionados(sel ? seleccionados.filter((s) => s !== c.id) : [...seleccionados, c.id])
                        }
                        className={`rounded-full border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
                          asignado
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : sel
                              ? "border-emerald-600 bg-emerald-600 text-white"
                              : "border-emerald-200 bg-white text-slate-700"
                        }`}
                      >
                        {c.nombre} {asignado ? "✓" : ""}
                      </button>
                    );
                  })}
                  {clubesFiltrados.length === 0 && <p className="text-sm text-slate-400">No se encontraron clubes.</p>}
                </div>
                {seleccionados.length > 0 && <Button onClick={asignarClubes}>Asignar {seleccionados.length} club(es)</Button>}
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Generar accesos" subtitle="Elegí un usuario existente o crealo. Para Staff podés marcarlo como principal." />
              {accesos ? (
                <div className="p-4">
                  <Alert tone="amber">
                    Guardá estas claves; solo se muestran una vez.
                  </Alert>
                  <div className="mt-3 divide-y divide-slate-100">
                    {accesos.map((a) => (
                      <div key={a.id + a.username} className="flex items-center justify-between py-2 text-sm">
                        <span>
                          {a.rol} · <b>{a.username}</b>
                          {a.esPrincipal ? " · principal" : ""}
                        </span>
                        <code className="rounded bg-slate-100 px-2 py-0.5">{a.password ?? "ya existía"}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="border-b border-slate-100 p-4 pb-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Usuarios de la organización
                </p>
                <input
                  className={inputCls + " w-full"}
                  placeholder="Buscar por nombre o usuario…"
                  value={usuarioBusqueda}
                  onChange={(e) => setUsuarioBusqueda(e.target.value)}
                />
                <div className="mt-2 max-h-44 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-1">
                  {usuariosFiltrados.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() =>
                        setAccesoForm({
                          nombre: u.nombre ?? u.username,
                          username: u.username,
                          rol: u.rol === "director" ? "director" : "staff",
                          clubId: accesoForm.clubId || (u.clubDirector?.id ?? ""),
                        })
                      }
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition hover:bg-emerald-50"
                    >
                      <span>
                        <span className="font-medium text-slate-800">{u.nombre ?? u.username}</span>
                        <span className="ml-2 text-xs text-slate-400">@{u.username}</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        {u.rol === "director" && u.clubDirector ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{u.clubDirector.nombre}</span>
                        ) : null}
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${u.rol === "director" ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-700"}`}>
                          {u.rol === "director" ? "Director" : u.rol === "staff" ? "Staff" : "Admin"}
                        </span>
                      </span>
                    </button>
                  ))}
                  {usuariosFiltrados.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">Sin resultados.</p>}
                </div>
                <p className="mt-2 text-xs text-slate-400">Clic en un usuario para rellenar el formulario.</p>
              </div>

              <form onSubmit={generarAccesos} className="grid gap-2 p-4 sm:grid-cols-2">
                <input className={inputCls} placeholder="Nombre" value={accesoForm.nombre} onChange={(e) => setAccesoForm({ ...accesoForm, nombre: e.target.value })} required />
                <input className={inputCls} placeholder="Username" value={accesoForm.username} onChange={(e) => setAccesoForm({ ...accesoForm, username: e.target.value })} required />
                <select className={inputCls} value={accesoForm.rol} onChange={(e) => setAccesoForm({ ...accesoForm, rol: e.target.value as "staff" | "director" })}>
                  <option value="staff">Staff</option>
                  <option value="director">Director</option>
                </select>
                <select className={inputCls} value={accesoForm.clubId} onChange={(e) => setAccesoForm({ ...accesoForm, clubId: e.target.value })} required>
                  <option value="">Club…</option>
                  {(detalle.clubes ?? []).map((ec) => (
                    <option key={ec.clubId} value={ec.clubId}>{ec.club.nombre}</option>
                  ))}
                </select>
                <Button type="submit" className="sm:col-span-2">Generar acceso</Button>
              </form>
            </Card>

            <Card>
              <CardHeader title="Staff principal por club" subtitle="La evaluación que define el puntaje oficial" />
              {(detalle.clubes ?? []).length === 0 ? (
                <Empty>Primero asigná clubes.</Empty>
              ) : (
                <div className="divide-y divide-slate-100">
                  {(detalle.clubes ?? []).map((ec) => {
                    const staffs = ec.asignaciones.filter((a) => a.usuario.rol === "staff");
                    return (
                      <div key={ec.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                        <span className="font-medium">{ec.club.nombre}</span>
                        <select
                          className={inputCls}
                          value={ec.principal?.id ?? ""}
                          onChange={(e) => designarPrincipal(ec.clubId, e.target.value)}
                        >
                          <option value="">— Sin principal —</option>
                          {staffs.map((s) => (
                            <option key={s.usuario.id} value={s.usuario.id}>
                              {s.usuario.nombre ?? s.usuario.username}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader title="Acciones" />
              <div className="space-y-3 p-4">
                <Button variant="danger" className="w-full" onClick={cerrar}>
                  Cerrar evaluaciones
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <Alert tone="amber">
          Este evento está cerrado. Evaluaciones, incidentes y penalizaciones están protegidas. Usá
          «Reabrir evento» si necesitás volver a editarlo (queda en auditoría).
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Evaluaciones pendientes" subtitle="Quién tiene que evaluar todavía" />
          <div className="divide-y divide-slate-100">
            {(pendientes ?? []).map((p, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-medium">{p.club}</span>
                <span className="text-slate-500">{p.staffPrincipal ? `${p.staffPrincipal} (principal)` : p.motivo}</span>
              </div>
            ))}
            {(pendientes ?? []).length === 0 && !cargandoPendientes ? <Empty>Sin pendientes</Empty> : null}
            {pendientes === null && cargandoPendientes ? <p className="px-4 py-3 text-sm text-slate-400">Cargando…</p> : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Ranking del evento" subtitle="Puntaje oficial del principal, menos penalizaciones" />
          <ol className="space-y-1 p-4">
            {(ranking ?? []).map((r) => (
              <li key={r.posicion} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span>
                  <span className="mr-2 font-semibold">{r.posicion}º</span>
                  {r.club}
                </span>
                <span className="font-semibold">{r.puntaje.toLocaleString("es")} pts</span>
              </li>
            ))}
            {ranking && ranking.length === 0 && <Empty>Aún sin resultados</Empty>}
            {!ranking && <p className="text-sm text-slate-400">Cargando…</p>}
          </ol>
        </Card>
      </div>
    </div>
  );
}