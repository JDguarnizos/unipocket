export interface Notificacion {
    idsNotificar: number[]; //Ids de usuarios y admins a notificar
    mensaje: string;
    importancia: 'urgente' | 'alta' | 'media' | 'baja' ; 
}