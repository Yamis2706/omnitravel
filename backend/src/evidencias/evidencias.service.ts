import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { errorDominio } from '../common/errores';

const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB (RNF-29)

/** MIME permitido → extensión y firma de bytes esperada al inicio del archivo. */
const TIPOS: Record<string, { extension: string; firma: (b: Buffer) => boolean }> = {
  'image/jpeg': { extension: 'jpg', firma: (b) => b[0] === 0xff && b[1] === 0xd8 },
  'image/png': { extension: 'png', firma: (b) => b.subarray(0, 4).toString('hex') === '89504e47' },
  'image/webp': {
    extension: 'webp',
    firma: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
  },
};

export const PATRON_USUARIO = /^\d+$/;
export const PATRON_ARCHIVO = /^\d+-[a-f0-9]{12}\.(jpg|png|webp)$/;

/**
 * Evidencia fotográfica guardada en el disco del backend, en
 * `<EVIDENCIAS_DIR>/<id_usuario>/<archivo>`. La `storage_key` que se
 * registra en la tabla `evidencia` es `<id_usuario>/<archivo>`, igual que
 * en el bucket de Supabase, para poder migrar a S3 sin cambiar datos.
 */
@Injectable()
export class EvidenciasService {
  readonly directorio: string;

  constructor(config: ConfigService) {
    this.directorio = resolve(config.get<string>('EVIDENCIAS_DIR') ?? 'uploads/evidencia');
  }

  async guardar(usuarioId: string, base64?: unknown, mimeType?: unknown) {
    const tipo = typeof mimeType === 'string' ? TIPOS[mimeType] : undefined;
    if (!tipo || typeof base64 !== 'string' || !base64) {
      throw errorDominio(
        HttpStatus.BAD_REQUEST,
        'FILE_REJECTED',
        'Solo se aceptan fotos JPG, PNG o WEBP.',
      );
    }

    const contenido = Buffer.from(base64, 'base64');
    if (contenido.length === 0 || contenido.length > TAMANO_MAXIMO) {
      throw errorDominio(HttpStatus.BAD_REQUEST, 'FILE_REJECTED', 'La foto supera los 5 MB.');
    }
    if (!tipo.firma(contenido)) {
      throw errorDominio(
        HttpStatus.BAD_REQUEST,
        'FILE_REJECTED',
        'El archivo no corresponde a una imagen válida.',
      );
    }

    const archivo = `${Date.now()}-${randomBytes(6).toString('hex')}.${tipo.extension}`;
    const carpeta = join(this.directorio, usuarioId);
    await mkdir(carpeta, { recursive: true });
    await writeFile(join(carpeta, archivo), contenido);

    return { storageKey: `${usuarioId}/${archivo}` };
  }
}
