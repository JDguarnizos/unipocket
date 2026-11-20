import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { SesionApi } from "../services/sesion-api";

export const roleGuard: CanActivateFn = (route) => {
    const sesion = inject(SesionApi); // Cambiado: el usuario actual ahora vive en SesionApi
    const router = inject(Router);
    const usuario = sesion.usuarioActual();
    const rolesPermitidos = route.data['roles'] as String[] | undefined;
    
    if (usuario && rolesPermitidos?.includes(usuario.rol)) return true;

    return router.createUrlTree(['/dashboard']);
}