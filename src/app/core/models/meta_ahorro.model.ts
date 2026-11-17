// Esto es una meta de ahorro
// Nada relacionado con el sufijo griego
export interface MetaAhorro {
    idUsuario: number;
    nombre: string;
    listaAportes: { monto: number; fechaAporte: string | null }[];
    valorObjetivo: number;
    fechaLimite: string;
    completado: boolean;
}