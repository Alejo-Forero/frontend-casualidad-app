/**
 * Parsea "yyyy-MM-dd" (o "yyyy-MM-ddTHH:mm:ss") como medianoche en hora LOCAL.
 * Evita el desfase de 1 día que produce `new Date("yyyy-MM-dd")` (interpreta UTC).
 */
export function parseLocalDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const onlyDate = iso.split('T')[0];
  const parts = onlyDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/**
 * Diferencia en días enteros entre una fecha ISO y hoy (en hora local).
 * Positivo = futuro, 0 = hoy, negativo = pasado.
 */
export function diffDaysFromToday(iso: string | null | undefined): number | null {
  const d = parseLocalDate(iso);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
