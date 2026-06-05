const admin = require('firebase-admin');

let db;

// Inicializar Firebase (solo una vez)
if (!admin.apps.length) {
  const credentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);
  
  admin.initializeApp({
    credential: admin.credential.cert(credentials),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
  
  db = admin.database();
}

async function obtenerProductos() {
  try {
    const snapshot = await db.ref('inventario').once('value');
    const productos = [];
    
    snapshot.forEach((childSnapshot) => {
      const producto = childSnapshot.val();
      if (producto.nombre && producto.codigo) {
        productos.push({
          nombre: producto.nombre,
          codigo: producto.codigo,
          descripcion: producto.descripcion || '',
          cantidad: producto.cantidad || 0,
          precioCosto: producto.precioCosto || 0,
          precioVenta: producto.precioVenta || 0,
        });
      }
    });
    
    return productos;
  } catch (error) {
    console.error('Error obtener productos:', error);
    throw error;
  }
}

async function registrarVenta(data) {
  try {
    const ahora = new Date();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const día = String(ahora.getDate()).padStart(2, '0');
    const año = ahora.getFullYear();
    const fechaFormato = `${mes}/${día}/${año}`;

    const venta = {
      fecha: fechaFormato,
      producto: data.producto,
      cantidad: parseInt(data.cantidad),
      precio: parseFloat(data.precio) || 0,
      descuento: parseFloat(data.descuento) || 0,
      cliente: data.cliente || '',
      timestamp: admin.database.ServerValue.TIMESTAMP,
    };

    // Guardar venta en Firebase
    const ventaRef = db.ref('ventas').push();
    await ventaRef.set(venta);

    return {
      exito: true,
      mensaje: 'Vendimia completada satisfactoriamente',
      timestamp: fechaFormato,
      ventaId: ventaRef.key,
    };
  } catch (error) {
    console.error('Error registrar venta:', error);
    throw error;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    // GET: Obtener productos
    if (req.method === 'GET') {
      const productos = await obtenerProductos();
      return res.status(200).json({
        exito: true,
        productos,
      });
    }

    // POST: Registrar venta
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
        cantidad,
        precio,
        descuento,
        cliente,
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