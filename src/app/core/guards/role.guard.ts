import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { LocalApi } from "../services/local-api";

export const roleGuard: CanActivateFn = (route) => {
    const api = inject(LocalApi);
    const router = inject(Router);
    const usuario = api.usuarioActual();
    const rolesPermitidos = route.data['roles'] as String[] | undefined;
    
    if (usuario && rolesPermitidos?.includes(usuario.rol)) return true;

    return router.createUrlTree(['/dashboard']);
}