/**
 * Parser de guías de flete chilenas.
 * Detecta tablas Excel (múltiples guías) y documentos individuales.
 */

import type { CargoExtra } from '../../shared/types';

export interface ParsedGuia {
  numero_guia?: string;
  fecha?: string;
  origen?: string;
  destino?: string;
  empresa_flete?: string;
  rut_empresa?: string;
  nombre_chofer?: string;
  rut_chofer?: string;
  patente?: string;
  descripcion_carga?: string;
  monto_base?: number;
  cargos_extra?: CargoExtra[];
  monto_total?: number;
  notas?: string;
}

// ── Lista completa de ciudades/localidades de carga Chile ────────────────────
const CIUDADES = [
  // Principales
  'Arica','Iquique','Antofagasta','Calama','Copiapó','La Serena','Coquimbo',
  'Valparaíso','Viña del Mar','Santiago','Rancagua','Talca','Chillán',
  'Concepción','Los Ángeles','Temuco','Valdivia','Osorno','Puerto Montt',
  'Coyhaique','Punta Arenas',
  // Zona central — transporte de carga frecuente
  'San Antonio','Quilpué','La Calera','San Fernando','Linares','Curicó',
  'Constitución','Lota','Coronel','Angol','Victoria','Villarrica','Pucón',
  'Castro','Ancud','Puerto Varas','Puerto Natales','Ovalle','Illapel',
  // Maule y O'Higgins — orígenes muy comunes en guías
  'Lontue','San Clemente','Molina','Longaví','Parral','San Javier',
  'Cauquenes','Chanco','Pelarco','Río Claro','Curepto','Vichuquén',
  'Hualañé','Licantén','Rauco','Romeral','Teno','Sagrada Familia',
  'Pencahue','Maule','Empedrado','San Rafael','Retiro','Colbún',
  'Villa Alegre','Yerbas Buenas','Cumpeo','Río Maule',
  // Metropolitana
  'Peñaflor','Melipilla','Talagante','Buin','Paine','San Bernardo',
  'Puente Alto','Maipú','Quilicura','Pudahuel','Lampa','Colina','Til Til',
  'Viluco','Buín','El Monte','Isla de Maipo','Alhué','Curacaví',
  // O'Higgins
  'Pelequén','Peumo','Pichidegua','Las Cabras','Quinta de Tilcoco',
  'Rengo','Requínoa','Graneros','Machalí','Coinco','Coltauco',
  'Doñihue','Mostazal','Codegua','Malloa','Olivar',
  // Valparaíso interior
  'Casablanca','Cartagena','El Tabo','El Quisco','Algarrobo',
  'Los Vilos','Salamanca','Quillota','Hijuelas','Nogales',
  'Limache','Olmué','Villa Alemana',
  // Biobío
  'Nacimiento','Cabrero','Yumbel','Hualqui','Santa Juana',
  'Lebu','Arauco','Curanilahue','Los Álamos',
];

// ── Utilidades ───────────────────────────────────────────────────────────────

function normalizeAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/** Retorna el nombre canónico de la ciudad si se encuentra en la lista */
function cityMatch(text: string): string | undefined {
  const norm = normalizeAccents(text.trim().toUpperCase());
  if (norm.length < 3) return undefined;
  for (const c of CIUDADES) {
    const normC = normalizeAccents(c.toUpperCase());
    if (norm === normC) return c;
    // Permite prefijo exacto con espacio/fin (ej: "LONTUE " → "Lontue")
    if (norm.startsWith(normC) && (norm.length === normC.length || norm[normC.length] === ' ')) return c;
  }
  return undefined;
}

function extractRut(text: string): string[] {
  const ruts: string[] = [];
  const re = /\b(\d{1,2}\.?\d{3}\.?\d{3}-[\dkK])\b/gi;
  let m;
  while ((m = re.exec(text)) !== null) ruts.push(m[1].toUpperCase());
  return ruts;
}

function extractDate(text: string): string | undefined {
  const m1 = text.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\b/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  const m2 = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m2) return `${m2[1]}-${m2[2].padStart(2,'0')}-${m2[3].padStart(2,'0')}`;
  return undefined;
}

