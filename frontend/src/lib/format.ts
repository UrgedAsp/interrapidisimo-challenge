const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const pointsFormatter = new Intl.NumberFormat('es-CO');

export function formatCOP(value: number): string {
  return copFormatter.format(value).replace(/\s+/g, ' ').trim();
}

export function formatPoints(value: number): string {
  return pointsFormatter.format(value);
}
