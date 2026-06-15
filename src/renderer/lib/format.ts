/** Formatea un número como peso chileno: $ 1.250.000 */
export function formatCLP(amount: number): string {
  if (isNaN(amount)) return '$ 0';
  return '$ ' + Math.round(amount).toLocaleString('es-CL');
}

/** Formatea fecha ISO a dd/mm/yyyy */
export function formatFecha(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Hoy en formato YYYY-MM-DD */
export function hoy(): string {
  return new Date().toISOString().split('T')[0];
}

/** RUT chileno: 12.345.678-9 */
export function formatRut(rut: string): string {
  const clean = rut.replace(/[^0-9kK]/g, '');
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1);
  const dv   = clean.slice(-1).toUpperCase();
  return body.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv;
}
