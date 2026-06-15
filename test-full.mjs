// Test completo — verifica TODOS los campos vs los datos reales del Excel
const textoLimpio = `N CONTENEDOR N GUIA TRAMO CLIENTE VALOR VIA INTERPLANTA OTROS TOTAL COMENTARIOS
25 SEGU929520-0 3247 LONTUE - VALPARAISO YEMETE FRUIT 700000 700000
25 TRIU874559-0 127442 LONTUE - SAN ANTONIO EXPORTADORA SAN CLEMEN 650000 650000
25 MSGU907754-0 127516 TALCA - VALPARAISO EXPORTADORA SAN CLEMEN 820000 90000 910000 RETIRO CRUZADO DE SAN ANTONIO A VALPO
25 MSDU901414-0 113236 RETIRO - VALPARAISO DAVID DEL CURTO 930000 930000
25 HLBU987648-9 3233 VILUCO - VALPARAISO EXPORTADORA LAS DELICIAS 450000 450000
25 CQSEKU936414 3311 VILUCO - VALPARAISO EXPORTADORA LAS DELICIAS 450000 20000 470000 DOS HORAS ESTADIA EN PUERTO
25 SZLU514-2 127920 TALCA - SAN ANTONIO EXPORTADORA SAN CLEMEN 770000 770000
25 HLBU985733-9 13074 PELEQUEN- VALPARAISO FRUZAL 530000 530000`;

// Esperado real del Excel
const esperado = [
  { guia:'3247',  orig:'Lontue',   dest:'Valparaíso', emp:'YEMETE FRUIT',              base:700000, total:700000, cargos:0,  cont:'SEGU929520-0', notas:'' },
  { guia:'127442',orig:'Lontue',   dest:'San Antonio',emp:'EXPORTADORA SAN CLEMEN',    base:650000, total:650000, cargos:0,  cont:'TRIU874559-0', notas:'' },
  { guia:'127516',orig:'Talca',    dest:'Valparaíso', emp:'EXPORTADORA SAN CLEMEN',    base:820000, total:910000, cargos:1,  cont:'MSGU907754-0', notas:'RETIRO CRUZADO DE SAN ANTONIO A VALPO' },
  { guia:'113236',orig:'Retiro',   dest:'Valparaíso', emp:'DAVID DEL CURTO',           base:930000, total:930000, cargos:0,  cont:'MSDU901414-0', notas:'' },
  { guia:'3233',  orig:'Viluco',   dest:'Valparaíso', emp:'EXPORTADORA LAS DELICIAS',  base:450000, total:450000, cargos:0,  cont:'HLBU987648-9', notas:'' },
  { guia:'3311',  orig:'Viluco',   dest:'Valparaíso', emp:'EXPORTADORA LAS DELICIAS',  base:450000, total:470000, cargos:1,  cont:'CQSEKU936414',  notas:'DOS HORAS ESTADIA EN PUERTO' },
  { guia:'127920',orig:'Talca',    dest:'San Antonio',emp:'EXPORTADORA SAN CLEMEN',    base:770000, total:770000, cargos:0,  cont:'SZLU514-2',     notas:'' },
  { guia:'13074', orig:'Pelequén', dest:'Valparaíso', emp:'FRUZAL',                    base:530000, total:530000, cargos:0,  cont:'HLBU985733-9',  notas:'' },
];

