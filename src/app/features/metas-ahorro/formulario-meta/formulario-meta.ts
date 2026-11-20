import { Component, EventEmitter, HostListener, Input, OnInit, Output, inject, signal } from '@angular/core';
import { AbstractControl, ReactiveFormsModule, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { MetaAhorro } from '../../../core/models/meta_ahorro.model';
import { SesionApi } from '../../../core/services/sesion-api';
import { MetasApi } from '../../../core/services/metas-api';
import { MovimientosApi } from '../../../core/services/movimientos-api';
import { aFechaLocal, formatearPesos, hoyTexto, mesesHasta } from '../../../core/utils/formato';

// Validador personalizado (CU-12, curso alterno 3.1): la fecha límite debe ser POSTERIOR a hoy.
// Un validador recibe el control y devuelve null si está bien, o un objeto con el error.
function fechaPosteriorAHoy(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null; // si está vacío, de eso se encarga Validators.required
  const fecha = aFechaLocal(control.value);
  const hoy = aFechaLocal(hoyTexto());
  return fecha > hoy ? null : { fechaNoFutura: true };
}

/*
  Modal "Nueva meta" / "Editar meta" (un solo componente para los dos casos).
  - CU-10: crear una meta de ahorro.
  - CU-11: verificar que la meta sea viable con los ingresos del usuario.
  - CU-12 / CU-13: editar una meta existente, con las mismas validaciones.
  Mismo patrón que el modal "Registrar movimiento": se cierra con la X, Cancelar,
  la tecla Escape o un clic afuera.
*/
@Component({
  selector: 'app-formulario-meta',
  imports: [ReactiveFormsModule],
  templateUrl: './formulario-meta.html',
  // Reutilizamos los estilos del modal "Registrar movimiento" para que todos los modales se vean igual
  styleUrls: ['../../movimientos/registro-movimiento/registro-movimiento.css']
})
export class FormularioMeta implements OnInit {
  private fb = inject(FormBuilder);
  private sesion = inject(SesionApi);
  private metasApi = inject(MetasApi);
  private movimientosApi = inject(MovimientosApi);

  // Meta a editar. Si llega null, el modal sirve para crear una meta nueva.
  @Input() meta: MetaAhorro | null = null;

  @Output() cerrado = new EventEmitter<void>();
  // Al guardar, le enviamos al padre un mensaje corto para mostrarlo en pantalla
  @Output() guardado = new EventEmitter<string>();

  // Fecha mínima del calendario (el validador hace la revisión real)
  hoy = hoyTexto();

  // Mensaje general cuando no se puede guardar (nombre repetido o meta no viable)
  mensajeError = signal('');

  metaForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(40)]],
    valorObjetivo: [null as number | null, [Validators.required, Validators.min(1)]],
    fechaLimite: ['', [Validators.required, fechaPosteriorAHoy]]
  });

  get esEdicion(): boolean {
    return this.meta !== null;
  }

  ngOnInit(): void {
    // Si es edición, llenamos el formulario con los datos actuales de la meta.
    // La fecha del JSON viene como "2027-06-15T00:00:00.000Z"; el input necesita "2027-06-15".
    if (this.meta) {
      this.metaForm.patchValue({
        nombre: this.meta.nombre,
        valorObjetivo: this.meta.valorObjetivo,
        fechaLimite: this.meta.fechaLimite.substring(0, 10)
      });
    }
  }

  campoInvalido(campo: string): boolean {
    const control = this.metaForm.get(campo);
    return !!control && control.invalid && control.touched;
  }

  guardar(): void {
    this.mensajeError.set('');
    if (this.metaForm.invalid) {
      this.metaForm.markAllAsTouched();
      return;
    }

    const usuario = this.sesion.usuarioActual();
    if (!usuario) return;

    const valores = this.metaForm.getRawValue();
    const nombre = valores.nombre!.trim();
    const valorObjetivo = Number(valores.valorObjetivo);
    const fechaLimite = valores.fechaLimite!;

    // Nombre con solo espacios: lo tratamos como vacío
    if (!nombre) {
      this.metaForm.get('nombre')!.setErrors({ required: true });
      return;
    }

    // CU-12 curso alterno 3.1: no puede haber otra meta del mismo usuario con el mismo nombre.
    // Si estamos editando, la meta actual no cuenta como "repetida".
    const repetida = this.metasApi.buscarMeta(usuario.id, nombre);
    const esLaMisma = this.meta !== null && repetida?.nombre.toLowerCase() === this.meta.nombre.toLowerCase();
    if (repetida && !esLaMisma) {
      this.mensajeError.set(`Ya tienes una meta llamada "${nombre}". Usa otro nombre.`);
      return;
    }

    // CU-11 (viabilidad): ahorro mensual necesario = lo que falta / meses que quedan.
    // En una meta nueva lo que falta es todo el valor objetivo; al editar, se descuenta lo ya aportado.
    const aportado = this.meta ? this.meta.listaAportes.reduce((suma, a) => suma + a.monto, 0) : 0;
    const falta = Math.max(0, valorObjetivo - aportado);
    const ahorroMensual = Math.ceil(falta / mesesHasta(fechaLimite));
    const ingresos = this.movimientosApi.registroActual()?.totalIngresos ?? 0;

    if (ahorroMensual > ingresos) {
      this.mensajeError.set(
        `Esta meta no es viable: tendrías que ahorrar ${formatearPesos(ahorroMensual)} al mes ` +
        `y tus ingresos registrados son ${formatearPesos(ingresos)}. ` +
        `Amplía la fecha límite o reduce el valor objetivo.`
      );
      return;
    }

    // Guardamos la fecha con el mismo formato que usa metas.json
    const fechaGuardada = fechaLimite + 'T00:00:00.000Z';

    if (this.meta) {
      // CU-12 / CU-13: editar (se busca por el nombre ORIGINAL)
      this.metasApi.editarMetaAhorro(usuario.id, this.meta.nombre, {
        nombre,
        valorObjetivo,
        fechaLimite: fechaGuardada
      });
      this.guardado.emit(`Se actualizó la meta "${nombre}".`);
    } else {
      // CU-10: crear con la función de Juan (verifica que el usuario exista)
      this.metasApi.registrarMetaAhorro({
        idUsuario: usuario.id,
        nombre,
        listaAportes: [],
        valorObjetivo,
        fechaLimite: fechaGuardada,
        completado: false
      });
      this.guardado.emit(`Se creó la meta "${nombre}".`);
    }
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
