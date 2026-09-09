// ClubRank demo — genera Admin + datos completos de ejemplo.
// Uso: npx prisma db seed   (o)   node prisma/seed.mjs
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PASS_ADMIN = 'admin123';
const PASS_USUARIOS = 'usuario123';

const NOMBRES_CLUBES = [
  'Águilas Doradas',
  'Leones Blancos',
  'Toros Rojos',
  'Cóndores Negros',
  'Lobos Estelares',
  'Panteras Plateadas',
  'Dragones Verdes',
  'Halcones Celestes',
  'Tigres Escarlata',
  'Búhos Dorados',
];

async function limpia() {
  const tables = [
    'puntajeCriterio', 'evaluacion', 'asignacion', 'incidente', 'penalizacionAplicada',
    'eventoClub', 'criterio', 'motivoPenalizacion', 'miembro', 'notificacion',
    'auditoria', 'club', 'evento', 'usuario', 'organizacion',
  ];
  for (const t of tables) {
    await prisma[t].deleteMany();
  }
}

async function main() {
  await limpia();

  const hashAdmin = await bcrypt.hash(PASS_ADMIN, 10);
  const hashUsuarios = await bcrypt.hash(PASS_USUARIOS, 10);

  // ---- Admin + organización ----
  const admin = await prisma.usuario.create({
    data: {
      nombre: 'Miguel Ángel Ruiz',
      username: 'admin',
      passwordHash: hashAdmin,
      rol: 'admin',
      creadoPorAdmin: false,
      organizacion: { create: { nombre: 'Academia Semillero ClubRank' } },
    },
    include: { organizacion: true },
  });
  const orgId = admin.organizacionId;

  // ---- 10 clubes × 12 miembros ----
  const clubes = [];
  const cargos = ['Capitán', 'Vicecapitán', null, 'Coordinador', null, null, 'Representante', null, null, 'Logística', null, null];
  const categorias = ['Principiante', 'Intermedio', 'Avanzado'];
  for (const nombre of NOMBRES_CLUBES) {
    const club = await prisma.club.create({
      data: {
        nombre,
        organizacionId: orgId,
        miembros: {
          create: Array.from({ length: 12 }, (_, mi) => ({
            nombre: `Miembro ${mi + 1} de ${nombre}`,
            edad: 15 + ((mi * 2) % 15),
            cargo: cargos[mi % cargos.length],
            categoria: categorias[mi % categorias.length],
            anioIngreso: 2019 + (mi % 7),
          })),
        },
      },
      include: { miembros: true },
    });
    clubes.push(club);
  }

  // ---- 5 staff + 10 directores (1 por club) ----
  const staff = [];
  for (let i = 1; i <= 5; i++) {
    staff.push(
      await prisma.usuario.create({
        data: {
          nombre: `Staff Nº ${i}`,
          username: `staff${i}`,
          passwordHash: hashUsuarios,
          rol: 'staff',
          creadoPorAdmin: true,
          organizacionId: orgId,
        },
      }),
    );
  }

  const directores = [];
  for (let i = 1; i <= 10; i++) {
    directores.push(
      await prisma.usuario.create({
        data: {
          nombre: `Director Nº ${i}`,
          username: `director${i}`,
          passwordHash: hashUsuarios,
          rol: 'director',
          creadoPorAdmin: true,
          organizacionId: orgId,
          clubDirectorId: clubes[i - 1].id,
        },
      }),
    );
  }

  // ---- 6 eventos (5 cerrados + 1 abierto) ----
  const criteriosData = [
    { nombre: 'Técnica', peso: 40 },
    { nombre: 'Presentación', peso: 30 },
    { nombre: 'Dificultad', peso: 30 },
  ];

  const objetosEvento = [
    { nombre: 'Festival de Primavera 2026', fecha: '2026-04-20', tipo: 'Festival' },
    { nombre: 'Campeonato Regional 2026', fecha: '2026-05-30', tipo: 'Campeonato' },
    { nombre: 'Gala de Danza 2026', fecha: '2026-06-25', tipo: 'Gala' },
    { nombre: 'Copa de Invierno 2026', fecha: '2026-07-15', tipo: 'Copa' },
    { nombre: 'Masterclass Regional 2026', fecha: '2026-08-20', tipo: 'Masterclass' },
    { nombre: 'Gran Final - Próximo', fecha: '2026-11-15', tipo: 'Final', abierto: true },
  ];

  // valores deterministas por club/evento para ranking variado
  const valor = (clubIdx, eventoIdx, j) => {
    const base = 72 + ((clubIdx * 7 + eventoIdx * 5 + j * 3) % 25);
    return base;
  };

  const eventos = [];
  for (const [idx, ev] of objetosEvento.entries()) {
    const evento = await prisma.evento.create({
      data: {
        nombre: ev.nombre,
        fecha: new Date(ev.fecha),
        temporada: '2026',
        tipo: ev.tipo,
        puntajeMaximo: 120,
        cerrado: ev.abierto ? false : true,
        organizacionId: orgId,
        criterios: { create: criteriosData },
      },
    });
    eventos.push(evento);

    // Todos los eventos (abiertos o no) tienen clubes participantes viñeta para director/staff.
    const criterios = await prisma.criterio.findMany({ where: { eventoId: evento.id } });
    const staffPrincipal = staff[idx % staff.length];

    for (let c = 0; c < clubes.length; c++) {
      const club = clubes[c];
      const ec = await prisma.eventoClub.create({
        data: { eventoId: evento.id, clubId: club.id, ...(ev.abierto ? {} : { principalId: staffPrincipal.id }) },
      });

      await prisma.asignacion.createMany({
        data: [
          { usuarioId: staffPrincipal.id, eventoClubId: ec.id, rol: 'staff' },
          { usuarioId: directores[c].id, eventoClubId: ec.id, rol: 'director' },
        ],
      });

      // En eventos abiertos no hay evaluaciones; el staff evalúa cuando el evento empieza.
      if (ev.abierto) continue;

      await prisma.evaluacion.create({
        data: {
          eventoClubId: ec.id,
          usuarioId: staffPrincipal.id,
          comentario: `Evaluación de ${staffPrincipal.nombre} en ${ev.nombre}`,
          puntajes: {
            create: criterios.map((cr, j) => ({
              criterioId: cr.id,
              valor: valor(c, idx, j),
            })),
          },
        },
      });
    }
  }

  // ---- 5 incidentes ----
  const tiposIncidente = ['Tardanza', 'Indisciplina', 'Daño material', 'Discusión', 'Incumplimiento de vestimenta'];
  const gravedades = ['baja', 'media', 'alta'];
  const estados = ['abierto', 'en_revision', 'resuelto'];
  for (let i = 0; i < 5; i++) {
    const evento = eventos[i % eventos.length];
    const club = clubes[(i * 2) % clubes.length];
    const ec = await prisma.eventoClub.findFirst({
      where: { eventoId: evento.id, clubId: club.id },
    });
    await prisma.incidente.create({
      data: {
        tipo: tiposIncidente[i],
        gravedad: gravedades[i % gravedades.length],
        descripcion: `Incidente de ejemplo Nº ${i + 1}: ${tiposIncidente[i]}.`,
        estado: estados[i % estados.length],
        eventoId: evento.id,
        eventoClubId: ec ? ec.id : null,
        usuarioId: admin.id,
      },
    });
  }

  // ---- 3 motivos + 3 penalizaciones aplicadas ----
  const motivos = [];
  for (const m of [
    { nombre: 'Tardanza en presentación', descripcion: 'El club llegó tarde a su presentación.', puntosDescuento: 5 },
    { nombre: 'Indisciplina en escenario', descripcion: 'Comportamiento indebido durante la presentación.', puntosDescuento: 10 },
    { nombre: 'Vestimenta inapropiada', descripcion: 'No cumplió con el reglamento de vestimenta.', puntosDescuento: 3 },
  ]) {
    motivos.push(
      await prisma.motivoPenalizacion.create({
        data: { ...m, organizacionId: orgId },
      }),
    );
  }

  for (let i = 0; i < 3; i++) {
    const evento = eventos[i];
    const club = clubes[(i * 3 + 1) % clubes.length];
    const ec = await prisma.eventoClub.findFirst({
      where: { eventoId: evento.id, clubId: club.id },
    });
    if (!ec) continue;
    await prisma.penalizacionAplicada.create({
      data: {
        motivoId: motivos[i].id,
        eventoClubId: ec.id,
        usuarioId: admin.id,
        comentario: `Penalización aplicada por ${motivos[i].nombre}.`,
        anulada: false,
      },
    });
  }

  console.log('Seed listo.');
  console.log('--------------------------------------------------');
  console.log(`Admin:      usuario = admin      / contraseña = ${PASS_ADMIN}`);
  for (let i = 1; i <= 5; i++) {
    console.log(`Staff:      usuario = staff${i}      / contraseña = ${PASS_USUARIOS}`);
  }
  for (let i = 1; i <= 10; i++) {
    console.log(`Director:   usuario = director${i}   / contraseña = ${PASS_USUARIOS}`);
  }
  console.log('--------------------------------------------------');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });