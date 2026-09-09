import Link from "next/link";

const FEATURES = [
  {
    icon: "🏠",
    title: "Clubes",
    desc: "Creá tus clubes, agregá miembros y organizalos por cargo y categoría.",
  },
  {
    icon: "📅",
    title: "Eventos",
    desc: "Configurá eventos con fecha, temporada, tipo y puntaje máximo personalizado.",
  },
  {
    icon: "⚖️",
    title: "Evaluación ponderada",
    desc: "Definí criterios con pesos. El staff principal califica del 0 al 100 y el sistema calcula el puntaje automáticamente.",
  },
  {
    icon: "🏆",
    title: "Rankings",
    desc: "Ranking por evento y acumulado por temporada. Penalizaciones y cierres protegidos.",
  },
  {
    icon: "🚨",
    title: "Incidentes",
    desc: "Reportá incidentes con gravedad (baja, media, alta). El admin los gestiona y resuelve.",
  },
  {
    icon: "⚠️",
    title: "Penalizaciones",
    desc: "Catálogo de motivos con descuento de puntos. Aplicá, anulá y revisá el historial completo.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Creá tu organización",
    desc: "Registrate como administrador y creá tu organización en un minuto.",
  },
  {
    n: "2",
    title: "Agregá clubes y miembros",
    desc: "Creá los clubes, sumá miembros con cargo y categoría.",
  },
  {
    n: "3",
    title: "Configurá el evento",
    desc: "Elegí criterios de evaluación con pesos, asigná clubes y generá accesos para el staff.",
  },
  {
    n: "4",
    title: "El staff evalúa",
    desc: "Cada staff principal califica a su club del 0 al 100 en cada criterio.",
  },
  {
    n: "5",
    title: "Mirá los resultados",
    desc: "Rankings por evento y temporada. Incidentes, penalizaciones y todo el historial en un solo lugar.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="text-lg font-bold tracking-tight text-emerald-700">ClubRank</span>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:text-emerald-700"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/registro"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 to-white" />
        <div className="mx-auto max-w-4xl px-4 pb-16 pt-20 text-center sm:pt-28">
          <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Web + API · Multiclub · Fácil de usar
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
            Evaluá, rankeá y gestioná
            <br />
            <span className="text-emerald-600">tus clubes</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
            ClubRank es la plataforma para organizar clubes, crear eventos de
            evaluación con criterios ponderados, obtener rankings automáticos,
            registrar incidentes y aplicar penalizaciones.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/registro"
              className="rounded-xl bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
            >
              Crear mi organización
            </Link>
            <Link
              href="#como-funciona"
              className="rounded-xl border border-emerald-200 px-6 py-3 text-base font-medium text-emerald-700 transition hover:bg-emerald-50"
            >
              Cómo funciona
            </Link>
          </div>
        </div>
      </section>

      {/* Qué es */}
      <section className="border-t border-emerald-50 py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
            ¿Qué es ClubRank?
          </h2>
          <p className="mt-4 text-2xl font-bold leading-relaxed text-slate-900 sm:text-3xl">
            La forma más simple de medir el desempeño de tus clubes.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-slate-500">
            Definí criterios de evaluación con pesos, dejá que el staff califique,
            y dejá que el sistema calcule los puntajes automáticamente. Todo con
            trazabilidad completa, incidentes y penalizaciones incluidas.
          </p>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="bg-emerald-50/50 py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-600">
            Cómo funciona
          </h2>
          <p className="mt-3 text-center text-2xl font-bold text-slate-900">
            5 pasos para empezar
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-5">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white shadow-md shadow-emerald-600/20">
                  {s.n}
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-900">
                  {s.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-emerald-600">
            Todo lo que necesitás
          </h2>
          <p className="mt-3 text-center text-2xl font-bold text-slate-900">
            Funcionalidades del MVP
          </p>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-emerald-100 bg-white p-6 transition hover:border-emerald-300 hover:shadow-md hover:shadow-emerald-600/5"
              >
                <div className="text-3xl">{f.icon}</div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="bg-emerald-600 py-20">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Empezá a rankear tus clubes hoy
          </h2>
          <p className="mt-4 text-emerald-100">
            Creá tu organización en un minuto. Sin tarjeta de crédito, sin
            complicaciones.
          </p>
          <Link
            href="/registro"
            className="mt-8 inline-block rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-emerald-700 shadow-lg transition hover:bg-emerald-50"
          >
            Crear mi organización
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} ClubRank. Plataforma web responsive con API
        REST (futura app nativa).
      </footer>
    </div>
  );
}