function extractPatente(text: string): string | undefined {
  // Patente chilena: ej ABCD12 o AB1234. NO debe ir seguida de % (batería teléfono)
  const m = text.match(/\b([A-Z]{2,4}[-.\s]?\d{2,4})\b(?!\s*%)/i);
  if (!m) return undefined;
  const p = m[1].toUpperCase().replace(/[-.\s]/g, '');
  if (p.length < 4 || /^\d+$/.test(p)) return undefined;
  return p;
}

/**
 * Extrae código de contenedor ISO con tolerancia a ruido OCR.
 * El prefijo de letras puede tener 1-2 dígitos mezclados (0→O, 1→I/L, 5→S, 8→B…).
 * Ejemplos reales: SEGU929520-0, CQSEKU936414, SZLU514-2, H1BU987648-9 (OCR noise)
 */
function extractContainer(text: string): string | undefined {
  // Pasar 1: regex estándar (sin ruido)
  const clean = text.match(/([A-Z]{4,6}\d{3,9}[-]?\d?)(?:\b|$)/i);
  if (clean) return clean[1].toUpperCase();

  // Pasar 2: regex tolerante — prefijo puede tener dígitos OCR mezclados
  // Requisito: empieza con letra, tiene ≥3 letras reales en las primeras 6 posiciones
  const noisy = text.match(/([A-Z][A-Z0-9]{3,5})(\d{3,9})([-]\d)?/i);
  if (!noisy) return undefined;

  const rawPre = noisy[1].toUpperCase();
  const letterCount = (rawPre.match(/[A-Z]/g) ?? []).length;
  if (letterCount < 3) return undefined; // demasiados dígitos → no es contenedor

  // Revertir dígitos OCR a letras en el prefijo
  const DIGIT_TO_LETTER: Record<string, string> = {
    '0': 'O', '1': 'I', '2': 'Z', '5': 'S', '6': 'G', '8': 'B',
  };
  const cleanPre = rawPre.replace(/[0-9]/g, d => DIGIT_TO_LETTER[d] ?? d);
  return `${cleanPre}${noisy[2]}${noisy[3] ?? ''}`.toUpperCase();
}

/**
 * Extrae números en formato chileno:
 *   700.000  |  1.027.900  |  700 000 (espacio OCR)  |  700000
 *
 * IMPORTANTE: los 3 patrones son MUTUAMENTE EXCLUYENTES para evitar
 * que "700.000 100.090" se concatene en un solo número "700000100090".
 *   - Patrón 1: puntos como miles → 700.000, 1.027.900
 *   - Patrón 2: par espacio → 700 000 (solo 1 grupo, sin encadenar)
 *   - Patrón 3: número largo sin separador → 700000
 */
function extractNums(text: string, minVal = 1000): number[] {
  const RE = /\b(\d{1,3}(?:\.\d{3})+|\d{1,3} \d{3}(?! [\d])|\d{4,9})\b/g;
  return [...text.matchAll(RE)]
    .map(m => parseInt(m[1].replace(/[. ]/g, ''), 10))
    .filter(n => n >= minVal);
}

/** Corrige letras OCR confundidas con dígitos dentro de contextos numéricos */
function fixOcrDigits(text: string): string {
  let t = text;
  for (let pass = 0; pass < 4; pass++) {
    const prev = t;
    t = t
      .replace(/(?<=[\d.])([OoQDU])(?=[\d.])/g, '0')
      .replace(/(?<=[\d.])[lI|!](?=[\d.])/g, '1')
      .replace(/(?<=[\d.])[Ss](?=[\d.])/g, '5')
      .replace(/(?<=[\d.])[Bb](?=[\d.])/g, '8')
      .replace(/(?<=[\d.])[Gg](?=[\d.])/g, '9')
      .replace(/(?<=[\d.])[Zz](?=[\d.])/g, '2')
      .replace(/(?<=[\d.])[Tt](?=[\d.])/g, '7');
    if (t === prev) break;
  }
  t = t.replace(/\b([1-9])([OoQDUlI|]{1,3})([\s.]|$)/g,
    (_, d, ocrs, sep) => d + '0'.repeat(ocrs.length) + sep);
  return t;
}

