import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Admin } from '../models/admin.model';
import { Estadisticas } from '../models/estadisticas.model';
import { MetaAhorro } from '../models/meta_ahorro.model';
import { Notificacion } from '../models/notificacion.model';
import { RegistroFinanciero } from '../models/reg_financiero.model';
import { Usuario } from '../models/usuario.model';
import { MovimientoUsuario } from '../models/movimiento.model';

/*
  LocalApi: CAPA DE DATOS.
  Su único trabajo es leer los archivos de public/local-auth-api/ con HttpClient.
  No guarda nada en memoria ni tiene lógica de negocio.

  Cambiado: antes este servicio hacía todo (login, movimientos, metas, usuarios...).
  Ahora cada tema tiene su propio servicio y todos usan LocalApi para leer los JSON:
  - SesionApi          -> login y usuario actual
  - UsuariosApi        -> lista de usuarios, bloquear y eliminar (RF14)
  - MovimientosApi     -> movimientos y registros financieros
  - MetasApi           -> metas de ahorro
  - NotificacionesApi  -> notificaciones (RF01, RF16)
*/
@Service()
export class LocalApi {
  private http = inject(HttpClient);

  // =====================================================================
  // LECTURA DE LOS JSON
  // Cada método lee un archivo de public/local-auth-api/ con HttpClient
  // y devuelve un Observable (los datos llegan cuando alguien hace .subscribe()).
  // =====================================================================

  obtenerAdmins(): Observable<Admin[]> {
    return this.http.get<Admin[]>('local-auth-api/admins.json');
  }
  obtenerEstadisticas(): Observable<Estadisticas[]> {
    return this.http.get<Estadisticas[]>('local-auth-api/estadisticas.json');
  }
  // Corregido (Nicolás): antes usaba como tipo el componente MetasAhorro; el tipo correcto es el modelo Meta
  // Cambiado (Guarniz): Reflejado el cambio de nombre a MetaAhorro.
  obtenerMetasAhorro(): Observable<MetaAhorro[]> {
    return this.http.get<MetaAhorro[]>('local-auth-api/metas.json');
  }
  obtenerNotificaciones(): Observable<Notificacion[]> {
    return this.http.get<Notificacion[]>('local-auth-api/notificaciones.json');
  }
  obtenerRegistrosFinancieros(): Observable<RegistroFinanciero[]> {
    return this.http.get<RegistroFinanciero[]>('local-auth-api/registrosFinancieros.json');
  }
  // Corregido (Nicolás): antes leía admins.json en vez de usuarios.json
  obtenerUsuarios(): Observable<Usuario[]> {
    return this.http.get<Usuario[]>('local-auth-api/usuarios.json');
  }
  // Nuevo (Nicolás): movimientos (ingresos y gastos) de todos los usuarios
  obtenerMovimientos(): Observable<MovimientoUsuario[]> {
    return this.http.get<MovimientoUsuario[]>('local-auth-api/movimientos.json');
  }
}
