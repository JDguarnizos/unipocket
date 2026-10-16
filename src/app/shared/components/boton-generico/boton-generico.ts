import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common'; // 1. Importamos las herramientas comunes de Angular

@Component({
  selector: 'app-boton-generico',
  standalone: true, // 2. Le decimos que es un componente independiente
  imports: [CommonModule], // 3. Le inyectamos el módulo para que entienda el [ngClass]
  templateUrl: './boton-generico.html',
  styleUrls: ['./boton-generico.css']
})
export class BotonGenericoComponent {
  @Input() texto: string = 'Botón'; 
  @Input() tipo: string = 'principal'; 
}