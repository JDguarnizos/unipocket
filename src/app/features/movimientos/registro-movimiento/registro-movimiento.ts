import { Component, EventEmitter, HostListener, Input, OnInit, Output, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Movimiento } from '../../../core/models/movimiento.model';

/*
  Modal "Registrar movimiento".
  - El padre (ej. el Dashboard) lo muestra con @if y le dice con qué tipo abrir.
  - Cuando el usuario guarda, el modal AVISA al padre con el evento (guardado).
  - Cuando cierra o cancela, avisa con el evento (cerrado).
*/
@Component({
  selector: 'app-registro-movimiento',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './registro-movimiento.html',
  styleUrls: ['./registro-movimiento.css']
})
export class RegistroMovimiento implements OnInit {
  private fb = inject(FormBuilder);

  // @Input: dato que recibe del padre. Con qué tipo se abre el modal.
  @Input() tipoInicial: 'gasto' | 'ingreso' = 'gasto';

  // @Output: eventos que el modal le envía al padre
  @Output() cerrado = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<Movimiento>();

  // Categorías de gasto (coinciden con los colores --cat-* de styles.css)
  categoriasGasto = ['Alimentación', 'Transporte', 'Materiales e impresiones', 'Entretenimiento', 'Suscripciones', 'Otros'];
  categoriasIngreso = ['Mesada', 'Trabajo', 'Beca', 'Monitoría', 'Otros ingresos'];

  // Fecha de hoy en formato AAAA-MM-DD (el formato que usa el input type="date")
  hoy = new Date().toLocaleDateString('en-CA');

  // Formulario reactivo. La descripción es OPCIONAL (solo tiene límite de caracteres).
  movimientoForm = this.fb.group({
    tipo: ['gasto' as 'gasto' | 'ingreso', Validators.required],
    monto: [null as number | null, [Validators.required, Validators.min(1)]],
    categoria: ['', Validators.required],
    fecha: [this.hoy, Validators.required],
    descripcion: ['', Validators.maxLength(60)]
  });

  ngOnInit(): void {
    // Al abrir, seleccionamos el tipo que nos mandó el padre
    this.movimientoForm.patchValue({ tipo: this.tipoInicial });
  }

  // Atajo para saber si el tipo seleccionado es gasto
  get esGasto(): boolean {
    return this.movimientoForm.value.tipo === 'gasto';
  }

  // Lista de categorías según el tipo
  get categorias(): string[] {
    return this.esGasto ? this.categoriasGasto : this.categoriasIngreso;
  }

  // Cambia el tipo con los botones Gasto / Ingreso y limpia la categoría (las listas son distintas)
  seleccionarTipo(tipo: 'gasto' | 'ingreso'): void {
    this.movimientoForm.patchValue({ tipo, categoria: '' });
  }

  campoInvalido(campo: string): boolean {
    const control = this.movimientoForm.get(campo);
    return !!control && control.invalid && control.touched;
  }

  guardar(): void {
    if (this.movimientoForm.invalid) {
      this.movimientoForm.markAllAsTouched();
      return;
    }

    // Armamos el objeto Movimiento con los valores del formulario
    const valores = this.movimientoForm.getRawValue();
    const movimiento: Movimiento = {
      tipo: valores.tipo!,
      monto: Number(valores.monto),
      categoria: valores.categoria!,
      fecha: valores.fecha!,
      descripcion: valores.descripcion ?? ''
    };

    // Le enviamos el movimiento al padre. Él decide qué hacer (sumar/restar saldo, guardarlo en la API, etc.)
    this.guardado.emit(movimiento);
  }

  cerrar(): void {
    this.cerrado.emit();
  }

  // Permite cerrar el modal con la tecla Escape
  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    this.cerrar();
  }
}