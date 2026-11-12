import { Component, signal, HostListener, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// Interfaz que define cómo se ve cada notificación
interface Notificacion {
  id: number;
  mensaje: string;    // Texto principal de la notificación
  tiempo: string;     // Cuándo ocurrió (ej: "Hace 5 min")
  leida: boolean;     // Si el usuario ya la vio o no
}

@Component({
  imports: [CommonModule],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {

  //Abrir y cerrar el menu lateral en los dispositivos moviles
  @Output() toggleMenu = new EventEmitter<void>();

  onToggleMenu(): void {
    this.toggleMenu.emit();
  }

  // ── Datos del usuario ──────────────────────────────────────────────────────
  nombreUsuario: string = 'Estudiante';
  rolUsuario: string = 'Ucompensar';

  // ── Estado del menú de notificaciones ─────────────────────────────────────
  // signal() es la forma moderna de Angular para variables reactivas.
  // Cuando cambia, el HTML se actualiza automáticamente.
  mostrarNotificaciones = signal(false);

  // ── Lista de notificaciones de ejemplo ────────────────────────────────────
  notificaciones: Notificacion[] = [
    {
      id: 1,
      mensaje: 'Llevas el 68% de tu presupuesto mensual.',
      tiempo: 'Hace 5 min',
      leida: false,
    },
    {
      id: 2,
      mensaje: 'Meta "Viaje de semestre" al 45% 🎯',
      tiempo: 'Hace 1 hora',
      leida: false,
    },
    {
      id: 3,
      mensaje: 'Se registró un ingreso de $150.000.',
      tiempo: 'Ayer, 16:00',
      leida: true,
    },
  ];

  // Calculamos cuántas notificaciones NO han sido leídas
  get cantidadSinLeer(): number {
    return this.notificaciones.filter(n => !n.leida).length;
  }

  // ── Constructor con inyección del elemento raíz ───────────────────────────
  // Necesitamos la referencia al elemento para detectar clics fuera del menú
  constructor(private elementRef: ElementRef) {}

  // ── Abrir / cerrar el panel de notificaciones ─────────────────────────────
  toggleNotificaciones(): void {
    this.mostrarNotificaciones.update(valor => !valor);
  }

  // ── Marcar una notificación como leída ────────────────────────────────────
  marcarComoLeida(id: number): void {
    const notif = this.notificaciones.find(n => n.id === id);
    if (notif) {
      notif.leida = true;
    }
  }

  // ── Marcar todas como leídas ──────────────────────────────────────────────
  marcarTodasComoLeidas(): void {
    this.notificaciones.forEach(n => (n.leida = true));
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