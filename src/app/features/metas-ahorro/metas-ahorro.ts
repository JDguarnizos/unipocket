import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MetaAhorro } from '../../core/models/meta_ahorro.model';
import { SesionApi } from '../../core/services/sesion-api';
import { MetasApi } from '../../core/services/metas-api';
import { MovimientosApi } from '../../core/services/movimientos-api';
import { aFechaLocal, formatearFecha, formatearPesos, hoyTexto, mesesHasta } from '../../core/utils/formato';
import { FormularioMeta } from './formulario-meta/formulario-meta';
import { AbonarMeta } from './abonar-meta/abonar-meta';

// Datos ya calculados de cada tarjeta, para que el HTML solo tenga que mostrarlos
interface TarjetaMeta {
  meta: MetaAhorro;
  aportado: number;
  porcentaje: number;            // 0 a 100 (RF11)
  atrasada: boolean;             // no completada y con la fecha límite vencida
  ahorroMensual: number | null;  // null cuando no aplica (completada o vencida)
  fechaCumplida: string | null;  // fecha del último aporte, si la meta está cumplida
}

/*
  Vista "Metas de ahorro" (RF08 a RF12, CU-10 a CU-17).
  - RF08 / CU-10: crear metas (modal FormularioMeta).
  - RF09 / CU-15: abonar a una meta (modal AbonarMeta).
  - RF10: ver la lista de aportes de cada meta.
  - RF11: progreso de cada meta en porcentaje con una barra.
  - RF12: insignia "Meta cumplida" cuando se alcanza el valor objetivo.
  - CU-12 / CU-13: editar una meta (el mismo modal FormularioMeta).
*/
@Component({
  selector: 'app-metas-ahorro',
  imports: [FormularioMeta, AbonarMeta],
  templateUrl: './metas-ahorro.html',
  styleUrl: './metas-ahorro.css',
})
export class MetasAhorro implements OnInit {
  private sesion = inject(SesionApi);
  private metasApi = inject(MetasApi);
  private movimientosApi = inject(MovimientosApi);

  // ===== Datos =====

  // Solo las metas del usuario que inició sesión
  misMetas = computed(() => {
    const usuario = this.sesion.usuarioActual();
    return this.metasApi.metasAhorro().filter(m => m.idUsuario === usuario?.id);
  });

  // Una tarjeta por meta, con todos los cálculos hechos (se recalcula sola al abonar o editar)
  tarjetas = computed<TarjetaMeta[]>(() => {
    const hoy = aFechaLocal(hoyTexto());

    return this.misMetas().map(meta => {
      // RF11: total aportado y porcentaje (los calcula MetasApi para no repetir la cuenta)
      const aportado = this.metasApi.totalAportado(meta);
      const porcentaje = this.metasApi.porcentajeMeta(meta);
      const vencida = aFechaLocal(meta.fechaLimite) < hoy;

      // "Ahorra $X/mes" = lo que falta / meses que quedan. No se muestra si ya pasó la fecha.
      const ahorroMensual = meta.completado || vencida
        ? null
        : Math.ceil(Math.max(0, meta.valorObjetivo - aportado) / mesesHasta(meta.fechaLimite));

      // Para "Meta alcanzada el ...": usamos la fecha del último aporte
      const ultimo = meta.listaAportes[meta.listaAportes.length - 1];
      const fechaCumplida = meta.completado && ultimo?.fechaAporte ? ultimo.fechaAporte : null;

      return {
        meta,
        aportado,
        porcentaje,
        atrasada: !meta.completado && vencida,
        ahorroMensual,
        fechaCumplida
      };
    });
  });

  // Subtítulo: "Llevas $X ahorrados en N metas"
  totalAhorrado = computed(() => this.tarjetas().reduce((suma, t) => suma + t.aportado, 0));

  // ===== Estado de la pantalla =====

  // Nombre de la meta cuya lista de aportes está desplegada (null = ninguna)
  metaAbierta = signal<string | null>(null);

  // Modal de crear/editar: 'nueva', 'editar' o null (cerrado)
  modalMeta = signal<'nueva' | 'editar' | null>(null);
  // Meta que se está editando o a la que se va a abonar
  metaSeleccionada = signal<MetaAhorro | null>(null);
  modalAbonar = signal(false);

  // Mensaje verde que confirma la última acción
  mensajeExito = signal('');

  ngOnInit(): void {
    // Cargamos las metas y los datos financieros (los ingresos se usan en CU-11).
    // El error de carga ya lo muestra MetasApi en la consola.
    this.metasApi.cargarMetasAhorro().subscribe({ error: () => {} });
    this.movimientosApi.cargarDatosFinancieros();
  }

  // ===== Acciones =====

  // RF10: muestra u oculta la lista de aportes de una meta
  alternarAportes(nombre: string): void {
    this.metaAbierta.update(actual => actual === nombre ? null : nombre);
  }

  abrirNuevaMeta(): void {
    this.metaSeleccionada.set(null);
    this.modalMeta.set('nueva');
  }

  abrirEditar(meta: MetaAhorro): void {
    this.metaSeleccionada.set(meta);
    this.modalMeta.set('editar');
  }

  abrirAbonar(meta: MetaAhorro): void {
    this.metaSeleccionada.set(meta);
    this.modalAbonar.set(true);
  }

  // Cierra cualquiera de los dos modales
  cerrarModales(): void {
    this.modalMeta.set(null);
    this.modalAbonar.set(false);
    this.metaSeleccionada.set(null);
  }

  // Un modal guardó: mostramos su mensaje y lo cerramos
  alGuardar(mensaje: string): void {
    this.mensajeExito.set(mensaje);
    this.cerrarModales();
  }

  // Lista de aportes del más reciente al más antiguo (copiamos con [...] para no alterar la original)
  aportesRecientes(meta: MetaAhorro) {
    return [...meta.listaAportes].reverse();
  }

  // Las fechas de metas.json vienen como "2026-09-01T00:00:00.000Z": tomamos solo "2026-09-01"
  fecha(valor: string | null): string {
    return valor ? formatearFecha(valor.substring(0, 10)) : 'Sin fecha';
  }

  formatearPesos = formatearPesos;
}
