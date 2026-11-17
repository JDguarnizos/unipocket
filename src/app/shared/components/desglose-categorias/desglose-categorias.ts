import { Component, computed, input } from '@angular/core';
import { Movimiento } from '../../../core/models/movimiento.model';
import { colorCategoria, formatearPesos, formatearPesosCorto } from '../../../core/utils/formato';

// Forma de cada fila del desglose
interface CategoriaDesglose {
  nombre: string;
  monto: number;
  porcentaje: number; // redondeado, para mostrar en pantalla
  color: string;
}

/*
  Desglose visual de los gastos por categoría (es la gráfica de dona + la lista).
  Es un componente COMPARTIDO: recibe una lista de movimientos y calcula todo solo.
  Se puede usar en el Historial, en el Dashboard o en Reportes :).

  Nota: Uso:  <app-desglose-categorias [movimientos]="misMovimientos()" />
*/
@Component({
  selector: 'app-desglose-categorias',
  standalone: true,
  imports: [],
  templateUrl: './desglose-categorias.html',
  styleUrls: ['./desglose-categorias.css']
})
export class DesgloseCategorias {
  // input() es la versión "signal" de @Input().
  // La usamos porque así los computed() de abajo se recalculan solos cuando cambia la lista.
  movimientos = input<Movimiento[]>([]);

  // 1) Solo nos interesan los gastos
  private gastos = computed(() => this.movimientos().filter(m => m.tipo === 'gasto'));

  // 2) Total gastado (se muestra en el centro de la dona)
  totalGastos = computed(() => this.gastos().reduce((suma, m) => suma + m.monto, 0));

  // 3) Agrupamos por categoría y calculamos el porcentaje de cada una
  categorias = computed<CategoriaDesglose[]>(() => {
    const total = this.totalGastos();

    // Objeto acumulador: { "Alimentación": 119000, "Transporte": 68000, ... }
    const totalesPorCategoria: Record<string, number> = {};
    for (const gasto of this.gastos()) {
      totalesPorCategoria[gasto.categoria] = (totalesPorCategoria[gasto.categoria] ?? 0) + gasto.monto;
    }

    // Convertimos el objeto en una lista y la ordenamos de mayor a menor gasto
    return Object.entries(totalesPorCategoria)
      .map(([nombre, monto]) => ({
        nombre,
        monto,
        porcentaje: total > 0 ? Math.round((monto / total) * 100) : 0,
        color: colorCategoria(nombre)
      }))
      .sort((a, b) => b.monto - a.monto);
  });

  // 4) Fondo de la dona: un conic-gradient (degradado en círculo) con un tramo por categoría.
  //    Ej: "conic-gradient(amarillo 0% 35%, azul 35% 55%, ...)"
  gradienteDona = computed(() => {
    const total = this.totalGastos();
    if (total === 0) return 'var(--neutral-200)';

    let acumulado = 0; // porcentaje donde empieza cada tramo
    const tramos = this.categorias().map(cat => {
      const inicio = acumulado;
      acumulado += (cat.monto / total) * 100;
      return `${cat.color} ${inicio}% ${acumulado}%`;
    });
    return `conic-gradient(${tramos.join(', ')})`;
  });

  // Funciones de formato para usarlas en el HTML
  formatearPesos = formatearPesos;
  formatearPesosCorto = formatearPesosCorto;
}