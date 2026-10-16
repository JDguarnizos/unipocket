import { Component } from '@angular/core';

@Component({
  imports: [],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {
  
  nombreUsuario: string = 'Laura Gómez'; 
  rolUsuario: string = 'Estudiante - UNAL';
}