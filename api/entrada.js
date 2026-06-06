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

      // Obtener cantidad actual
      const snapshot = await db.ref(`inventario/${codigo}/cantidad`).once('value');
      const cantidadActual = snapshot.val() || 0;
      const nuevaCantidad = cantidadActual + parseInt(cantidad);

      // Actualizar en inventario
      await db.ref(`inventario/${codigo}/cantidad`).set(nuevaCantidad);

      // Registrar en log de entradas
      await db.ref('entradas').push().set({
        fecha: new Date().toLocaleDateString('es-MX'),
        producto: producto,
        cantidad: parseInt(cantidad),
        cantidadAnterior: cantidadActual,
        cantidadNueva: nuevaCantidad,
        timestamp: admin.database.ServerValue.TIMESTAMP,
      });

      return res.status(200).json({
        exito: true,
        mensaje: 'Vendimia completada satisfactoriamente',
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