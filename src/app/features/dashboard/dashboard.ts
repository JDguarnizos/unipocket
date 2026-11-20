import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { BotonGenericoComponent } from '../../shared/components/boton-generico/boton-generico';
import { TarjetaResumenComponent } from '../../shared/components/tarjeta-resumen/tarjeta-resumen';
import { ItemMovimientoComponent } from '../../shared/components/item-movimiento/item-movimiento';
import { RegistroMovimiento } from '../movimientos/registro-movimiento/registro-movimiento';
import { Movimiento } from '../../core/models/movimiento.model';
import { SesionApi } from '../../core/services/sesion-api';
import { MovimientosApi } from '../../core/services/movimientos-api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BotonGenericoComponent, TarjetaResumenComponent, ItemMovimientoComponent, RegistroMovimiento],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  // Cambiado: antes todo venía de LocalApi; ahora la sesión y los movimientos tienen su propio servicio
  private sesion = inject(SesionApi);
  private movimientosApi = inject(MovimientosApi);
  private router = inject(Router);

  modalAbierto = false;
  tipoModal: 'gasto' | 'ingreso' = 'gasto';

  // ===== Datos conectados a la API local =====
  usuario = this.sesion.usuarioActual;

  // 1) El registro financiero del usuario. Lo buscamos una sola vez y las demás tarjetas salen de aquí.
registroActual = computed(() => {
    const usuario = this.sesion.usuarioActual();
    if (!usuario) return undefined;
  // Buscamos haciendo match estricto o flexible con el id del usuario
  return this.movimientosApi.registrosFinancieros().find(r => r.idUsuario == usuario.id);
  });
  // 2) Dinero disponible = lo que ha entrado - lo que ha salido
  saldoDisponible = computed(() => {
    const r = this.registroActual();
    return r ? r.totalIngresos - r.totalGastos : 0;
  });

  // 3) Porcentaje del presupuesto que ya se gastó
  porcentajePresupuesto = computed(() => {
    const r = this.registroActual();
    if (!r || r.presupuesto === 0) return 0;
    return Math.round((r.totalGastos / r.presupuesto) * 100);
  });

  // 4) Presupuesto restante (puede ser negativo si se pasó del límite)
  presupuestoRestante = computed(() => {
    const r = this.registroActual();
    return r ? r.presupuesto - r.totalGastos : 0;
  });

  // 5) Días que faltan para terminar el mes (contando hoy)
  diasRestantes = computed(() => {
    const hoy = new Date();
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
    return ultimoDia - hoy.getDate() + 1;
  });

  // 6) Gasto diario recomendado = lo que queda del presupuesto / días que faltan
  gastoDiarioRecomendado = computed(() =>
    Math.round(Math.max(0, this.presupuestoRestante()) / this.diasRestantes())
  );

  // Mes actual para la cabecera: "noviembre de 2026"
  mesActual = new Date().toLocaleDateString('es-co', { month: 'long', year: 'numeric' });

  // Movimientos del usuario que inició sesión
  movimientosRecientes = computed(() => {
    const usuario = this.sesion.usuarioActual();
    return this.movimientosApi.movimientos()
      .filter(m => m.idUsuario === usuario?.id)
      .slice(0, 5)
      .map(m => ({
        titulo: m.descripcion || m.categoria,
        subtitulo: `${m.categoria} - ${m.fecha}`,
        monto: m.monto,
        tipo: m.tipo
      }));
  });

  ngOnInit(): void {
    if (!this.sesion.usuarioActual()) {
      this.router.navigate(['/login']);
      return;
    }
    // Lee los JSON solo la primera vez gracias a la bandera restaurada
    this.movimientosApi.cargarDatosFinancieros();
  }

  abrirModal(tipo: 'gasto' | 'ingreso'): void {
    this.tipoModal = tipo;
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  registrarMovimiento(movimiento: Movimiento): void {
    const usuario = this.sesion.usuarioActual();
    if (!usuario) return;

    this.movimientosApi.registrarMovimiento(usuario.id, movimiento);
    this.cerrarModal();
  }

  formatearPesos(valor: number): string {
    return '$' + Number(valor || 0).toLocaleString('es-CO');
  }
}