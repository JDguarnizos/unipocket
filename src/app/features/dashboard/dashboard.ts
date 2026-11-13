import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

// Importamos los componentes que creó Nicolás
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
  // Servicio de Juan: de aquí salen los datos del JSON
  private api = inject(LocalApi);
  private router = inject(Router);

  // ===== Modal "Registrar movimiento" =====
  modalAbierto = false;
  tipoModal: 'gasto' | 'ingreso' = 'gasto';

  // ===== Datos conectados a la API local =====
  // Solo se conecta lo que usa el modal: "Dinero disponible" y "Movimientos recientes".
  // Las demás tarjetas siguen fijas en el HTML (las conecta Santiago según el cronograma).

  // computed() = valor CALCULADO a partir de otros signals.
  // Cada vez que cambia el usuario o los registros del servicio, se recalcula solo.
  saldoDisponible = computed(() => {
    const usuario = this.api.usuarioActual();
    const registro = this.api.registrosFinancieros().find(r => r.idUsuario === usuario?.id);
    // Saldo = lo que ha entrado - lo que ha salido
    return registro ? registro.totalIngresos - registro.totalGastos : 0;
  });

  // Movimientos del usuario que inició sesión, ya con el formato que pide <app-item-movimiento>
  movimientosRecientes = computed(() => {
    const usuario = this.api.usuarioActual();
    return this.api.movimientos()
      .filter(m => m.idUsuario === usuario?.id) // solo los de este usuario
      .slice(0, 5)                              // los 5 más recientes (los nuevos van de primeros)
      .map(m => ({
        titulo: m.descripcion || m.categoria,   // si no escribió descripción, mostramos la categoría
        subtitulo: `${m.categoria} - ${m.fecha}`,
        monto: m.monto,
        tipo: m.tipo
      }));
  });

  ngOnInit(): void {
    // TEMPORAL: si nadie ha iniciado sesión (ej. se recargó la página), volvemos al login.
    // Cuando Juan agregue los Guards, esta validación pasa a ellos.
    if (!this.api.usuarioActual()) {
      this.router.navigate(['/login']);
      return;
    }
    // Pedimos al servicio que lea los JSON (solo la primera vez)
    this.api.cargarDatosFinancieros();
  }

  // Abre el modal con el tipo del botón que se presionó
  abrirModal(tipo: 'gasto' | 'ingreso'): void {
    this.tipoModal = tipo;
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  // Se ejecuta cuando el modal emite (guardado)
  registrarMovimiento(movimiento: Movimiento): void {
    const usuario = this.api.usuarioActual();
    if (!usuario) return;

    // El servicio guarda el movimiento y actualiza totalIngresos / totalGastos.
    // No hace falta tocar saldoDisponible ni movimientosRecientes: como son computed,
    // se recalculan solos (un ingreso sube el saldo y un gasto lo baja).
    this.api.registrarMovimiento(usuario.id, movimiento);

    this.cerrarModal();
  }

  // Convierte un número a pesos colombianos: 860000 -> "$860.000"
  formatearPesos(valor: number): string {
    return '$' + valor.toLocaleString('es-CO');
  }
}
