// Funciones de ayuda reutilizables para mostrar datos en pantalla :).
// Son funciones normales (no componentes ni servicios): se importan donde se necesiten.

// Convierte un numero a pesos colombianos con NumberFormat (herramienta nativa de JS (waos)): 860000 -> "$860.000"
export function formatearPesos(valor: number): string {
  return '$' + valor.toLocaleString('es-CO');
}

// Versión corta para espacios pequeños: 340000 -> "$340k (ahi pal responsive)"
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

// Color de cada categoría de gasto (variables --cat-* de styles.css).
// Si la categoría no está en la lista, usa el color de "Otros".
const COLORES_CATEGORIA: Record<string, string> = {
  'Alimentación': 'var(--cat-alimentacion)',
  'Transporte': 'var(--cat-transporte)',
  'Materiales e impresiones': 'var(--cat-materiales)',
  'Entretenimiento': 'var(--cat-entretenimiento)',
  'Suscripciones': 'var(--cat-suscripciones)'
};

export function colorCategoria(categoria: string): string {
  return COLORES_CATEGORIA[categoria] ?? 'var(--cat-otros)';
}