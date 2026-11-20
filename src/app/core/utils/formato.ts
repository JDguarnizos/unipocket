// Funciones de ayuda reutilizables para mostrar datos en pantalla :).
// Son funciones normales (no componentes ni servicios): se importan donde se necesiten.

// Convierte un numero a pesos colombianos con NumberFormat (herramienta nativa de JS (interesante)): 860000 -> "$860.000"
export function formatearPesos(valor: number): string {
  return '$' + valor.toLocaleString('es-CO');
}

// Versión corta para espacios pequeños: 340000 -> "$340k"
export function formatearPesosCorto(valor: number): string {
  return valor >= 1000 ? '$' + Math.round(valor / 1000) + 'k' : '$' + valor;
}

// Convierte "2026-11-12" -> "12 de nov de 2026"
// Se agrega 'T00:00' para que JavaScript use la hora local y no cambie el día.
export function formatearFecha(fecha: string): string {
  return new Date(fecha + 'T00:00').toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Nuevo: convierte una fecha de texto en un Date LOCAL a medianoche.
// Sirve para "2026-11-12" (input type="date") y para "2026-11-12T00:00:00.000Z" (metas.json).
// Tomamos solo los 10 primeros caracteres (AAAA-MM-DD) y agregamos 'T00:00:00':
// así JavaScript usa la hora de Colombia y no se corre un día por la zona horaria.
export function aFechaLocal(fecha: string): Date {
  return new Date(fecha.substring(0, 10) + 'T00:00:00');
}

// Nuevo: fecha de hoy en formato AAAA-MM-DD (el formato que usa el input type="date").
// 'en-CA' es un formato regional que escribe las fechas justo así.
export function hoyTexto(): string {
  return new Date().toLocaleDateString('en-CA');
}

// Nuevo (CU-11): meses que faltan hasta una fecha, contando meses de 30 días.
// Usamos Math.ceil para redondear hacia arriba (10 días = 1 mes) y el mínimo es 1,
// así nunca se divide entre 0 al calcular el ahorro mensual.
export function mesesHasta(fecha: string): number {
  const hoy = aFechaLocal(hoyTexto());
  const dias = (aFechaLocal(fecha).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.ceil(dias / 30));
}

// Color de cada categoría de gasto (variables --cat-* de styles.css).
// Si la categoría no está en la lista, usa el color de "Otros".
const COLORES_CATEGORIA: Record<string, string> = {
  'Alimentación': 'var(--cat-alimentacion)',
  'Transporte': 'var(--cat-transporte)',
  'Materiales e impresiones': 'var(--cat-materiales)',
  'Entretenimiento': 'var(--cat-entretenimiento)',
  'Suscripciones': 'var(--cat-suscripciones)',
  // Nuevo (CU-15): los aportes a metas se registran como gasto de categoría "Ahorro"
  'Ahorro': 'var(--success-500)'
};

export function colorCategoria(categoria: string): string {
  return COLORES_CATEGORIA[categoria] ?? 'var(--cat-otros)';
}