/** Preprocesa OCR: normaliza guiones, corrige dígitos, elimina ruido */
function preprocesarOCR(raw: string): string {
  return raw
    .replace(/[–—‒‐‑]/g, '-')
    .replace(/\|+/g, ' ')
    .replace(/_{2,}/g, ' ')
    .replace(/\r\n|\r/g, '\n')
    .split('\n').map(line => fixOcrDigits(line)).join('\n')
    .replace(/[ \t]{3,}/g, '   ')
    .replace(/^\s+|\s+$/gm, '');
}

// ── PARSER FORMATO PROPIO DE LA APP ─────────────────────────────────────────

/**
 * Detecta si el texto viene del Excel exportado por la propia app.
 * Cabeceras típicas: N° Guía | Fecha | Origen | Destino | Empresa Flete |
 *   RUT Empresa | Nombre Chofer | RUT Chofer | Patente | Descripción Carga |
 *   Monto Base (CLP) | Cargos Extra (CLP) | Total (CLP) | Estado
 */
function isAppFormat(text: string): boolean {
  return (
    /n[°º]?[\s.]*gu[ií]a/i.test(text) &&
    /empresa\s+flete/i.test(text) &&
    /(rut\s+empresa|nombre\s+chofer|rut\s+chofer)/i.test(text)
  );
}

