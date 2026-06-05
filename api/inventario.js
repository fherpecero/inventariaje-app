const { google } = require('googleapis');

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
const sheetId = process.env.SHEET_ID;

const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

async function obtenerInventario() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Inventario!A2:H1000',
    });
    return response.data.values || [];
  } catch (error) {
    console.error('Error al obtener inventario:', error);
    throw error;
  }
}

async function buscarProductoPorCodigo(codigo) {
  try {
    const filas = await obtenerInventario();
    
    for (let i = 0; i < filas.length; i++) {
      const fila = filas[i];
      if (fila[1] === codigo) {
        return {
          existe: true,
          id: fila[0],
          nombre: fila[0],
          codigo: fila[1],
          cantidad: parseInt(fila[3]) || 0,
          precioCosto: parseFloat(fila[4]) || 0,
          precioVenta: parseFloat(fila[5]) || 0,
          fila: i + 2,
        };
      }
    }
    
    return { existe: false };
  } catch (error) {
    console.error('Error al buscar producto:', error);
    throw error;
  }
}

async function actualizarInventario(codigo, nuevaCantidad, usuario = 'admin') {
  try {
    const producto = await buscarProductoPorCodigo(codigo);
    
    if (!producto.existe) {
      return {
        exito: false,
        mensaje: 'Producto no encontrado',
      };
    }

    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const día = String(ahora.getDate()).padStart(2, '0');
    const hora = String(ahora.getHours()).padStart(2, '0');
    const minuto = String(ahora.getMinutes()).padStart(2, '0');
    const segundo = String(ahora.getSeconds()).padStart(2, '0');
    const timestamp = `${año}-${mes}-${día} ${hora}:${minuto}:${segundo}`;

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Inventario!D${producto.fila}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[nuevaCantidad]],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Inventario!G${producto.fila}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[timestamp]],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `Inventario!H${producto.fila}`,
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

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
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