export interface Notificacion {
    idsNotificar: Array<number>; //Ids de usuarios y admins a notificar
    mensaje: string;
    importancia: number; //Suponiendo que sea de mientras más alto el número, sea la importancia
}