function parseAppFormat(rawText: string): ParsedGuia[] {
  const text   = preprocesarOCR(rawText);
  const lines  = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
  const results: ParsedGuia[] = [];

  // Encontrar fila de cabecera
  const headerIdx = lines.findIndex(l =>
    /n[°º]?[\s.]*gu[ií]a/i.test(l) && (/empresa/i.test(l) || /chofer/i.test(l))
  );
  if (headerIdx < 0) return [];

  // Determinar posición aproximada de columnas de montos en el encabezado
  // para leerlas de forma posicional (más robusto al ruido OCR)
  const headerLine = lines[headerIdx];
  const montoBasePos  = /monto\s*base/i.exec(headerLine)?.index ?? -1;
  const cargosPos     = /cargos?\s*extra/i.exec(headerLine)?.index ?? -1;
  const totalPos      = /total/i.exec(headerLine)?.index ?? -1;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 5) continue;
    if (/^(total|suma|subtotal|resumen|neto|monto)/i.test(line)) break;

    let rem = line; // texto restante tras extraer tokens tipados

    // ── Fecha ─────────────────────────────────────────────────────────────
    const fecha = extractDate(rem);
    rem = rem.replace(/\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g, ' ');

    // ── RUTs (hasta 2: empresa y chofer) ──────────────────────────────────
    const ruts = extractRut(rem);
    rem = rem.replace(/\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b/gi, ' ');

    // ── Estado ────────────────────────────────────────────────────────────
    const estadoM = rem.match(/\b(pendiente|pagado|pagada|anulado|anulada|completado)\b/i);
    if (estadoM) rem = rem.replace(estadoM[0], ' ');

    // ── Patente ───────────────────────────────────────────────────────────
    const patenteM = rem.match(/\b([A-Z]{2,4}[-.\s]?\d{2,4})\b(?!\s*%)/i);
    const patente = patenteM
      ? patenteM[1].toUpperCase().replace(/[-.\s]/g, '')
      : undefined;
    if (patenteM && patente && patente.length >= 4 && !/^\d+$/.test(patente))
      rem = rem.replace(patenteM[0], ' ');

    // ── Contenedor ────────────────────────────────────────────────────────
    const containerMCode = extractContainer(rem);
    const containerM = containerMCode ? [containerMCode] : null;
    if (containerMCode) rem = rem.replace(/([A-Z][A-Z0-9]{3,5}\d{3,9}(?:[-]\d)?)/i, ' ');

    // ── Montos (≥50 000 CLP) ──────────────────────────────────────────────
    // Si tenemos posiciones de columna en el encabezado, extraer posicionalmente
    // para evitar que números del N° guía o RUT se confundan con montos
    let montos: number[];
    if (montoBasePos > 0 && totalPos > montoBasePos) {
      // Extraer solo del segmento de montos (último tercio de la línea)
      const montoSeg = line.slice(Math.max(0, montoBasePos - 5));
      montos = extractNums(montoSeg, 50_000);
    } else {
      montos = extractNums(rem, 50_000);
    }
    rem = rem.replace(/\b(\d{1,3}(?:\.\d{3})+|\d{1,3} \d{3}(?! [\d])|\d{4,9})\b/g, ' ');

    // ── Ciudades (origen / destino) ───────────────────────────────────────
    let origen: string | undefined;
    let destino: string | undefined;
    const normRem = normalizeAccents(rem.toUpperCase());
    const cityHits: { city: string; idx: number }[] = [];
    for (const c of CIUDADES) {
      const idx = normRem.indexOf(normalizeAccents(c.toUpperCase()));
      if (idx >= 0) cityHits.push({ city: c, idx });
    }
    cityHits.sort((a, b) => a.idx - b.idx);
    if (cityHits.length >= 2) { origen = cityHits[0].city; destino = cityHits[1].city; }
    else if (cityHits.length === 1) { origen = cityHits[0].city; }
    for (const { city } of cityHits) {
      rem = rem.replace(new RegExp(normalizeAccents(city), 'i'), ' ');
    }

    // ── N° Guía ───────────────────────────────────────────────────────────
    // Puede ser: "G000125", "125", "3247", "127442" — primer token numérico/alfanum
    const guiaM = line.match(/^\s*([A-Z]?\d{3,8})\b/);
    const guiaNum = guiaM?.[1];
    if (guiaNum) rem = rem.replace(guiaNum, ' ');

    // ── Texto restante → empresa + chofer + descripcion ───────────────────
    const chunks = rem
      .split(/\s{2,}/)
      .map(s => s.trim())
      .filter(s => s.length > 2 && /[A-Za-záéíóúñÁÉÍÓÚÑ]/.test(s));

    let empresa_flete: string | undefined;
    let nombre_chofer: string | undefined;
    let descripcion_carga: string | undefined;

    // Detectar descripción explícita antes de asignar empresa/chofer
    const descKeywordM = rem.match(/(?:descripci[oó]n|carga|mercader[ií]a|contenido|bultos?|producto)[\s:]*([A-Za-záéíóúñÁÉÍÓÚÑ0-9\s,.\-]+)/i);
    if (descKeywordM) {
      descripcion_carga = descKeywordM[1].trim().slice(0, 100);
      rem = rem.replace(descKeywordM[0], ' ');
    } else if (containerM) {
      descripcion_carga = `Contenedor ${containerM[0]}`;
    }

    if (chunks.length >= 2) { empresa_flete = chunks[0]; nombre_chofer = chunks[1]; }
    else if (chunks.length === 1) { empresa_flete = chunks[0]; }
    if (!descripcion_carga && chunks.length >= 3) descripcion_carga = chunks[2];

    // ── Montos ────────────────────────────────────────────────────────────
    const monto_base  = montos.length > 0 ? montos[0] : undefined;
    const monto_total = montos.length > 1 ? montos[montos.length - 1] : monto_base;
    const cargos_extra: CargoExtra[] = [];
    if (montos.length >= 3) {
      for (let j = 1; j < montos.length - 1; j++) {
        cargos_extra.push({ descripcion: 'Cargos Extra', monto: montos[j] });
      }
    }

    // Descartar líneas sin datos útiles
    if (!guiaNum && !origen && !monto_base) continue;

    results.push({
      numero_guia:       guiaNum,
      fecha,
      origen,
      destino,
      empresa_flete,
      rut_empresa:       ruts[0],
      nombre_chofer,
      rut_chofer:        ruts[1],
      patente,
      descripcion_carga,
      monto_base,
      cargos_extra:      cargos_extra.length > 0 ? cargos_extra : undefined,
      monto_total,
    });
  }

  return results;
}

// ── PARSER TABLA EXCEL ───────────────────────────────────────────────────────

/**
 * Detecta todas las guías en un texto de tabla Excel.
 * Columnas esperadas: [N°CONT] [N°GUIA] TRAMO CLIENTE VALOR [INTERPLANTA] [OTROS] TOTAL [COMENTARIOS]
 * O bien el formato propio de la app (con fecha, RUT, chofer, patente, estado).
 *
 * Estrategia clave: los montos se extraen SOLO del texto posterior al tramo,
 * así los N° de guía nunca se confunden con importes.
 */
