import { Usuario } from "./usuario.model";

export interface Admin extends Usuario {
    rol: string; //Nota, preguntar que de tipos de roles hay
    correo: string;
    ultimoAcceso: Date;
    fechaUltimoAcceso: Date;
    fechasEstadisticas: Array<Date>; //Este seria el FK para buscar objetos de estadisticas
}