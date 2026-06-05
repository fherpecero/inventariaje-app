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

const PRODUCTOS = [
  { nombre: 'V-DAILY', codigo: '783495591689', descripcion: '1 BOLSA DE 150 G', cantidad: 1, precioCosto: 800, precioVenta: 1600 },
  { nombre: 'V-CURCUMAX', codigo: '704001043645', descripcion: '1 BOLSA CON 60 CÁPSULAS', cantidad: 1, precioCosto: 425, precioVenta: 850 },
  { nombre: 'V-LATTEKAFFE', codigo: '742761499890', descripcion: '1 BOLSA DE 330 G', cantidad: 1, precioCosto: 600, precioVenta: 1200 },
  { nombre: 'KETO + BHB', codigo: '789232455740', descripcion: '1 BOLSA DE 185 G', cantidad: 2, precioCosto: 900, precioVenta: 1800 },
  { nombre: 'V-TEDETOX', codigo: '782706461339', descripcion: '1 BOLSA DE TÉ DE 8 G', cantidad: 23, precioCosto: 175, precioVenta: 350 },
  { nombre: 'GLUTATION PLUS', codigo: '782706461278', descripcion: '1 FRASCO DE 50 ML', cantidad: 1, precioCosto: 700, precioVenta: 1400 },
  { nombre: 'V-ASCULAX', codigo: '782706461254', descripcion: '1 BOLSA CON 60 CÁPSULAS', cantidad: 0, precioCosto: 350, precioVenta: 700 },
  { nombre: 'V-ITALAY', codigo: '782706461209', descripcion: '1 BOLSA CON 60 CÁPSULAS', cantidad: 2, precioCosto: 350, precioVenta: 700 },
  { nombre: 'V-NITRO', codigo: '782706461407', descripcion: '1 FRASCO DE 50 ML', cantidad: 4, precioCosto: 600, precioVenta: 1200 },
  { nombre: 'V-GLUCALOSE', codigo: '782706461261', descripcion: '1 BOLSA CON 60 CÁPSULAS', cantidad: 3, precioCosto: 350, precioVenta: 700 },
  { nombre: 'V-ORGANEX', codigo: '782706461193', descripcion: '1 BOLSA CON 60 CÁPSULAS', cantidad: 4, precioCosto: 350, precioVenta: 700 },
  { nombre: 'V-ITAREN', codigo: '782706461186', descripcion: '1 BOLSA CON 60 CÁPSULAS', cantidad: 4, precioCosto: 350, precioVenta: 700 },
  { nombre: 'GENIUS SHAKE', codigo: '723326333682', descripcion: '1 BOLSA DE 340 G', cantidad: 2, precioCosto: 700, precioVenta: 1400 },
  { nombre: 'V-SMOOTHIE', codigo: '742761499937', descripcion: '1 BOLSA DE 300 G', cantidad: 1, precioCosto: 450, precioVenta: 900 },
  { nombre: 'V-KETOKAFE BHB', codigo: '782706461384', descripcion: '1 BOLSA DE 150 G', cantidad: 2, precioCosto: 625, precioVenta: 1250 },
  { nombre: 'V-LOVKAFE', codigo: '782706461360', descripcion: '1 BOLSA DE 150 G', cantidad: 3, precioCosto: 450, precioVenta: 900 },
  { nombre: 'VITARLY-L', codigo: '782706461230', descripcion: '1 BOLSA CON 60 CÁPSULAS', cantidad: 2, precioCosto: 375, precioVenta: 750 },
  { nombre: 'V-ITALBOOST', codigo: '782706461247', descripcion: '1 BOLSA CON 60 CÁPSULAS', cantidad: 3, precioCosto: 425, precioVenta: 850 },
  { nombre: 'V-TEDETOX MORAS', codigo: '789232464094', descripcion: 'FRUTOS ROJOS', cantidad: 8, precioCosto: 175, precioVenta: 350 },
  { nombre: 'V-ITADOL', codigo: '782706461285', descripcion: '1 BOLSA CON 60 CÁPSULAS', cantidad: 3, precioCosto: 350, precioVenta: 700 },
  { nombre: 'SMART BIOTICS KIDS', codigo: '723326333675', descripcion: '1 FRASCO DE 165 G', cantidad: 2, precioCosto: 400, precioVenta: 800 },
  { nombre: 'DFENCE KIDS', codigo: '723326333699', descripcion: '1 FRASCO DE 135 G', cantidad: 2, precioCosto: 400, precioVenta: 800 },
  { nombre: 'V-FORTYFLORA', codigo: '782706461322', descripcion: '1 BOLSA CON 60 CÁPSULAS', cantidad: 1, precioCosto: 350, precioVenta: 700 },
  { nombre: 'V-NRGY TROPICAL', codigo: '742968946739', descripcion: '1 FRASCO DE 90 G', cantidad: 1, precioCosto: 400, precioVenta: 800 },
  { nombre: 'V-control', codigo: '782706461292', descripcion: '1 BOLSA CON 60 CÁPSULAS', cantidad: 2, precioCosto: 350, precioVenta: 700 },
  { nombre: 'V-OMEGA3', codigo: '782706461421', descripcion: '1 BOLSA CON 90 CÁPSULAS', cantidad: 0, precioCosto: 750, precioVenta: 1500 },
  { nombre: 'V-NEUROKAFE', codigo: '782706461346', descripcion: '1 BOLSA DE 150 G', cantidad: 2, precioCosto: 450, precioVenta: 900 },
];

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    // Solo permitir en desarrollo
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        exito: false,
        mensaje: 'No permitido en producción',
      });
    }

    // Cargar productos a Firebase
    const inventarioRef = db.ref('inventario');
    await inventarioRef.set({});

    for (const producto of PRODUCTOS) {
      await db.ref(`inventario/${producto.codigo}`).set(producto);
    }

    return res.status(200).json({
      exito: true,
      mensaje: `${PRODUCTOS.length} productos cargados exitosamente`,
      productos: PRODUCTOS.length,
    });
  } catch (error) {
    console.error('Error al cargar productos:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error al cargar productos',
      error: error.message,
    });
  }
};