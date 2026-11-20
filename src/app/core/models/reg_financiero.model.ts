export interface RegistroFinanciero {
    idUsuario: number;
    totalIngresos: number;
    presupuesto: number;
    totalGastos: number;
    // Nuevo (RF06, RNF09): cuánto del presupuesto se asigna a cada categoría de gasto.
    // Es opcional: si un registro no lo trae, simplemente no hay comparativa por categoría.
    presupuestoCategorias?: { categoria: string; monto: number }[];
}