import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Dashboard } from './features/dashboard/dashboard';
import { Presupuesto } from './features/presupuesto/presupuesto';
import { Movimientos } from './features/movimientos/movimientos';
import { MetasAhorro } from './features/metas-ahorro/metas-ahorro';
import { authGuard } from './core/guards/role.guard';
import { roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' }, // la app arranca en el login
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  {
    path: 'admin',
    component: Dashboard, //Cambiar este componente por el de admins cuando lo creen, por favor, os los ruego.
    canActivate: [authGuard, roleGuard],
    data: { roles: ['administrador'] }, //Requiere que el usuario cargado tenga el rol de admin
  },
  { path: 'presupuesto', component: Presupuesto },
  { path: 'movimientos', component: Movimientos },
  { path: 'metas-ahorro', component: MetasAhorro },
  { path: '**', redirectTo: 'dashboard' },
];