export function parseTablaGuias(rawText: string): ParsedGuia[] {
  // Intentar primero con el formato propio de la app (tiene más columnas)
  if (isAppFormat(rawText)) {
    const appResults = parseAppFormat(rawText);
    if (appResults.length > 0) return appResults;
  }
  const text = preprocesarOCR(rawText);
  const lines = text.split('\n').filter(l => l.trim().length > 8);
  const guias: ParsedGuia[] = [];

  // Tramo flexible: acepta 0-2 espacios a cada lado del guión
  const TRAMO_RE = /\b([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]+)?)\s*-\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]+)?)\b/;

  // Solo excluir palabras que NUNCA son parte de un nombre de ciudad chilena
  const PALABRAS_EXCLUIDAS = /^(TOTAL|IVA|NETO|SUBTOTAL|SUMA|VALOR|FECHA|FOLIO|COMENTARIO|INTERPLANTA|CRUZADO|ESTADIA)$/i;

  for (const line of lines) {
    const lineTrim = line.trim();

    // ── Saltar encabezados, totales y líneas demasiado cortas ──────────────
    if (/^(n[°º.\s#]|tramo|cliente|total|iva|valor|fecha|comentar|resumen|empresa|contenedor|cuenta|subtotal|neto|suma|interplanta|otros|flete)/i.test(lineTrim)) continue;
    if (/^\s*(total|iva|subtotal|neto|suma)\b/i.test(line)) continue;
    if (lineTrim.split(/\s+/).length < 4) continue;                // muy pocas palabras
    if (/^[\d\s.,$%-]+$/.test(lineTrim)) continue;                 // solo números → saltar
    if (/^[^A-Za-záéíóúñÁÉÍÓÚÑ]{0,3}$/.test(lineTrim)) continue; // sin letras → ruido

    // ── 1. Detectar TRAMO con validación de ciudades reales ───────────────
    let tramoMatch = line.match(TRAMO_RE);

    // Validar que los grupos capturados realmente son ciudades o al menos
    // no son palabras comunes excluidas
    if (tramoMatch) {
      const orig = tramoMatch[1].trim().split(/\s+/)[0];
      const dest = tramoMatch[2].trim().split(/\s+/)[0];
      if (PALABRAS_EXCLUIDAS.test(orig) || PALABRAS_EXCLUIDAS.test(dest)) {
        tramoMatch = null;
      }
    }

    let tramoStartIdx = tramoMatch ? line.indexOf(tramoMatch[0]) : -1;
    let tramoEndIdx   = tramoMatch ? tramoStartIdx + tramoMatch[0].length : -1;

    // ── 2. Fallback: buscar dos ciudades CONOCIDAS en la misma línea ───────
    let origenFB: string | undefined;
    let destinoFB: string | undefined;
    let afterFBIdx = 0;

    if (!tramoMatch) {
      type CityHit = { city: string; idx: number; len: number };
      const hits: CityHit[] = [];
      const normLine = normalizeAccents(line.toUpperCase());
      for (const c of CIUDADES) {
        const normC = normalizeAccents(c.toUpperCase());
        const idx = normLine.indexOf(normC);
        if (idx >= 0) hits.push({ city: c, idx, len: normC.length });
      }
      hits.sort((a, b) => a.idx - b.idx);
      const unique: CityHit[] = [];
      for (const h of hits) {
        if (!unique.some(u => h.idx >= u.idx && h.idx < u.idx + u.len)) unique.push(h);
      }
      if (unique.length >= 2) {
        origenFB   = unique[0].city;
        destinoFB  = unique[1].city;
        afterFBIdx = unique[1].idx + unique[1].len;
      } else if (unique.length === 1) {
        origenFB   = unique[0].city;
        afterFBIdx = unique[0].idx + unique[0].len;
      }
    }

    // Sin tramo detectado → descartar línea
    if (!tramoMatch && !origenFB) continue;

    // ── 3. Texto ANTES del tramo ───────────────────────────────────────────
    const preTramoIdx = tramoMatch ? tramoStartIdx : (origenFB ? line.toUpperCase().indexOf(normalizeAccents(origenFB.toUpperCase())) : 0);
    const beforeTramo = line.slice(0, Math.max(0, preTramoIdx));

    // ── 4. Texto DESPUÉS del tramo ─────────────────────────────────────────
    const postTramoIdx = tramoMatch ? tramoEndIdx : afterFBIdx;
    const afterTramo   = line.slice(postTramoIdx).trim();

    // ── 5. Extraer montos del texto posterior al tramo ─────────────────────
    // Mínimo: 50.000 CLP — evita falsos positivos con números pequeños del OCR
    // Los N° de guía (3247, 127442, etc.) están ANTES del tramo, no después
    const todosMontos = extractNums(afterTramo, 50_000);

    // REGLA CLAVE: si hay tramo claro vía regex, aceptamos línea aunque no haya
    // montos (OCR pudo garbarlos). Pero si el tramo es por fallback de ciudad,
    // exigimos al menos un monto válido para evitar falsos positivos.
    if (todosMontos.length === 0 && !tramoMatch) continue;

    // ── 6. N° de guía: último número de 3–7 dígitos antes del tramo ──────────
    const guiaNum = beforeTramo.match(/\b(\d{3,7})\b/g)?.slice(-1)[0];

    // ── 7. Código de contenedor — usa extractContainer con tolerancia OCR
    const containerCode = extractContainer(line);
    const containerMatch = containerCode ? [containerCode] : null;

    // ── 8. Origen / destino (con recuperación de palabras extra capturadas) ─────
    let realOrigen: string;
    let realDestino: string;
    let extraDest = '';   // palabras del destino que en realidad son del cliente

    if (tramoMatch) {
      const rawOrig = tramoMatch[1].trim();
      const rawDest = tramoMatch[2].trim();
      // El regex permite 2 palabras en el destino → puede capturar 1a palabra del cliente
      // Ej: "VALPARAISO YEMETE" → destino="Valparaíso", extraDest="YEMETE"
      const destWords = rawDest.split(/\s+/);
      if (destWords.length > 1 && cityMatch(destWords[0])) {
        realDestino = cityMatch(destWords[0])!;
        extraDest   = destWords.slice(1).join(' ');
      } else {
        realDestino = cityMatch(rawDest) ?? rawDest;
      }
      realOrigen = cityMatch(rawOrig) ?? rawOrig;
    } else {
      realOrigen  = origenFB!;
      realDestino = destinoFB ?? '';
    }

    // ── 9b. Nombre de empresa cliente: extraDest + afterTramo, antes de números ─
    const clientSource = extraDest ? `${extraDest} ${afterTramo}` : afterTramo;
    const clientMatch  = clientSource.match(
      /^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ&.,\s]+?)(?=\s+\d{4,}|\s{3,}|$)/
    );
    const cliente = clientMatch
      ? clientMatch[1].trim().replace(/\s+/g, ' ').slice(0, 60)
      : undefined;

    // ── 10. Desglose de montos ────────────────────────────────────────────────

    // Redondear al millar más cercano (OCR agrega ±1-200 px de ruido en dígitos)
    // y filtrar rango válido para fletes/cargos chilenos: 15.000 – 5.000.000
    function sanearMonto(n: number): number | null {
      if (n < 50_000) return null;
      const r = Math.round(n / 1000) * 1000;
      return Math.abs(n - r) <= 500 ? r : n; // si está muy cerca del millar → redondear
    }

    const montosValidos = todosMontos.map(sanearMonto).filter((n): n is number => n !== null);

    // Eliminar duplicados consecutivos (VALOR == TOTAL cuando no hay extras)
    const deduped: number[] = [];
    for (const n of montosValidos) {
      if (deduped.length === 0 || deduped[deduped.length - 1] !== n) deduped.push(n);
    }

    let monto_base: number | undefined;
    let monto_total: number | undefined;
    const cargos: CargoExtra[] = [];

    if (deduped.length === 0) {
      // OCR no detectó ningún monto válido — incluir guía de todas formas si hay tramo claro
      monto_base = 0; monto_total = 0;
    } else if (deduped.length === 1) {
      monto_base  = deduped[0];
      monto_total = deduped[0];
    } else if (deduped.length === 2) {
      monto_base  = deduped[0];
      monto_total = deduped[1];
    } else {
      monto_base  = deduped[0];
      monto_total = deduped[deduped.length - 1];
      const extraLabels = ['Interplanta', 'Otros', 'Estadía'];
      for (let i = 1; i < deduped.length - 1; i++) {
        cargos.push({ descripcion: extraLabels[i - 1] ?? `Cargo ${i}`, monto: deduped[i] });
      }
    }

    // ── CORRECCIÓN DE CONSISTENCIA base/total ─────────────────────────────
    // Regla 1: total nunca puede ser menor que la base → usar base como total
    if (monto_total && monto_base && monto_total < monto_base) {
      monto_total = monto_base;
    }
    // Regla 2: total > base × 4 → OCR agregó dígito extra → usar base como total
    if (monto_total && monto_base && monto_base > 0 && monto_total > monto_base * 4) {
      monto_total = monto_base;
    }
    // Regla 3: total no es múltiplo de 1000 (residuo > 500) → redondear
    if (monto_total && monto_total % 1000 > 500) {
      monto_total = Math.round(monto_total / 1000) * 1000;
    }

    // ── 11. Comentarios: texto DESPUÉS del último número (columna COMENTARIOS) ──
    //    Captura frases como "RETIRO CRUZADO DE SAN ANTONIO A VALPO" correctamente
    //    incluso cuando contienen palabras cortas ("DE", "A", "EN") que rompen la
    //    regex de "N palabras en mayúsculas".
    let notas: string | undefined;
    {
      const numRE2 = /\b(\d{1,3}(?:\.\d{3})+|\d{1,3} \d{3}(?! [\d])|\d{4,9})\b/g;
      let lastNm: RegExpExecArray | null = null;
      let nm2: RegExpExecArray | null;
      while ((nm2 = numRE2.exec(afterTramo)) !== null) lastNm = nm2;
      if (lastNm) {
        const afterNums = afterTramo.slice(lastNm.index + lastNm[0].length).trim();
        if (afterNums.length > 2) notas = afterNums;
      }
    }

    guias.push({
      numero_guia:       guiaNum,
      origen:            realOrigen   || undefined,
      destino:           realDestino  || undefined,
      empresa_flete:     cliente,
      descripcion_carga: containerMatch
        ? `Contenedor ${containerMatch[0]}`
        : undefined,
      monto_base,
      monto_total,
      cargos_extra:      cargos.length > 0 ? cargos : undefined,
      notas,
    });
  }

  // ── Deduplicación: eliminar guías duplicadas por OCR ─────────────────────
  // Dos guías son duplicadas si tienen el mismo N° de guía, o si tienen
  // el mismo tramo + monto total idéntico (OCR repitió la línea)
  const dedup: ParsedGuia[] = [];
  for (const g of guias) {
    const esDuplicado = dedup.some(prev => {
      // Mismo número de guía (no vacío)
      if (g.numero_guia && prev.numero_guia && g.numero_guia === prev.numero_guia) return true;
      // Mismo origen+destino+total → línea repetida por OCR
      if (
        g.origen && prev.origen && normalizeAccents(g.origen.toUpperCase()) === normalizeAccents(prev.origen.toUpperCase()) &&
        g.destino && prev.destino && normalizeAccents(g.destino.toUpperCase()) === normalizeAccents(prev.destino.toUpperCase()) &&
        g.monto_total && prev.monto_total && g.monto_total === prev.monto_total
      ) return true;
      return false;
    });
    if (!esDuplicado) dedup.push(g);
  }

  return dedup;
}

