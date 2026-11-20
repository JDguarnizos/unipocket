import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { SesionApi } from "../services/sesion-api";

// Crear una función que niega el acceso a las rutas a cualquier usuario no validado (ó una sesión activa)
// Devolviendo false o true dependiendo de si existe un usuario
export const authGuard: CanActivateFn = (_route, state) => {
    const sesion = inject(SesionApi); // Cambiado: el usuario actual ahora vive en SesionApi
    const router = inject(Router);

    if (sesion.usuarioActual()) return true;

    return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url}
    })
};