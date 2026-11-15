import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { BotonGenericoComponent } from '../../shared/components/boton-generico/boton-generico';
import { TarjetaResumenComponent } from '../../shared/components/tarjeta-resumen/tarjeta-resumen';
import { ItemMovimientoComponent } from '../../shared/components/item-movimiento/item-movimiento';
import { RegistroMovimiento } from '../movimientos/registro-movimiento/registro-movimiento';
import { Movimiento } from '../../core/models/movimiento.model';
import { LocalApi } from '../../core/services/local-api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BotonGenericoComponent, TarjetaResumenComponent, ItemMovimientoComponent, RegistroMovimiento],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  public api = inject(LocalApi);
  private router = inject(Router);

  modalAbierto = false;
  tipoModal: 'gasto' | 'ingreso' = 'gasto';

  nombreUsuario = computed(() => {
    const usuario = this.api.usuarioActual();
    return usuario?.nombre ?? 'Usuario';
  });

  saldoDisponible = computed(() => {
    const usuario = this.api.usuarioActual();
    if (!usuario) return 0;
    
    const userId = this.api.obtenerIdActual();
    const registro = this.api.registrosFinancieros().find(r => Number(r.idUsuario) === userId);

    return registro ? Number(registro.totalIngresos) - Number(registro.totalGastos) : 1200000;
  });

  movimientosRecientes = computed(() => {
    const usuario = this.api.usuarioActual();
    if (!usuario) return [];
    
    const userId = this.api.obtenerIdActual();
    return this.api.movimientos()
      .filter(m => Number(m.idUsuario) === userId)
      .slice(0, 5)
      .map(m => ({
        titulo: m.descripcion || m.categoria,     
        subtitulo: `${m.categoria} - ${m.fecha}`, 
        monto: Number(m.monto),
        tipo: m.tipo
      }));
  });

  porcentajePresupuesto = computed(() => {
    const usuario = this.api.usuarioActual();
    if (!usuario) return 0;

    const userId = this.api.obtenerIdActual();
    const registro = this.api.registrosFinancieros().find(r => Number(r.idUsuario) === userId);

    if (!registro || Number(registro.presupuesto) === 0) return 0;
    return Math.round((Number(registro.totalGastos) / Number(registro.presupuesto)) * 100);
  });

  datosPresupuesto = computed(() => {
    const usuario = this.api.usuarioActual();
    if (!usuario) return undefined;

    const userId = this.api.obtenerIdActual();
    return this.api.registrosFinancieros().find(r => Number(r.idUsuario) === userId);
  });

  ngOnInit(): void {
    if (!this.api.usuarioActual()) {
      this.router.navigate(['/login']);
      return;
    }
    this.api.cargarDatosFinancieros();
  }

  abrirModal(tipo: 'gasto' | 'ingreso'): void {
    this.tipoModal = tipo;
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  registrarMovimiento(movimiento: Movimiento): void {
    const usuario = this.api.usuarioActual();
    if (!usuario) return;

    this.api.registrarMovimiento(usuario.id, movimiento);
    this.cerrarModal();
  }

  formatearPesos(valor: number): string {
    return '$' + Number(valor || 0).toLocaleString('es-CO');
  }
}