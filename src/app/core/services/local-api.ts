import { inject, Injectable, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Admin } from '../models/admin.model';
import { Estadisticas } from '../models/estadisticas.model';
import { MetasAhorro } from '../../features/metas-ahorro/metas-ahorro';
import { Notificacion } from '../models/notificacion.model';
import { RegistroFinanciero } from '../models/reg_financiero.model';
import { Usuario } from '../models/usuario.model';


@Service()
export class LocalApi {
    private http = inject(HttpClient);

    obtenerAdmins(): Observable<Admin[]>{
        return this.http.get<Admin[]>('local-auth-api/admins.json');
    }
    obtenerEstadisticas(): Observable<Estadisticas[]>{
        return this.http.get<Estadisticas[]>('local-auth-api/estadisticas.json');
    }
    obtenerMetasAhorro(): Observable<MetasAhorro[]>{
        return this.http.get<MetasAhorro[]>('local-auth-api/metas.json');
    }
    obtenerNotificaciones(): Observable<Notificacion[]>{
        return this.http.get<Notificacion[]>('local-auth-api/notificaciones.json');
    }
    obtenerRegistrosFinancieros(): Observable<RegistroFinanciero[]>{
        return this.http.get<RegistroFinanciero[]>('local-auth-api/registrosFinancieros.json');
    }
    obtenerUsuarios(): Observable<Usuario[]>{
        return this.http.get<Usuario[]>('local-auth-api/admins.json');
    }


}
