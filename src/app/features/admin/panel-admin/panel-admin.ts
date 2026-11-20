import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { LocalApi } from '../../../core/services/local-api';
import { SesionApi } from '../../../core/services/sesion-api';
import { UsuariosApi } from '../../../core/services/usuarios-api';
import { MetasApi } from '../../../core/services/metas-api';
import { MovimientosApi } from '../../../core/services/movimientos-api';
import { NotificacionesApi } from '../../../core/services/notificaciones-api';
import { Usuario } from '../../../core/models/usuario.model';
import { Notificacion } from '../../../core/models/notificacion.model';
import { formatearFecha } from '../../../core/utils/formato';
import { TarjetaResumenComponent } from '../../../shared/components/tarjeta-resumen/tarjeta-resumen';

/*
  Panel del administrador.
  - RF15: estadísticas generales y ANONIMIZADAS (solo totales, nunca datos financieros de una persona).
  - RF14: lista de usuarios con acciones de bloquear / desbloquear y eliminar.
  - RF16: formulario para redactar una notificación global.

  Los usuarios ahora viven en UsuariosApi (signal compartido): si el admin bloquea o elimina
  una cuenta, el cambio se mantiene al navegar y el login lo respeta.
*/
@Component({
  selector: 'app-panel-admin',
  standalone: true,
  imports: [ReactiveFormsModule, TarjetaResumenComponent],
  templateUrl: './panel-admin.html',
  styleUrls: ['./panel-admin.css']
})
export class PanelAdmin implements OnInit {
  // Cambiado: antes todo venía de LocalApi; ahora cada tema tiene su propio servicio
  private localApi = inject(LocalApi);              // solo para leer estadisticas.json
  private sesion = inject(SesionApi);
  private usuariosApi = inject(UsuariosApi);
  private metasApi = inject(MetasApi);
  private movimientosApi = inject(MovimientosApi);
  private notificacionesApi = inject(NotificacionesApi);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // Administrador que inició sesión (para el saludo)
  admin = this.sesion.usuarioActual;

  // ===================================================================
  // 1. DATOS
  // ===================================================================

  // Lista de usuarios que se muestra en la tabla.
  // Cambiado: ya no es una copia local; apunta al signal de UsuariosApi,
  // que es el mismo que revisa el login.
  usuarios = this.usuariosApi.usuarios;

  // Historial de estadísticas (estadisticas.json). toSignal convierte el Observable en signal.
  historialEstadisticas = toSignal(this.localApi.obtenerEstadisticas(), { initialValue: [] });

  // ===================================================================
  // 2. ESTADÍSTICAS (RF15) - todas son computed: se recalculan solas
  // ===================================================================

  totalUsuarios = computed(() => this.usuarios().length);
  usuariosBloqueados = computed(() => this.usuarios().filter(u => u.bloqueado).length);

  // Una meta está ACTIVA si no se ha completado y su fecha límite no ha pasado
  metasActivas = computed(() => {
    const hoy = new Date();
    return this.metasApi.metasAhorro().filter(m => !m.completado && new Date(m.fechaLimite) >= hoy).length;
  });
  metasCompletadas = computed(() => this.metasApi.metasAhorro().filter(m => m.completado).length);
  totalMetas = computed(() => this.metasApi.metasAhorro().length);

  totalMovimientos = computed(() => this.movimientosApi.movimientos().length);

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
    // Respaldo de los Guards: solo el administrador puede ver esta vista
    const actual = this.sesion.usuarioActual();
    if (!actual) {
      this.router.navigate(['/login']);
      return;
    }
    if (actual.rol !== 'administrador') {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Cargamos los datos que necesitan las estadísticas.
    // cargarUsuarios() solo lee el JSON la primera vez; después devuelve la lista en memoria,
    // así no se pierden los bloqueos o eliminaciones al salir y volver al panel.
    this.usuariosApi.cargarUsuarios().subscribe();
    this.metasApi.cargarMetasAhorro().subscribe();
    this.movimientosApi.cargarDatosFinancieros();
  }

  // ----- Acciones de usuarios -----

  // Bloquea o desbloquea la cuenta. El cambio se guarda en UsuariosApi.
  alternarBloqueo(usuario: Usuario): void {
    this.usuariosApi.alternarBloqueo(usuario.id);
    // "usuario" todavía tiene el valor ANTERIOR al cambio, por eso la condición va al revés
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

  // Segundo clic ("Sí, eliminar"): quitamos al usuario. El cambio se guarda en UsuariosApi.
  eliminarUsuario(usuario: Usuario): void {
    this.usuariosApi.eliminarUsuario(usuario.id);
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

    // Cambiado (RF16): antes solo hacía console.log. Ahora la guardamos en NotificacionesApi
    // (signal compartido), así llega a la campana del header de cada destinatario.
    this.notificacionesApi.enviarNotificacionGlobal(notificacion);

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