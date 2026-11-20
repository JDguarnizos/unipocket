import { Component, EventEmitter, HostListener, Input, Output, inject, signal } from '@angular/core';
import { AbstractControl, ReactiveFormsModule, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { MetaAhorro } from '../../../core/models/meta_ahorro.model';
import { SesionApi } from '../../../core/services/sesion-api';
import { MetasApi } from '../../../core/services/metas-api';
import { MovimientosApi } from '../../../core/services/movimientos-api';
import { aFechaLocal, formatearPesos, hoyTexto } from '../../../core/utils/formato';

// Validador personalizado (CU-15): la fecha del aporte NO puede ser futura.
function fechaNoFutura(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null; // si está vacío, de eso se encarga Validators.required
  return aFechaLocal(control.value) <= aFechaLocal(hoyTexto()) ? null : { fechaFutura: true };
}

/*
  Modal "Abonar a una meta" (RF09, CU-15).
  - Pide el monto y la fecha del aporte.
  - CU-17: antes de abonar verifica que la meta todavía exista.
  - CU-15 paso 6: el aporte también se registra como un GASTO de categoría "Ahorro",
    así el dinero disponible baja (sale de la billetera y entra a la meta).
  Mismo patrón que el modal "Registrar movimiento" (X, Cancelar, Escape y clic afuera).
*/
@Component({
  selector: 'app-abonar-meta',
  imports: [ReactiveFormsModule],
  templateUrl: './abonar-meta.html',
  // Reutilizamos los estilos del modal "Registrar movimiento"
  styleUrls: ['../../movimientos/registro-movimiento/registro-movimiento.css']
})
export class AbonarMeta {
  private fb = inject(FormBuilder);
  private sesion = inject(SesionApi);
  private metasApi = inject(MetasApi);
  private movimientosApi = inject(MovimientosApi);

  // Meta a la que se le va a abonar (la manda el padre)
  @Input({ required: true }) meta!: MetaAhorro;

  @Output() cerrado = new EventEmitter<void>();
  @Output() guardado = new EventEmitter<string>();

  hoy = hoyTexto();
  mensajeError = signal('');

  abonoForm = this.fb.group({
    monto: [null as number | null, [Validators.required, Validators.min(1)]],
    fecha: [this.hoy, [Validators.required, fechaNoFutura]] // por defecto, hoy
  });

  // Datos para el resumen de arriba: cuánto lleva y cuánto le falta
  get aportado(): number {
    return this.meta.listaAportes.reduce((suma, a) => suma + a.monto, 0);
  }

  get falta(): number {
    return Math.max(0, this.meta.valorObjetivo - this.aportado);
  }

  campoInvalido(campo: string): boolean {
    const control = this.abonoForm.get(campo);
    return !!control && control.invalid && control.touched;
  }

  guardar(): void {
    this.mensajeError.set('');
    if (this.abonoForm.invalid) {
      this.abonoForm.markAllAsTouched();
      return;
    }

    const usuario = this.sesion.usuarioActual();
    if (!usuario) return;

    // CU-17: verificamos que la meta exista ANTES de abonar (pudo ser eliminada o renombrada)
    const metaActual = this.metasApi.buscarMeta(usuario.id, this.meta.nombre);
    if (!metaActual) {
      this.mensajeError.set('La meta ya no está disponible.');
      return;
    }

    // Una meta cumplida ya no recibe abonos
    if (metaActual.completado) {
      this.mensajeError.set('Esta meta ya está cumplida.');
      return;
    }

    const valores = this.abonoForm.getRawValue();
    const monto = Number(valores.monto);

    // RF09: registramos el aporte con la función de Juan.
    // La fecha del input se convierte con 'T00:00:00' para que no se corra un día.
    this.metasApi.registrarAporteMetaAhorro(usuario.id, metaActual.nombre, monto, aFechaLocal(valores.fecha!));

    // CU-15 paso 6: el aporte descuenta del dinero disponible (se guarda como gasto "Ahorro")
    this.movimientosApi.registrarMovimiento(usuario.id, {
      tipo: 'gasto',
      monto,
      categoria: 'Ahorro',
      fecha: valores.fecha!,
      descripcion: `Aporte a meta: ${metaActual.nombre}`
    });

    this.guardado.emit(`Abonaste ${formatearPesos(monto)} a "${metaActual.nombre}".`);
  }

  cerrar(): void {
    this.cerrado.emit();
  }

  // Permite cerrar el modal con la tecla Escape
  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    this.cerrar();
  }

  formatearPesos = formatearPesos;
}
