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

/** Valida RUT chileno con dígito verificador */
export function validarRut(rut: string): boolean {
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv   = clean.slice(-1);
  let sum = 0;
  let mult = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const expected = 11 - (sum % 11);
  const dvCalc = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected);
  return dv === dvCalc;
}

/** Calcula días entre fecha ISO y hoy */
export function diasDesde(fechaIso: string): number {
  const d = new Date(fechaIso);
  const hoyD = new Date();
  return Math.floor((hoyD.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}
