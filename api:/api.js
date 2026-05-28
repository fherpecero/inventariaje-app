// Backend API para gestión de inventario
// Deploy en Vercel

const { google } = require('googleapis');

const SHEET_ID = process.env.SHEET_ID || '1FVEJVobtDtQ8yVM8KFHL5YkHGNoKWl9tgRLzKW8rjao';
const SHEETS_RANGE = 'Inventario!A:H';
const VENTAS_RANGE = 'ventas!A:J';

// Inicializar auth
const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// API Handler
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { action, ...params } = req.body;

    switch (action) {
      case 'getProducts':
        return res.json(await getProducts());
      case 'getProductByBarcode':
        return res.json(await getProductByBarcode(params.codigo));
      case 'registerEntrada':
        return res.json(await registerEntrada(params));
      case 'registerSalida':
        return res.json(await registerSalida(params));
      case 'getReportesMonthly':
        return res.json(await getReportesMonthly(params.mes, params.año));
      default:
        return res.status(400).json({ error: 'Action not found' });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: error.message });
  }
}

async function getProducts() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEETS_RANGE,
    });

    const rows = response.data.values || [];
    const products = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0]) {
        products.push({
          nombre: row[0],
          codigo: row[1] || '',
          descripcion: row[2] || '',
          costo: parseFloat(row[4]) || 0,
          precioVenta: parseFloat(row[5]) || 0,
          stock: parseInt(row[7]) || 0,
        });
      }
    }

    return { success: true, products };
  } catch (error) {
    throw new Error('Error fetching products: ' + error.message);
  }
}

async function getProductByBarcode(codigo) {
  const productos = await getProducts();
  const producto = productos.products.find(p => p.codigo === codigo);
  return { success: !!producto, producto };
}

async function registerEntrada(params) {
  try {
    const { nombre, cantidad, usuario } = params;
    const fecha = new Date().toLocaleDateString();
    const hora = new Date().toLocaleTimeString();

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: VENTAS_RANGE,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[fecha, nombre, cantidad, 0, 0, 'ENTRADA', hora, '', 0, usuario]],
      },
    });

    return { success: true, message: 'Entrada registrada' };
  } catch (error) {
    throw new Error('Error registering entrada: ' + error.message);
  }
}

async function registerSalida(params) {
  try {
    const { nombre, cantidad, precio, descuento, usuario, cliente } = params;
    const fecha = new Date().toLocaleDateString();
    const hora = new Date().toLocaleTimeString();
    const ganancia = (precio * cantidad) - (precio * cantidad * (descuento / 100));

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: VENTAS_RANGE,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[fecha, nombre, cantidad, precio, descuento, 'VENTA', hora, cliente || '', ganancia, usuario]],
      },
    });

    return { success: true, message: 'Venta registrada', ganancia };
  } catch (error) {
    throw new Error('Error registering salida: ' + error.message);
  }
}

async function getReportesMonthly(mes, año) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: VENTAS_RANGE,
    });

    const rows = response.data.values || [];
    const reportes = {
      ingresosTotales: 0,
      egresosTotales: 0,
      gananciaTotal: 0,
      totalVentas: 0,
      totalEntradas: 0,
      productosTopVendidos: [],
      productosBottomVendidos: [],
      historico: [],
    };

    return { success: true, ...reportes };
  } catch (error) {
    throw new Error('Error generating reports: ' + error.message);
  }
}