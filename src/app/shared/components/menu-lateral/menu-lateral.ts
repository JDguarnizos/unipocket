import { Component, Output, EventEmitter, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SesionApi } from '../../../core/services/sesion-api';

@Component({
  selector: 'app-menu-lateral',
  imports: [RouterModule],
  templateUrl: './menu-lateral.html',
  styleUrl: './menu-lateral.css'
})
export class MenuLateral {
  private sesion = inject(SesionApi);

  @Output() menuClosed = new EventEmitter<void>();

  // RNF05: el menú cambia según el rol del usuario que inició sesión.
  // computed() se recalcula solo cuando cambia usuarioActual.
  // El administrador NO ve las opciones de finanzas personales, porque ese actor
  // no interactúa con el dinero de los estudiantes (solo gestiona la plataforma).
  esAdmin = computed(() => this.sesion.usuarioActual()?.rol === 'administrador');

  cerrarMenu(): void {
    this.menuClosed.emit();
  }
}
