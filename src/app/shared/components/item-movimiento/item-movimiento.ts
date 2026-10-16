import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-item-movimiento',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './item-movimiento.html',
  styleUrls: ['./item-movimiento.css']
})
export class ItemMovimientoComponent {
  @Input() titulo: string = 'Movimiento';
  @Input() subtitulo: string = 'Categoría - Fecha';
  @Input() monto: string = '$0';
  @Input() tipo: string = 'gasto'; // Puede ser 'ingreso' o 'gasto'
}