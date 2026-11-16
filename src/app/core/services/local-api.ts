import { inject, Injectable, Service, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, shareReplay, tap, throwError } from 'rxjs';
import { Admin } from '../models/admin.model';
import { Estadisticas } from '../models/estadisticas.model';
import { MetaAhorro } from '../models/meta_ahorro.model';
import { Notificacion } from '../models/notificacion.model';
import { RegistroFinanciero } from '../models/reg_financiero.model';
import { Usuario } from '../models/usuario.model';
import { Movimiento, MovimientoUsuario } from '../models/movimiento.model';

@Service()
export class LocalApi {
  private http = inject(HttpClient);

  // =====================================================================
  // 1. LECTURA DE LOS JSON
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

  // =====================================================================
  // 2. LOGIN
  // =====================================================================

  // Usuario que inició sesión. null = nadie ha iniciado sesión.
  // Es un signal: cualquier componente que lo lea se actualiza solo cuando cambia.
  usuarioActual = signal<Usuario | null>(null);

  // Busca un usuario o admin con ese correo y contraseña.
  // forkJoin espera a que lleguen LOS DOS archivos (usuarios y admins) y luego
  // map une las dos listas y busca la coincidencia. Devuelve undefined si no existe.
  validarCredenciales(correo: string, contrasena: string): Observable<Usuario | undefined> {
    return forkJoin([this.obtenerUsuarios(), this.obtenerAdmins()]).pipe(
      map(([usuarios, admins]) =>
        [...usuarios, ...admins].find((u) => u.correo === correo && u.contrasena === contrasena),
      ),
    );
  }

  // Guarda en memoria quién inició sesión (incluye su rol: "usuario" o "administrador")
  iniciarSesion(usuario: Usuario): void {
    this.usuarioActual.set(usuario);
  }

  // =====================================================================
  // 3. DATOS FINANCIEROS EN MEMORIA
  // Los .json de public/ son de SOLO LECTURA (HttpClient no puede escribir en ellos).
  // Por eso: los leemos UNA vez, los copiamos en signals y desde ahí los modificamos.
  // Como el servicio es único en toda la app, los cambios se mantienen al navegar
  // entre vistas, pero se pierden al recargar la página (vuelve a leer el JSON).
  // =====================================================================

  movimientos = signal<MovimientoUsuario[]>([]);
  registrosFinancieros = signal<RegistroFinanciero[]>([]);
  private datosFinancierosCargados = false;

  // Lee movimientos.json y registrosFinancieros.json y llena los signals.
  // Si ya se cargaron antes, no hace nada (así no se borran los movimientos nuevos).
  cargarDatosFinancieros(): void {
    if (this.datosFinancierosCargados) return;
    this.datosFinancierosCargados = true;

    forkJoin([this.obtenerMovimientos(), this.obtenerRegistrosFinancieros()]).subscribe({
      next: ([movimientos, registros]) => {
        this.movimientos.set(movimientos);
        this.registrosFinancieros.set(registros);
      },
      error: () => {
        // Si falla la lectura, permitimos intentarlo de nuevo la próxima vez
        this.datosFinancierosCargados = false;
        console.error('No se pudieron cargar los datos financieros');
      },
    });
  }

  // Registra un movimiento nuevo del usuario indicado.
  registrarMovimiento(idUsuario: number, movimiento: Movimiento): void {
    // 1) Agregamos el movimiento de PRIMERO en la lista (es el más reciente).
    //    update() recibe la lista actual y devuelve una lista nueva.
    const nuevo: MovimientoUsuario = { ...movimiento, idUsuario };
    this.movimientos.update((lista) => [nuevo, ...lista]);

    // 2) Actualizamos los totales del registro financiero de ese usuario:
    //    un ingreso suma a totalIngresos y un gasto suma a totalGastos.
    //    (El saldo disponible = totalIngresos - totalGastos, así que el ingreso
    //    lo hace subir y el gasto lo hace bajar.)
    this.registrosFinancieros.update((registros) =>
      registros.map((registro) => {
        if (registro.idUsuario !== idUsuario) return registro; // los demás quedan igual
        return movimiento.tipo === 'ingreso'
          ? { ...registro, totalIngresos: registro.totalIngresos + movimiento.monto }
          : { ...registro, totalGastos: registro.totalGastos + movimiento.monto };
      }),
    );
  }

  // Actualización de datos dentro de metas de ahorro, hecho con las manos.
  // La idea es usar la misma forma que se usa arriba para cargar datos, manipularlos en memoria
  // Dado que angular por defecto no puede modificar JSONs

  metasAhorro = signal<MetaAhorro[]>([]);
  private metasAhorroCargadas = false;
  private metasAhorroCarga: Observable<MetaAhorro[]> | null = null;

  // Mismo flujo, obtener datos suscribiendose al observable, si falla notificando en consola
  cargarMetasAhorro(): Observable<MetaAhorro[]> {
    if (this.metasAhorroCargadas) return of(this.metasAhorro());

    if (!this.metasAhorroCarga) {
      this.metasAhorroCarga = this.obtenerMetasAhorro().pipe(
        tap((metasAhorro) => {
          this.metasAhorro.set(metasAhorro);
          this.metasAhorroCargadas = true;
        }),
        catchError((error) => {
          this.metasAhorroCarga = null;
          console.error('La carga de MetasAhorro ha fallado.');
          return throwError(() => error);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }

    return this.metasAhorroCarga;
  }

  // Carga usuarios, verifica que el usuario dentro de la meta de ahorro exista y inserta la meta en tal caso
  registrarMetaAhorro(NuevaMetaAhorro: MetaAhorro): void {
    // Cargar la lista de usuarios.
    // Podría dejar esto en una función nueva pero no se puede suscribir a la misma para
    var listausuarios = signal<Usuario[]>([]);
    this.obtenerUsuarios().subscribe({
      next: (Usuarios) => {
        listausuarios.set(Usuarios);
        var usuarioExiste = false;

        // Es la manera que encontré para iterar en esta lista xd, en general no hace cambios en la lista de usuarios
        listausuarios.update((usuarios) =>
          usuarios.map((usuario) => {
            if (NuevaMetaAhorro.idUsuario == usuario.id) {
              usuarioExiste = true;
            }
            return usuario;
          }),
        );

        if (usuarioExiste)
          this.metasAhorro.update((MetasActuales) => [NuevaMetaAhorro, ...MetasActuales]);
      },
      error: () => {
        console.error('La carga de ListaUsuarios ha fallado durante el registro de MetaAhorro.');
      },
    });
  }

  // Verifica que el aporte si aporte algo, verifica nombre y id del usuario con la lista actual de metas, añade los aportes
  registrarAporteMetaAhorro(idUsuario: number, nombreMeta: string, aporte: number): void {
    if (aporte <= 0) return;

    this.cargarMetasAhorro().subscribe({
      next: () =>
        this.metasAhorro.update((metas) =>
          metas.map((meta) => {
            if (meta.idUsuario !== idUsuario) return meta;
            if (meta.nombre.toLowerCase() !== nombreMeta.toLowerCase()) return meta;

            const listaAportes = [...meta.listaAportes, aporte];
            const totalAportes = listaAportes.reduce((total, valor) => total + valor, 0);

            return {
              ...meta,
              listaAportes,
              completado: meta.completado || totalAportes >= meta.valorObjetivo,
            };
          }),
        ),
      error: () => console.error('No se pudo registrar el aporte a la meta.'),
    });
  }
}
