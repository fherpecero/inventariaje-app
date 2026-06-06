const admin = require('firebase-admin');

let db;

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
      const { codigo, producto, cantidad, precio, descuento, cliente } = req.body;

      if (!codigo || !cantidad) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Pero ponle bien cuantos quieres, no dice',
        });
      }

      // Obtener cantidad actual
      const snapshot = await db.ref(`inventario/${codigo}/cantidad`).once('value');
      const cantidadActual = snapshot.val() || 0;

      // Verificar stock
      if (cantidadActual < parseInt(cantidad)) {
        return res.status(400).json({
          exito: false,
          mensaje: `Stock insuficiente. Disponible: ${cantidadActual}`,
        });
      }

      const nuevaCantidad = cantidadActual - parseInt(cantidad);

      // Restar del inventario
      await db.ref(`inventario/${codigo}/cantidad`).set(nuevaCantidad);

      // Registrar venta
      await db.ref('ventas').push().set({
        fecha: new Date().toLocaleDateString('es-MX'),
        producto: producto,
        codigo: codigo,
        cantidad: parseInt(cantidad),
        precio: parseFloat(precio) || 0,
        descuento: parseFloat(descuento) || 0,
        cliente: cliente || '',
        timestamp: admin.database.ServerValue.TIMESTAMP,
      });

      return res.status(200).json({
        exito: true,
        mensaje: 'Vendimia completada satisfactoriamente',
        cantidadRestante: nuevaCantidad,
      });
    }

    return res.status(405).json({
      exito: false,
      mensaje: 'No asi no se puede',
    });
  } catch (error) {
    console.error('Error en API salida:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Yo falle pero no se por que, soporta',
      error: error.message,
    });
  }
};