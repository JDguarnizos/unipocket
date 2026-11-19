import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { Presupuesto } from './features/presupuesto/presupuesto';
import { Movimientos } from './features/movimientos/movimientos';
import { MetasAhorro } from './features/metas-ahorro/metas-ahorro';
import { PanelAdmin } from './features/admin/panel-admin/panel-admin';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' }, // la app arranca en el login
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard },
  { path: 'presupuesto', component: Presupuesto },
  { path: 'movimientos', component: Movimientos },
  { path: 'metas-ahorro', component: MetasAhorro },
  { path: 'admin', component: PanelAdmin }, // panel del administrador 
  { path: '**', redirectTo: 'dashboard' }
];