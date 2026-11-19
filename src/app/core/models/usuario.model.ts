export interface Usuario {
    nombre: string;
    id: number;
    id_reg_financiero: number;
    // Campos agregados para el login (Nicolás):
    correo: string;
    contrasena: string; // Solo para la demo: en un sistema real NUNCA se guarda la contraseña en texto plano
    rol: string;        // "usuario" (estudiante) o "administrador"
    // Campo agregado para el panel de administrador (Nicolás, RF14):
    bloqueado?: boolean; // opcional: si no viene en el JSON, la cuenta está activa
}