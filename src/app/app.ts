import { Component, signal, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Header } from './shared/components/header/header';
import { MenuLateral } from './shared/components/menu-lateral/menu-lateral';

@Component({
  imports: [Header, MenuLateral, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('unipocket');
  private router = inject(Router);

  // ── Menú lateral en móvil (Santiago) ──
  isMenuOpen = false;

  toggleMenuLateral(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  // ── Login sin layout (Nicolás) ──
  // El layout (header + menú lateral) solo se muestra cuando NO estamos en el login
  mostrarLayout(): boolean {
    return !this.router.url.startsWith('/login');
  }
}