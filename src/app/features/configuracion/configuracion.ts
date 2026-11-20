import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SesionApi } from '../../core/services/sesion-api';

/*
  Vista "Configuración" (RNF05: opción del menú lateral).
  - Muestra los datos de la cuenta del usuario que inició sesión, en SOLO LECTURA
    (no hay backend para guardar cambios).
  - Tiene un botón para cerrar sesión.
  La usan los dos roles: estudiante y administrador.
*/
@Component({
  selector: 'app-configuracion',
  imports: [],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css'
})
export class Configuracion {
  private sesion = inject(SesionApi);
  private router = inject(Router);

  // Usuario que inició sesión (signal de SesionApi)
  usuario = this.sesion.usuarioActual;

  // En los JSON el rol es "usuario" o "administrador"; en pantalla mostramos un texto más claro
  tipoCuenta = computed(() =>
    this.usuario()?.rol === 'administrador' ? 'Administrador' : 'Estudiante'
  );

  // Borra el usuario actual y vuelve al login sin recargar la página
  cerrarSesion(): void {
    this.sesion.cerrarSesion();
    this.router.navigate(['/login']);
  }
}
