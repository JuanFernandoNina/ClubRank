"use client";

import { useState, useEffect, FormEvent } from "react";
import { apiClient } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { PageHeader, Card, CardHeader, Button, inputCls, Spinner, Empty, Alert, Badge, Field } from "@/components/ui";

interface Usuario {
  id: string;
  nombre: string | null;
  username: string;
  rol: "staff" | "director";
  clubDirector?: { id: string; nombre: string } | null;
}
interface Club {
  id: string;
  nombre: string;
}

export default function UsuariosPage() {
  const { sesion, cargando } = useRequireAuth("admin");
  const [usuarios, setUsuarios] = useState<Usuario[] | null>(null);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [creado, setCreado] = useState<{ username: string; password: string | null; reutilizado: boolean } | null>(null);
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [editForm, setEditForm] = useState({ nombre: "", rol: "staff" as "staff" | "director", clubId: "", password: "" });

  const [form, setForm] = useState({
    nombre: "",
    username: "",
    password: "",
    rol: "staff" as "staff" | "director",
    clubId: "",
  });

  async function recargar() {
    const data = await apiClient.get<Usuario[]>(`/auth/organizaciones/${sesion!.organizacionId}/usuarios`);
    setUsuarios(data);
    const clubs = await apiClient.get<Club[]>(`/organizaciones/${sesion!.organizacionId}/clubes`);
    setClubes(clubs);
  }

  useEffect(() => {
    if (sesion?.organizacionId) recargar().catch(() => setUsuarios([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion]);

  async function crearUsuario(e: FormEvent) {
    e.preventDefault();
    setCreando(true);
    setError(null);
    setOk(null);
    setCreado(null);
    try {
      const body: Record<string, unknown> = {
        nombre: form.nombre,
        username: form.username,
        rol: form.rol,
      };
      if (form.password) body.password = form.password;
      if (form.rol === "director" && form.clubId) body.clubId = form.clubId;
      const res = await apiClient.post<{
        usuario: Usuario;
        password: string | null;
        reutilizado: boolean;
      }>("/auth/usuarios", body);
      if (res.reutilizado) {
        setOk(`El usuario ${res.usuario.username} ya existía y se reutilizó.`);
      } else {
        setCreado({ username: res.usuario.username, password: res.password, reutilizado: res.reutilizado });
      }
      setForm({ nombre: "", username: "", password: "", rol: "staff", clubId: "" });
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setCreando(false);
    }
  }

  async function guardarEdicion(e: FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setGuardando(true);
    setError(null);
    setOk(null);
    try {
      const body: Record<string, unknown> = { nombre: editForm.nombre, rol: editForm.rol };
      if (editForm.password) body.password = editForm.password;
      if (editForm.rol === "director") body.clubId = editForm.clubId || null;
      await apiClient.patch(`/auth/usuarios/${editando.id}`, body);
      setOk(`Usuario ${editando.username} actualizado.`);
      setEditando(null);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando || !sesion || !usuarios) return <Spinner />;

  const rolBadge = (r: string) =>
    r === "director" ? <Badge tone="blue">Director</Badge> : <Badge tone="zinc">Staff</Badge>;

  return (
    <div className="space-y-6">
      <PageHeader title="Usuarios" subtitle="Creá cuentas de Staff y Director con usuario y contraseña">
        {error ? <Alert>{error}</Alert> : null}
        {ok ? <Alert tone="green">{ok}</Alert> : null}
      </PageHeader>

      <Card>
        <CardHeader title="Nuevo usuario" subtitle="Si dejás la contraseña vacía se genera automáticamente" />
        <form onSubmit={crearUsuario} className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label="Nombre">
            <input
              className={inputCls}
              placeholder="Nombre y apellido"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </Field>
          <Field label="Usuario">
            <input
              className={inputCls}
              placeholder="ej. juan.perez"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
            />
          </Field>
          <Field label="Rol">
            <select
              className={inputCls}
              value={form.rol}
              onChange={(e) => setForm({ ...form, rol: e.target.value as "staff" | "director" })}
            >
              <option value="staff">Staff (evalúa clubes)</option>
              <option value="director">Director (su club)</option>
            </select>
          </Field>
          <Field label="Contraseña" hint="Opcional">
            <input
              className={inputCls}
              type="text"
              placeholder="Dejá vacío para autogenerar"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
            />
          </Field>
          {form.rol === "director" ? (
            <Field label="Club del director" hint="El director verá este club">
              <select
                className={inputCls}
                value={form.clubId}
                onChange={(e) => setForm({ ...form, clubId: e.target.value })}
              >
                <option value="">Seleccioná un club…</option>
                {clubes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}
          <Button type="submit" disabled={creando} className="sm:col-span-2">
            {creando ? "Creando…" : "Crear usuario"}
          </Button>
        </form>
        {creado ? (
          <div className="mx-4 mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <p className="font-semibold text-emerald-800">¡Usuario creado!</p>
            <p className="mt-1 text-emerald-700">
              Usuario: <b>{creado.username}</b> · Contraseña:{" "}
              <b>{creado.password ?? "(reutilizada)"}</b>
            </p>
            <p className="mt-1 text-xs text-emerald-600">
              Guardá la contraseña ahora; solo se muestra una vez.
            </p>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader title={`Usuarios (${usuarios.length})`} subtitle="Cuentas de la organización" />
        <div className="divide-y divide-slate-100">
          {usuarios.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                  {(u.nombre ?? u.username).charAt(0).toUpperCase()}
                </div>
                <div className="leading-tight">
                  <div className="font-medium text-slate-800">{u.nombre ?? u.username}</div>
                  <div className="text-xs text-slate-500">@{u.username}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {u.rol === "director" && u.clubDirector ? (
                  <Badge tone="green">{u.clubDirector.nombre}</Badge>
                ) : null}
                {rolBadge(u.rol)}
                <button
                  type="button"
                  onClick={() => {
                    setEditando(u);
                    setEditForm({
                      nombre: u.nombre ?? "",
                      rol: u.rol,
                      clubId: u.clubDirector?.id ?? "",
                      password: "",
                    });
                  }}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100 hover:text-emerald-700"
                >
                  Editar
                </button>
              </div>
            </div>
          ))}
          {usuarios.length === 0 && <Empty>No hay usuarios creados.</Empty>}
        </div>
      </Card>

      {editando ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-800">
              Editar usuario · <span className="text-emerald-700">@{editando.username}</span>
            </h3>
            <form onSubmit={guardarEdicion} className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Nombre">
                <input
                  className={inputCls}
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  required
                />
              </Field>
              <Field label="Rol">
                <select
                  className={inputCls}
                  value={editForm.rol}
                  onChange={(e) => {
                    const rol = e.target.value as "staff" | "director";
                    setEditForm({ ...editForm, rol, clubId: rol === "director" ? editForm.clubId : "" });
                  }}
                >
                  <option value="staff">Staff (evalúa clubes)</option>
                  <option value="director">Director (su club)</option>
                </select>
              </Field>
              {editForm.rol === "director" ? (
                <Field label="Club del director">
                  <select
                    className={inputCls}
                    value={editForm.clubId}
                    onChange={(e) => setEditForm({ ...editForm, clubId: e.target.value })}
                  >
                    <option value="">Sin club</option>
                    {clubes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <Field label="Nueva contraseña" hint="Opcional">
                <input
                  className={inputCls}
                  type="text"
                  placeholder="Dejá vacío para no cambiar"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  autoComplete="new-password"
                />
              </Field>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <Button type="submit" disabled={guardando}>
                  {guardando ? "Guardando…" : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}