import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { SesionApi } from '../../core/services/sesion-api';
import { MovimientosApi } from '../../core/services/movimientos-api';
import { aFechaLocal, formatearFecha, formatearPesos, hoyTexto } from '../../core/utils/formato';

// =====================================================================
// FUNCIONES PEQUEÑAS DE FECHAS
// Son funciones normales (fuera de la clase) porque no dependen del componente.
// =====================================================================

// Suma (o resta, si n es negativo) días a una fecha. new Date(año, mes, día + n) ajusta solo el mes y el año.
function sumarDias(fecha: Date, n: number): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + n);
}

// Lunes de la semana de esa fecha. getDay(): 0 = domingo, 1 = lunes, ..., 6 = sábado.
// Si es domingo retrocedemos 6 días; si no, retrocedemos hasta el lunes.
function inicioSemana(fecha: Date): Date {
  const dia = fecha.getDay();
  return sumarDias(fecha, dia === 0 ? -6 : 1 - dia);
}

// Domingo de esa misma semana (lunes + 6 días)
function finSemana(fecha: Date): Date {
  return sumarDias(inicioSemana(fecha), 6);
}

// Día 1 del mes de esa fecha
function inicioMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

// Último día del mes: el "día 0" del mes siguiente es el último día del mes actual
function finMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
}

// Date -> "AAAA-MM-DD", el mismo formato de los movimientos (así se pueden comparar como texto)
function aTexto(fecha: Date): string {
  return fecha.toLocaleDateString('en-CA');
}

// "noviembre" -> nombre del mes en español
function nombreMes(fecha: Date): string {
  return fecha.toLocaleDateString('es-CO', { month: 'long' });
}

/*
  Vista "Resumen y reportes financieros" (RF07, RNF08, RNF09).
  - RF07: resumen semanal o mensual, con flechas para ir al periodo anterior o siguiente.
  - RNF08: diseño tipo recibo, fácil de leer.
  - RNF09: comparativa presupuesto vs gasto real por categoría.
  Todos los cálculos son computed: si cambia el periodo o se registra un movimiento, se recalculan solos.
*/
@Component({
  selector: 'app-reportes',
  imports: [],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css'
})
export class Reportes implements OnInit {
  private sesion = inject(SesionApi);
  private movimientosApi = inject(MovimientosApi);

  // ===== Estado =====

  // RF07: tipo de resumen
  tipo = signal<'semanal' | 'mensual'>('mensual');

  // Cuántos periodos nos movimos con las flechas: 0 = periodo base, -1 = anterior, 1 = siguiente
  desplazamiento = signal(0);

  // ===== Datos =====

  misMovimientos = computed(() => {
    const usuario = this.sesion.usuarioActual();
    return this.movimientosApi.movimientos().filter(m => m.idUsuario === usuario?.id);
  });

  // Periodo base: el que contiene el movimiento MÁS RECIENTE del usuario.
  // Así la demo muestra datos aunque el JSON tenga fechas pasadas. Si no hay movimientos, usamos hoy.
  private fechaBase = computed(() => {
    const fechas = this.misMovimientos().map(m => m.fecha).sort();
    return aFechaLocal(fechas.length > 0 ? fechas[fechas.length - 1] : hoyTexto());
  });

  // Inicio y fin del periodo que se está viendo
  periodo = computed(() => {
    const base = this.fechaBase();
    const n = this.desplazamiento();

    if (this.tipo() === 'semanal') {
      const referencia = sumarDias(base, n * 7); // cada flecha mueve 7 días
      return { inicio: inicioSemana(referencia), fin: finSemana(referencia) };
    }
    const referencia = new Date(base.getFullYear(), base.getMonth() + n, 1); // cada flecha mueve 1 mes
    return { inicio: inicioMes(referencia), fin: finMes(referencia) };
  });

  // Texto del periodo: "Noviembre 2026" o "Semana del 16 al 22 de noviembre de 2026"
  textoPeriodo = computed(() => {
    const { inicio, fin } = this.periodo();

    if (this.tipo() === 'mensual') {
      const mes = nombreMes(inicio);
      return mes.charAt(0).toUpperCase() + mes.slice(1) + ' ' + inicio.getFullYear();
    }
    // Si la semana queda entre dos meses: "Semana del 30 de noviembre al 6 de diciembre de 2026"
    if (inicio.getMonth() === fin.getMonth()) {
      return `Semana del ${inicio.getDate()} al ${fin.getDate()} de ${nombreMes(fin)} de ${fin.getFullYear()}`;
    }
    const anioInicio = inicio.getFullYear() !== fin.getFullYear() ? ` de ${inicio.getFullYear()}` : '';
    return `Semana del ${inicio.getDate()} de ${nombreMes(inicio)}${anioInicio} al ${fin.getDate()} de ${nombreMes(fin)} de ${fin.getFullYear()}`;
  });

  // SOLO los movimientos del periodo. Las fechas "AAAA-MM-DD" se pueden comparar como texto.
  movimientosPeriodo = computed(() => {
    const desde = aTexto(this.periodo().inicio);
    const hasta = aTexto(this.periodo().fin);
    return this.misMovimientos().filter(m => m.fecha >= desde && m.fecha <= hasta);
  });

  // ===== Balance general (RF07) =====
  totalIngresos = computed(() => this.sumar('ingreso'));
  totalGastos = computed(() => this.sumar('gasto'));
  // Positivo = superávit (sobró dinero); negativo = déficit (se gastó más de lo que entró)
  balance = computed(() => this.totalIngresos() - this.totalGastos());

  // ===== Comparativa presupuesto vs gasto real (RNF09) =====
  // El presupuesto por categoría es MENSUAL. Para el reporte semanal lo dividimos entre 4
  // (un mes tiene aproximadamente 4 semanas), por eso el factor es 0.25.
  comparativa = computed(() =>
    this.movimientosApi.compararPresupuesto(this.movimientosPeriodo(), this.tipo() === 'semanal' ? 0.25 : 1)
  );

  // Fecha en que se genera el reporte (pie del recibo)
  fechaGenerado = formatearFecha(hoyTexto());

  ngOnInit(): void {
    this.movimientosApi.cargarDatosFinancieros();
  }

  // ===== Acciones =====

  // Al cambiar entre Semanal y Mensual volvemos al periodo base
  cambiarTipo(tipo: 'semanal' | 'mensual'): void {
    this.tipo.set(tipo);
    this.desplazamiento.set(0);
  }

  // Flechas ‹ ›: paso = -1 (anterior) o 1 (siguiente)
  moverPeriodo(paso: number): void {
    this.desplazamiento.update(n => n + paso);
  }

  private sumar(tipo: 'ingreso' | 'gasto'): number {
    return this.movimientosPeriodo().filter(m => m.tipo === tipo).reduce((suma, m) => suma + m.monto, 0);
  }

  formatearPesos = formatearPesos;
}
