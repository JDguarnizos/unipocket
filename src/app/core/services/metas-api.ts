import { inject, Service, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap, throwError } from 'rxjs';
import { MetaAhorro } from '../models/meta_ahorro.model';
import { Usuario } from '../models/usuario.model';
import { LocalApi } from './local-api';

/*
  MetasApi: METAS DE AHORRO EN MEMORIA.
  Movido desde LocalApi sin cambiar la lógica (Juan). El único cambio es que
  la lectura de los JSON ahora se pide a LocalApi (this.localApi.obtener...).

  Lo usan: PanelAdmin (estadísticas de metas) y, más adelante, la vista de Metas de ahorro.
*/
@Service()
export class MetasApi {
  private localApi = inject(LocalApi);

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
      next: () =>
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
        ),
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
}
