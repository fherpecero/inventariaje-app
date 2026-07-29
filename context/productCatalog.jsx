/**
 * PRODUCT CATALOG - Source of Truth Local
 * 
 * Este archivo es la fuente única de verdad para productos en toda la app.
 * - Una sola lectura al iniciar la app
 * - Sin consultas a Firestore por cada venta
 * - Cambios aquí se propagan automáticamente a todo
 * 
 * Estructura: Espejo exacto de Firestore con imagen añadida
 */

export const PRODUCT_CATALOG = {
  '723326333699': {
    codigo: '723326333699',
    nombre: 'DFENCE KIDS',
    descripcion: '1 FRASCO DE 135 G',
    categoria: 'kids',
    precioCostoStandard: 400,
    precioVentaStandard: 800,
    stock: 2,
    activo: true,
    imagen: require('../assets/productos/723326333699.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '723326333682': {
    codigo: '723326333682',
    nombre: 'GENIUS SHAKE',
    descripcion: '1 BOLSA DE 340 G',
    categoria: 'kids',
    precioCostoStandard: 700,
    precioVentaStandard: 1400,
    stock: 2,
    activo: true,
    imagen: require('../assets/productos/723326333682.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '704001003502': {
    codigo: '704001003502',
    nombre: 'GLUTATION PLUS',
    descripcion: '1 FRASCO DE 50 ML',
    categoria: 'gotas',
    precioCostoStandard: 700,
    precioVentaStandard: 1400,
    stock: 2,
    activo: true,
    imagen: require('../assets/productos/704001003502.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '789232455740': {
    codigo: '789232455740',
    nombre: 'KETO + BHB',
    descripcion: '1 BOLSA DE 185 G',
    categoria: 'polvo',
    precioCostoStandard: 900,
    precioVentaStandard: 1800,
    stock: 2,
    activo: true,
    imagen: require('../assets/productos/789232455740.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '723326333675': {
    codigo: '723326333675',
    nombre: 'SMART BIOTICS KIDS',
    descripcion: '1 FRASCO DE 165 G',
    categoria: 'kids',
    precioCostoStandard: 400,
    precioVentaStandard: 800,
    stock: 2,
    activo: true,
    imagen: require('../assets/productos/723326333675.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461254': {
    codigo: '782706461254',
    nombre: 'V-ASCULAX',
    descripcion: '1 BOLSA CON 60 CÁPSULAS',
    categoria: 'capsulas',
    precioCostoStandard: 350,
    precioVentaStandard: 700,
    stock: 1,
    activo: true,
    imagen: require('../assets/productos/782706461254.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461292': {
    codigo: '782706461292',
    nombre: 'V-CONTROL',
    descripcion: '1 BOLSA CON 60 CÁPSULAS',
    categoria: 'capsulas',
    precioCostoStandard: 350,
    precioVentaStandard: 700,
    stock: 2,
    activo: true,
    imagen: require('../assets/productos/782706461292.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '704001043645': {
    codigo: '704001043645',
    nombre: 'V-CURCUMAX',
    descripcion: '1 BOLSA CON 60 CÁPSULAS',
    categoria: 'capsulas',
    precioCostoStandard: 425,
    precioVentaStandard: 850,
    stock: 1,
    activo: true,
    imagen: require('../assets/productos/704001043645.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '783495591689': {
    codigo: '783495591689',
    nombre: 'V-DAILY',
    descripcion: '1 BOLSA DE 150 G',
    categoria: 'polvo',
    precioCostoStandard: 800,
    precioVentaStandard: 1600,
    stock: 1,
    activo: true,
    imagen: require('../assets/productos/783495591689.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461322': {
    codigo: '782706461322',
    nombre: 'V-FORTYFLORA',
    descripcion: '1 BOLSA CON 60 CÁPSULAS',
    categoria: 'capsulas',
    precioCostoStandard: 350,
    precioVentaStandard: 700,
    stock: 1,
    activo: true,
    imagen: require('../assets/productos/782706461322.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461261': {
    codigo: '782706461261',
    nombre: 'V-GLUCALOSE',
    descripcion: '1 BOLSA CON 60 CÁPSULAS',
    categoria: 'capsulas',
    precioCostoStandard: 350,
    precioVentaStandard: 700,
    stock: 4,
    activo: true,
    imagen: require('../assets/productos/782706461261.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461278': {
    codigo: '782706461278',
    nombre: 'V-GLUTATION',
    descripcion: '1 BOLSA CON 60 CÁPSULAS',
    categoria: 'capsulas',
    precioCostoStandard: 835,
    precioVentaStandard: 1670,
    stock: 0,
    activo: true,
    imagen: require('../assets/productos/782706461278.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461285': {
    codigo: '782706461285',
    nombre: 'V-ITADOL',
    descripcion: '1 BOLSA CON 60 CÁPSULAS',
    categoria: 'capsulas',
    precioCostoStandard: 350,
    precioVentaStandard: 700,
    stock: 3,
    activo: true,
    imagen: require('../assets/productos/782706461285.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461209': {
    codigo: '782706461209',
    nombre: 'V-ITALAY',
    descripcion: '1 BOLSA CON 60 CÁPSULAS',
    categoria: 'capsulas',
    precioCostoStandard: 350,
    precioVentaStandard: 700,
    stock: 2,
    activo: true,
    imagen: require('../assets/productos/782706461209.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461247': {
    codigo: '782706461247',
    nombre: 'V-ITALBOOST',
    descripcion: '1 BOLSA CON 60 CÁPSULAS',
    categoria: 'capsulas',
    precioCostoStandard: 425,
    precioVentaStandard: 850,
    stock: 3,
    activo: true,
    imagen: require('../assets/productos/782706461247.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '783495495154': {
    codigo: '783495495154',
    nombre: 'VITALAGE COLLAGEN',
    descripcion: '1 BOLSA DE 300 G',
    categoria: 'polvo',
    precioCostoStandard: 720,
    precioVentaStandard: 1440,
    stock: 4,
    activo: true,
    imagen: require('../assets/productos/783495495154.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
   '789233333333': {
    codigo: '789233333333',
    nombre: 'V-PRIME',
    descripcion: '1 BOLSA CON 60 CÁPSULAS',
    categoria: 'capsulas',
    precioCostoStandard: 400,
    precioVentaStandard: 800,
    stock: 4,
    activo: true,
    imagen: require('../assets/productos/789233333333.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '789222222222': {
    codigo: '789222222222',
    nombre: 'V-HARMONY',
    descripcion: '1 BOLSA CON 60 CÁPSULAS',
    categoria: 'capsulas',
    precioCostoStandard: 400,
    precioVentaStandard: 800,
    stock: 4,
    activo: true,
    imagen: require('../assets/productos/789222222222.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461186': {
    codigo: '782706461186',
    nombre: 'V-ITAREN',
    descripcion: '1 BOLSA CON 60 CÁPSULAS',
    categoria: 'capsulas',
    precioCostoStandard: 350,
    precioVentaStandard: 700,
    stock: 4,
    activo: true,
    imagen: require('../assets/productos/782706461186.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461384': {
    codigo: '782706461384',
    nombre: 'V-KETOKAFE BHB',
    descripcion: '1 BOLSA DE 150 G',
    categoria: 'cafe',
    precioCostoStandard: 625,
    precioVentaStandard: 1250,
    stock: 2,
    activo: true,
    imagen: require('../assets/productos/782706461384.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '742761499890': {
    codigo: '742761499890',
    nombre: 'V-LATTEKAFFE',
    descripcion: '1 BOLSA DE 330 G',
    categoria: 'cafe',
    precioCostoStandard: 600,
    precioVentaStandard: 1200,
    stock: 1,
    activo: true,
    imagen: require('../assets/productos/742761499890.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461360': {
    codigo: '782706461360',
    nombre: 'V-LOVKAFE',
    descripcion: '1 BOLSA DE 150 G',
    categoria: 'cafe',
    precioCostoStandard: 450,
    precioVentaStandard: 900,
    stock: 3,
    activo: true,
    imagen: require('../assets/productos/782706461360.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461346': {
    codigo: '782706461346',
    nombre: 'V-NEUROKAFE',
    descripcion: '1 BOLSA DE 150 G',
    categoria: 'cafe',
    precioCostoStandard: 450,
    precioVentaStandard: 900,
    stock: 3,
    activo: true,
    imagen: require('../assets/productos/782706461346.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461407': {
    codigo: '782706461407',
    nombre: 'V-NITRO',
    descripcion: '1 FRASCO DE 50 ML',
    categoria: 'gotas',
    precioCostoStandard: 600,
    precioVentaStandard: 1200,
    stock: 5,
    activo: true,
    imagen: require('../assets/productos/782706461407.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '742968946739': {
    codigo: '742968946739',
    nombre: 'V-NRGY TROPICAL',
    descripcion: '1 FRASCO DE 90 G',
    categoria: 'polvo',
    precioCostoStandard: 400,
    precioVentaStandard: 800,
    stock: 1,
    activo: true,
    imagen: require('../assets/productos/742968946739.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461421': {
    codigo: '782706461421',
    nombre: 'V-OMEGA3',
    descripcion: '1 BOLSA CON 90 CÁPSULAS',
    categoria: 'capsulas',
    precioCostoStandard: 750,
    precioVentaStandard: 1500,
    stock: 2,
    activo: true,
    imagen: require('../assets/productos/782706461421.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461193': {
    codigo: '782706461193',
    nombre: 'V-ORGANEX',
    descripcion: '1 BOLSA CON 60 CÁPSULAS',
    categoria: 'capsulas',
    precioCostoStandard: 350,
    precioVentaStandard: 700,
    stock: 5,
    activo: true,
    imagen: require('../assets/productos/782706461193.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '742761499937': {
    codigo: '742761499937',
    nombre: 'V-SMOOTHIE',
    descripcion: '1 BOLSA DE 300 G',
    categoria: 'polvo',
    precioCostoStandard: 450,
    precioVentaStandard: 900,
    stock: 1,
    activo: true,
    imagen: require('../assets/productos/742761499937.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461339': {
    codigo: '782706461339',
    nombre: 'V-TEDETOX',
    descripcion: '1 BOLSA DE TÉ DE 8 G',
    categoria: 'te',
    precioCostoStandard: 175,
    precioVentaStandard: 350,
    stock: 23,
    activo: true,
    imagen: require('../assets/productos/782706461339.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '789232464094': {
    codigo: '789232464094',
    nombre: 'V-TEDETOX MORAS',
    descripcion: 'FRUTOS ROJOS',
    categoria: 'te',
    precioCostoStandard: 175,
    precioVentaStandard: 350,
    stock: 10,
    activo: true,
    imagen: require('../assets/productos/789232464094.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461353': {
    codigo: '782706461353',
    nombre: 'V-THERMOKAFE',
    descripcion: '1 BOLSA DE 150 G',
    categoria: 'cafe',
    precioCostoStandard: 450,
    precioVentaStandard: 900,
    stock: 0,
    activo: true,
    imagen: require('../assets/productos/782706461353.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461414': {
    codigo: '782706461414',
    nombre: 'VITALPRO',
    descripcion: '1 BOLSA DE 300 G',
    categoria: 'polvo',
    precioCostoStandard: 750,
    precioVentaStandard: 1500,
    stock: 0,
    activo: true,
    imagen: require('../assets/productos/782706461414.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  },
  '782706461230': {
    codigo: '782706461230',
    nombre: 'VITARLY-L',
    descripcion: '1 BOLSA CON 60 CÁPSULAS',
    categoria: 'capsulas',
    precioCostoStandard: 375,
    precioVentaStandard: 750,
    stock: 3,
    activo: true,
    imagen: require('../assets/productos/782706461230.webp'),
    createdAt: new Date('2026-06-11'),
    updatedAt: new Date('2026-06-11'),
    createdBy: 'populate-catalog'
  }
};

/**
 * HELPER FUNCTIONS
 */

// Obtener producto por código/SKU
export const getProducto = (codigo) => {
  return PRODUCT_CATALOG[codigo];
};

// Obtener nombre de producto
export const getNombreProducto = (codigo) => {
  return PRODUCT_CATALOG[codigo]?.nombre || 'Producto no encontrado';
};

// Obtener precio de venta
export const getPrecioVenta = (codigo) => {
  return PRODUCT_CATALOG[codigo]?.precioVentaStandard || 0;
};

// Obtener precio de costo
export const getPrecioCosto = (codigo) => {
  return PRODUCT_CATALOG[codigo]?.precioCostoStandard || 0;
};

// Obtener imagen del producto
export const getImagenProducto = (codigo) => {
  return PRODUCT_CATALOG[codigo]?.imagen || null;
};

// Obtener lista para dropdown
export const getListaProductosParaDropdown = () => {
  return Object.values(PRODUCT_CATALOG)
    .filter(p => p.activo)
    .map(p => ({
      label: p.nombre,
      value: p.codigo
    }));
};

// Obtener todos los productos activos
export const getProductosActivos = () => {
  return Object.values(PRODUCT_CATALOG).filter(p => p.activo);
};

// Obtener productos por categoría
export const getProductosPorCategoria = (categoria) => {
  return Object.values(PRODUCT_CATALOG).filter(
    p => p.activo && p.categoria === categoria
  );
};

// Obtener todas las categorías únicas
export const getCategorias = () => {
  const categorias = new Set(
    Object.values(PRODUCT_CATALOG)
      .filter(p => p.activo)
      .map(p => p.categoria)
  );
  return Array.from(categorias).sort();
};

// Validar si un código existe
export const productoExiste = (codigo) => {
  return !!PRODUCT_CATALOG[codigo];
};

// Calcular ganancia de un producto
export const calcularGanancia = (codigo) => {
  const producto = PRODUCT_CATALOG[codigo];
  if (!producto) return 0;
  return producto.precioVentaStandard - producto.precioCostoStandard;
};

// Calcular margen de ganancia (%)
export const calcularMargenGanancia = (codigo) => {
  const producto = PRODUCT_CATALOG[codigo];
  if (!producto || producto.precioCostoStandard === 0) return 0;
  const ganancia = producto.precioVentaStandard - producto.precioCostoStandard;
  return (ganancia / producto.precioCostoStandard) * 100;
};