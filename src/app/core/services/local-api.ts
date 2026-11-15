import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { Admin } from '../models/admin.model';
import { Estadisticas } from '../models/estadisticas.model';
import { Meta } from '../models/meta.model';
import { Notificacion } from '../models/notificacion.model';
import { RegistroFinanciero } from '../models/reg_financiero.model';
import { Usuario } from '../models/usuario.model';
import { Movimiento, MovimientoUsuario } from '../models/movimiento.model';

@Injectable({
  providedIn: 'root'
})
export class LocalApi {
    private http = inject(HttpClient);

    constructor() {
        this.cargarDatosFinancieros();
    }

    obtenerAdmins(): Observable<Admin[]>{
        return this.http.get<Admin[]>('/local-auth-api/admins.json');
    }
    obtenerEstadisticas(): Observable<Estadisticas[]>{
        return this.http.get<Estadisticas[]>('/local-auth-api/estadisticas.json');
    }
    obtenerMetasAhorro(): Observable<Meta[]>{
        return this.http.get<Meta[]>('/local-auth-api/metas.json');
    }
    obtenerNotificaciones(): Observable<Notificacion[]>{
        return this.http.get<Notificacion[]>('/local-auth-api/notificaciones.json');
    }
    obtenerRegistrosFinancieros(): Observable<RegistroFinanciero[]>{
        return this.http.get<RegistroFinanciero[]>('/local-auth-api/registrosFinancieros.json');
    }
    obtenerUsuarios(): Observable<Usuario[]>{
        return this.http.get<Usuario[]>('/local-auth-api/usuarios.json');
    }
    obtenerMovimientos(): Observable<MovimientoUsuario[]>{
        return this.http.get<MovimientoUsuario[]>('/local-auth-api/movimientos.json');
    }

    // Usuario actual en sesión
    usuarioActual = signal<Usuario | null>(null);

    validarCredenciales(correo: string, contrasena: string): Observable<Usuario | undefined> {
        return forkJoin([this.obtenerUsuarios(), this.obtenerAdmins()]).pipe(
            map(([usuarios, admins]) =>
                [...usuarios, ...admins].find(u => u.correo === correo && u.contrasena === contrasena)
            )
        );
    }

    // CADA VEZ QUE CAMBIAS DE USUARIO, sincronizamos y verificamos su cuenta al instante
    iniciarSesion(usuario: Usuario): void {
        this.usuarioActual.set(usuario);
        this.cargarDatosFinancieros(); 
    }

    movimientos = signal<MovimientoUsuario[]>([]);
    registrosFinancieros = signal<RegistroFinanciero[]>([]);

    cargarDatosFinancieros(): void {
        forkJoin([this.obtenerMovimientos(), this.obtenerRegistrosFinancieros()]).subscribe({
            next: ([movimientos, registros]) => {
                this.movimientos.set(movimientos);
                this.registrosFinancieros.set(registros);
                this.verificarRegistroUsuarioActual();
            },
            error: () => {
                console.error('No se pudieron cargar los datos financieros');
            }
        });
    }

    // Obtiene un ID numérico seguro basado en el ID o en el correo del usuario actual
    public obtenerIdActual(): number {
        const usuario = this.usuarioActual();
        if (!usuario) return 1;
        const idNum = Number(usuario.id);
        if (!isNaN(idNum) && idNum > 0) return idNum;

        // Si el ID no es numérico, generamos un número único a partir del correo
        if (usuario.correo) {
            let hash = 0;
            for (let i = 0; i < usuario.correo.length; i++) {
                hash = (hash << 5) - hash + usuario.correo.charCodeAt(i);
                hash |= 0;
            }
            return Math.abs(hash) % 9000 + 100;
        }
        return 1;
    }

    // Garantiza que cualquier usuario (1º, 2º, 3º, etc.) tenga su tarjeta financiera creada en memoria
    private verificarRegistroUsuarioActual(): void {
        const userId = this.obtenerIdActual();

        this.registrosFinancieros.update(registros => {
            const existe = registros.some(r => Number(r.idUsuario) === userId);
            if (!existe) {
                const nuevoRegistro: RegistroFinanciero = {
                    idUsuario: userId,
                    totalIngresos: 1200000,
                    totalGastos: 0,
                    presupuesto: 2300000
                } as any;
                return [...registros, nuevoRegistro];
            }
            return registros;
        });
    }

    // MÉTODO BLINDADO: Registra y actualiza saldos para cualquier usuario con éxito
    registrarMovimiento(idUsuario: any, movimiento: Movimiento): void {
        const userId = this.obtenerIdActual();
        this.verificarRegistroUsuarioActual();

        const montoNum = Number(movimiento?.monto || 0);
        const tipoMov = movimiento?.tipo === 'ingreso' ? 'ingreso' : 'gasto';
        const categoriaMov = movimiento?.categoria || 'General';
        const fechaMov = movimiento?.fecha || new Date().toISOString().split('T')[0];
        const descMov = movimiento?.descripcion || '';

        const nuevoMovimiento: MovimientoUsuario = {
            idUsuario: userId,
            monto: montoNum,
            tipo: tipoMov,
            categoria: categoriaMov,
            fecha: fechaMov,
            descripcion: descMov
        };

        // Añadimos el movimiento de primero en la lista
        this.movimientos.update(lista => [nuevoMovimiento, ...lista]);

        // Actualizamos de inmediato el registro financiero del usuario activo
        this.registrosFinancieros.update(registros => {
            return registros.map(reg => {
                if (Number(reg.idUsuario) !== userId) return reg;
                
                const ingresosActuales = Number(reg.totalIngresos || 0);
                const gastosActuales = Number(reg.totalGastos || 0);

                if (tipoMov === 'ingreso') {
                    return { ...reg, totalIngresos: ingresosActuales + montoNum };
                } else {
                    return { ...reg, totalGastos: gastosActuales + montoNum };
                }
            });
        });
    }
}