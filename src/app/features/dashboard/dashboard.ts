import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { BotonGenericoComponent } from '../../shared/components/boton-generico/boton-generico';
import { TarjetaResumenComponent } from '../../shared/components/tarjeta-resumen/tarjeta-resumen';
import { ItemMovimientoComponent } from '../../shared/components/item-movimiento/item-movimiento';
import { RegistroMovimiento } from '../movimientos/registro-movimiento/registro-movimiento';
import { DesgloseCategorias } from '../../shared/components/desglose-categorias/desglose-categorias';
import { Movimiento } from '../../core/models/movimiento.model';
import { SesionApi } from '../../core/services/sesion-api';
import { MovimientosApi } from '../../core/services/movimientos-api';
import { MetasApi } from '../../core/services/metas-api';
import { MetaAhorro } from '../../core/models/meta_ahorro.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BotonGenericoComponent, TarjetaResumenComponent, ItemMovimientoComponent, RegistroMovimiento, DesgloseCategorias],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  // Cambiado: antes todo venía de LocalApi; ahora la sesión y los movimientos tienen su propio servicio
  private sesion = inject(SesionApi);
  private movimientosApi = inject(MovimientosApi);
  // Nuevo (CU-3): el resumen del dashboard también muestra las metas de ahorro
  private metasApi = inject(MetasApi);
  private router = inject(Router);

  modalAbierto = false;
  tipoModal: 'gasto' | 'ingreso' = 'gasto';

  // ===== Datos conectados a la API local =====
  usuario = this.sesion.usuarioActual;

  // 1) a 4) Cambiado: estos cálculos se movieron a MovimientosApi para que la vista de
  //    Presupuesto use exactamente los mismos. Aquí solo los "conectamos" con el mismo nombre,
  //    así el HTML del resumen rápido no cambió.
  registroActual = this.movimientosApi.registroActual;               // registro financiero del usuario
  saldoDisponible = this.movimientosApi.saldoDisponible;             // ingresos - gastos
  porcentajePresupuesto = this.movimientosApi.porcentajePresupuesto; // % del presupuesto usado
  presupuestoRestante = this.movimientosApi.presupuestoRestante;     // presupuesto - gastos

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

  // ===== Nuevo: dashboard extendido (RNF04) y CU-3 =====

  // Todos los movimientos del usuario (para el desglose por categoría)
  misMovimientos = computed(() => {
    const usuario = this.sesion.usuarioActual();
    return this.movimientosApi.movimientos().filter(m => m.idUsuario === usuario?.id);
  });

  // Metas del usuario que inició sesión
  misMetas = computed(() => {
    const usuario = this.sesion.usuarioActual();
    return this.metasApi.metasAhorro().filter(m => m.idUsuario === usuario?.id);
  });

  // Tarjeta "Metas de ahorro": hasta 2 metas que todavía no se han cumplido
  metasEnProgreso = computed(() => this.misMetas().filter(m => !m.completado).slice(0, 2));

  // CU-3 curso alterno: usuario nuevo, sin movimientos ni metas -> mensaje de bienvenida
  sinDatos = computed(() => this.misMovimientos().length === 0 && this.misMetas().length === 0);

  ngOnInit(): void {
    if (!this.sesion.usuarioActual()) {
      this.router.navigate(['/login']);
      return;
    }
    // Lee los JSON solo la primera vez gracias a la bandera restaurada
    this.movimientosApi.cargarDatosFinancieros();
    // Nuevo: también cargamos las metas (el error de carga ya lo muestra MetasApi en consola)
    this.metasApi.cargarMetasAhorro().subscribe({ error: () => {} });
  }

  // Navega a otra vista con el router, sin recargar la página (Accesos rápidos y enlaces)
  irA(ruta: string): void {
    this.router.navigate([ruta]);
  }

  // RF11: total aportado y porcentaje de una meta (los calcula MetasApi)
  aportadoMeta(meta: MetaAhorro): number {
    return this.metasApi.totalAportado(meta);
  }

  porcentajeMeta(meta: MetaAhorro): number {
    return this.metasApi.porcentajeMeta(meta);
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