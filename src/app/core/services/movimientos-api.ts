import { computed, inject, Service, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Movimiento, MovimientoUsuario } from '../models/movimiento.model';
import { RegistroFinanciero } from '../models/reg_financiero.model';
import { LocalApi } from './local-api';
import { SesionApi } from './sesion-api';

// Nuevo (RF06, RNF09): una fila de la comparativa "Presupuesto vs gasto real"
export interface ComparativaCategoria {
  categoria: string;
  asignado: number;        // presupuesto de la categoría
  gastado: number;         // gasto real
  diferencia: number;      // asignado - gastado (negativo = se pasó)
  porcentaje: number;      // cuánto del presupuesto se ha usado (0 si no tiene presupuesto)
  sinPresupuesto: boolean; // categoría con gastos pero sin presupuesto asignado (ej: "Ahorro")
}

/*
  MovimientosApi: DATOS FINANCIEROS EN MEMORIA (movimientos y registros financieros).
  Movido desde LocalApi sin cambiar su funcionamiento.

  Los .json de public/ son de SOLO LECTURA (HttpClient no puede escribir en ellos).
  Por eso: los leemos UNA vez, los copiamos en signals y desde ahí los modificamos.
  Como el servicio es único en toda la app, los cambios se mantienen al navegar
  entre vistas, pero se pierden al recargar la página (vuelve a leer el JSON).

  Lo usan: Dashboard, Movimientos/Historial, Presupuesto, Reportes, Metas de ahorro
  (aportes e ingresos para CU-11) y PanelAdmin (total de movimientos).
*/
@Service()
export class MovimientosApi {
  private localApi = inject(LocalApi);
  // Nuevo: para saber de quién son los datos que se muestran en pantalla
  private sesion = inject(SesionApi);

  movimientos = signal<MovimientoUsuario[]>([]);
  registrosFinancieros = signal<RegistroFinanciero[]>([]);
  private datosFinancierosCargados = false;

  // Nuevo: registro financiero del usuario que inició sesión (ingresos, gastos y presupuesto).
  // Es un computed: si cambia el usuario o se registra un movimiento, se recalcula solo.
  registroActual = computed(() => {
    const usuario = this.sesion.usuarioActual();
    if (!usuario) return undefined;
    return this.registrosFinancieros().find((r) => r.idUsuario === usuario.id);
  });

  // ----- Cálculos del presupuesto (RF04) -----
  // Movidos desde el Dashboard para usarlos también en la vista de Presupuesto
  // sin repetir la cuenta. Todos salen del registro financiero del usuario actual.

  // Dinero disponible = lo que ha entrado - lo que ha salido
  saldoDisponible = computed(() => {
    const r = this.registroActual();
    return r ? r.totalIngresos - r.totalGastos : 0;
  });

  // Porcentaje del presupuesto que ya se gastó
  porcentajePresupuesto = computed(() => {
    const r = this.registroActual();
    if (!r || r.presupuesto === 0) return 0;
    return Math.round((r.totalGastos / r.presupuesto) * 100);
  });

  // Presupuesto restante (puede ser negativo si se pasó del límite)
  presupuestoRestante = computed(() => {
    const r = this.registroActual();
    return r ? r.presupuesto - r.totalGastos : 0;
  });

  // Nuevo (RF06, RNF09): compara el presupuesto de cada categoría con lo que se gastó.
  // - gastos: los movimientos que se quieren comparar (todos, o solo los de un periodo).
  // - factor: para ajustar el presupuesto mensual (ej: 0.25 = una semana, en Reportes).
  // La usan la vista de Presupuesto y la de Reportes, así la cuenta está en un solo lugar.
  compararPresupuesto(gastos: Movimiento[], factor = 1): ComparativaCategoria[] {
    const asignados = this.registroActual()?.presupuestoCategorias ?? [];

    // 1) Sumamos lo gastado en cada categoría: { "Alimentación": 119000, ... }
    const gastadoPorCategoria: Record<string, number> = {};
    for (const m of gastos) {
      if (m.tipo !== 'gasto') continue;
      gastadoPorCategoria[m.categoria] = (gastadoPorCategoria[m.categoria] ?? 0) + m.monto;
    }

    // 2) Una fila por cada categoría que tiene presupuesto
    const filas = asignados.map((a) =>
      this.crearFila(a.categoria, Math.round(a.monto * factor), gastadoPorCategoria[a.categoria] ?? 0),
    );

    // 3) Categorías con gastos pero SIN presupuesto (ej: "Ahorro"): también se muestran
    for (const categoria of Object.keys(gastadoPorCategoria)) {
      if (!asignados.some((a) => a.categoria === categoria)) {
        filas.push(this.crearFila(categoria, 0, gastadoPorCategoria[categoria]));
      }
    }
    return filas;
  }

  private crearFila(categoria: string, asignado: number, gastado: number): ComparativaCategoria {
    return {
      categoria,
      asignado,
      gastado,
      diferencia: asignado - gastado,
      porcentaje: asignado > 0 ? Math.round((gastado / asignado) * 100) : 0,
      sinPresupuesto: asignado === 0,
    };
  }

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
