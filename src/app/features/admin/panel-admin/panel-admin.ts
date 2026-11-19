import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { LocalApi } from '../../../core/services/local-api';
import { Usuario } from '../../../core/models/usuario.model';
import { Notificacion } from '../../../core/models/notificacion.model';
import { formatearFecha } from '../../../core/utils/formato';
import { TarjetaResumenComponent } from '../../../shared/components/tarjeta-resumen/tarjeta-resumen';

/*
  Panel del administrador.
  - RF15: estadísticas generales y ANONIMIZADAS (solo totales, nunca datos financieros de una persona).
  - RF14: lista de usuarios con acciones de bloquear / desbloquear y eliminar.
  - RF16: formulario para redactar una notificación global.

  Diseño (Nicolás): esta vista ya funciona en memoria para la demo.
  Conexión (Santiago): pasar los métodos marcados con "PENDIENTE (Santiago)" a LocalApi,
  para que los cambios se compartan con el resto de vistas.
*/
@Component({
  selector: 'app-panel-admin',
  standalone: true,
  imports: [ReactiveFormsModule, TarjetaResumenComponent],
  templateUrl: './panel-admin.html',
  styleUrls: ['./panel-admin.css']
})
export class PanelAdmin implements OnInit {
  private api = inject(LocalApi);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Administrador que inició sesión (para el saludo)
  admin = this.api.usuarioActual;

  // ===================================================================
  // 1. DATOS
  // ===================================================================

  // Lista de usuarios que se muestra en la tabla.
  // TEMPORAL: es una copia local para que la demo funcione; Santiago la mueve a LocalApi.
  usuarios = signal<Usuario[]>([]);

  // Historial de estadísticas (estadisticas.json). toSignal convierte el Observable en signal.
  historialEstadisticas = toSignal(this.api.obtenerEstadisticas(), { initialValue: [] });

  // ===================================================================
  // 2. ESTADÍSTICAS (RF15) - todas son computed: se recalculan solas
  // ===================================================================

  totalUsuarios = computed(() => this.usuarios().length);
  usuariosBloqueados = computed(() => this.usuarios().filter(u => u.bloqueado).length);

  // Una meta está ACTIVA si no se ha completado y su fecha límite no ha pasado
  metasActivas = computed(() => {
    const hoy = new Date();
    return this.api.metasAhorro().filter(m => !m.completado && new Date(m.fechaLimite) >= hoy).length;
  });
  metasCompletadas = computed(() => this.api.metasAhorro().filter(m => m.completado).length);
  totalMetas = computed(() => this.api.metasAhorro().length);

  totalMovimientos = computed(() => this.api.movimientos().length);

  // ===================================================================
  // 3. GESTIÓN DE USUARIOS (RF14)
  // ===================================================================

  // Búsqueda por nombre o correo (formulario reactivo de un solo campo)
  busquedaForm = this.fb.group({ texto: [''] });
  busqueda = toSignal(this.busquedaForm.valueChanges, { initialValue: this.busquedaForm.value });

  usuariosFiltrados = computed(() => {
    const texto = (this.busqueda().texto ?? '').trim().toLowerCase();
    return this.usuarios().filter(u =>
      !texto || u.nombre.toLowerCase().includes(texto) || u.correo.toLowerCase().includes(texto)
    );
  });

  // id del usuario al que se le está pidiendo confirmación para eliminar (null = ninguno)
  idPorEliminar = signal<number | null>(null);

  // Mensaje corto que confirma la última acción (ej. "Cuenta bloqueada")
  mensajeAccion = signal('');

  // ===================================================================
  // 4. NOTIFICACIÓN GLOBAL (RF16) - formulario reactivo
  // ===================================================================

  importancias: Notificacion['importancia'][] = ['baja', 'media', 'alta', 'urgente'];

