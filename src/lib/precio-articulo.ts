/** precio de costo + por_aplic % → precio de venta (2 decimales) */
export function calcularPrecioVenta(precio: number, porAplicPorciento: number): number {
  const p = Number(precio) || 0;
  const pct = Number(porAplicPorciento) || 0;
  return Math.round(p * (1 + pct / 100) * 100) / 100;
}
