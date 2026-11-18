import { Component, Output, EventEmitter, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LocalApi } from '../../../core/services/local-api'; 

@Component({
  selector: 'app-menu-lateral',
  imports: [CommonModule, RouterModule],
  templateUrl: './menu-lateral.html',
  styleUrl: './menu-lateral.css'
})
export class MenuLateral {
  // Inyectamos el servicio para leer el usuario actual y su rol
  private api = inject(LocalApi); 

  @Output() menuClosed = new EventEmitter<void>();

  // Computed que indica si el usuario actual es administrador
  esAdmin = computed(() => this.api.usuarioActual()?.rol === 'administrador');

  cerrarMenu(): void {
    this.menuClosed.emit();
  }
}