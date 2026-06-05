const { google } = require('googleapis');

// Credenciales de Google Cloud
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const sheetId = process.env.SHEET_ID;

// Crear cliente de Google Sheets
const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

// Obtener todos los productos
async function obtenerInventario() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Inventario!A2:H1000', // Desde fila 2 (sin encabezados)
    });
    return response.data.values || [];
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    throw error;
  }
}

// Buscar producto por código de barras
async function buscarProductoPorCodigo(codigo) {
  try {
    const filas = await obtenerInventario();
    
    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      if (fila[2] === codigo) { // Columna C = Código
        return {
          existe: true,
          id: fila[0],
          nombre: fila[1],
          codigo: fila[2],
          cantidad: parseInt(fila[3]) || 0,
          precioCosto: parseFloat(fila[4]) || 0,
          precioVenta: parseFloat(fila[5]) || 0,
          fechaActualizacion: fila[6],
          usuarioActualizacion: fila[7],
          fila: i + 2, // Número de fila para actualización
        };
      }
    }
    
    return { existe: false };
  } catch (error) {
    console.error('Error al buscar producto:', error);
    throw error;
  }
}

// Actualizar cantidad en inventario
async function actualizarInventario(codigo, nuevaCantidad, usuario = 'admin') {
  try {
    const producto = await buscarProductoPorCodigo(codigo);
    
    if (!producto.existe) {
      return {
        exito: false,
        mensaje: 'Producto no encontrado',
      };
    }

    const fechaActual = new Date().toLocaleString('es-MX');
    
    // Actualizar en Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Inventario!D${producto.fila}`, // Columna D = Cantidad
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[nuevaCantidad]],
      },
    });

    // Actualizar fecha
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Inventario!G${producto.fila}`, // Columna G = Fecha
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[fechaActual]],
      },
    });

    // Actualizar usuario
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Inventario!H${producto.fila}`, // Columna H = Usuario
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[usuario]],
      },
    });

    return {
      exito: true,
      mensaje: `Inventario actualizado a ${nuevaCantidad} unidades`,
      codigo,
      nuevaCantidad,
    };
  } catch (error) {
    console.error('Error al actualizar inventario:', error);
    throw error;
  }
}

// ENDPOINTS
export default async (req, res) => {
  try {
    // GET: Buscar producto por código
    if (req.method === 'GET') {
      const { codigo } = req.query;

      if (!codigo) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Código de barras requerido',
        });
      }

      const producto = await buscarProductoPorCodigo(codigo);
      return res.status(200).json(producto);
    }

    // PUT: Actualizar cantidad
    if (req.method === 'PUT') {
      const { codigo, cantidad } = req.body;
      const usuario = req.headers['x-usuario'] || 'admin';

      if (!codigo || !cantidad) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Código y cantidad son requeridos',
        });
      }

      const resultado = await actualizarInventario(codigo, cantidad, usuario);
      return res.status(200).json(resultado);
    }

    // Método no permitido
    return res.status(405).json({
      exito: false,
      mensaje: 'Método no permitido',
    });
  } catch (error) {
    console.error('Error en API:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error interno del servidor',
      error: error.message,
    });
  }
};