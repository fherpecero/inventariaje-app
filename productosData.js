export const productosImages = {
  '704001043645': require('./assets/productos/704001043645.webp'),
  '723326333675': require('./assets/productos/723326333675.webp'),
  '723326333682': require('./assets/productos/723326333682.webp'),
  '723326333699': require('./assets/productos/723326333699.webp'),
  '742761499890': require('./assets/productos/742761499890.webp'),
  '742761499937': require('./assets/productos/742761499937.webp'),
  '742968946739': require('./assets/productos/742968946739.webp'),
  '782706461186': require('./assets/productos/782706461186.webp'),
  '782706461193': require('./assets/productos/782706461193.webp'),
  '782706461209': require('./assets/productos/782706461209.webp'),
  '782706461230': require('./assets/productos/782706461230.webp'),
  '782706461247': require('./assets/productos/782706461247.webp'),
  '782706461254': require('./assets/productos/782706461254.webp'),
  '782706461261': require('./assets/productos/782706461261.webp'),
  '782706461278': require('./assets/productos/782706461278.webp'),
  '782706461285': require('./assets/productos/782706461285.webp'),
  '782706461292': require('./assets/productos/782706461292.webp'),
  '782706461322': require('./assets/productos/782706461322.webp'),
  '782706461339': require('./assets/productos/782706461339.webp'),
  '782706461346': require('./assets/productos/782706461346.webp'),
  '782706461360': require('./assets/productos/782706461360.webp'),
  '782706461384': require('./assets/productos/782706461384.webp'),
  '782706461407': require('./assets/productos/782706461407.webp'),
  '782706461421': require('./assets/productos/782706461421.webp'),
  '783495591689': require('./assets/productos/783495591689.webp'),
  '789232455740': require('./assets/productos/789232455740.webp'),
};

export const getImagenProducto = (codigo) => {
  return productosImages[codigo] || null;
};