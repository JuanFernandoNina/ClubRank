"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storage, type Sesion } from "./api";

/** Hook para el guard de páginas protegidas. Redirige a /login si no hay sesión. */
export function useRequireAuth(role?: "admin" | "staff" | "director") {
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion["usuario"] | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = storage.token;
    const u = storage.usuario;
    if (!token || !u) {
      router.replace("/login");
      return;
    }
    if (role && u.rol !== role) {
      // Rol distinto: redirigir al panel de su rol
      router.replace(u.rol === "admin" ? "/panel" : u.rol === "staff" ? "/staff" : "/director");
      return;
    }
    setSesion(u);
    setCargando(false);
  }, [router, role]);

  return { sesion, cargando };
}

export function cerrarSesion() {
  storage.token = null;
  storage.usuario = null;
  window.location.href = "/login";
}