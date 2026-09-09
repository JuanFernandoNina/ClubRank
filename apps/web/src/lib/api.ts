const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export interface Sesion {
  token: string;
  usuario: {
    id: string;
    nombre: string | null;
    username: string;
    rol: "admin" | "staff" | "director";
    organizacionId: string | null;
    clubDirectorId: string | null;
  };
}

export const storage = {
  get token(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("cr_token");
  },
  set token(v: string | null) {
    if (typeof window === "undefined") return;
    if (v) window.localStorage.setItem("cr_token", v);
    else window.localStorage.removeItem("cr_token");
  },
  get usuario(): Sesion["usuario"] | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem("cr_usuario");
    return raw ? JSON.parse(raw) : null;
  },
  set usuario(u: Sesion["usuario"] | null) {
    if (typeof window === "undefined") return;
    if (u) window.localStorage.setItem("cr_usuario", JSON.stringify(u));
    else window.localStorage.removeItem("cr_usuario");
  },
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const token =
    options.token !== undefined ? options.token : storage.token;
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? (options.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = await res.json();
      const m = (data as { message?: string | string[] }).message;
      msg = Array.isArray(m) ? m.join(", ") : (m ?? msg);
    } catch {
      /* cuerpo no JSON */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const apiClient = {
  get: <T>(p: string, t?: string | null) => api<T>(p, { token: t }),
  post: <T>(p: string, b?: unknown, t?: string | null) =>
    api<T>(p, { method: "POST", body: b, token: t }),
  patch: <T>(p: string, b?: unknown, t?: string | null) =>
    api<T>(p, { method: "PATCH", body: b, token: t }),
  del: <T>(p: string, t?: string | null) =>
    api<T>(p, { method: "DELETE", token: t }),
};

/** Sube un FormData (multipart) y devuelve JSON. */
export async function apiForm<T>(p: string, form: FormData, t?: string | null): Promise<T> {
  const token = t !== undefined ? t : storage.token;
  const res = await fetch(`${API_URL}${p}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = await res.json();
      const m = (data as { message?: string | string[] }).message;
      msg = Array.isArray(m) ? m.join(", ") : (m ?? msg);
    } catch {
      /* cuerpo no JSON */
    }
    throw new ApiError(res.status, msg);
  }
  return (await res.json()) as T;
}

/** Descarga un archivo (blob) con autenticación. */
export async function apiBlob(p: string, t?: string | null): Promise<Blob> {
  const token = t !== undefined ? t : storage.token;
  const res = await fetch(`${API_URL}${p}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const data = await res.json();
      const m = (data as { message?: string | string[] }).message;
      msg = Array.isArray(m) ? m.join(", ") : (m ?? msg);
    } catch {
      /* cuerpo no JSON */
    }
    throw new ApiError(res.status, msg);
  }
  return res.blob();
}