import { inject, Service, signal } from '@angular/core';
import { Notificacion } from '../models/notificacion.model';
import { LocalApi } from './local-api';

/*
  NotificacionesApi: NOTIFICACIONES EN MEMORIA (RF01 notificaciones, RF16 notificaciones globales).

  Mismo patrón que los movimientos: notificaciones.json es de solo lectura, así que
  lo leemos UNA vez, lo guardamos en un signal y las notificaciones nuevas que envía
  el administrador se agregan a ese signal.
  Como el servicio es único en toda la app, lo que envía el admin desde su panel
  aparece en la campana del header de los usuarios a los que va dirigida.

  Lo usan: Header (campana) y PanelAdmin (formulario "Enviar notificación").
*/
@Service()
export class NotificacionesApi {
  private localApi = inject(LocalApi);

  notificaciones = signal<Notificacion[]>([]);
  private notificacionesCargadas = false;

  // Lee notificaciones.json y llena el signal.
  // Si ya se cargaron antes, no hace nada (así no se borran las que envió el admin).
  cargarNotificaciones(): void {
    if (this.notificacionesCargadas) return;
    this.notificacionesCargadas = true;

    this.localApi.obtenerNotificaciones().subscribe({
      next: (lista) => {
        // Usamos update y NO set: si el admin envió una notificación mientras
        // el JSON todavía se estaba leyendo, set() la borraría. Con update()
        // dejamos las que ya estaban de primeras y agregamos las del JSON al final.
        this.notificaciones.update((actuales) => [...actuales, ...lista]);
      },
      error: () => {
        // Si falla la lectura, permitimos intentarlo de nuevo la próxima vez
        this.notificacionesCargadas = false;
        console.error('No se pudieron cargar las notificaciones');
      },
    });
  }

  // RF16: el administrador envía una notificación.
  // La agregamos de PRIMERA en la lista para que se vea como la más reciente.
  enviarNotificacionGlobal(notificacion: Notificacion): void {
    this.notificaciones.update((lista) => [notificacion, ...lista]);
  }
}
