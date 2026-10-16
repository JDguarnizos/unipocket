import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tarjeta-resumen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tarjeta-resumen.html',
  styleUrls: ['./tarjeta-resumen.css']
})
export class TarjetaResumenComponent {
  // Con esto, la tarjeta puede mostrar cualquier información que le pasemos
  @Input() titulo: string = 'Título por defecto';
  @Input() valorPrincipal: string = '$0';
  @Input() textoSecundario: string = 'Detalle extra';
}