"use client";

import { useState, useEffect, FormEvent } from "react";
import { apiClient, apiBlob, apiForm, storage } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { PageHeader, Card, CardHeader, Button, inputCls, Spinner, Empty, Alert, Badge, Field } from "@/components/ui";

interface Club {
  id: string;
  nombre: string;
  createdAt: string;
  _count?: { miembros: number };
}
interface Miembro {
  id: string;
  nombre: string;
  edad: number | null;
  cargo: string | null;
  categoria: string | null;
}

export default function ClubesPage() {
  const { sesion, cargando } = useRequireAuth("admin");
  const [clubes, setClubes] = useState<Club[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState("");
  const [creando, setCreando] = useState(false);

  // detalle seleccionado
  const [clubSel, setClubSel] = useState<Club | null>(null);
  const [miembros, setMiembros] = useState<Miembro[] | null>(null);
  const [nuevoMiembro, setNuevoMiembro] = useState({ nombre: "", edad: "", cargo: "" });
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // edición / eliminación
  const [editarClub, setEditarClub] = useState<Club | null>(null);
  const [clubNombre, setClubNombre] = useState("");
  const [editarMiembro, setEditarMiembro] = useState<Miembro | null>(null);
  const [miembroForm, setMiembroForm] = useState({ nombre: "", edad: "", cargo: "" });

  async function recargar() {
    const data = await apiClient.get<Club[]>(`/organizaciones/${sesion!.organizacionId}/clubes`);
    setClubes(data);
  }

  useEffect(() => {
    if (sesion?.organizacionId) recargar().catch(() => setClubes([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion]);

  async function crearClub(e: FormEvent) {
    e.preventDefault();
    setCreando(true);
    setError(null);
    try {
      await apiClient.post(`/organizaciones/${sesion!.organizacionId}/clubes`, { nombre: nuevo });
      setNuevo("");
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setCreando(false);
    }
  }

  async function abrirClub(c: Club) {
    setClubSel(c);
    setMiembros(null);
    const m = await apiClient.get<Miembro[]>(`/clubes/${c.id}/miembros`);
    setMiembros(m);
  }

  async function crearMiembro(e: FormEvent) {
    e.preventDefault();
    if (!clubSel) return;
    const body = {
      nombre: nuevoMiembro.nombre,
      edad: nuevoMiembro.edad ? Number(nuevoMiembro.edad) : undefined,
      cargo: nuevoMiembro.cargo || undefined,
    };
    await apiClient.post(`/clubes/${clubSel.id}/miembros`, body);
    setNuevoMiembro({ nombre: "", edad: "", cargo: "" });
    const m = await apiClient.get<Miembro[]>(`/clubes/${clubSel.id}/miembros`);
    setMiembros(m);
  }

  async function guardarClub(e: FormEvent) {
    e.preventDefault();
    if (!editarClub) return;
    setError(null);
    try {
      await apiClient.patch(`/clubes/${editarClub.id}`, { nombre: clubNombre });
      setEditarClub(null);
      const clubs = await apiClient.get<Club[]>(`/organizaciones/${sesion!.organizacionId}/clubes`);
      setClubes(clubs);
      if (clubSel?.id === editarClub.id) setClubSel({ ...clubSel, nombre: clubNombre });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function eliminarClub(c: Club) {
    if (!confirm(`¿Eliminar el club "${c.nombre}"? Se borrarán sus miembros y asignaciones.`)) return;
    try {
      await apiClient.del(`/clubes/${c.id}`);
      if (clubSel?.id === c.id) {
        setClubSel(null);
        setMiembros(null);
      }
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function guardarMiembro(e: FormEvent) {
    e.preventDefault();
    if (!editarMiembro || !clubSel) return;
    setError(null);
    try {
      const body = {
        nombre: miembroForm.nombre,
        edad: miembroForm.edad ? Number(miembroForm.edad) : null,
        cargo: miembroForm.cargo || null,
      };
      await apiClient.patch(`/miembros/${editarMiembro.id}`, body);
      setEditarMiembro(null);
      const m = await apiClient.get<Miembro[]>(`/clubes/${clubSel.id}/miembros`);
      setMiembros(m);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function eliminarMiembro(m: Miembro) {
    if (!confirm(`¿Quitar a "${m.nombre}" del club?`)) return;
    if (!clubSel) return;
    await apiClient.del(`/miembros/${m.id}`);
    const lista = await apiClient.get<Miembro[]>(`/clubes/${clubSel.id}/miembros`);
    setMiembros(lista);
  }

  async function descargarPlantilla() {
    if (!clubSel) return;
    setImportErr(null);
    try {
      const blob = await apiBlob(`/clubes/${clubSel.id}/plantilla`, storage.token);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plantilla-miembros.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setImportErr(err instanceof Error ? err.message : "Error al descargar");
    }
  }

  async function importarExcel(e: FormEvent) {
    e.preventDefault();
    if (!clubSel || uploading) return;
    const input = e.target as HTMLFormElement;
    const fileEl = input.querySelector<HTMLInputElement>('input[name="archivo"]');
    const archivo = fileEl?.files?.[0];
    if (!archivo) {
      setImportErr("Seleccioná un archivo .xlsx");
      return;
    }
    setUploading(true);
    setImportMsg(null);
    setImportErr(null);
    try {
      const form = new FormData();
      form.append("archivo", archivo);
      const res = await apiForm<{ importados: number; club: string }>(
        `/clubes/${clubSel.id}/miembros/importar`,
        form,
        storage.token,
      );
      setImportMsg(`Se importaron ${res.importados} miembros a ${res.club}.`);
      if (fileEl) fileEl.value = "";
      const m = await apiClient.get<Miembro[]>(`/clubes/${clubSel.id}/miembros`);
      setMiembros(m);
      await recargar();
    } catch (err) {
      setImportErr(err instanceof Error ? err.message : "Error al importar");
    } finally {
      setUploading(false);
    }
  }

  if (cargando || !sesion || !clubes) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Clubes" subtitle="Gestiona los clubes de tu organización y sus miembros">
        {error ? <Alert>{error}</Alert> : null}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Crear club" />
            <form onSubmit={crearClub} className="flex gap-2 p-4">
              <input
                className={inputCls}
                placeholder="Nombre del club"
                value={nuevo}
                onChange={(e) => setNuevo(e.target.value)}
                required
              />
              <Button type="submit" disabled={creando}>
                Crear
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader title={`Clubes (${clubes.length})`} />
            <div className="divide-y divide-slate-100">
              {clubes.map((c) => (
                <div key={c.id} className="flex w-full items-center justify-between px-4 py-3 hover:bg-slate-50">
                  <button onClick={() => abrirClub(c)} className="flex flex-1 items-center justify-between text-left">
                    <span className="font-medium">{c.nombre}</span>
                    <span className="flex items-center gap-2">
                      <Badge>{c._count?.miembros ?? 0} miembros</Badge>
                      {clubSel?.id === c.id ? <Badge tone="blue">Seleccionado</Badge> : null}
                    </span>
                  </button>
                  <span className="ml-3 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditarClub(c);
                        setClubNombre(c.nombre);
                      }}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-emerald-700"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarClub(c)}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </span>
                </div>
              ))}
              {clubes.length === 0 && <Empty>Creá tu primer club</Empty>}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {clubSel ? (
            <>
              <Card>
                <CardHeader
                  title={`Miembros de ${clubSel.nombre}`}
                  subtitle="Cargá de a uno o importá en lote desde un archivo Excel"
                />
                {importMsg ? (
                  <div className="px-4 pt-3">
                    <Alert tone="green">{importMsg}</Alert>
                  </div>
                ) : null}
                {importErr ? (
                  <div className="px-4 pt-3">
                    <Alert>{importErr}</Alert>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 p-4 pb-1">
                  <Button variant="secondary" onClick={descargarPlantilla}>
                    Descargar plantilla
                  </Button>
                  <form onSubmit={importarExcel} className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      name="archivo"
                      accept=".xlsx"
                      className="text-sm text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700"
                    />
                    <Button type="submit" variant="secondary" disabled={uploading}>
                      {uploading ? "Importando…" : "Importar Excel"}
                    </Button>
                  </form>
                </div>
                <form onSubmit={crearMiembro} className="grid gap-2 p-4 sm:grid-cols-4">
                  <input
                    className={inputCls + " sm:col-span-2"}
                    placeholder="Nombre"
                    value={nuevoMiembro.nombre}
                    onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, nombre: e.target.value })}
                    required
                  />
                  <input
                    className={inputCls}
                    placeholder="Edad"
                    type="number"
                    min="0"
                    value={nuevoMiembro.edad}
                    onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, edad: e.target.value })}
                  />
                  <input
                    className={inputCls}
                    placeholder="Cargo"
                    value={nuevoMiembro.cargo}
                    onChange={(e) => setNuevoMiembro({ ...nuevoMiembro, cargo: e.target.value })}
                  />
                  <Button type="submit" className="sm:col-span-4">
                    Agregar miembro
                  </Button>
                </form>
              </Card>
              <Card>
                <CardHeader title={`Lista (${miembros?.length ?? 0})`} />
                <div className="divide-y divide-slate-100">
                  {(miembros ?? []).map((m) => (
                    <div key={m.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span>
                        {m.nombre}
                        <span className="ml-2 text-slate-500">
                          {m.edad ? `${m.edad} años` : ""} {m.cargo ? `· ${m.cargo}` : ""}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditarMiembro(m);
                            setMiembroForm({ nombre: m.nombre, edad: m.edad?.toString() ?? "", cargo: m.cargo ?? "" });
                          }}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-emerald-700"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminarMiembro(m)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </span>
                    </div>
                  ))}
                  {(miembros ?? []).length === 0 && <Empty>Sin miembros</Empty>}
                </div>
              </Card>
            </>
          ) : (
            <Empty>Seleccioná un club para gestionar sus miembros.</Empty>
          )}
        </div>
      </div>

      {editarClub ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">Editar club</h3>
            <form onSubmit={guardarClub} className="mt-4 space-y-3">
              <input
                className={inputCls}
                value={clubNombre}
                onChange={(e) => setClubNombre(e.target.value)}
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditarClub(null)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <Button type="submit">Guardar</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editarMiembro ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">Editar miembro</h3>
            <form onSubmit={guardarMiembro} className="mt-4 grid gap-3">
              <Field label="Nombre">
                <input
                  className={inputCls}
                  value={miembroForm.nombre}
                  onChange={(e) => setMiembroForm({ ...miembroForm, nombre: e.target.value })}
                  required
                />
              </Field>
              <Field label="Edad">
                <input
                  className={inputCls}
                  type="number"
                  min="0"
                  value={miembroForm.edad}
                  onChange={(e) => setMiembroForm({ ...miembroForm, edad: e.target.value })}
                />
              </Field>
              <Field label="Cargo">
                <input
                  className={inputCls}
                  value={miembroForm.cargo}
                  onChange={(e) => setMiembroForm({ ...miembroForm, cargo: e.target.value })}
                />
              </Field>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditarMiembro(null)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <Button type="submit">Guardar</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}