import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
}
