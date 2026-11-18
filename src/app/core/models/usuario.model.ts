export interface Usuario {
    nombre: string;
    id: number;
    id_reg_financiero: number;
    correo: string;
    contrasena: string; // Solo para la demo: en un sistema real NUNCA se guarda la contraseña en texto plano
    rol: string;        // "usuario" (estudiante) o "administrador"
    bloqueado?: boolean; // true = cuenta bloqueada por el admin. Opcional para compatibilidad con el JSON actual
}