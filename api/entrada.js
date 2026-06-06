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

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    if (req.method === 'POST') {
      const { codigo, producto, cantidad } = req.body;

      if (!codigo || !cantidad) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Pero ponle bien cuantos quieres, no dice',
        });
      }

      // Obtener cantidad actual del inventario
      const snapshot = await db.ref(`inventario/${producto}/codigo`).parent.once('value');
      const productoData = snapshot.val();
      
      if (!productoData) {
        return res.status(400).json({
          exito: false,
          mensaje: 'Producto no encontrado',
        });
      }

      const cantidadActual = productoData.cantidad || 0;
      const nuevaCantidad = cantidadActual + parseInt(cantidad);

      // Actualizar cantidad en inventario
      await db.ref(`inventario/${producto}/cantidad`).set(nuevaCantidad);

      const timestamp = getTimestamp();

      // Registrar en entradas (historial)
      await db.ref('entradas').push().set({
        fecha: timestamp,
        producto: producto,
        codigo: codigo,
        cantidad: parseInt(cantidad),
        cantidadAnterior: cantidadActual,
        cantidadNueva: nuevaCantidad,
      });

      return res.status(200).json({
        exito: true,
        mensaje: 'Vendimia completada satisfactoriamente',
        timestamp: timestamp,
        cantidadNueva: nuevaCantidad,
      });
    }

    return res.status(405).json({
      exito: false,
      mensaje: 'No asi no se puede',
    });
  } catch (error) {
    console.error('Error en API entrada:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Yo falle pero no se por que, soporta',
      error: error.message,
    });
  }
};