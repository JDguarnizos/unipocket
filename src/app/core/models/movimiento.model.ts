// Modelo de un movimiento (ingreso o gasto).
// Define la "forma" de los datos que produce el formulario del modal "Registrar movimiento".
export interface Movimiento {
  tipo: 'gasto' | 'ingreso';
  monto: number;
  categoria: string;
  fecha: string;        // formato AAAA-MM-DD
  descripcion: string;  // opcional: puede venir vacía
}

// Movimiento tal como se guarda en la API local (public/local-auth-api/movimientos.json).
// Es el mismo Movimiento + el id del usuario dueño, para saber de quién es cada uno.
// (Mismo estilo que usa Juan: Admin extends Usuario)
export interface MovimientoUsuario extends Movimiento {
  idUsuario: number;
}
