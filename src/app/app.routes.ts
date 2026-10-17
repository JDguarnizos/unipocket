import { Routes } from '@angular/router';
import { DashboardComponent } from './features/dashboard/dashboard';
import { Presupuesto } from './features/presupuesto/presupuesto';
import { Movimientos } from './features/movimientos/movimientos';
import { MetasAhorro } from './features/metas-ahorro/metas-ahorro';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'presupuesto', component: Presupuesto },
  { path: 'movimientos', component: Movimientos },
  { path: 'metas-ahorro', component: MetasAhorro },
  { path: '**', redirectTo: 'dashboard' }
];