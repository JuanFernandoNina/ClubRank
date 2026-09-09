"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth";
import { PageHeader, Button, inputCls, Spinner, Empty, Alert, Badge } from "@/components/ui";

interface Evento {
  id: string;
  nombre: string;
  fecha: string;
  lugar: string | null;
  tipo: string | null;
  temporada: string;
  puntajeMaximo: number;
  cerrado: boolean;
}

export default function EventosPage() {
  const { sesion, cargando } = useRequireAuth("admin");
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    nombre: "",
    fecha: "",
    lugar: "",
    tipo: "campamento",
    temporada: new Date().getFullYear().toString(),
    puntajeMaximo: "320",
  });

  useEffect(() => {
    if (sesion?.organizacionId) {
      apiClient
        .get<Evento[]>(`/organizaciones/${sesion.organizacionId}/eventos`)
        .then(setEventos)
        .catch(() => setEventos([]));
    }
  }, [sesion]);

  async function crearEvento(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await apiClient.post(`/organizaciones/${sesion!.organizacionId}/eventos`, {
        nombre: form.nombre,
        fecha: new Date(form.fecha).toISOString(),
        lugar: form.lugar || undefined,
        tipo: form.tipo || undefined,
        temporada: form.temporada,
        puntajeMaximo: Number(form.puntajeMaximo),
      });
      const data = await apiClient.get<Evento[]>(`/organizaciones/${sesion!.organizacionId}/eventos`);
      setEventos(data);
      setForm({ ...form, nombre: "", lugar: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear evento");
    }
  }

  if (cargando || !sesion || !eventos) return <Spinner />;

  const ordenados = [...eventos].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <div>
      <PageHeader title="Eventos" subtitle="Campamentos, reuniones y actividades evaluables">
        <details className="relative">
          <summary className="cursor-pointer select-none rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700">
            + Nuevo evento
          </summary>
          <form
            onSubmit={crearEvento}
            className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
          >
            <div className="space-y-2.5">
              {error ? <Alert>{error}</Alert> : null}
              <input
                name="nombre"
                required
                placeholder="Nombre"
                className={inputCls + " w-full"}
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  className={inputCls}
                  value={form.fecha}
                  onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                  required
                />
                <input
                  placeholder="Temporada (ej. 2026)"
                  className={inputCls}
                  value={form.temporada}
                  onChange={(e) => setForm({ ...form, temporada: e.target.value })}
                />
              </div>
              <input
                placeholder="Lugar"
                className={inputCls + " w-full"}
                value={form.lugar}
                onChange={(e) => setForm({ ...form, lugar: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className={inputCls + " bg-white capitalize"}
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                >
                  <option value="campamento">campamento</option>
                  <option value="reunion">reunión</option>
                  <option value="concurso">concurso</option>
                  <option value="otro">otro</option>
                </select>
                <input
                  type="number"
                  min="1"
                  placeholder="Puntaje máx"
                  className={inputCls}
                  value={form.puntajeMaximo}
                  onChange={(e) => setForm({ ...form, puntajeMaximo: e.target.value })}
                  required
                />
              </div>
              <button className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                Crear evento
              </button>
            </div>
          </form>
        </details>
      </PageHeader>

      {eventos.length === 0 && <Empty>Creá tu primer evento para configurar criterios y clubes.</Empty>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ordenados.map((e) => (
          <div key={e.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">{e.nombre}</h3>
                <p className="text-xs text-slate-400">
                  {new Date(e.fecha).toLocaleDateString("es")} · {e.lugar ?? "Sin lugar"}
                </p>
              </div>
              <Badge tone={e.cerrado ? "green" : "amber"}>{e.cerrado ? "Cerrado" : "Abierto"}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-slate-50 py-1.5">
                <div className="font-semibold text-slate-700">{e.puntajeMaximo} pts</div>
                <div className="text-slate-400">Máximo</div>
              </div>
              <div className="rounded-lg bg-slate-50 py-1.5">
                <div className="font-semibold text-slate-700">{e.cerrado ? "Sí" : "No"}</div>
                <div className="text-slate-400">Cerrado</div>
              </div>
              <div className="rounded-lg bg-slate-50 py-1.5">
                <div className="font-semibold text-slate-700 capitalize">{e.tipo ?? "—"}</div>
                <div className="text-slate-400">Tipo</div>
              </div>
            </div>
            <div className="mt-2 text-xs capitalize text-slate-400">Temporada {e.temporada}</div>
            <div className="mt-4 flex-1"></div>
            <Link
              href={`/panel/eventos/${e.id}`}
              className="block rounded-lg bg-emerald-600 py-2 text-center text-sm font-medium text-white hover:bg-emerald-700"
            >
              Gestionar evento
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}