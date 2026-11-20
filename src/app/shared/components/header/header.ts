import { Component, signal, computed, inject, HostListener, ElementRef, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { Notificacion } from '../../../core/models/notificacion.model';
import { SesionApi } from '../../../core/services/sesion-api';
import { NotificacionesApi } from '../../../core/services/notificaciones-api';

@Component({
  imports: [],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  // inject() trae los servicios (reemplaza al constructor con parámetros)
  private sesion = inject(SesionApi);
  private notificacionesApi = inject(NotificacionesApi);
  private router = inject(Router);
  // Referencia al elemento del header, para detectar clics fuera del panel
  private elementRef = inject(ElementRef);

  //Abrir y cerrar el menu lateral en los dispositivos moviles
  @Output() toggleMenu = new EventEmitter<void>();

  onToggleMenu(): void {
    this.toggleMenu.emit();
  }

  // Al crear el header pedimos las notificaciones.
  // El servicio solo lee el JSON la primera vez, así que no se duplican.
  constructor() {
    this.notificacionesApi.cargarNotificaciones();
  }

  // ── Datos del usuario (antes estaban fijos: "Estudiante" / "Ucompensar") ──
  // computed() se recalcula solo cuando cambia usuarioActual (al iniciar o cerrar sesión).
  nombreUsuario = computed(() => this.sesion.usuarioActual()?.nombre ?? '');

  // En los JSON el rol es "usuario" o "administrador"; en pantalla mostramos un texto más claro
  rolUsuario = computed(() =>
    this.sesion.usuarioActual()?.rol === 'administrador' ? 'Administrador' : 'Estudiante'
  );

  // Iniciales para el avatar: "Sofía Ramírez" -> "SR"
  iniciales = computed(() =>
    this.nombreUsuario().split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  );

  // ── Estado del menú de notificaciones ─────────────────────────────────────
  // signal() es la forma moderna de Angular para variables reactivas.
  // Cuando cambia, el HTML se actualiza automáticamente.
  mostrarNotificaciones = signal(false);

  // ── Notificaciones del usuario actual (RF01, RF16) ────────────────────────
  // Antes era un array de ejemplo. Ahora sale de NotificacionesApi y solo dejamos
  // las que incluyen el id del usuario en "idsNotificar".
  notificaciones = computed(() => {
    const usuario = this.sesion.usuarioActual();
    if (!usuario) return [];
    return this.notificacionesApi.notificaciones().filter(n => n.idsNotificar.includes(usuario.id));
  });

  // El globo de la campana muestra el total de notificaciones del usuario
  cantidadNotificaciones = computed(() => this.notificaciones().length);

  // RNF07: título que se muestra según la importancia de la notificación.
  // Record<A, B> es un objeto que tiene una propiedad de tipo B por cada valor de A.
  titulos: Record<Notificacion['importancia'], string> = {
    urgente: 'Aviso urgente',
    alta: 'Atención',
    media: 'Aviso',
    baja: 'Información',
  };

  // ── Abrir / cerrar el panel de notificaciones ─────────────────────────────
  toggleNotificaciones(): void {
    this.mostrarNotificaciones.update(valor => !valor);
  }

  // ── Cerrar sesión ─────────────────────────────────────────────────────────
  // Borra el usuario actual, cierra el panel y vuelve al login sin recargar la página.
  cerrarSesion(): void {
    this.sesion.cerrarSesion();
    this.mostrarNotificaciones.set(false);
    this.router.navigate(['/login']);
  }

  // ── Cerrar el panel si el usuario hace clic fuera del header ─────────────
  // @HostListener escucha eventos en toda la página (document)
  @HostListener('document:click', ['$event'])
  cerrarAlClickearAfuera(evento: MouseEvent): void {
    // Si el clic ocurrió FUERA de este componente, cerramos el panel
    const dentroDelComponente = this.elementRef.nativeElement.contains(evento.target);
    if (!dentroDelComponente) {
      this.mostrarNotificaciones.set(false);
    }
  }
}
