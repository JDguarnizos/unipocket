import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { Presupuesto } from './features/presupuesto/presupuesto';
import { Movimientos } from './features/movimientos/movimientos';
import { MetasAhorro } from './features/metas-ahorro/metas-ahorro';
import { PanelAdmin } from './features/admin/panel-admin/panel-admin';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' }, // la app arranca en el login
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'presupuesto', component: Presupuesto, canActivate: [authGuard] },
  { path: 'movimientos', component: Movimientos, canActivate: [authGuard] },
  { path: 'metas-ahorro', component: MetasAhorro, canActivate: [authGuard] },
  { path: 'admin', component: PanelAdmin, canActivate: [authGuard, roleGuard],
  data: { roles: ['administrador'] } }, // panel del administrador 
  { path: '**', redirectTo: 'dashboard' }
];
