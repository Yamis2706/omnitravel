// OmniTravel · copia de datos Supabase → PostgreSQL en AWS RDS
//
// Uso (desde backend/):
//   node --env-file=.env scripts/copiar-supabase-a-aws.mjs --simular
//   node --env-file=.env scripts/copiar-supabase-a-aws.mjs [--reemplazar]
//
// Variables (en backend/.env o en la terminal):
//   DATABASE_URL     destino: AWS RDS (omnitravel_db)
//   SUPABASE_DB_URL  origen: Supabase → Project Settings → Database →
//                    Connection string (URI). Solo se usa para LEER.
//   SUPABASE_URL     opcional: https://<ref>.supabase.co, para descargar las
//                    fotos del bucket público `evidencia`.
//   EVIDENCIAS_DIR   carpeta de fotos del backend (por defecto uploads/evidencia)
//   DB_SSL           'true' para conectar a AWS con SSL
//
// Qué hace:
//   - Copia las tablas que existen en ambas bases, solo con las columnas
//     comunes, respetando el orden de las llaves foráneas y los ids.
//   - `rol` no se copia (ya existe en AWS); se verifica que coincida.
//   - Adapta las diferencias de esquema: reporte.estado 'pendiente' →
//     'pendiente_validacion'; decision_moderacion → moderacion.
//   - Las contraseñas de `usuario` (SHA-256 de la app) se copian tal cual:
//     el backend las acepta y las convierte a bcrypt en el primer login.
//   - Descarga las fotos y les da una ruta `<id_usuario>/<archivo>` válida
//     para el backend.
//   - Todo en una transacción: si algo falla, AWS queda como estaba.
//
// --simular   muestra lo que se copiaría sin escribir nada.
// --reemplazar  vacía en AWS las tablas a copiar (excepto rol) antes de
//               copiar. Sin esta opción, el script se detiene si AWS ya
//               tiene datos.

import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import pg from 'pg';

const SIMULAR = process.argv.includes('--simular');
const REEMPLAZAR = process.argv.includes('--reemplazar');
const EXCLUIDAS = new Set(['spatial_ref_sys', 'rol']);

function exigir(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`Falta la variable ${nombre}. Revisa los comentarios al inicio del script.`);
    process.exit(1);
  }
  return valor;
}

