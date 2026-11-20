import { Component, OnInit, computed, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
// toSignal convierte los cambios de un formulario (Observable) en un signal
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { SesionApi } from '../../core/services/sesion-api';
import { MovimientosApi } from '../../core/services/movimientos-api';
import { Movimiento } from '../../core/models/movimiento.model';
import { formatearFecha, formatearPesos } from '../../core/utils/formato';
import { BotonGenericoComponent } from '../../shared/components/boton-generico/boton-generico';
import { ItemMovimientoComponent } from '../../shared/components/item-movimiento/item-movimiento';
import { DesgloseCategorias } from '../../shared/components/desglose-categorias/desglose-categorias';
import { RegistroMovimiento } from './registro-movimiento/registro-movimiento';

/*
  Vista "Historial de movimientos".
  - Muestra TODOS los movimientos del usuario, del más reciente al más antiguo.
  - Tiene filtros (búsqueda, tipo y categoría) hechos con un formulario reactivo.
  - Al lado muestra el desglose de gastos por categoría.
*/
@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [ReactiveFormsModule, BotonGenericoComponent, ItemMovimientoComponent, DesgloseCategorias, RegistroMovimiento],
  templateUrl: './movimientos.html',
  styleUrls: ['./movimientos.css']
})
export class Movimientos implements OnInit {
  // Cambiado: antes todo venía de LocalApi; ahora la sesión y los movimientos tienen su propio servicio
  private sesion = inject(SesionApi);
  private movimientosApi = inject(MovimientosApi);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // ===== Filtros (formulario reactivo) =====
  filtrosForm = this.fb.group({
    busqueda: [''],
    tipo: ['todos'],   // 'todos' | 'ingreso' | 'gasto'
    categoria: ['']    // '' = todas las categorías
  });

  // Cada vez que el usuario escribe o cambia un filtro, este signal se actualiza.
  // initialValue: el valor que tiene antes de que el usuario toque algo.
  filtros = toSignal(this.filtrosForm.valueChanges, { initialValue: this.filtrosForm.value });

  // ===== Datos =====

  // Todos los movimientos del usuario, ordenados por fecha (más reciente primero).
  // localeCompare compara textos: como la fecha es "AAAA-MM-DD", el orden alfabético = orden por fecha.
  misMovimientos = computed(() => {
    const usuario = this.sesion.usuarioActual();
    return this.movimientosApi.movimientos()
      .filter(m => m.idUsuario === usuario?.id)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  });

  // Lista de categorías que el usuario ha usado (para el select del filtro), sin repetidas
  categoriasDisponibles = computed(() =>
    [...new Set(this.misMovimientos().map(m => m.categoria))].sort()
  );

  // Movimientos que cumplen TODOS los filtros
  movimientosFiltrados = computed(() => {
    const f = this.filtros();
    const texto = (f.busqueda ?? '').trim().toLowerCase();

    return this.misMovimientos().filter(m => {
      const cumpleTipo = f.tipo === 'todos' || m.tipo === f.tipo;
      const cumpleCategoria = !f.categoria || m.categoria === f.categoria;
      const cumpleTexto = !texto
        || m.descripcion.toLowerCase().includes(texto)
        || m.categoria.toLowerCase().includes(texto);
      return cumpleTipo && cumpleCategoria && cumpleTexto;
    });
  });

  // Totales de lo que se está viendo (cambian con los filtros)
  totalIngresos = computed(() => this.sumar(this.movimientosFiltrados(), 'ingreso'));
  totalGastos = computed(() => this.sumar(this.movimientosFiltrados(), 'gasto'));

  // ===== Modal "Registrar movimiento" (el mismo del Dashboard) =====
  modalAbierto = false;
  tipoModal: 'gasto' | 'ingreso' = 'gasto';

  ngOnInit(): void {
    // TEMPORAL (igual que en el Dashboard): sin sesión, volvemos al login.
    // Cuando estén los Guards de Juan, esta validación pasa a ellos.
    if (!this.sesion.usuarioActual()) {
      this.router.navigate(['/login']);
      return;
    }
    this.movimientosApi.cargarDatosFinancieros();
  }

  // Suma los montos de un tipo (ingreso o gasto)
  private sumar(lista: Movimiento[], tipo: 'ingreso' | 'gasto'): number {
    return lista.filter(m => m.tipo === tipo).reduce((suma, m) => suma + m.monto, 0);
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ busqueda: '', tipo: 'todos', categoria: '' });
  }

  abrirModal(tipo: 'gasto' | 'ingreso'): void {
    this.tipoModal = tipo;
    this.modalAbierto = true;
  }

  cerrarModal(): void {
    this.modalAbierto = false;
  }

  // El modal emite (guardado): el servicio lo guarda y TODAS las listas se recalculan solas
  registrarMovimiento(movimiento: Movimiento): void {
    const usuario = this.sesion.usuarioActual();
    if (!usuario) return;
    this.movimientosApi.registrarMovimiento(usuario.id, movimiento);
    this.cerrarModal();
  }

  // Funciones de formato para usarlas en el HTML
  formatearPesos = formatearPesos;
  formatearFecha = formatearFecha;
}