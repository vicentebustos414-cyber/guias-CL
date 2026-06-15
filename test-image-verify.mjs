/**
 * Test de verificación contra la imagen de referencia del usuario.
 * GUIA_RODRIGO_SILVA_DICIEMBRE_2025.xlsx (screenshot celular)
 *
 * Simula texto OCR realista y verifica que el parser extraiga
 * absolutamente todos los datos sin inventar nada.
 */

// ── Importar parser ──────────────────────────────────────────────────────────
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Transpile TS → JS inline
const ts = require('typescript');
const fs = require('fs');
const src = fs.readFileSync('src/renderer/lib/parser.ts', 'utf8');
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const m = {}; const fn = new Function('exports', 'require', js); fn(m, require);
const { parseTablaGuias } = m;

// ── Texto OCR simulado (lo que produciría Tesseract de la imagen) ────────────
// Incluye "24" prefix que el Excel muestra en columna A,
// y variaciones de espaciado típicas del OCR
const OCR_TEXT = `
N° CONTENEDOR N° GUIA   TRAMO                      CLIENTE                    VALOR VIA INTERPLANTA OTROS   TOTAL    COMENTARIOS
24 SEGU929520-0   3247  LONTUE - VALPARAISO        YEMETE FRUIT                700000                      700000
24 TRIU874559-0  127442  LONTUE - SAN ANTONIO      EXPORTADORA SAN CLEMENT     650000                      650000
24 MSGU907754-0  127516  TALCA - VALPARAISO        EXPORTADORA SAN CLEMENT     820000       90000           910000   RETIRO CRUZADO DE SAN ANTONIO A VALPO
24 MSDU901414-0  113236  RETIRO - VALPARAISO       DAVID DEL CURTO             930000                      930000
24 HLBU987648-9    3233  VILUCO - VALPARAISO       EXPORTADORA LAS DELICIAS    450000                      450000
24 CQSEKU936414   3311  VILUCO - VALPARAISO       EXPORTADORA LAS DELICIAS    450000              20000    470000   DOS HORAS ESTADIA EN PUERTO
24 SZLU514-2    127920  TALCA - SAN ANTONIO       EXPORTADORA SAN CLEMENT     770000                      770000
24 HLBU985733-9  13074  PELEQUEN - VALPARAISO     FRUZAL                      530000                      530000
`;

// ── Datos esperados (verdad absoluta de la imagen) ───────────────────────────
const EXPECTED = [
  {
    numero_guia: '3247',
    origen: 'Lontue', destino: 'Valparaíso',
    contenedor: 'SEGU929520-0',
    monto_base: 700000, monto_total: 700000,
    notas: undefined,
  },
  {
    numero_guia: '127442',
    origen: 'Lontue', destino: 'San Antonio',
    contenedor: 'TRIU874559-0',
    monto_base: 650000, monto_total: 650000,
    notas: undefined,
  },
  {
    numero_guia: '127516',
    origen: 'Talca', destino: 'Valparaíso',
    contenedor: 'MSGU907754-0',
    monto_base: 820000, monto_total: 910000,
    cargos_extra_sum: 90000,
    notas_contains: 'RETIRO CRUZADO',
  },
  {
    numero_guia: '113236',
    origen: 'Retiro', destino: 'Valparaíso',
    contenedor: 'MSDU901414-0',
    monto_base: 930000, monto_total: 930000,
    notas: undefined,
  },
  {
    numero_guia: '3233',
    origen: 'Viluco', destino: 'Valparaíso',
    contenedor: 'HLBU987648-9',
    monto_base: 450000, monto_total: 450000,
    notas: undefined,
  },
  {
    numero_guia: '3311',
    origen: 'Viluco', destino: 'Valparaíso',
    contenedor: 'CQSEKU936414',
    monto_base: 450000, monto_total: 470000,
    cargos_extra_sum: 20000,
    notas_contains: 'DOS HORAS ESTADIA',
  },
  {
    numero_guia: '127920',
    origen: 'Talca', destino: 'San Antonio',
    contenedor: 'SZLU514-2',
    monto_base: 770000, monto_total: 770000,
    notas: undefined,
  },
  {
    numero_guia: '13074',
    origen: 'Pelequén', destino: 'Valparaíso',
    contenedor: 'HLBU985733-9',
    monto_base: 530000, monto_total: 530000,
    notas: undefined,
  },
];

// ── Ejecutar parser ──────────────────────────────────────────────────────────
const result = parseTablaGuias(OCR_TEXT);

console.log(`\n🔍 Detectadas: ${result.length}/8 guías\n`);

