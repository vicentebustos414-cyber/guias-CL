import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Camera, Loader2, Sparkles, AlertCircle, Table2, CheckCircle2, Pencil } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import { parseTextoGuia, parseTablaGuias, type ParsedGuia } from '../lib/parser';

interface BatchData {
  nombre_chofer: string;
  patente: string;
  fecha: string;
}

interface Props {
  onImport: (data: ParsedGuia) => void;
  onBatchImport?: (guias: ParsedGuia[], batch: BatchData) => void;
  onClose: () => void;
}

type Tab = 'image' | 'text';
type Mode = 'single' | 'batch';

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

/** Celda editable inline — muestra texto, al hacer clic se convierte en input */
function EditCell({
  value,
  onChange,
  type = 'text',
  mono = false,
  align = 'left',
  placeholder = '',
}: {
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'number';
  mono?: boolean;
  align?: 'left' | 'right';
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function finish() {
    setEditing(false);
  }

  const display = type === 'number' && value
    ? `$${Number(value).toLocaleString('es-CL')}`
    : value || '—';

  const isEmpty = !value || value === '0';

  return editing ? (
    <input
      ref={inputRef}
      type={type === 'number' ? 'text' : 'text'}
      inputMode={type === 'number' ? 'numeric' : 'text'}
      className={`w-full px-1 py-0.5 border border-blue-400 rounded text-xs outline-none bg-white ${mono ? 'font-mono' : ''} ${align === 'right' ? 'text-right' : ''}`}
      value={value}
      onChange={e => {
        const raw = e.target.value;
        if (type === 'number') {
          // Solo dígitos
          onChange(raw.replace(/\D/g, ''));
        } else {
          onChange(raw);
        }
      }}
      onBlur={finish}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') finish(); if (e.key === 'Escape') { finish(); } }}
      placeholder={placeholder}
    />
  ) : (
    <span
      onClick={startEdit}
      title="Clic para editar"
      className={`group flex items-center gap-1 cursor-pointer rounded px-1 py-0.5 hover:bg-blue-50 transition-colors ${align === 'right' ? 'justify-end' : ''}`}
    >
      <span className={`${isEmpty ? 'text-slate-300 italic' : type === 'number' ? 'font-semibold text-blue-700' : 'text-slate-800'} ${mono ? 'font-mono' : ''} truncate`}>
        {isEmpty ? (placeholder || '—') : display}
      </span>
      <Pencil className="w-2.5 h-2.5 text-slate-300 group-hover:text-blue-400 shrink-0" />
    </span>
  );
}

export default function ImportModal({ onImport, onBatchImport, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('image');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedGuia | null>(null);
  const [parsedMultiple, setParsedMultiple] = useState<ParsedGuia[] | null>(null);
  const [mode, setMode] = useState<Mode>('single');
  const [error, setError] = useState('');
  // Batch common fields
  const [batchChofer, setBatchChofer] = useState('');
  const [batchPatente, setBatchPatente] = useState('');
  const [batchFecha, setBatchFecha] = useState(todayIso());
  const fileRef = useRef<HTMLInputElement>(null);

  function detectAndSet(rawText: string) {
    const multi = parseTablaGuias(rawText);
    if (multi.length >= 2) {
      setParsedMultiple(multi);
      setParsed(null);
      setMode('batch');
    } else {
      const single = parseTextoGuia(rawText);
      setParsed(single);
      setParsedMultiple(null);
      setMode('single');
    }
  }

  /** Actualiza un campo de una guía en el array editable */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function updateGuia(idx: number, field: keyof ParsedGuia, value: any) {
    setParsedMultiple(prev => {
      if (!prev) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  /**
   * Preprocesado inteligente de imagen para máxima precisión OCR:
   *  1. Escala 2–3× para mayor resolución
   *  2. Corrección de balance de blancos (normaliza dominante de color)
   *  3. Conversión a escala de grises (luminosidad perceptual)
   *  4. Filtro de nitidez (kernel unsharp mask 3×3)
   *  5. Umbral adaptativo local (ventana 31×31) → imagen binaria limpia
   */
  async function preprocessImageForOCR(file: File): Promise<Blob> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        // ── 1. Escalar ────────────────────────────────────────────────────────
        const MAX_DIM = 3500;
        const scale = Math.min(4.0, Math.max(2.0, MAX_DIM / Math.max(img.width, img.height)));
        const W = Math.round(img.width  * scale);
        const H = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);
        URL.revokeObjectURL(url);

        const imgData = ctx.getImageData(0, 0, W, H);
        const d = imgData.data;
        const N = W * H;

        // ── 2. Balance de blancos (normaliza el canal más brillante → 255) ────
        let maxR = 0, maxG = 0, maxB = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i]   > maxR) maxR = d[i];
          if (d[i+1] > maxG) maxG = d[i+1];
          if (d[i+2] > maxB) maxB = d[i+2];
        }
        const scR = maxR > 0 ? 255 / maxR : 1;
        const scG = maxG > 0 ? 255 / maxG : 1;
        const scB = maxB > 0 ? 255 / maxB : 1;
        for (let i = 0; i < d.length; i += 4) {
          d[i]   = Math.min(255, d[i]   * scR);
          d[i+1] = Math.min(255, d[i+1] * scG);
          d[i+2] = Math.min(255, d[i+2] * scB);
        }

        // ── 3. Escala de grises → array separado ─────────────────────────────
        const gray = new Float32Array(N);
        for (let i = 0; i < N; i++) {
          const p = i * 4;
          gray[i] = 0.299 * d[p] + 0.587 * d[p+1] + 0.114 * d[p+2];
        }

        // ── 4. Kernel de nitidez (unsharp mask) ──────────────────────────────
        // kernel: 0 -1 0 / -1 5 -1 / 0 -1 0
        const sharp = new Float32Array(N);
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const c = y * W + x;
            const t = y > 0     ? (y-1)*W+x : c;
            const b = y < H-1   ? (y+1)*W+x : c;
            const l = x > 0     ? y*W+(x-1) : c;
            const r = x < W-1   ? y*W+(x+1) : c;
            sharp[c] = Math.max(0, Math.min(255,
              5*gray[c] - gray[t] - gray[b] - gray[l] - gray[r]
            ));
          }
        }

        // ── 5. Umbral adaptativo local (ventana 31×31, C=12) ─────────────────
        // Más robusto que contraste global para fotos con iluminación desigual
        const WSIZE = 31; const HALF = Math.floor(WSIZE / 2); const C = 12;
        // Tabla de suma integral para velocidad O(1) por ventana
        const sum = new Float64Array((W+1) * (H+1));
        for (let y = 0; y < H; y++)
          for (let x = 0; x < W; x++) {
            const i = (y+1)*(W+1)+(x+1);
            sum[i] = sharp[y*W+x] + sum[y*(W+1)+(x+1)] + sum[(y+1)*(W+1)+x] - sum[y*(W+1)+x];
          }

        const out = new Uint8ClampedArray(d.length);
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const x1=Math.max(0,x-HALF), y1=Math.max(0,y-HALF);
            const x2=Math.min(W-1,x+HALF), y2=Math.min(H-1,y+HALF);
            const area = (x2-x1+1)*(y2-y1+1);
            const localSum = sum[(y2+1)*(W+1)+(x2+1)] - sum[y1*(W+1)+(x2+1)] - sum[(y2+1)*(W+1)+x1] + sum[y1*(W+1)+x1];
            const mean = localSum / area;
            const val = sharp[y*W+x] < mean - C ? 0 : 255;
            const p = (y*W+x)*4;
            out[p]=out[p+1]=out[p+2]=val; out[p+3]=255;
          }
        }

        const result = new ImageData(out, W, H);
        ctx.putImageData(result, 0, 0);
        canvas.toBlob(blob => resolve(blob!), 'image/png');
      };

      img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OCR INTELIGENTE — corrección y fusión de múltiples pasadas
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Corrige errores clásicos del OCR en contextos de números/montos chilenos.
   * Aplicado línea a línea para mayor precisión contextual.
   */
  function fixOcrNumbers(text: string): string {
    return text.split('\n').map(line => {
      let l = line;

      // ── 1. Bloques numéricos con letras mezcladas (ej: "7OO 000", "l00.090") ──
      // Primero normalizar: dentro de secuencias que parecen números, reemplazar letras
      // Se aplica en loop hasta que no haya más cambios (maneja O's consecutivas)
      for (let pass = 0; pass < 4; pass++) {
        const prev = l;
        l = l
          .replace(/(?<=[\d.])([OoQDU])(?=[\d.])/g, '0')  // O→0 entre dígitos/puntos
          .replace(/(?<=[\d.])[lI|!](?=[\d.])/g,    '1')  // l→1
          .replace(/(?<=[\d.])[Ss](?=[\d.])/g,       '5')  // S→5
          .replace(/(?<=[\d.])[Bb](?=[\d.])/g,       '8')  // B→8
          .replace(/(?<=[\d.])[Gg](?=[\d.])/g,       '9')  // G→9
          .replace(/(?<=[\d.])[Zz](?=[\d.])/g,       '2')  // Z→2
          .replace(/(?<=[\d.])[Tt](?=[\d.])/g,       '7'); // T→7
        if (l === prev) break; // convergió
      }

      // ── 2. Patrón "dígito + OO...O" seguido de separador o fin ──────────────
      // Cubre: "7OO 000" → "700 000", "l0O.090" → "100.090"→"100000"
      l = l.replace(/\b([1-9])([OoQDUlI|]{1,3})([\s.]|$)/g,
        (_, d, ocrs, sep) => d + '0'.repeat(ocrs.length) + sep);

      // ── 3. Prefijo/sufijo suelto ───────────────────────────────────────────
      l = l
        .replace(/\b[oOlI]([0-9]{5,})\b/g, '0$1')        // "O700000" → "0700000"... mejor quitar el 0 extra
        .replace(/\b([0-9]{4,})[oOlI]\b/g, '$10');        // "70000o" → "700000"

      // ── 4. Espacios dentro de número: "700 000" → "700000" (para parsear) ──
      // Pero solo cuando hay exactamente 3 dígitos después del espacio
      l = l.replace(/\b(\d{1,3})\s(\d{3})\s(\d{3})\b/g, '$1$2$3');
      l = l.replace(/\b(\d{1,3})\s(\d{3})\b(?!\s*\d)/g, '$1$2');

      // ── 5. Separadores mixtos → formato punto chileno ─────────────────────
      l = l.replace(/\b(\d{1,3})[,](\d{3})\b/g, '$1.$2');

      return l;
    }).join('\n');
  }

  async function handleImage(file: File) {
    setError('');
    setLoading(true);
    setProgress(5);
    const url = URL.createObjectURL(file);
    setPreview(url);

    try {
      // Paso 1: preprocesado avanzado
      const processed = await preprocessImageForOCR(file);
      setProgress(12);

      // Paso 2: OCR única pasada PSM 6 (tabla uniforme — mejor para Excel)
      const worker = await createWorker('spa', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text')
            setProgress(12 + Math.round(m.progress * 80));
        },
      });
      await (worker as any).setParameters({
        tessedit_pageseg_mode: '6',
        preserve_interword_spaces: '1',
        tessedit_do_invert: '0',
      });
      const { data } = await worker.recognize(processed as File);
      await worker.terminate();

      // Paso 3: corrección post-OCR
      setProgress(95);
      const cleaned = fixOcrNumbers(data.text);
      setProgress(100);
      setText(cleaned);
      detectAndSet(cleaned);

    } catch (err: any) {
      setError('Error al procesar la imagen: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  function handleTextParse() {
    if (!text.trim()) return;
    detectAndSet(text);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleImage(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleImage(file);
  }

  function handleApplySingle() {
    if (parsed) { onImport(parsed); onClose(); }
  }

  function handleApplyBatch() {
    if (parsedMultiple && onBatchImport) {
      onBatchImport(parsedMultiple, { nombre_chofer: batchChofer, patente: batchPatente, fecha: batchFecha });
      onClose();
    }
  }

  const fieldsFound = parsed
    ? Object.values(parsed).filter(v => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)).length
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden fade-in flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-900">Importar Datos</h2>
              <p className="text-xs text-slate-500">Desde foto de planilla, imagen o texto pegado</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6">
          <button
            onClick={() => { setTab('image'); setParsed(null); setParsedMultiple(null); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'image' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Camera className="w-4 h-4" /> Desde Imagen / Foto
          </button>
          <button
            onClick={() => { setTab('text'); setParsed(null); setParsedMultiple(null); }}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'text' ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" /> Desde Texto
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tab === 'image' && (
            <div className="space-y-4">
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-purple-50"
              >
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                {preview ? (
                  <img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-lg shadow-sm mb-3" />
                ) : (
                  <Upload className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                )}
                <p className="text-sm font-medium text-slate-700">
                  {preview ? 'Clic para cambiar la imagen' : 'Arrastra una foto aquí o haz clic para seleccionar'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Foto de planilla Excel, guía de flete, boleta o captura</p>
              </div>

              {loading && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-purple-800">
                        {progress < 12 ? '🔍 Mejorando imagen (nitidez + umbral)…'
                         : progress < 92 ? '🧠 Leyendo tabla con OCR inteligente…'
                         : '✨ Corrigiendo dígitos y analizando…'}
                      </p>
                      <div className="mt-2 h-2 bg-purple-200 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                      </div>
                      <p className="text-xs text-purple-500 mt-1">{progress}% completado</p>
                    </div>
                  </div>
                </div>
              )}

              {text && !loading && tab === 'image' && (
                <div>
                  <label className="label">Texto extraído (puedes editar antes de aplicar)</label>
                  <textarea
                    className="input-field resize-none h-24 text-xs font-mono"
                    value={text}
                    onChange={e => setText(e.target.value)}
                  />
                  <button onClick={() => detectAndSet(text)} className="btn-secondary text-xs mt-2 px-3 py-1.5">
                    <Sparkles className="w-3 h-3" /> Re-analizar texto editado
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="label">Pega aquí el texto o contenido de la planilla</label>
                <textarea
                  className="input-field resize-none h-40 text-sm font-mono"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder={`Puedes pegar texto de una planilla, por ejemplo:\n\n3247  LONTUE - VALPARAISO  YEMETE FRUIT  700000  700000\n127442  LONTUE - SAN ANTONIO  EXPORTADORA SAN CLEMENT  650000  650000\n127516  TALCA - VALPARAISO  EXPORTADORA SAN CLEMENT  820000  90000  910000\n\nO texto de una guía individual:\nGuía N° G000125  Fecha: 08/06/2026\nOrigen: Santiago  Destino: Concepción\n...`}
                />
              </div>
              <button onClick={handleTextParse} disabled={!text.trim()} className="btn-primary">
                <Sparkles className="w-4 h-4" /> Analizar y extraer datos
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* ── Modo BATCH: múltiples guías detectadas ── */}
          {mode === 'batch' && parsedMultiple && !loading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-blue-600" />
                  <p className="text-sm font-semibold text-blue-800">
                    {parsedMultiple.length} guías detectadas — <span className="font-normal text-slate-500">haz clic en cualquier celda para corregir</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Pencil className="w-3 h-3" /> Editable
                </div>
              </div>

              {/* Tabla editable */}
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600">
                      <th className="px-2 py-2 text-left font-semibold border-b border-slate-200 whitespace-nowrap">#</th>
                      <th className="px-2 py-2 text-left font-semibold border-b border-slate-200 whitespace-nowrap">N° Guía</th>
                      <th className="px-2 py-2 text-left font-semibold border-b border-slate-200 whitespace-nowrap">Origen</th>
                      <th className="px-2 py-2 text-left font-semibold border-b border-slate-200 whitespace-nowrap">Destino</th>
                      <th className="px-2 py-2 text-left font-semibold border-b border-slate-200 whitespace-nowrap">Cliente / Empresa</th>
                      <th className="px-2 py-2 text-left font-semibold border-b border-slate-200 whitespace-nowrap">Contenedor</th>
                      <th className="px-2 py-2 text-right font-semibold border-b border-slate-200 whitespace-nowrap bg-blue-50 text-blue-700">Valor Vía $</th>
                      <th className="px-2 py-2 text-right font-semibold border-b border-slate-200 whitespace-nowrap bg-amber-50 text-amber-700">Cargos Extra $</th>
                      <th className="px-2 py-2 text-right font-semibold border-b border-slate-200 whitespace-nowrap bg-green-50 text-green-700">TOTAL $</th>
                      <th className="px-2 py-2 text-left font-semibold border-b border-slate-200 whitespace-nowrap">Comentarios</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedMultiple.map((g, i) => {
                      const cargosSum = g.cargos_extra?.reduce((s, c) => s + (c.monto || 0), 0) ?? 0;
                      return (
                        <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50/30 transition-colors`}>
                          <td className="px-2 py-1.5 text-slate-400 font-medium">{i + 1}</td>

                          {/* N° Guía */}
                          <td className="px-2 py-1.5 min-w-[80px]">
                            <EditCell
                              value={g.numero_guia || ''}
                              onChange={v => updateGuia(i, 'numero_guia', v)}
                              mono
                              placeholder="Nº guía"
                            />
                          </td>

                          {/* Origen */}
                          <td className="px-2 py-1.5 min-w-[90px]">
                            <EditCell
                              value={g.origen || ''}
                              onChange={v => updateGuia(i, 'origen', v)}
                              placeholder="Origen"
                            />
                          </td>

                          {/* Destino */}
                          <td className="px-2 py-1.5 min-w-[90px]">
                            <EditCell
                              value={g.destino || ''}
                              onChange={v => updateGuia(i, 'destino', v)}
                              placeholder="Destino"
                            />
                          </td>

                          {/* Empresa */}
                          <td className="px-2 py-1.5 min-w-[140px]">
                            <EditCell
                              value={g.empresa_flete || ''}
                              onChange={v => updateGuia(i, 'empresa_flete', v)}
                              placeholder="Empresa"
                            />
                          </td>

                          {/* Contenedor */}
                          <td className="px-2 py-1.5 min-w-[110px]">
                            <EditCell
                              value={g.descripcion_carga ? g.descripcion_carga.replace('Contenedor ', '') : ''}
                              onChange={v => updateGuia(i, 'descripcion_carga', v ? `Contenedor ${v}` : '')}
                              mono
                              placeholder="Código"
                            />
                          </td>

                          {/* Valor Vía (monto_base) */}
                          <td className="px-2 py-1.5 min-w-[100px] bg-blue-50/40">
                            <EditCell
                              value={g.monto_base ? String(g.monto_base) : ''}
                              onChange={v => updateGuia(i, 'monto_base', v ? Number(v) : 0)}
                              type="number"
                              align="right"
                              placeholder="$0"
                            />
                          </td>

                          {/* Cargos Extra (suma) */}
                          <td className="px-2 py-1.5 min-w-[100px] bg-amber-50/40">
                            <EditCell
                              value={cargosSum > 0 ? String(cargosSum) : ''}
                              onChange={v => {
                                const monto = v ? Number(v) : 0;
                                updateGuia(i, 'cargos_extra', monto > 0 ? [{ descripcion: 'Otros', monto }] : []);
                              }}
                              type="number"
                              align="right"
                              placeholder="$0"
                            />
                          </td>

                          {/* TOTAL */}
                          <td className="px-2 py-1.5 min-w-[110px] bg-green-50/40">
                            <EditCell
                              value={g.monto_total ? String(g.monto_total) : ''}
                              onChange={v => updateGuia(i, 'monto_total', v ? Number(v) : 0)}
                              type="number"
                              align="right"
                              placeholder="$0"
                            />
                          </td>

                          {/* Notas */}
                          <td className="px-2 py-1.5 min-w-[160px]">
                            <EditCell
                              value={g.notas || ''}
                              onChange={v => updateGuia(i, 'notas', v)}
                              placeholder="Comentario"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Campos comunes del conductor */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-800 mb-3 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Datos del conductor (aplica a todas las guías)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="label text-xs">Nombre Chofer</label>
                    <input
                      className="input-field text-sm"
                      value={batchChofer}
                      onChange={e => setBatchChofer(e.target.value)}
                      placeholder="Ej: Rodrigo Silva"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Patente Vehículo</label>
                    <input
                      className="input-field text-sm uppercase font-mono"
                      value={batchPatente}
                      onChange={e => setBatchPatente(e.target.value.toUpperCase())}
                      placeholder="BBCD12"
                      maxLength={8}
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Fecha de las guías</label>
                    <input
                      type="date"
                      className="input-field text-sm"
                      value={batchFecha}
                      onChange={e => setBatchFecha(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Modo SINGLE: una sola guía ── */}
          {mode === 'single' && parsed && !loading && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-800">
                  {fieldsFound} campo{fieldsFound !== 1 ? 's' : ''} detectado{fieldsFound !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <Field label="N° Guía"    value={parsed.numero_guia} />
                  <Field label="Fecha"      value={parsed.fecha} />
                  <Field label="Origen"     value={parsed.origen} />
                  <Field label="Destino"    value={parsed.destino} />
                  <Field label="Empresa"    value={parsed.empresa_flete} />
                  <Field label="RUT Empresa" value={parsed.rut_empresa} />
                  <Field label="Chofer"     value={parsed.nombre_chofer} />
                  <Field label="RUT Chofer" value={parsed.rut_chofer} />
                  <Field label="Patente"    value={parsed.patente} />
                  <Field label="Carga"      value={parsed.descripcion_carga} />
                  <Field label="Monto Base" value={parsed.monto_base ? `$${parsed.monto_base.toLocaleString('es-CL')}` : undefined} />
                  {parsed.cargos_extra && parsed.cargos_extra.length > 0 && (
                    <Field label="Cargos Extra" value={parsed.cargos_extra.map(c => `${c.descripcion}: $${c.monto.toLocaleString('es-CL')}`).join(', ')} />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <p className="text-xs text-slate-400">
            {mode === 'batch' && parsedMultiple
              ? `${parsedMultiple.length} guías listas — puedes editar cualquier valor antes de importar`
              : 'Los campos vacíos no se sobreescribirán'}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>

            {mode === 'batch' && parsedMultiple && parsedMultiple.length > 0 && onBatchImport && (
              <button onClick={handleApplyBatch} className="btn-success">
                <Table2 className="w-4 h-4" />
                Importar {parsedMultiple.length} guías
              </button>
            )}

            {mode === 'single' && parsed && (
              <button
                onClick={handleApplySingle}
                disabled={fieldsFound === 0}
                className="btn-success"
              >
                <Sparkles className="w-4 h-4" />
                Aplicar {fieldsFound} campo{fieldsFound !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-slate-500 text-xs font-medium w-24 shrink-0">{label}:</span>
      {value ? (
        <span className="text-slate-900 font-medium truncate">{value}</span>
      ) : (
        <span className="text-slate-300 italic text-xs">no detectado</span>
      )}
    </div>
  );
}
