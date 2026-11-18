import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { LocalApi } from '../../core/services/local-api';
import { Notificacion } from '../../core/models/notificacion.model';

/*
  Panel de administrador.
  Tiene dos secciones:
  1. Gestión de usuarios: ver la lista y bloquear/desbloquear cuentas.
  2. Envío de notificaciones globales: formulario para mandar un mensaje a todos.
*/
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
})
export class Admin implements OnInit {
  private api = inject(LocalApi);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // ===== Datos =====

  // Lista de todos los usuarios en memoria (viene del signal del servicio)
  usuarios = this.api.usuarios;

  // Lista de notificaciones enviadas (viene del signal del servicio)
  notificaciones = this.api.notificacionesAdmin;

  // Administrador que inició sesión
  adminActual = this.api.usuarioActual;

  // ===== Estado local de la vista =====

  // Pestaña activa: 'usuarios' o 'notificaciones'
  pestanaActiva = signal<'usuarios' | 'notificaciones'>('usuarios');

  // Mensaje de confirmación que se muestra al enviar una notificación
  mensajeConfirmacion = signal<string>('');

  // ===== Formulario de nueva notificación =====
  notificacionForm = this.fb.group({
    mensaje: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(200)]],
    importancia: ['media' as Notificacion['importancia'], Validators.required],
  });

  // ===== Computed =====

  // Conteo rápido de usuarios bloqueados (para el resumen en la cabecera)
  usuariosBloqueados = computed(
    () => this.usuarios().filter((u) => u.bloqueado).length
  );

  ngOnInit(): void {
    // Verificación de acceso: si no hay sesión o no es admin, va al login
    const usuario = this.api.usuarioActual();
    if (!usuario) {
      this.router.navigate(['/login']);
      return;
    }
    // Si el usuario tiene sesión pero NO es admin, redirigir al dashboard
    // Esto evita que un estudiante llegue a /admin escribiendo la URL a mano
    if (usuario.rol !== 'administrador') {
      // Un usuario normal no puede entrar al panel de admin
      this.router.navigate(['/dashboard']);
      return;
    }

    // Cargamos los datos que necesita este panel
    this.api.cargarUsuarios();
    this.api.cargarNotificaciones();
  }

  // Cambia la pestaña activa y limpia el mensaje de confirmación
  cambiarPestana(pestana: 'usuarios' | 'notificaciones'): void {
    this.pestanaActiva.set(pestana);
    this.mensajeConfirmacion.set('');
  }

  // Llama al servicio para bloquear o desbloquear al usuario indicado
  toggleBloqueo(idUsuario: number): void {
    // El admin no puede bloquearse a sí mismo
    if (idUsuario === this.adminActual()?.id) return;
    this.api.toggleBloqueoUsuario(idUsuario);
  }

  // Verifica si el campo del formulario es inválido y el usuario ya lo tocó
  campoInvalido(campo: string): boolean {
    const control = this.notificacionForm.get(campo);
    return !!control && control.invalid && control.touched;
  }

  // Envía la notificación global usando los valores del formulario
  enviarNotificacion(): void {
    if (this.notificacionForm.invalid) {
      this.notificacionForm.markAllAsTouched();
      return;
    }

    const { mensaje, importancia } = this.notificacionForm.value;

    // Llamamos al servicio; él ya sabe a quiénes enviarla (todos los usuarios)
    this.api.enviarNotificacionGlobal(
      mensaje ?? '',
      (importancia as Notificacion['importancia']) ?? 'media'
    );

    // Mostramos confirmación y limpiamos el formulario
    this.mensajeConfirmacion.set(' Notificación enviada a todos los usuarios.');
    this.notificacionForm.reset({ mensaje: '', importancia: 'media' });
  }
}