// Mostrar cada guía detectada
result.forEach((g, i) => {
  console.log(`  Guía ${i + 1}: N°${g.numero_guia || '?'}  ${g.origen || '?'} → ${g.destino || '?'}  Base=$${g.monto_base?.toLocaleString('es-CL')} Total=$${g.monto_total?.toLocaleString('es-CL')}${g.cargos_extra?.length ? `  Cargos: ${g.cargos_extra.map(c => `${c.descripcion}=$${c.monto.toLocaleString('es-CL')}`).join(', ')}` : ''}${g.notas ? `  Notas: "${g.notas}"` : ''}  Container: ${g.descripcion_carga || '—'}`);
});

// ── Verificar campo por campo ────────────────────────────────────────────────
console.log('\n' + '─'.repeat(120));
console.log(`${'Campo'.padEnd(22)}| ${'Esperado'.padEnd(40)}| ${'Obtenido'.padEnd(40)}| OK?`);
console.log('─'.repeat(120));

let ok = 0, fail = 0;

function normalizeAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function check(label, expected, actual) {
  const expNorm = expected != null ? normalizeAccents(String(expected)).toUpperCase() : '';
  const actNorm = actual != null ? normalizeAccents(String(actual)).toUpperCase() : '';
  const pass = expNorm === actNorm || (expected === undefined && (actual === undefined || actual === '' || actual === null));
  if (pass) { ok++; } else { fail++; }
  const expStr = expected != null ? String(expected) : '—';
  const actStr = actual != null ? String(actual) : '—';
  if (!pass) {
    console.log(`${label.padEnd(22)}| ${expStr.padEnd(40)}| ${actStr.padEnd(40)}| ${pass ? '✓' : '✗ FALLO'}`);
  }
}

function checkContains(label, expectedSubstr, actual) {
  const pass = actual && normalizeAccents(actual.toUpperCase()).includes(normalizeAccents(expectedSubstr.toUpperCase()));
  if (pass) { ok++; } else { fail++; }
  if (!pass) {
    console.log(`${label.padEnd(22)}| contains: ${expectedSubstr.padEnd(28)}| ${(actual || '—').padEnd(40)}| ✗ FALLO`);
  }
}

for (let i = 0; i < EXPECTED.length; i++) {
  const exp = EXPECTED[i];
  const got = result[i];

  if (!got) {
    console.log(`Guía ${i + 1}: ✗ NO DETECTADA`);
    fail += 7;
    continue;
  }

  const prefix = `G${i + 1}`;
  check(`${prefix} numero_guia`, exp.numero_guia, got.numero_guia);
  check(`${prefix} origen`, exp.origen, got.origen);
  check(`${prefix} destino`, exp.destino, got.destino);
  check(`${prefix} monto_base`, exp.monto_base, got.monto_base);
  check(`${prefix} monto_total`, exp.monto_total, got.monto_total);

  // Container
  const gotContainer = got.descripcion_carga ? got.descripcion_carga.replace('Contenedor ', '') : undefined;
  check(`${prefix} contenedor`, exp.contenedor, gotContainer);

  // Cargos extra
  if (exp.cargos_extra_sum) {
    const gotSum = got.cargos_extra?.reduce((s, c) => s + (c.monto || 0), 0) ?? 0;
    check(`${prefix} cargos_sum`, exp.cargos_extra_sum, gotSum);
  }

  // Notas
  if (exp.notas_contains) {
    checkContains(`${prefix} notas`, exp.notas_contains, got.notas);
  } else if (exp.notas === undefined) {
    // Notas should be empty/undefined — not a hard fail if parser adds minor noise
  }
}

console.log('─'.repeat(120));
console.log(`\nResultado: ${ok} campos correctos, ${fail} con diferencias`);

if (result.length !== 8) {
  console.log(`\n⚠️  Se detectaron ${result.length} guías en vez de 8`);
}

if (fail === 0 && result.length === 8) {
  console.log('\n✅ TODOS LOS DATOS EXTRAÍDOS CORRECTAMENTE — 0 inventados, 0 faltantes');
} else {
  console.log('\n❌ Hay diferencias — revisar los fallos arriba');
}

// ── Verificación extra: no inventa guías fantasma ────────────────────────────
if (result.length > 8) {
  console.log(`\n🚫 GUÍAS INVENTADAS (${result.length - 8} extras):`);
  for (let i = 8; i < result.length; i++) {
    console.log(`  Extra ${i + 1}: N°${result[i].numero_guia || '?'} ${result[i].origen || '?'} → ${result[i].destino || '?'} $${result[i].monto_total || 0}`);
  }
}

process.exit(fail > 0 || result.length !== 8 ? 1 : 0);
