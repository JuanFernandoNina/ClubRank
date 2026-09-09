"use client";

import { useState, useEffect, FormEvent } from "react";
import { apiClient } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { Card, CardHeader, Button, inputCls, Spinner, Empty, Badge, Alert, PageHeader } from "@/components/ui";

interface Motivo {
  id: string;
  nombre: string;
  descripcion: string | null;
  puntosDescuento: number;
  activo: boolean;
}
interface Penalizacion {
  id: string;
  comentario: string | null;
  anulada: boolean;
  createdAt: string;
  motivo: { id: string; nombre: string; puntosDescuento: number };
  eventoClub: {
    club: { id: string; nombre: string };
    evento: { id: string; nombre: string };
  };
  usuario: { id: string; nombre: string | null; username: string };
}

export default function PenalizacionesPage() {
  const { sesion, cargando } = useRequireAuth("admin");
  const [motivos, setMotivos] = useState<Motivo[] | null>(null);
  const [aplicadas, setAplicadas] = useState<Penalizacion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ nombre: "", descripcion: "", puntosDescuento: "10" });

  async function cargarTodo() {
    const org = sesion!.organizacionId;
    const [m, a] = await Promise.all([
      apiClient.get<Motivo[]>(`/organizaciones/${org}/motivos-penalizacion`),
      apiClient.get<Penalizacion[]>(`/organizaciones/${org}/penalizaciones`),
    ]);
    setMotivos(m);
    setAplicadas(a);
  }

  useEffect(() => {
    if (sesion?.organizacionId) cargarTodo().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion]);

  async function crearMotivo(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post(`/organizaciones/${sesion!.organizacionId}/motivos-penalizacion`, {
        nombre: form.nombre,
        descripcion: form.descripcion || undefined,
        puntosDescuento: Number(form.puntosDescuento),
      });
      setForm({ nombre: "", descripcion: "", puntosDescuento: "10" });
      await cargarTodo();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  }

  async function alternarMotivo(m: Motivo) {
    if (m.activo) {
      await apiClient.del(`/motivos-penalizacion/${m.id}`);
    } else {
      await apiClient.patch(`/motivos-penalizacion/${m.id}`, {
        nombre: m.nombre,
        descripcion: m.descripcion ?? undefined,
        puntosDescuento: m.puntosDescuento,
      });
    }
    await cargarTodo();
  }

  async function anular(p: Penalizacion) {
    await apiClient.del(`/penalizaciones/${p.id}`);
    await cargarTodo();
  }

  if (cargando || !sesion || !motivos || !aplicadas) return <Spinner />;

  return (
    <div className="space-y-6">
      <PageHeader title="Penalizaciones" subtitle="Descuentos del total acumulado de temporada">
        {error ? <Alert>{error}</Alert> : null}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader title="Catálogo de motivos" subtitle="Los staff los eligen al penalizar a un club en un evento" />
            <form onSubmit={crearMotivo} className="grid gap-2 p-4 sm:grid-cols-3">
              <input className={inputCls} placeholder="Motivo (ej. llegar tarde)" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              <input className={inputCls} placeholder="Descuento (pts)" type="number" min="1" value={form.puntosDescuento} onChange={(e) => setForm({ ...form, puntosDescuento: e.target.value })} required />
              <input className={inputCls + " sm:col-span-3"} placeholder="Descripción (opcional)" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              <Button type="submit" className="sm:col-span-3">Agregar motivo</Button>
            </form>
            <div className="divide-y divide-slate-100">
              {motivos.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <span className="font-medium">{m.nombre}</span>
                    <Badge tone="red" >−{m.puntosDescuento} pts</Badge>
                    {m.descripcion ? <p className="text-xs text-slate-500">{m.descripcion}</p> : null}
                  </div>
                  <Button variant={m.activo ? "ghost" : "secondary"} onClick={() => alternarMotivo(m)}>
                    {m.activo ? "Desactivar" : "Reactivar"}
                  </Button>
                </div>
              ))}
              {motivos.length === 0 && <Empty>Creá motivos de penalización.</Empty>}
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Aplicadas" subtitle="Anular solo si corresponde (queda en auditoría)" />
          <div className="divide-y divide-slate-100">
            {aplicadas.map((p) => (
              <div key={p.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{p.motivo.nombre}</span>
                    <Badge tone="red">−{p.motivo.puntosDescuento} pts</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.anulada ? <Badge tone="zinc">Anulada</Badge> : <Button variant="ghost" onClick={() => anular(p)}>Anular</Button>}
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {p.eventoClub.evento.nombre} · {p.eventoClub.club.nombre} · por {p.usuario.nombre ?? p.usuario.username} · {new Date(p.createdAt).toLocaleString("es")}
                </p>
                {p.comentario ? <p className="text-xs text-slate-400">"{p.comentario}"</p> : null}
              </div>
            ))}
            {aplicadas.length === 0 && <Empty>Ninguna penalización aplicada todavía.</Empty>}
          </div>
        </Card>
      </div>
    </div>
  );
}