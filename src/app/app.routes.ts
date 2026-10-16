import { Routes } from '@angular/router';
import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard/dashboard';
import { Presupuesto } from './pages/presupuesto/presupuesto';
import { Movimientos } from './pages/movimientos/movimientos';
import { Historial } from './pages/historial/historial';
import { MetasAhorro } from './pages/metas-ahorro/metas-ahorro';
import { Reportes } from './pages/reportes/reportes';
import { Configuracion } from './pages/configuracion/configuracion';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard },
  { path: 'presupuesto', component: Presupuesto },
  { path: 'movimientos', component: Movimientos },
  { path: 'historial', component: Historial },
  { path: 'metas-ahorro', component: MetasAhorro },
  { path: 'reportes', component: Reportes },
  { path: 'configuracion', component: Configuracion },
  { path: '**', redirectTo: 'dashboard' }
];