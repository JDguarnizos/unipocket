import { inject, Service, signal } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';
import { Usuario } from '../models/usuario.model';
import { LocalApi } from './local-api';
import { UsuariosApi } from './usuarios-api';

/*
  SesionApi: LOGIN Y USUARIO ACTUAL.
  Movido desde LocalApi sin cambiar su funcionamiento.

  Lo usan: Login, los guards (authGuard y roleGuard), el Header, el Menú lateral,
  Configuración y todas las vistas que necesitan saber quién inició sesión.
*/
@Service()
export class SesionApi {
  private localApi = inject(LocalApi);
  private usuariosApi = inject(UsuariosApi);

  // Usuario que inició sesión. null = nadie ha iniciado sesión.
  // Es un signal: cualquier componente que lo lea se actualiza solo cuando cambia.
  usuarioActual = signal<Usuario | null>(null);

  // Busca un usuario o admin con ese correo y contraseña.
  // Cambiado (Nicolás): los usuarios ya no se leen directo del JSON, sino de la lista
  // EN MEMORIA (signal usuarios de UsuariosApi). Así, si el admin elimina a alguien, ese usuario
  // ya no puede iniciar sesión; y si lo bloquea, el login puede revisar el campo "bloqueado".
  // forkJoin espera a que terminen las dos cargas y luego map une las listas y busca la coincidencia.
  validarCredenciales(correo: string, contrasena: string): Observable<Usuario | undefined> {
    return forkJoin([this.usuariosApi.cargarUsuarios(), this.localApi.obtenerAdmins()]).pipe(
      map(([, admins]) =>
        // Usamos usuarios() (la lista actualizada) y no la que llegó del JSON
        [...this.usuariosApi.usuarios(), ...admins].find(
          (u) => u.correo === correo && u.contrasena === contrasena,
        ),
      ),
    );
  }

  // Guarda en memoria quién inició sesión (incluye su rol: "usuario" o "administrador")
  iniciarSesion(usuario: Usuario): void {
    this.usuarioActual.set(usuario);
  }

  // Cierra la sesión: borra el usuario actual de memoria.
  // Lo usan el botón del Header y la vista de Configuración.
  cerrarSesion(): void {
    this.usuarioActual.set(null);
  }
}
