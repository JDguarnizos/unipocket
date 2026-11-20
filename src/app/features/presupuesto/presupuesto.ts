import { Component, OnInit, computed, inject } from '@angular/core';
import { Movimiento } from '../../core/models/movimiento.model';
import { SesionApi } from '../../core/services/sesion-api';
import { ComparativaCategoria, MovimientosApi } from '../../core/services/movimientos-api';
import { colorCategoria, formatearPesos } from '../../core/utils/formato';
import { RegistroMovimiento } from '../movimientos/registro-movimiento/registro-movimiento';

/*
  Vista "Presupuesto" (solo lectura).
  - RF04: presupuesto total del periodo, cuánto se ha usado y cuánto queda.
  - RF06: presupuesto vs gasto por categoría, con barras de colores.
  Todo es computed: al registrar un gasto, la vista se actualiza en tiempo real.
*/
@Component({
  selector: 'app-presupuesto',
  imports: [RegistroMovimiento],
  templateUrl: './presupuesto.html',
  styleUrl: './presupuesto.css',
})
export class Presupuesto implements OnInit {
  private sesion = inject(SesionApi);
  private movimientosApi = inject(MovimientosApi);

  // ===== RF04: los MISMOS cálculos que usa el Dashboard (están en MovimientosApi) =====
  registroActual = this.movimientosApi.registroActual;
  porcentajePresupuesto = this.movimientosApi.porcentajePresupuesto;
  presupuestoRestante = this.movimientosApi.presupuestoRestante;

  // Mes actual para la cabecera: "noviembre de 2026"
  mesActual = new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });

  // ===== RF06: presupuesto vs gasto por categoría =====

  // Movimientos del usuario que inició sesión
  private misMovimientos = computed(() => {
    const usuario = this.sesion.usuarioActual();
    return this.movimientosApi.movimientos().filter(m => m.idUsuario === usuario?.id);
  });

  // Una fila por categoría. La comparación la hace MovimientosApi (la misma que usa Reportes).
  // Las categorías con presupuesto van primero y luego las que no tienen (ej: "Ahorro").
  categorias = computed(() => this.movimientosApi.compararPresupuesto(this.misMovimientos()));

  // ===== Modal "Registrar gasto" (el mismo del Dashboard) =====
  modalAbierto = false;

  ngOnInit(): void {
    this.movimientosApi.cargarDatosFinancieros();
  }

  // RF06: color de la barra según cuánto se ha usado de la categoría
  // verde: menos del 80 % · amarilla: entre 80 % y 100 % · roja: se pasó del 100 %
  colorBarra(fila: ComparativaCategoria): 'verde' | 'amarilla' | 'roja' {
    if (fila.porcentaje > 100) return 'roja';
    if (fila.porcentaje >= 80) return 'amarilla';
    return 'verde';
  }

  // El modal emite (guardado): el servicio lo guarda y todos los computed se recalculan solos
  registrarMovimiento(movimiento: Movimiento): void {
    const usuario = this.sesion.usuarioActual();
    if (!usuario) return;
    this.movimientosApi.registrarMovimiento(usuario.id, movimiento);
    this.modalAbierto = false;
  }

  formatearPesos = formatearPesos;
  colorCategoria = colorCategoria;
}