// ── Parser inline ─────────────────────────────────────────────────────────────
function normalizeAccents(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
const CIUDADES = ['Arica','Iquique','Antofagasta','Calama','Copiapó','La Serena','Coquimbo','Valparaíso','Viña del Mar','Santiago','Rancagua','Talca','Chillán','Concepción','Los Ángeles','Temuco','Valdivia','Osorno','Puerto Montt','Coyhaique','Punta Arenas','San Antonio','Quilpué','La Calera','San Fernando','Linares','Curicó','Constitución','Lota','Coronel','Angol','Victoria','Villarrica','Pucón','Castro','Ancud','Puerto Varas','Puerto Natales','Ovalle','Illapel','Lontue','San Clemente','Molina','Longaví','Parral','San Javier','Retiro','Viluco','Pelequén'];
function cityMatch(text) {
  const norm = normalizeAccents(text.trim().toUpperCase());
  if (norm.length < 3) return undefined;
  for (const c of CIUDADES) {
    const normC = normalizeAccents(c.toUpperCase());
    if (norm === normC) return c;
    if (norm.startsWith(normC) && (norm.length === normC.length || norm[normC.length] === ' ')) return c;
  }
}
function extractNums(text, minVal=1000) {
  const RE = /\b(\d{1,3}(?:[.\s]\d{3})+|\d{4,9})\b/g;
  return [...text.matchAll(RE)].map(m => parseInt(m[1].replace(/[.\s]/g,''),10)).filter(n=>n>=minVal);
}
function preprocesarOCR(raw) {
  return raw.replace(/[–—‒‐‑]/g,'-').replace(/\|+/g,' ').replace(/_{2,}/g,' ').replace(/\r\n|\r/g,'\n').replace(/[ \t]{3,}/g,'   ').replace(/^\s+|\s+$/gm,'');
}

function parseTablaGuias(rawText) {
  const text = preprocesarOCR(rawText);
  const lines = text.split('\n').filter(l=>l.trim().length>6);
  const guias = [];
  const TRAMO = /\b([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]+)?)\s*-\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ]+)?)\b/;

  for (const line of lines) {
    const lineTrim = line.trim();
    if (/^(n[°º.\s#]|tramo|cliente|total|iva|valor|fecha|comentar|resumen|empresa|contenedor|cuente|cuenta|subtotal|neto|suma)/i.test(lineTrim)) continue;
    if (/^\s*(total|iva|subtotal|neto|suma)\b/i.test(line)) continue;
    if (lineTrim.split(/\s+/).length < 3) continue;

    let tramoMatch = line.match(TRAMO);
    let tramoStartIdx = tramoMatch ? line.indexOf(tramoMatch[0]) : -1;
    let tramoEndIdx   = tramoMatch ? tramoStartIdx + tramoMatch[0].length : -1;
    let origenFB, destinoFB, afterFBIdx=0;
    if (!tramoMatch) {
      const hits=[];
      const normLine=normalizeAccents(line.toUpperCase());
      for (const c of CIUDADES) { const normC=normalizeAccents(c.toUpperCase()); const idx=normLine.indexOf(normC); if(idx>=0) hits.push({city:c,idx,len:normC.length}); }
      hits.sort((a,b)=>a.idx-b.idx);
      const unique=[];
      for (const h of hits) { if(!unique.some(u=>h.idx>=u.idx&&h.idx<u.idx+u.len)) unique.push(h); }
      if (unique.length>=2) { origenFB=unique[0].city; destinoFB=unique[1].city; afterFBIdx=unique[1].idx+unique[1].len; }
      else if (unique.length===1) { origenFB=unique[0].city; afterFBIdx=unique[0].idx+unique[0].len; }
    }
    if (!tramoMatch && !origenFB) continue;

    const preTramoIdx = tramoMatch ? tramoStartIdx : 0;
    const beforeTramo = line.slice(0, Math.max(0, preTramoIdx));
    const postTramoIdx = tramoMatch ? tramoEndIdx : afterFBIdx;
    const afterTramo = line.slice(postTramoIdx).trim();

    const todosMontos = extractNums(afterTramo,1000);
    if (todosMontos.length===0 && !tramoMatch) continue;

    const guiaNum = beforeTramo.match(/\b(\d{3,7})\b/g)?.slice(-1)?.[0];
    // Contenedor: formato ISO 4-6 letras + 6-7 dígitos (con o sin check digit)
    const contRE = /\b([A-Z]{4,6}\d{3,7}[-]?\d?)\b/i;
    const containerMatch = line.match(contRE);

    let realOrigen, realDestino, extraDest='';
    if (tramoMatch) {
      const rawOrig=tramoMatch[1].trim(), rawDest=tramoMatch[2].trim();
      const destWords=rawDest.split(/\s+/);
      if (destWords.length>1 && cityMatch(destWords[0])) { realDestino=cityMatch(destWords[0]); extraDest=destWords.slice(1).join(' '); }
      else realDestino=cityMatch(rawDest)||rawDest;
      realOrigen=cityMatch(rawOrig)||rawOrig;
    } else { realOrigen=origenFB; realDestino=destinoFB||''; }

    const clientSource = extraDest ? `${extraDest} ${afterTramo}` : afterTramo;
    const clientMatch = clientSource.match(/^([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ&.,\s]+?)(?=\s+\d{4,}|\s{3,}|$)/);
    const cliente = clientMatch ? clientMatch[1].trim().replace(/\s+/g,' ').slice(0,60) : undefined;

    // Notas: texto DESPUÉS del último número de la línea
    let notas;
    const numRE = /\b(\d{1,3}(?:[.\s]\d{3})+|\d{4,9})\b/g;
    let lastNumMatch; let lm;
    while ((lm = numRE.exec(afterTramo)) !== null) lastNumMatch = lm;
    if (lastNumMatch) {
      const afterNums = afterTramo.slice(lastNumMatch.index + lastNumMatch[0].length).trim();
      if (afterNums.length > 2) notas = afterNums;
    }

    const deduped=[];
    for (const n of todosMontos) { if(deduped.length===0||deduped[deduped.length-1]!==n) deduped.push(n); }
    let monto_base, monto_total; const cargos=[];
    if(deduped.length===0){monto_base=0;monto_total=0;}
    else if(deduped.length===1){monto_base=deduped[0];monto_total=deduped[0];}
    else if(deduped.length===2){monto_base=deduped[0];monto_total=deduped[1];}
    else { monto_base=deduped[0];monto_total=deduped[deduped.length-1]; for(let i=1;i<deduped.length-1;i++) cargos.push({descripcion:i===1?'Otros':`Cargo ${i}`,monto:deduped[i]}); }

    guias.push({ numero_guia:guiaNum, origen:realOrigen, destino:realDestino||undefined, empresa_flete:cliente, descripcion_carga:containerMatch?containerMatch[1]:undefined, monto_base, monto_total, cargos_extra:cargos, notas });
  }
  return guias;
}

// ── Comparar resultado vs esperado ────────────────────────────────────────────
const resultado = parseTablaGuias(textoLimpio);
console.log(`\nDetectadas: ${resultado.length}/8 guías\n`);
console.log('Campo          | Esperado                           | Obtenido                           | OK?');
console.log('───────────────|────────────────────────────────────|────────────────────────────────────|────');

let totalOK = 0, totalFail = 0;
for (let i = 0; i < esperado.length; i++) {
  const e = esperado[i];
  const r = resultado[i];
  if (!r) { console.log(`Guía ${i+1}: NO DETECTADA`); totalFail++; continue; }
  const checks = [
    ['N° Guía',    e.guia,    r.numero_guia],
    ['Origen',     e.orig,    r.origen],
    ['Destino',    e.dest,    r.destino],
    ['Empresa',    e.emp,     r.empresa_flete],
    ['Total',      e.total,   r.monto_total],
    ['N° Cargos',  e.cargos,  r.cargos_extra?.length ?? 0],
    ['Contenedor', e.cont,    r.descripcion_carga],
    ['Notas',      e.notas || '(vacío)', r.notas || '(vacío)'],
  ];
  for (const [campo, esp, obt] of checks) {
    const ok = String(esp).toLowerCase() === String(obt).toLowerCase() || (esp==='' && !obt);
    if (ok) totalOK++; else totalFail++;
    if (!ok) console.log(`G${i+1} ${campo.padEnd(13)}| ${String(esp).padEnd(34)}| ${String(obt).padEnd(34)}| ${ok?'✅':'❌'}`);
  }
}
console.log(`\nResultado: ${totalOK} campos correctos, ${totalFail} con diferencias`);
