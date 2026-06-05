module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  
  try {
    // TEST: Devolver datos hardcodeados
    if (req.method === 'GET') {
      const { codigo } = req.query;
      
      // Lista de test
      const productosTest = {
        '704001043645': { existe: true, nombre: 'V-CURCUMAX', codigo: '704001043645', cantidad: 1 },
        '782706461339': { existe: true, nombre: 'V-TEDETOX', codigo: '782706461339', cantidad: 23 },
        '783495591689': { existe: true, nombre: 'V-DAILY', codigo: '783495591689', cantidad: 1 },
      };
      
      const producto = productosTest[codigo];
      
      if (producto) {
        return res.status(200).json(producto);
      } else {
        return res.status(200).json({ existe: false });
      }
    }

    if (req.method === 'PUT') {
      const { codigo, cantidad } = req.body;
      
      return res.status(200).json({
        exito: true,
        mensaje: `Cantidad actualizada a ${cantidad}`,
        codigo,
        nuevaCantidad: cantidad,
      });
    }

    return res.status(405).json({ exito: false, mensaje: 'Método no permitido' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      exito: false,
      mensaje: 'Error',
      error: error.message,
    });
  }
};