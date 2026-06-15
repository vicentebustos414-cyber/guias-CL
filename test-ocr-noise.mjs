/**
 * Test con texto OCR degradado — simula errores típicos de Tesseract
 * (O→0, l→1, letras borrosas, espaciado roto)
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const fs = require('fs');
const src = fs.readFileSync('src/renderer/lib/parser.ts', 'utf8');
const js = ts.transpileModule(src, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const m = {}; new Function('exports', 'require', js)(m, require);
const { parseTablaGuias } = m;

// OCR con ruido: O's mezcladas con 0's, espaciado irregular, acentos perdidos
const NOISY_OCR = `
N° CONTENEDOR N° GUIA TRAMO CLIENTE VALOR VIA INTERPLANTA OTROS TOTAL COMENTARIOS
24SEGU929520-0 3247 LONTUE - VALPARAISO YEMETE FRUIT 7OO.OOO 700.000
24TRIU874559-0 127442 LONTUE - SAN ANTONIO EXPORTADORA SAN CLEMENT 650.000 650.000
24MSGU9O7754-0 127516 TALCA - VALPARAISO EXPORTADORA SAN CLEMENT 820.000 9O.000 910.000 RETIRO CRUZADO DE SAN ANTONIO A VALPO
24MSDU901414-0 113236 RETIRO - VALPARAISO DAVID DEL CURTO 930.000 930.000
24HLBU987648-9 3233 VILUCO - VALPARAISO EXPORTADORA LAS DELICIAS 45O.OOO 450.000
24CQSEKU936414 3311 VILUCO - VALPARAISO EXPORTADORA LAS DELICIAS 450.000 2O.OOO 470.000 DOS HORAS ESTADIA EN PUERTO
24SZLU514-2 127920 TALCA - SAN ANTONIO EXPORTADORA SAN CLEMENT 770.000 770.000
24HLBU985733-9 13074 PELEQUEN - VALPARAISO FRUZAL 530.000 530.000
`;

const result = parseTablaGuias(NOISY_OCR);
console.log(`\n🔍 OCR con ruido → Detectadas: ${result.length}/8 guías\n`);

let ok = 0, fail = 0;
const EXPECT_TOTALS = [700000, 650000, 910000, 930000, 450000, 470000, 770000, 530000];
const EXPECT_BASES  = [700000, 650000, 820000, 930000, 450000, 450000, 770000, 530000];

for (let i = 0; i < 8; i++) {
  const g = result[i];
  if (!g) { console.log(`  Guía ${i+1}: ✗ NO DETECTADA`); fail++; continue; }

  const totalOk = g.monto_total === EXPECT_TOTALS[i];
  const baseOk = g.monto_base === EXPECT_BASES[i];

  if (totalOk && baseOk) {
    ok++;
    console.log(`  ✓ Guía ${i+1}: Base=$${g.monto_base?.toLocaleString('es-CL')} Total=$${g.monto_total?.toLocaleString('es-CL')}${g.cargos_extra?.length ? ` + ${g.cargos_extra.map(c=>`${c.descripcion}=$${c.monto.toLocaleString('es-CL')}`).join(',')}` : ''}`);
  } else {
    fail++;
    console.log(`  ✗ Guía ${i+1}: Base=${g.monto_base} (esperado ${EXPECT_BASES[i]}) Total=${g.monto_total} (esperado ${EXPECT_TOTALS[i]})`);
  }
}

console.log(`\nResultado: ${ok}/8 guías con montos correctos, ${fail} errores`);
if (result.length > 8) console.log(`⚠️  ${result.length - 8} guías inventadas!`);
if (fail === 0 && result.length === 8) console.log('✅ Robusto contra errores OCR');
process.exit(fail > 0 ? 1 : 0);
