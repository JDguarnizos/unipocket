import { inject, Service, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Movimiento, MovimientoUsuario } from '../models/movimiento.model';
import { RegistroFinanciero } from '../models/reg_financiero.model';
import { LocalApi } from './local-api';

/*
  MovimientosApi: DATOS FINANCIEROS EN MEMORIA (movimientos y registros financieros).
  Movido desde LocalApi sin cambiar su funcionamiento.

  Los .json de public/ son de SOLO LECTURA (HttpClient no puede escribir en ellos).
  Por eso: los leemos UNA vez, los copiamos en signals y desde ahí los modificamos.
  Como el servicio es único en toda la app, los cambios se mantienen al navegar
  entre vistas, pero se pierden al recargar la página (vuelve a leer el JSON).

  Lo usan: Dashboard, Movimientos/Historial y PanelAdmin (total de movimientos).
*/
@Service()
export class MovimientosApi {
  private localApi = inject(LocalApi);

  movimientos = signal<MovimientoUsuario[]>([]);
  registrosFinancieros = signal<RegistroFinanciero[]>([]);
  private datosFinancierosCargados = false;

  // Lee movimientos.json y registrosFinancieros.json y llena los signals.
  // Si ya se cargaron antes, no hace nada (así no se borran los movimientos nuevos).
  cargarDatosFinancieros(): void {
    if (this.datosFinancierosCargados) return;
    this.datosFinancierosCargados = true;

    forkJoin([this.localApi.obtenerMovimientos(), this.localApi.obtenerRegistrosFinancieros()]).subscribe({
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
}