const origen = new pg.Client({
  connectionString: exigir('SUPABASE_DB_URL'),
  ssl: { rejectUnauthorized: false },
});
const destino = new pg.Client({
  connectionString: exigir('DATABASE_URL'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function columnas(cliente, tabla) {
  const { rows } = await cliente.query(
    `select column_name, udt_name, is_identity
       from information_schema.columns
      where table_schema = 'public' and table_name = $1
      order by ordinal_position`,
    [tabla],
  );
  return rows;
}

async function tablas(cliente) {
  const { rows } = await cliente.query(
    `select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'`,
  );
  return new Set(rows.map((r) => r.table_name));
}

/** Orden topológico por llaves foráneas del destino (padres primero). */
async function ordenarPorDependencias(lista) {
  const { rows } = await destino.query(
    `select tc.table_name as hija, ccu.table_name as padre
       from information_schema.table_constraints tc
       join information_schema.constraint_column_usage ccu
         on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
      where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'`,
  );
  const padres = new Map(lista.map((t) => [t, new Set()]));
  for (const { hija, padre } of rows) {
    if (padres.has(hija) && padres.has(padre) && hija !== padre) {
      padres.get(hija).add(padre);
    }
  }
  const orden = [];
  const visitadas = new Set();
  const visitar = (t) => {
    if (visitadas.has(t)) return;
    visitadas.add(t);
    for (const p of padres.get(t)) visitar(p);
    orden.push(t);
  };
  [...lista].sort().forEach(visitar);
  return orden;
}

/** Ajustes de valores por diferencias de esquema entre Supabase y AWS. */
function adaptarFila(tabla, fila) {
  if (tabla === 'reporte' && fila.estado === 'pendiente') {
    return { ...fila, estado: 'pendiente_validacion' };
  }
  return fila;
}

async function leerFilas(tabla, cols) {
  const lista = cols
    .map((c) =>
      c.udt_name === 'geometry' || c.udt_name === 'geography'
        ? `ST_AsEWKT("${c.column_name}"::geometry) as "${c.column_name}"`
        : `"${c.column_name}"`,
    )
    .join(', ');
  const { rows } = await origen.query(`select ${lista} from public."${tabla}"`);
  return rows;
}

async function insertar(tabla, colsDestino, filas) {
  if (filas.length === 0) return;
  const nombres = colsDestino.map((c) => `"${c.column_name}"`).join(', ');
  const valores = colsDestino
    .map((c, i) =>
      c.udt_name === 'geometry' || c.udt_name === 'geography'
        ? `ST_GeomFromEWKT($${i + 1})::${c.udt_name}`
        : `$${i + 1}`,
    )
    .join(', ');
  const overriding = colsDestino.some((c) => c.is_identity === 'YES')
    ? 'overriding system value'
    : '';
  const sql = `insert into public."${tabla}" (${nombres}) ${overriding} values (${valores})`;
  for (const fila of filas) {
    await destino.query(
      sql,
      colsDestino.map((c) => {
        const v = fila[c.column_name];
        // json/jsonb llegan como objeto: se reenvían serializados.
        return v !== null && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v;
      }),
    );
  }
}

async function reiniciarIdentidades(tabla, colsDestino) {
  for (const c of colsDestino.filter((x) => x.is_identity === 'YES')) {
    await destino.query(
      `select setval(pg_get_serial_sequence($1, $2),
                     coalesce((select max("${c.column_name}") from public."${tabla}"), 0) + 1, false)`,
      [`public.${tabla}`, c.column_name],
    );
  }
}

async function verificarRoles() {
  const a = (await origen.query('select id_rol::text, nombre_rol from rol order by 1')).rows;
  const b = (await destino.query('select id_rol::text, nombre_rol from rol order by 1')).rows;
  const clave = (filas) => filas.map((r) => `${r.id_rol}:${r.nombre_rol}`).join(',');
  if (clave(a) !== clave(b)) {
    throw new Error(
      `Los roles no coinciden.\n  Supabase: ${clave(a)}\n  AWS:      ${clave(b)}\n` +
        'Ajusta la tabla rol en AWS antes de copiar.',
    );
  }
}

/** Descarga las fotos del bucket público y reescribe storage_key. */
async function copiarFotos() {
  const { rows } = await destino.query(
    `select e.id_evidencia, e.storage_key, r.usuario_creador_id
       from evidencia e join reporte r on r.id_reporte = e.reporte_id`,
  );
  if (rows.length === 0) return { copiadas: 0, fallidas: 0 };

  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  if (!base) {
    console.warn(
      `  ⚠ ${rows.length} evidencias sin copiar: define SUPABASE_URL para descargar las fotos.`,
    );
    return { copiadas: 0, fallidas: rows.length };
  }

  const directorio = resolve(process.env.EVIDENCIAS_DIR ?? 'uploads/evidencia');
  let copiadas = 0;
  let fallidas = 0;
  for (const { id_evidencia, storage_key, usuario_creador_id } of rows) {
    const extension = /\.(png|webp)$/i.exec(storage_key)?.[1]?.toLowerCase() ?? 'jpg';
    const respuesta = await fetch(`${base}/storage/v1/object/public/evidencia/${storage_key}`);
    if (!respuesta.ok || usuario_creador_id == null) {
      console.warn(`  ⚠ No se pudo copiar la foto ${storage_key} (HTTP ${respuesta.status}).`);
      fallidas += 1;
      continue;
    }
    const nueva = `${usuario_creador_id}/${Date.now()}-${randomBytes(6).toString('hex')}.${extension}`;
    const ruta = join(directorio, nueva);
    await mkdir(dirname(ruta), { recursive: true });
    await writeFile(ruta, Buffer.from(await respuesta.arrayBuffer()));
    await destino.query('update evidencia set storage_key = $1 where id_evidencia = $2', [
      nueva,
      id_evidencia,
    ]);
    copiadas += 1;
  }
  return { copiadas, fallidas };
}

async function main() {
  await origen.connect();
  await destino.connect();
  await origen.query('set default_transaction_read_only = on');

  const enOrigen = await tablas(origen);
  const enDestino = await tablas(destino);
  const comunes = [...enOrigen].filter((t) => enDestino.has(t) && !EXCLUIDAS.has(t));
  const orden = await ordenarPorDependencias(comunes);
  const soloOrigen = [...enOrigen].filter((t) => !enDestino.has(t) && !EXCLUIDAS.has(t));

  await verificarRoles();

  // Plan: columnas comunes por tabla y conteos.
  const plan = [];
  for (const tabla of orden) {
    const colsO = await columnas(origen, tabla);
    const colsD = await columnas(destino, tabla);
    const nombresO = new Set(colsO.map((c) => c.column_name));
    const colsComunes = colsD.filter((c) => nombresO.has(c.column_name));
    const omitidas = colsO.map((c) => c.column_name).filter((n) => !colsD.some((c) => c.column_name === n));
    const total = Number((await origen.query(`select count(*) from public."${tabla}"`)).rows[0].count);
    const existentes = Number((await destino.query(`select count(*) from public."${tabla}"`)).rows[0].count);
    plan.push({ tabla, colsComunes, omitidas, total, existentes });
  }
  const decisiones = enOrigen.has('decision_moderacion')
    ? Number((await origen.query('select count(*) from decision_moderacion')).rows[0].count)
    : 0;

  console.log('Plan de copia (Supabase → AWS):');
  for (const p of plan) {
    const extra = p.omitidas.length ? `  (columnas solo en Supabase, se omiten: ${p.omitidas.join(', ')})` : '';
    console.log(`  ${p.tabla.padEnd(30)} ${String(p.total).padStart(5)} filas   [AWS hoy: ${p.existentes}]${extra}`);
  }
  if (decisiones) console.log(`  decision_moderacion → moderacion ${String(decisiones).padStart(5)} filas`);
  if (soloOrigen.length) console.log(`  Tablas solo en Supabase (no se copian): ${soloOrigen.join(', ')}`);

  const conDatos = plan.filter((p) => p.existentes > 0);
  if (conDatos.length && !REEMPLAZAR) {
    console.error(
      `\nAWS ya tiene datos en: ${conDatos.map((p) => `${p.tabla} (${p.existentes})`).join(', ')}.\n` +
        'Vuelve a ejecutar con --reemplazar para vaciarlas antes de copiar.',
    );
    process.exitCode = 1;
    return;
  }
  if (SIMULAR) {
    console.log('\n--simular: no se escribió nada.');
    return;
  }

  await destino.query('begin');
  try {
    if (REEMPLAZAR) {
      const vaciar = [...new Set([...orden, ...(enDestino.has('moderacion') ? ['moderacion'] : [])])];
      await destino.query(
        `truncate ${vaciar.map((t) => `public."${t}"`).join(', ')} restart identity cascade`,
      );
    }

    for (const { tabla, colsComunes, total } of plan) {
      const filas = (await leerFilas(tabla, colsComunes)).map((f) => adaptarFila(tabla, f));
      await insertar(tabla, colsComunes, filas);
      await reiniciarIdentidades(tabla, colsComunes);
      console.log(`  ✔ ${tabla}: ${total}`);
    }

    if (decisiones && enDestino.has('moderacion')) {
      const { rows } = await origen.query(
        'select reporte_id, moderador_id, accion, motivo, decidido_en from decision_moderacion',
      );
      for (const d of rows) {
        await destino.query(
          'insert into moderacion (reporte_id, moderador_id, accion, motivo, fecha) values ($1, $2, $3, $4, $5)',
          [d.reporte_id, d.moderador_id, d.accion === 'aprobado' ? 'aprobar' : 'rechazar', d.motivo, d.decidido_en],
        );
      }
      console.log(`  ✔ decision_moderacion → moderacion: ${rows.length}`);
    }

    const fotos = await copiarFotos();
    console.log(`  ✔ fotos de evidencia: ${fotos.copiadas} copiadas, ${fotos.fallidas} sin copiar`);

    await destino.query('commit');
    console.log('\nCopia terminada.');
  } catch (error) {
    await destino.query('rollback');
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(`\nERROR: ${error.message}\nAWS no fue modificado.`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await origen.end().catch(() => {});
    await destino.end().catch(() => {});
  });
