module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    // TEST SIN Google Sheets - solo datos hardcodeados
    if (req.method === 'GET') {
      const productosTest = [
        {
          nombre: 'V-DAILY',
          codigo: '783495591689',
          descripcion: '1 BOLSA DE 150 G',
          cantidad: 1,
          precioCosto: 800,
          precioVenta: 1600,
        },
        {
          nombre: 'V-CURCUMAX',
          codigo: '704001043645',
          descripcion: '1 BOLSA CON 60 CÁPSULAS',
          cantidad: 1,
          precioCosto: 425,
          precioVenta: 850,
        },
      ];

      return res.status(200).json({
        exito: true,
        productos: productosTest,
      });
    }

    return res.status(405).json({ exito: false, mensaje: 'No asi no se puede' });
  } catch (error) {
    return res.status(500).json({
      exito: false,
      mensaje: 'Error test',
      error: error.message,
    });
  }
};