// ── PARSER GUÍA INDIVIDUAL ───────────────────────────────────────────────────

export function parseTextoGuia(text: string): ParsedGuia {
  const ruts = extractRut(text);
  const { origen, destino } = extractCiudades(text);
  const cargos = extractCargosExtra(text);
  const montoTotal = extractMontoGeneral(text);
  const cargosTotal = cargos.reduce((s, c) => s + c.monto, 0);

  return {
    numero_guia:       extractGuiaNumber(text),
    fecha:             extractDate(text),
    origen,
    destino,
    empresa_flete:     extractEmpresa(text),
    rut_empresa:       ruts[0],
    nombre_chofer:     extractChofer(text),
    rut_chofer:        ruts.length > 1 ? ruts[1] : undefined,
    patente:           extractPatente(text),
    descripcion_carga: extractCarga(text),
    monto_base:        montoTotal ? montoTotal - cargosTotal : undefined,
    cargos_extra:      cargos.length > 0 ? cargos : undefined,
  };
}

// ── Helpers para parseTextoGuia ──────────────────────────────────────────────

function extractMontoGeneral(text: string): number | undefined {
  const labels = ['total','monto','valor','precio','pago','neto','flete','cobro','cobrar'];
  for (const l of labels) {
    const v = extractMonto(text, l);
    if (v && v > 1000) return v;
  }
  const all = [...text.matchAll(/\$\s*([\d.,]+)/g)]
    .map(m => parseInt(m[1].replace(/[.,]/g, ''), 10))
    .filter(n => n > 1000);
  return all.length > 0 ? Math.max(...all) : undefined;
}

