import { Injectable, BadRequestException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { PrismaService } from '../prisma/prisma.service.js';

const HEADERS = ['Nombre', 'Edad', 'Cargo', 'Año de ingreso', 'Categoría'];

export interface FilaMiembro {
  nombre: string;
  edad?: number;
  cargo?: string;
  anioIngreso?: number;
  categoria?: string;
}

@Injectable()
export class ClubesImportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Genera la plantilla .xlsx descargable */
  async generarPlantilla() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Miembros');
    ws.columns = HEADERS.map((h, i) => ({
      header: h,
      key: `col${i}`,
      width: i === 0 ? 32 : 18,
    }));
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF059669' },
    };
    ws.addRow(['Nombre de ejemplo']);
    ws.getRow(2).font = { italic: true, color: { argb: 'FF94A3B8' } };
    const buf = Buffer.from(await wb.xlsx.writeBuffer() as ArrayBuffer);
    return buf;
  }

  /** Parsea el archivo y crea los miembros */
  async importar(clubId: string, buffer: Buffer) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new BadRequestException('Club no encontrado');

    const data = Buffer.from(buffer);
    const filas: FilaMiembro[] = [];
    try {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(data as unknown as Parameters<typeof wb.xlsx.load>[0]);
      const ws = wb.worksheets[0];
      if (!ws) throw new Error('sin hoja');
      for (const row of ws.getRows(2, ws.rowCount - 1) ?? []) {
        if (!row) continue;
        const nombre = row.getCell(1).value;
        if (nombre === null || nombre === undefined) continue;
        const [edad, cargo, anioIngreso, categoria] = [
          row.getCell(2).value,
          row.getCell(3).value,
          row.getCell(4).value,
          row.getCell(5).value,
        ];
        const nombreStr = String(nombre).trim();
        if (!nombreStr) continue;
        filas.push({
          nombre: nombreStr,
          edad: this.num(edad),
          cargo: cargo && String(cargo).trim() ? String(cargo).trim() : undefined,
          anioIngreso: this.num(anioIngreso as any),
          categoria: categoria && String(categoria).trim() ? String(categoria).trim() : undefined,
        });
      }
    } catch {
      throw new BadRequestException(
        'No se pudo leer el archivo. Usá la plantilla descargable.',
      );
    }

    if (filas.length === 0) {
      throw new BadRequestException('El archivo no tiene filas con datos');
    }

    const creados = await this.prisma.$transaction(
      filas.map((f) =>
        this.prisma.miembro.create({
          data: { clubId, ...f },
        }),
      ),
    );

    return { importados: creados.length, club: club.nombre };
  }

  private num(v: unknown): number | undefined {
    if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }
    return undefined;
  }
}