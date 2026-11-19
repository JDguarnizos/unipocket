import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { LocalApi } from "../services/local-api";

// Crear una función que niega el acceso a las rutas a cualquier usuario no validado (ó una sesión activa)
// Devolviendo false o true dependiendo de si existe un usuario
export const authGuard: CanActivateFn = (_route, state) => {
    const api = inject(LocalApi);
    const router = inject(Router);

    if (api.usuarioActual()) return true;

    return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url}
    })
};