function extractMonto(text: string, label: string): number | undefined {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = text.match(new RegExp(esc + '[:\\s]*\\$?\\s*([\\d.,\\s]+)', 'i'));
  if (m) return parseInt(m[1].replace(/[.,\s]/g, ''), 10);
  return undefined;
}

function extractGuiaNumber(text: string): string | undefined {
  const patterns = [
    /\b([A-Z]\d{4,8})\b/,
    /(?:gu[ií]a|folio|n[°º]?)\s*[:.]?\s*(\d{3,8})/i,
    /(?:n[°º]|#)\s*(\d{3,8})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return undefined;
}

function extractCiudades(text: string): { origen?: string; destino?: string } {
  const found: string[] = [];
  const normText = normalizeAccents(text.toUpperCase());
  for (const c of CIUDADES) {
    if (normText.includes(normalizeAccents(c.toUpperCase()))) found.push(c);
  }
  const origenM  = text.match(/(?:origen|desde|sale|salida|despacho)[\s:]*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)/i);
  const destinoM = text.match(/(?:destino|hasta|llega|llegada|entrega)[\s:]*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)/i);
  let origen  = origenM  ? matchCiudad(origenM[1])  : undefined;
  let destino = destinoM ? matchCiudad(destinoM[1]) : undefined;
  if (!origen && !destino && found.length >= 2)  { origen = found[0]; destino = found[1]; }
  else if (!origen && found.length >= 1)          { origen = found[0]; if (!destino && found.length >= 2) destino = found[1]; }
  else if (!destino && found.length >= 1)         { destino = found.find(c => c !== origen) ?? found[0]; }
  return { origen, destino };
}