  notificacionForm = this.fb.group({
    destinatario: ['todos'],                     // 'todos' o el id de un usuario
    importancia: ['media' as Notificacion['importancia'], Validators.required],
    mensaje: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(200)]]
  });

  // Para el contador de caracteres del mensaje
  valoresNotificacion = toSignal(this.notificacionForm.valueChanges, { initialValue: this.notificacionForm.value });
  caracteresMensaje = computed(() => (this.valoresNotificacion().mensaje ?? '').length);

  mensajeNotificacion = signal('');

  ngOnInit(): void {
    // TEMPORAL (hasta los Guards de Juan): solo el administrador puede ver esta vista
    const actual = this.api.usuarioActual();
    if (!actual) {
      this.router.navigate(['/login']);
      return;
    }
    if (actual.rol !== 'administrador') {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Cargamos los datos que necesitan las estadísticas
    this.api.obtenerUsuarios().subscribe(usuarios => this.usuarios.set(usuarios));
    this.api.cargarMetasAhorro().subscribe();
    this.api.cargarDatosFinancieros();
  }

  // ----- Acciones de usuarios -----

  // Bloquea o desbloquea la cuenta (cambia el campo "bloqueado")
  // PENDIENTE (Santiago): mover a LocalApi (ej. api.cambiarBloqueoUsuario(id)).
  alternarBloqueo(usuario: Usuario): void {
    this.usuarios.update(lista =>
      lista.map(u => u.id === usuario.id ? { ...u, bloqueado: !u.bloqueado } : u)
    );
    this.mensajeAccion.set(usuario.bloqueado
      ? `Se desbloqueó la cuenta de ${usuario.nombre}.`
      : `Se bloqueó la cuenta de ${usuario.nombre}.`);
  }

  // Primer clic en "Eliminar": pedimos confirmación en la misma fila
  pedirConfirmacion(usuario: Usuario): void {
    this.idPorEliminar.set(usuario.id);
  }

  cancelarEliminacion(): void {
    this.idPorEliminar.set(null);
  }

  // Segundo clic ("Sí, eliminar"): quitamos al usuario de la lista
  // PENDIENTE (Santiago): mover a LocalApi (ej. api.eliminarUsuario(id)).
  eliminarUsuario(usuario: Usuario): void {
    this.usuarios.update(lista => lista.filter(u => u.id !== usuario.id));
    this.idPorEliminar.set(null);
    this.mensajeAccion.set(`Se eliminó la cuenta de ${usuario.nombre}.`);
  }

  // ----- Notificación global -----

  campoInvalido(campo: string): boolean {
    const control = this.notificacionForm.get(campo);
    return !!control && control.invalid && control.touched;
  }

  enviarNotificacion(): void {
    if (this.notificacionForm.invalid) {
      this.notificacionForm.markAllAsTouched();
      return;
    }

    const valores = this.notificacionForm.getRawValue();

    // "todos" = todos los usuarios de la lista; si no, solo el id elegido
    const ids = valores.destinatario === 'todos'
      ? this.usuarios().map(u => u.id)
      : [Number(valores.destinatario)];

    // Objeto con la misma forma que notificaciones.json (modelo Notificacion)
    const notificacion: Notificacion = {
      idsNotificar: ids,
      mensaje: valores.mensaje!,
      importancia: valores.importancia!
    };

    // PENDIENTE (Santiago): guardar con LocalApi para que aparezca en la campana del header.
    console.log('Notificación a enviar:', notificacion);

    this.mensajeNotificacion.set(`Notificación enviada a ${ids.length} usuario(s).`);
    this.notificacionForm.reset({ destinatario: 'todos', importancia: 'media', mensaje: '' });
  }

  // ----- Formato para el HTML -----

  // estadisticas.json trae fechas como "2026-11-01T00:00:00.000Z": tomamos solo "2026-11-01"
  formatearFechaEstadistica(fecha: Date | string): string {
    return formatearFecha(String(fecha).substring(0, 10));
  }

  // Iniciales para el avatar: "Laura Gómez" -> "LG"
  iniciales(nombre: string): string {
    return nombre.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }
}