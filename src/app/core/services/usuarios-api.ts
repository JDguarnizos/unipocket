import { inject, Service, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { Usuario } from '../models/usuario.model';
import { LocalApi } from './local-api';

/*
  UsuariosApi: USUARIOS EN MEMORIA (RF14 - gestión de usuarios).
  Movido desde LocalApi sin cambiar su funcionamiento.

  Igual que con los movimientos: usuarios.json es de solo lectura, así que
  lo leemos UNA vez, lo guardamos en un signal y los cambios del administrador
  (bloquear, desbloquear, eliminar) se hacen sobre ese signal.
  Como el servicio es único en toda la app, el panel de admin y el login ven la misma lista.

  Lo usan: PanelAdmin (tabla de usuarios) y SesionApi (login).
*/
@Service()
export class UsuariosApi {
  private localApi = inject(LocalApi);

  usuarios = signal<Usuario[]>([]);
  private usuariosCargados = false;

  // Devuelve la lista de usuarios. La primera vez lee el JSON; las siguientes
  // devuelve lo que ya está en memoria (con of(), que crea un Observable con ese valor),
  // para no borrar los cambios que haya hecho el administrador.
  cargarUsuarios(): Observable<Usuario[]> {
    if (this.usuariosCargados) return of(this.usuarios());

    return this.localApi.obtenerUsuarios().pipe(
      tap((lista) => {
        this.usuarios.set(lista);
        this.usuariosCargados = true;
      }),
    );
  }

  // Bloquea o desbloquea la cuenta: invierte el valor del campo "bloqueado".
  // map() recorre la lista y solo cambia al usuario con ese id; los demás quedan igual.
  alternarBloqueo(idUsuario: number): void {
    this.usuarios.update((lista) =>
      lista.map((u) => (u.id === idUsuario ? { ...u, bloqueado: !u.bloqueado } : u)),
    );
  }

  // Elimina la cuenta: filter() devuelve una lista nueva sin ese usuario.
  eliminarUsuario(idUsuario: number): void {
    this.usuarios.update((lista) => lista.filter((u) => u.id !== idUsuario));
  }
}