function matchCiudad(text: string): string | undefined {
  return cityMatch(text) ?? text.trim().split(/\s+/).slice(0, 3).join(' ') ?? undefined;
}

function extractEmpresa(text: string): string | undefined {
  const patterns = [
    /(?:empresa|razón social|raz[oó]n|importadora|cliente|señor[ea]?s?)[\s:]*([A-ZÁÉÍÓÚÑa-záéíóúñ\s&.,]+)/i,
    /(?:transportes?|logística|importadora)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) { const v = m[1].trim().replace(/\s+/g, ' ').slice(0, 60); if (v.length > 3) return v; }
  }
  return undefined;
}

function extractChofer(text: string): string | undefined {
  const m = text.match(/(?:chofer|conductor|ch[oó]fer|transportista|nombre)[\s:]*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)/i);
  if (m) { const v = m[1].trim().replace(/\s+/g, ' ').slice(0, 50); if (v.split(' ').length >= 2 && v.length > 5) return v; }
  return undefined;
}

function extractCarga(text: string): string | undefined {
  const m = text.match(/(?:carga|mercader[ií]a|producto|descripci[oó]n|detalle|contenido|bultos?)[\s:]*([A-ZÁÉÍÓÚÑa-záéíóúñ\s,.\-0-9]+)/i);
  if (m) { const v = m[1].trim().replace(/\s+/g, ' ').slice(0, 120); if (v.length > 3) return v; }
  return undefined;
}

function extractCargosExtra(text: string): CargoExtra[] {
  const cargos: CargoExtra[] = [];
  for (const l of ['peaje','espera','descarga','carga extra','seguro','combustible','pernocte','recargo','sobrecosto']) {
    const v = extractMonto(text, l);
    if (v && v > 0) cargos.push({ descripcion: l.charAt(0).toUpperCase() + l.slice(1), monto: v });
  }
  return cargos;
}
