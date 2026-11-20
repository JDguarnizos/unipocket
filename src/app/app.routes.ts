import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { Presupuesto } from './features/presupuesto/presupuesto';
import { Movimientos } from './features/movimientos/movimientos';
import { MetasAhorro } from './features/metas-ahorro/metas-ahorro';
import { PanelAdmin } from './features/admin/panel-admin/panel-admin';
import { Configuracion } from './features/configuracion/configuracion';
import { Reportes } from './features/reportes/reportes';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' }, // la app arranca en el login
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'presupuesto', component: Presupuesto, canActivate: [authGuard] },
  { path: 'movimientos', component: Movimientos, canActivate: [authGuard] },
  // Nuevo (RNF05): la vista de Movimientos ya es el historial completo, así que la reutilizamos
  { path: 'historial', component: Movimientos, canActivate: [authGuard] },
  { path: 'metas-ahorro', component: MetasAhorro, canActivate: [authGuard] },
  // Nuevo (RF07, RNF08, RNF09): resumen semanal/mensual tipo recibo
  { path: 'reportes', component: Reportes, canActivate: [authGuard] },
  { path: 'admin', component: PanelAdmin, canActivate: [authGuard, roleGuard],
  data: { roles: ['administrador'] } }, // panel del administrador 
  // Nuevo (RNF05): configuración de la cuenta, disponible para estudiante y administrador
  { path: 'configuracion', component: Configuracion, canActivate: [authGuard] },
  { path: '**', redirectTo: 'dashboard' } // comodín: siempre debe ir de ÚLTIMO
];
