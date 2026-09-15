/**
 * REGLAS DE NEGOCIO CENTRALIZADAS (Single Source of Truth Matemático)
 * Creado para aislar la lógica financiera y evitar discrepancias entre pantallas.
 */

// ==========================================
// REGLA 1: CÁLCULO DE COSTO UNITARIO EXACTO
// ==========================================
export const calcularCostoUnitario = (producto, esBonoInfluencer) => {
  if (!producto) return 0;
  
  const precioVenta = parseFloat(producto.precioVentaStandard || 0);
  
  // REGLA: Si es bono, el costo es estrictamente el 10% del precio de venta público.
  if (esBonoInfluencer) {
    return precioVenta * 0.10;
  }
  
  // REGLA: Si es producto regular, usamos el costo estándar del catálogo.
  return parseFloat(producto.precioCostoStandard || 0);
};

// ==========================================
// REGLA 2: CÁLCULO DE GANANCIA REAL (PROFIT)
// ==========================================
export const calcularGananciaTransaccion = (producto, precioCobradoAlCliente, esBonoInfluencer) => {
  const costoReal = calcularCostoUnitario(producto, esBonoInfluencer);
  
  // REGLA: Ganancia = Ingreso - Costo. 
  // Nota: Si el producto fue cortesía (precioCobrado = 0), esto arrojará 
  // un número negativo (pérdida exacta), lo cual es contablemente correcto.
  return precioCobradoAlCliente - costoReal;
};

// ==========================================
// REGLA 3: ESTRUCTURACIÓN DE INVENTARIO PARA FIREBASE
// ==========================================
export const calcularNuevoStock = (productoEnBD, cantidadMover, esSalida, esBonoInfluencer) => {
  // 1. Extraemos las bases numéricas de Firebase
  let cantidadTotalActual = parseInt(productoEnBD?.cantidad) || 0;
  let stockBonoActual = parseInt(productoEnBD?.piezasConDescuento) || 0;

  const factor = esSalida ? -1 : 1;
  const ajuste = cantidadMover * factor;

  // 2. REGLA SUPREMA: 'cantidad' SIEMPRE refleja el inventario físico total.
  // Esto garantiza que ExistenciasScreen y HomeScreen jamás muestren 0 por error.
  cantidadTotalActual += ajuste;

  // 3. REGLA SECUNDARIA: Si es un Bono Influencer, afectamos también el sub-contador.
  if (esBonoInfluencer) {
    stockBonoActual += ajuste;
  }

  // 4. PREVENCIÓN DE ERRORES: Candados financieros
  if (cantidadTotalActual < 0) cantidadTotalActual = 0;
  if (stockBonoActual < 0) stockBonoActual = 0;
  
  // Seguro anti-desfases: Nunca puedes tener más piezas con descuento que piezas físicas totales
  if (stockBonoActual > cantidadTotalActual) {
    stockBonoActual = cantidadTotalActual;
  }

  return {
    cantidad: cantidadTotalActual,
    piezasConDescuento: stockBonoActual,
    updatedAt: new Date().toISOString()
  };
};

