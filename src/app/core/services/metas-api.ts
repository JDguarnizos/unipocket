import { inject, Service, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap, throwError } from 'rxjs';
import { MetaAhorro } from '../models/meta_ahorro.model';
import { Usuario } from '../models/usuario.model';
import { LocalApi } from './local-api';
import { NotificacionesApi } from './notificaciones-api';

/*
  MetasApi: METAS DE AHORRO EN MEMORIA.
  Movido desde LocalApi sin cambiar la lógica (Juan). El único cambio es que
  la lectura de los JSON ahora se pide a LocalApi (this.localApi.obtener...).

  Nuevo (Fase 3): buscarMeta, editarMetaAhorro (CU-12 / CU-13) y el aviso de
  "meta completada" (RF12, CU-14). La lógica de Juan no se cambió; solo se agregó.

  Lo usan: la vista de Metas de ahorro (y sus modales), el Dashboard y PanelAdmin.
*/
@Service()
export class MetasApi {
  private localApi = inject(LocalApi);
  // Nuevo (RF12): para avisarle al usuario cuando completa una meta
  private notificacionesApi = inject(NotificacionesApi);

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
      this.metasAhorroCarga = this.localApi.obtenerMetasAhorro().pipe(
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
  registrarMetaAhorro(nuevaMetaAhorro: MetaAhorro): void {
    // Cargar la lista de usuarios.
    // Podría dejar esto en una función nueva pero no se puede suscribir a la misma para hacer los cambios, dado que se desincroniza
    // y puede saltarse uno de los usuarios.
    var listaUsuarios = signal<Usuario[]>([]);
    this.localApi.obtenerUsuarios().subscribe({
      next: (Usuarios) => {
        listaUsuarios.set(Usuarios);
        var usuarioExiste = false;

        // Es la manera que encontré para iterar en esta lista xd, en general no hace cambios en la lista de usuarios
        listaUsuarios.update((usuarios) =>
          usuarios.map((usuario) => {
            if (nuevaMetaAhorro.idUsuario == usuario.id) {
              usuarioExiste = true;
            }
            return usuario;
          }),
        );

        if (usuarioExiste)
          this.metasAhorro.update((MetasActuales) => [nuevaMetaAhorro, ...MetasActuales]);
      },
      error: () => {
        console.error('La carga de ListaUsuarios ha fallado durante el registro de MetaAhorro.');
      },
    });
  }

  // Verifica que el aporte no sea 0,
  // Valida que la fecha del aporte no sea futura y luego suma el monto a la meta.
  //  verifica nombre y id del usuario con la lista actual de metas, añade los aportes
  registrarAporteMetaAhorro(
    idUsuario: number,
    nombreMeta: string,
    aporte: number,
    fechaAporte: Date = new Date(),
  ): void {
    if (aporte <= 0) return;
    // Comparamos solo el DÍA, sin horas. Si comparáramos con new Date() directamente,
    // una fecha de hoy tomada de un <input type="date"> (que queda a medianoche)
    // sería "menor" que la hora actual y se rechazaría por error.
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diaAporte = new Date(fechaAporte);
    diaAporte.setHours(0, 0, 0, 0);

    // Solo rechazamos aportes con fecha FUTURA.
    // No bloqueamos por fechaLimite: una meta atrasada todavía debe poder recibir abonos
    // (así aparece en la referencia visual de Metas de ahorro).
    if (diaAporte > hoy) return;
    this.cargarMetasAhorro().subscribe({
      next: () => {
        // Nuevo (RF12): guardamos si la meta YA estaba completada ANTES del aporte
        const estabaCompletada = this.buscarMeta(idUsuario, nombreMeta)?.completado ?? false;

        this.metasAhorro.update((metas) =>
          metas.map((meta) => {
            // Si la meta no concuerda con el idUsuario y nombre, no hace NADA.
            if (meta.idUsuario !== idUsuario) return meta;
            if (meta.nombre.toLowerCase() !== nombreMeta.toLowerCase()) return meta;

            const listaAportes = [
              ...meta.listaAportes,
              { monto: aporte, fechaAporte: fechaAporte.toISOString() },
            ];
            const totalAportes = listaAportes.reduce((total, valor) => total + valor.monto, 0);

            return {
              ...meta,
              listaAportes,
              completado: meta.completado || totalAportes >= meta.valorObjetivo,
            };
          }),
        );

        // Nuevo (RF12, CU-14): si con este aporte pasó a completada, avisamos UNA vez
        this.avisarSiSeCompleto(idUsuario, nombreMeta, estabaCompletada);
      },
      error: () => console.error('No se pudo registrar el aporte a la meta.'),
    });
  }


  // Devuelve el progreso de meta de ahorro en porcentaje, pide id y nombre meta buscar y calcular esa meta.
  // Esto debe ser totalAportado, no voy a modificar las interfaces y json para añadir un total que se puede calcular tan facil como un for each
  calcularProgresoMetaAhorro(idUsuario: number, nombreMeta: string): Observable<number> {
    return this.cargarMetasAhorro().pipe(
      map((metas) => {
        const meta = metas.find(
          (item) =>
            item.idUsuario === idUsuario &&
            item.nombre.toLowerCase() === nombreMeta.toLowerCase(),
        );
        if (!meta || meta.valorObjetivo <= 0) return 0;

        const totalAportes = meta.listaAportes.reduce((total, aporte) => total + aporte.monto, 0);
        return (totalAportes / meta.valorObjetivo) * 100;
      }),
    );
  }

  // =====================================================================
  // NUEVO (Fase 3): métodos que necesitaba la vista de Metas de ahorro
  // =====================================================================

  // Busca una meta por usuario y nombre (sin importar mayúsculas), igual que hace Juan arriba.
  // Devuelve undefined si no existe. Se usa en CU-17 ("verificar que la meta exista").
  buscarMeta(idUsuario: number, nombreMeta: string): MetaAhorro | undefined {
    return this.metasAhorro().find(
      (meta) => meta.idUsuario === idUsuario && meta.nombre.toLowerCase() === nombreMeta.toLowerCase(),
    );
  }

  // RF11: total aportado a una meta (suma de todos sus aportes)
  totalAportado(meta: MetaAhorro): number {
    return meta.listaAportes.reduce((total, aporte) => total + aporte.monto, 0);
  }

  // RF11: progreso de una meta de 0 a 100. Es la misma cuenta de calcularProgresoMetaAhorro,
  // pero recibe la meta directamente y devuelve un número (más fácil de usar en el HTML).
  // Math.floor para que solo diga 100 % cuando de verdad se alcanzó.
  porcentajeMeta(meta: MetaAhorro): number {
    if (meta.valorObjetivo <= 0) return 0;
    return Math.min(100, Math.floor((this.totalAportado(meta) / meta.valorObjetivo) * 100));
  }

  // CU-12 / CU-13: editar una meta (nombre, valor objetivo y fecha límite).
  // Se busca por el nombre ORIGINAL, porque el usuario pudo haberle cambiado el nombre.
  // Las validaciones (nombre repetido, viabilidad, fecha) las hace el formulario antes de llamar.
  editarMetaAhorro(
    idUsuario: number,
    nombreOriginal: string,
    cambios: { nombre: string; valorObjetivo: number; fechaLimite: string },
  ): void {
    const estabaCompletada = this.buscarMeta(idUsuario, nombreOriginal)?.completado ?? false;

    this.metasAhorro.update((metas) =>
      metas.map((meta) => {
        if (meta.idUsuario !== idUsuario) return meta;
        if (meta.nombre.toLowerCase() !== nombreOriginal.toLowerCase()) return meta;

        // Si con los aportes que ya tiene se alcanza el NUEVO valor objetivo, queda completada
        const totalAportes = meta.listaAportes.reduce((total, aporte) => total + aporte.monto, 0);
        return {
          ...meta,
          ...cambios, // reemplaza nombre, valorObjetivo y fechaLimite
          completado: totalAportes >= cambios.valorObjetivo,
        };
      }),
    );

    // Buscamos con el nombre NUEVO, porque ya se guardó el cambio
    this.avisarSiSeCompleto(idUsuario, cambios.nombre, estabaCompletada);
  }

  // RF12, CU-14 paso 4: notificación SOLO para el dueño de la meta cuando la completa.
  // Comparamos el estado de antes y el de ahora: solo se envía si pasó
  // de "no completada" a "completada", así no se repite en cada aporte.
  private avisarSiSeCompleto(idUsuario: number, nombreMeta: string, estabaCompletada: boolean): void {
    const meta = this.buscarMeta(idUsuario, nombreMeta);
    if (!meta || estabaCompletada || !meta.completado) return;

    this.notificacionesApi.enviarNotificacionGlobal({
      idsNotificar: [idUsuario],
      importancia: 'baja',
      mensaje: `¡Completaste tu meta "${meta.nombre}"!`,
    });
  }
}
