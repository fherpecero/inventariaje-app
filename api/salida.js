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

function getTimestamp() {
  const ahora = new Date();
  const año = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const día = String(ahora.getDate()).padStart(2, '0');
  const hora = String(ahora.getHours()).padStart(2, '0');
  const minuto = String(ahora.getMinutes()).padStart(2, '0');
  const segundo = String(ahora.getSeconds()).padStart(2, '0');
  return `${año}-${mes}-${día} ${hora}:${minuto}:${segundo}`;
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
      const { codigo, producto, cantidad, descuento, cliente } = req.body;

      if (!codigo || !cantidad) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Pero ponle bien cuantos quieres, no dice',
        });
      }

      // Obtener producto del inventario
      const snapshot = await db.ref(`inventario/${producto}`).once('value');
      const productoData = snapshot.val();

      if (!productoData) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Producto no encontrado',
        });
      }

      const cantidadActual = productoData.cantidad || 0;
      const cantidadVenta = parseInt(cantidad);

      // Verificar stock
      if (cantidadActual < cantidadVenta) {
        return res.status(400).json({
          exito: false,
          mensaje: `No tienes tantos. Disponible: ${cantidadActual}`,
        });
      }

      const nuevaCantidad = cantidadActual - cantidadVenta;
      const precioUnitario = productoData.precioVenta || 0;
      const precioTotal = precioUnitario * cantidadVenta; // ← PRECIO TOTAL
      const descuentoAplicado = (precioTotal * (parseFloat(descuento) || 0)) / 100;
      const totalFinal = precioTotal - descuentoAplicado;

      // Restar del inventario
      await db.ref(`inventario/${producto}/cantidad`).set(nuevaCantidad);

      const timestamp = getTimestamp();

      // Registrar venta
      await db.ref('ventas').push().set({
        fecha: timestamp,
        producto: producto,
        codigo: codigo,
        cantidad: cantidadVenta,
        precioUnitario: precioUnitario,
        precioTotal: precioTotal,  // ← TOTAL
        descuentoPorcentaje: parseFloat(descuento) || 0,
        descuentoDolar: descuentoAplicado,
        totalFinal: totalFinal,
        cliente: cliente || '',
        timestamp: admin.database.ServerValue.TIMESTAMP,
      });

      return res.status(200).json({
        exito: true,
        mensaje: 'Vendimia completada satisfactoriamente',
        timestamp: timestamp,
        cantidadRestante: nuevaCantidad,
        totalFinal: totalFinal,
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