// ==========================================
// CEREBRO MATEMATICO DE ANALYTICS
// ==========================================
export const calcularMetricasAnalytics = (movimientos, productosLocales, diasFiltro) => {
  let totalVentas = 0;
  let totalGastos = 0;
  let totalEscaneres = 0;
  let totalCortesias = 0;       
  let totalDescuentosBonos = 0; 
  let gananciaRealAcumulada = 0; 
  
  const conteoProductos = {};
  const ventasPorFecha = {}; 

  // 1. INICIALIZAR LÍNEA DE TIEMPO PERFECTA
  const hoy = new Date();
  const rangoFechas = [];
  for (let i = diasFiltro - 1; i >= 0; i--) {
    const d = new Date(hoy);
    d.setDate(d.getDate() - i);
    const fechaStr = d.toISOString().split('T')[0];
    rangoFechas.push(fechaStr);
    ventasPorFecha[fechaStr] = 0; 
  }

  // 2. INICIALIZAR MAPA DE PRODUCTOS
  productosLocales.forEach(p => {
    const key = p.id || p.codigo;
    if (key) {
      conteoProductos[key] = {
        id: key,
        nombre: p.nombre,
        cantidad: 0,
        costoBase: parseFloat(p.precioCostoStandard || p.costo || p.precioCosto || 0) 
      };
    }
  });

  // 3. PROCESAMIENTO DE MOVIMIENTOS (Reglas de Negocio Centralizadas)
  movimientos.forEach(mov => {
    let fechaCorta = null;
    if (mov.timestamp || mov.createdAt || mov.fechaISO) {
      fechaCorta = (mov.timestamp || mov.createdAt || mov.fechaISO).split('T')[0];
    }

    // --- A) SALIDAS (Ventas Totales, Cortesías y Bonos) ---
    if (mov._origen === 'salida') {
      const esIntercambio = mov.modoIntercambio === true || mov.tipo === 'intercambio';

      if (!esIntercambio) {
        const ventaMonto = parseFloat(mov.total) || 0;
        const subtotalMonto = parseFloat(mov.subtotal) || ventaMonto;
        totalVentas += ventaMonto;

        let gananciaTransaccion = 0;
        const esCortesia = mov.descuentoPorcentaje === 100 || ventaMonto === 0;

        if (mov.consumoBono === true) {
          gananciaTransaccion = subtotalMonto * 0.10;
          totalDescuentosBonos += (parseFloat(mov.descuentoMonto) || 0);
        } 
        else if (esCortesia) {
          gananciaTransaccion = 0;
          totalCortesias += subtotalMonto;
        }
        else {
          // RN-03: Leer el costo congelado del ticket
          let costoTransaccion = parseFloat(mov.costoTotalVenta) || parseFloat(mov.costoTotalTicket) || 0;
            
          if (costoTransaccion === 0) {
              const itemsArray = (mov.productos && Array.isArray(mov.productos)) ? mov.productos : (mov.codigo ? [mov] : []);

              itemsArray.forEach(item => {
                const idProd = item.codigo || item.producto || item.id;
                const prod = productosLocales.find(p => p.codigo === idProd || p.id === idProd);
                let costoUnitario = prod ? parseFloat(prod.precioCostoStandard || prod.costo || prod.precioCosto || 0) : 0;

                // Salvavidas Legacy 50%
                if (costoUnitario === 0 && (!mov.descuentoPorcentaje || mov.descuentoPorcentaje === 0)) {
                  costoUnitario = parseFloat(item.precioUnitario || item.precioVenta || prod?.precioVentaStandard || 0) * 0.5;
                }
                costoTransaccion += (costoUnitario * (parseInt(item.cantidad) || 1));
            });
          }

          if (costoTransaccion === 0 && (!mov.descuentoPorcentaje || mov.descuentoPorcentaje === 0)) {
              costoTransaccion = subtotalMonto * 0.5;
          }
          gananciaTransaccion = ventaMonto - costoTransaccion;
        }

        gananciaRealAcumulada += gananciaTransaccion;

        if (fechaCorta && ventasPorFecha[fechaCorta] !== undefined) {
          ventasPorFecha[fechaCorta] += ventaMonto;
        }

        // CONTEO DE PRODUCTOS (Ignorando Cortesías al 100%)
        if (!esCortesia) {
          const itemsArray = (mov.productos && Array.isArray(mov.productos)) ? mov.productos : (mov.codigo ? [mov] : []);
          itemsArray.forEach(item => {
            const idProd = item.codigo || item.producto || item.id;
            if (idProd && conteoProductos[idProd]) {
              conteoProductos[idProd].cantidad += (parseInt(item.cantidad) || 1);
            }
          });
        }
      }
    }
    // --- B) ENTRADAS (Gasto de Restock) ---
    else if (mov._origen === 'entrada') {
      totalGastos += (parseFloat(mov.costoPagado) || parseFloat(mov.costoBase) || 0);
    }
    // --- C) ESCÁNERES ---
    else if (mov._origen === 'escaner') {
      const escMonto = parseFloat(mov.ventaTotal) || parseFloat(mov.totalCobrado) || parseFloat(mov.monto) || 0;
      totalEscaneres += escMonto;

      if (fechaCorta && ventasPorFecha[fechaCorta] !== undefined) {
        ventasPorFecha[fechaCorta] += escMonto;
      }
    }
  });

  // 4. PRECISIÓN FINANCIERA (Retornamos datos en crudo sin redondear prematuramente la gráfica)
  const round2 = (num) => Math.round(num * 100) / 100;
  
  const rankingArray = Object.values(conteoProductos);
  const top5 = [...rankingArray].sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
  const bottom5 = [...rankingArray].sort((a, b) => a.cantidad - b.cantidad).slice(0, 5);

  return { 
    totalVentas: round2(totalVentas), 
    totalGastos: round2(totalGastos), 
    totalEscaneres: round2(totalEscaneres), 
    gananciaNeta: round2(gananciaRealAcumulada), 
    flujoEfectivo: round2(totalVentas - totalGastos + totalEscaneres), 
    totalCortesias: round2(totalCortesias), 
    totalDescuentosBonos: round2(totalDescuentosBonos), 
    top5, 
    bottom5,
    ventasPorFecha,
    rangoFechas
  };
};