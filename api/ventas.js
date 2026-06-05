const { google } = require('googleapis');

const privateKey = process.env.GCP_PRIVATE_KEY.replace(/\\n/g, '\n');
const serviceAccountEmail = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
const projectId = process.env.GCP_PROJECT_ID;
const sheetId = process.env.SHEET_ID;

const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  }),
});

async function registrarVenta(data) {
  try {
    const ahora = new Date();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const día = String(ahora.getDate()).padStart(2, '0');
    const año = ahora.getFullYear();
    const fechaFormato = `${mes}/${día}/${año}`;

    const nuevaFila = [
      fechaFormato,
      data.producto,
      data.cantidad,
      data.precio || 0,
      data.descuento || 0,
      data.cliente || '',
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Ventas!A:F',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [nuevaFila],
      },
    });

    return {
      exito: true,
      mensaje: 'Vendimia completada satisfactoriamente',
      timestamp: fechaFormato,
    };
  } catch (error) {
    console.error('No quedo, algo salio rancio:', error);
    throw error;
  }
}

async function obtenerProductos() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Inventario!A2:G1000',
    });
    
    const productos = [];
    const filas = response.data.values || [];
    
    for (let fila of filas) {
      if (fila[0] && fila[1]) {
        productos.push({
          nombre: fila[0],
          codigo: fila[1],
          descripcion: fila[2] || '',
          cantidad: parseInt(fila[6]) || 0,
          precioCosto: parseFloat(fila[4]) || 0,
          precioVenta: parseFloat(fila[5]) || 0,
        });
      }
    }
    
    return productos;
  } catch (error) {
    console.error('Error al obtener productos:', error);
    throw error;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    if (req.method === 'GET') {
      const productos = await obtenerProductos();
      return res.status(200).json({
        exito: true,
        productos,
      });
    }

    if (req.method === 'POST') {
      const { producto, cantidad, precio, descuento, cliente } = req.body;

      if (!producto || !cantidad) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Pero ponle bien cuantos quieres, no dice',
        });
      }

      const resultado = await registrarVenta({
        producto,
        cantidad: parseInt(cantidad),
        precio: parseFloat(precio) || 0,
        descuento: parseFloat(descuento) || 0,
        cliente: cliente || '',
      });

      return res.status(200).json(resultado);
    }

    return res.status(405).json({
      exito: false,
      mensaje: 'No asi no se puede',
    });
  } catch (error) {
    console.error('Error en API:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Yo falle pero no se por que, soporta',
      error: error.message,
    });
  }
};