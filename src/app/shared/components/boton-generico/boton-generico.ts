import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-boton-generico',
  templateUrl: './boton-generico.html',
  styleUrls: ['./boton-generico.css']
})
export class BotonGenericoComponent {
  // @Input() permite que otro componente le pase información a este
  @Input() texto: string = 'Botón'; 
  @Input() tipo: string = 'principal'; // Opciones: 'principal', 'ingreso', 'gasto' o 'secundario'
}