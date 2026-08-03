// ==========================================
// 1. IMPORTACIONES
// ==========================================
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Modal, 
  Alert, 
  ActivityIndicator,
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONT_SIZES, SPACING, ScreenHeader, GLOBAL_STYLES, HEADER } from '../context/theme';

// Importamos el catálogo local como fuente de verdad
import { getProductosActivos } from '../context/productCatalog';

// 📊 NUEVAS IMPORTACIONES DE GRÁFICOS
import { LineChart, PieChart } from 'react-native-chart-kit';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// Obtenemos el ancho de la pantalla para hacer los gráficos responsivos
const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen({ onNavigate, darkMode, themeColors }) {
  // ==========================================
  // 2. LÓGICA Y ESTADOS (HOOKS)
  // ==========================================
  const { cuentaId } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [movimientos, setMovimientos] = useState([]);
  const [diasFiltro, setDiasFiltro] = useState(30);

  // 1. Estado único para el Modal Dinámico (sabe cuál reporte está abierto)
  const [modalReporte, setModalReporte] = useState({
    visible: false,
    tipo: null, // 'ventas' | 'restock' | 'escaner' | 'cortesias' | 'bonos'
  });

  // 2. Estado de ordenamiento dinámico
  const [sortConfig, setSortConfig] = useState({ key: 'fechaDate', direction: 'desc' });

  // Función para abrir cualquier reporte por su identificador
  const abrirReporte = (tipo) => {
    setSortConfig({ key: 'fechaDate', direction: 'desc' }); // Reset al abrir
    setModalReporte({ visible: true, tipo });
  };

  // Función para cambiar la dirección o la columna a ordenar
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };
  
  // Cargamos el catálogo local una sola vez
  const productosLocales = getProductosActivos();

  useEffect(() => {
    if (cuentaId) {
      cargarDatosAnalytics();
    }
  }, [cuentaId, diasFiltro]);

  const cargarDatosAnalytics = async () => {
    setLoading(true);
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - diasFiltro);
      const fechaIso = fechaLimite.toISOString();
      
      // 1. Consultar Salidas Reales (Usan 'timestamp')
      const qSalidas = query(
        collection(db, 'cuentas', cuentaId, 'salidas'),
        where('timestamp', '>=', fechaIso)
      );

      // 2. Consultar Entradas Reales (Usan 'fecha')
      const qEntradas = query(
        collection(db, 'cuentas', cuentaId, 'entradas'),
        where('fecha', '>=', fechaIso)
      );

      // 3. Consultar Eventos de Escáner (Usan 'createdAt')
      const qEscaneres = query(
        collection(db, 'cuentas', cuentaId, 'escaneres'),
        where('createdAt', '>=', fechaIso)
      );

      // Ejecutar las 3 descargas simultáneamente
      const [snapSalidas, snapEntradas, snapEscaneres] = await Promise.all([
        getDocs(qSalidas),
        getDocs(qEntradas),
        getDocs(qEscaneres)
      ]);

      const dataCombinada = [];
      
      snapSalidas.forEach((doc) => {
        dataCombinada.push({ id: doc.id, _origen: 'salida', ...doc.data() });
      });
      
      snapEntradas.forEach((doc) => {
        dataCombinada.push({ id: doc.id, _origen: 'entrada', ...doc.data() });
      });

      snapEscaneres.forEach((doc) => {
        dataCombinada.push({ id: doc.id, _origen: 'escaner', ...doc.data() });
      });

      setMovimientos(dataCombinada);
    } catch (error) {
      console.error("❌ Error cargando analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🧠 EL CEREBRO MATEMÁTICO + PREPARADOR DE GRÁFICOS
  const kpis = useMemo(() => {
    let totalVentas = 0;
    let totalGastos = 0;
    let totalEscaneres = 0;
    let totalCortesias = 0;       
    let totalDescuentosBonos = 0; 
    
    // 👈 NUEVO: Acumulador independiente y exacto de utilidad real
    let gananciaRealAcumulada = 0; 
    
    const conteoProductos = {};
    const ventasPorFecha = {}; 

    // 1. Inicializar mapa
    productosLocales.forEach(p => {
      const key = p.id || p.codigo;
      if (key) {
        conteoProductos[key] = {
          id: key,
          nombre: p.nombre,
          cantidad: 0
        };
      }
    });

    movimientos.forEach(mov => {
      // ==========================================
      // A) SALIDAS (Ventas, Bonos, Cortesías)
      // ==========================================
      if (mov._origen === 'salida') {
        const esIntercambio = mov.modoIntercambio === true || mov.tipo === 'intercambio';

        if (!esIntercambio) {
          const ventaMonto = parseFloat(mov.total) || 0;
          const subtotalMonto = parseFloat(mov.subtotal) || ventaMonto; // El valor público
          totalVentas += ventaMonto;

          // --- 📊 CÁLCULO DE GANANCIA REAL (REGLAS DE NEGOCIO) ---
          let gananciaTransaccion = 0;

          if (mov.consumoBono === true) {
            // 🎁 REGLA 1: Bono Influencer = 10% del Valor Público
            gananciaTransaccion = subtotalMonto * 0.10;
            totalDescuentosBonos += (parseFloat(mov.descuentoMonto) || 0);
          } 
          else if (mov.descuentoPorcentaje === 100 || ventaMonto === 0) {
            // 🎁 REGLA 2: Cortesía 100% = $0 de ganancia (No da pérdida negativa visual)
            gananciaTransaccion = 0;
            totalCortesias += subtotalMonto;
          } 
          else {
            // 🛒 REGLA 3: Venta Normal = Monto Cobrado - Costo Real
            let costoTransaccion = 0;
            
            if (mov.productos && Array.isArray(mov.productos)) {
              mov.productos.forEach(item => {
                const idProd = item.codigo || item.producto || item.id;
                const prod = productosLocales.find(p => p.codigo === idProd || p.id === idProd);
                // 🛡️ Búsqueda robusta del costo (por si en la BD se llama diferente)
                const costoUnitario = prod ? parseFloat(prod.precioCostoStandard || prod.costo || prod.precioCosto || 0) : 0;
                costoTransaccion += (costoUnitario * (parseInt(item.cantidad) || 1));
              });
            } else if (mov.codigo) {
               const prod = productosLocales.find(p => p.codigo === mov.codigo || p.id === mov.codigo);
               const costoUnitario = prod ? parseFloat(prod.precioCostoStandard || prod.costo || prod.precioCosto || 0) : 0;
               costoTransaccion += (costoUnitario * (parseInt(mov.cantidad) || 1));
            }
            
            gananciaTransaccion = ventaMonto - costoTransaccion;
          }

          // Sumamos el resultado de esta transacción al acumulado de utilidad
          gananciaRealAcumulada += gananciaTransaccion;
          // --------------------------------------------------------

          // 📈 Lógica de Gráficos y Top 5
          if (mov.timestamp && ventaMonto > 0) {
            const fechaCorta = mov.timestamp.split('T')[0]; 
            ventasPorFecha[fechaCorta] = (ventasPorFecha[fechaCorta] || 0) + ventaMonto;
          }

          if (mov.codigo && conteoProductos[mov.codigo]) {
            conteoProductos[mov.codigo].cantidad += (parseInt(mov.cantidad) || 1);
          } else if (mov.productos && Array.isArray(mov.productos)) {
            mov.productos.forEach(item => {
              const idProd = item.codigo || item.producto || item.id;
              if (idProd && conteoProductos[idProd]) {
                conteoProductos[idProd].cantidad += (parseInt(item.cantidad) || 1);
              }
            });
          }
        }
      } 
      // ==========================================
      // B) ENTRADAS (Gasto Restock)
      // ==========================================
      else if (mov._origen === 'entrada') {
        totalGastos += (parseFloat(mov.costoPagado) || parseFloat(mov.costoBase) || 0);
      }
      // ==========================================
      // C) ESCÁNERES
      // ==========================================
      else if (mov._origen === 'escaner') {
        const escMonto = parseFloat(mov.ventaTotal) || parseFloat(mov.totalCobrado) || parseFloat(mov.monto) || 0;
        totalEscaneres += escMonto;

        // Costo de productos escaneados (para la ganancia)
        let costoEsc = 0;
        if (mov.productos && Array.isArray(mov.productos)) {
          mov.productos.forEach(item => {
            const idProd = item.codigo || item.producto || item.id;
            const prod = productosLocales.find(p => p.codigo === idProd || p.id === idProd);
            const costoUnitario = prod ? parseFloat(prod.precioCostoStandard || prod.costo || prod.precioCosto || 0) : 0;
            costoEsc += (costoUnitario * (parseInt(item.cantidad) || 1));
          });
        }
        gananciaRealAcumulada += (escMonto - costoEsc);

        if (mov.createdAt || mov.timestamp || mov.fechaISO) {
          const fechaEv = (mov.createdAt || mov.timestamp || mov.fechaISO).split('T')[0];
          ventasPorFecha[fechaEv] = (ventasPorFecha[fechaEv] || 0) + escMonto;
        }
      }
    });

    // 2. 🧮 LOS DOS INDICADORES ESTRELLA
    const flujoEfectivo = totalVentas - totalGastos + totalEscaneres; 
    const gananciaNeta = gananciaRealAcumulada; 

    // 3. Preparación de Gráficos y Rankings
    const rankingArray = Object.values(conteoProductos);
    const top5 = [...rankingArray].sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
    const bottom5 = [...rankingArray].sort((a, b) => a.cantidad - b.cantidad).slice(0, 5);

    const fechasOrdenadas = Object.keys(ventasPorFecha).sort();
    const ultimosDias = fechasOrdenadas.slice(-7); 
    
    const lineChartData = {
      labels: ultimosDias.length > 0 ? ultimosDias.map(f => f.substring(5, 10)) : ['Sin datos'], 
      datasets: [{ data: ultimosDias.length > 0 ? ultimosDias.map(f => ventasPorFecha[f]) : [0] }]
    };

    const paletaPastel = [COLORS.turquesa, COLORS.morado || '#7e2b8d', COLORS.naranja, COLORS.verde, COLORS.rojito || '#f97272'];
    const pieChartData = top5
      .filter(item => item.cantidad > 0) 
      .map((item, index) => ({
        name: item.nombre.substring(0, 10), 
        population: item.cantidad,
        color: paletaPastel[index % paletaPastel.length],
        legendFontColor: themeColors.textSecondary,
        legendFontSize: 11
      }));

    return { 
      totalVentas, totalGastos, totalEscaneres, 
      gananciaNeta, flujoEfectivo, 
      totalCortesias, totalDescuentosBonos, top5, bottom5,
      lineChartData, pieChartData
    };
  }, [movimientos, productosLocales, themeColors]);

  // 🧠 CEREBRO DEL DETALLE DE VENTAS TOTALES
  const ventasDetalladas = useMemo(() => {
    if (!movimientos || movimientos.length === 0) return [];

    // 1. Filtrar transacciones de venta reales (excluye intercambios y cortesías al 100%)
    let ventas = movimientos.filter(
      (mov) =>
        mov._origen === 'salida' &&
        mov.tipo !== 'intercambio' &&
        mov.descuentoPorcentaje !== 100
    );

    // 2. Mapear y normalizar campos
    let dataFormateada = ventas.map((v) => {
      const prodObj = productosLocales.find(
        (p) => p.codigo === v.codigo || p.id === v.codigo
      );
      const productoNombre = prodObj?.nombre || v.producto || 'Producto Generico';

      const fechaTimestamp = new Date(v.timestamp || v.fecha || v.createdAt).getTime();
      const fechaFormateada = isNaN(fechaTimestamp)
        ? 'N/A'
        : new Date(fechaTimestamp).toLocaleDateString('es-MX', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
          });

      return {
        id: v.id || `${fechaTimestamp}-${v.codigo}`,
        fechaDate: fechaTimestamp || 0,
        fechaFormateada,
        cliente: v.cliente || 'Sin Cliente',
        productoNombre,
        montoReal: Number(v.total || v.monto || 0),
        esBono: v.consumoBono ? 'Sí' : 'No',
        registradoPor: v.creadoPorNombre || v.usuario || 'N/A',
        evento: v.escanerId ? 'Sí' : 'No',
      };
    });

    // 3. Ordenamiento dinámico según sortConfig
    dataFormateada.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return dataFormateada;
  }, [movimientos, productosLocales, sortConfig]);

  const CONFIGURACION_REPORTES = {
    ventas: {
      titulo: 'Detalle de Ventas Totales',
      data: ventasDetalladas,
      nombreArchivo: `Reporte_Ventas_${diasFiltro}dias.csv`,
      columnas: [
        { key: 'fechaDate', label: 'Fecha', width: 85, isDate: true },
        { key: 'cliente', label: 'Cliente', width: 120 },
        { key: 'productoNombre', label: 'Producto', width: 140 },
        { key: 'montoReal', label: 'Monto', width: 95, isMoneda: true },
        { key: 'esBono', label: 'Bono Inf.', width: 80, align: 'center' },
        { key: 'registradoPor', label: 'Registrado Por', width: 120 },
        { key: 'evento', label: 'Evento', width: 75, align: 'center' },
      ],
    },
  };

  const descargarReporteActivo = async () => {
    const configActual = CONFIGURACION_REPORTES[modalReporte.tipo];
    if (!configActual || !configActual.data || configActual.data.length === 0) {
      Alert.alert('Reporte Vacío', 'No hay registros en este período para exportar.');
      return;
    }

    try {
      // Encabezados
      const encabezados = configActual.columnas.map((c) => c.label).join(',') + '\n';

      // Filas
      const filas = configActual.data
        .map((item) =>
          configActual.columnas
            .map((col) => {
              let valor = item[col.key];
              if (col.isMoneda) valor = `$${Number(valor).toFixed(2)}`;
              if (col.isDate) valor = item.fechaFormateada;
              // Limpiar comas para evitar romper el formato CSV
              return `"${String(valor ?? '').replace(/"/g, '""')}"`;
            })
            .join(',')
        )
        .join('\n');

      const csvContent = encabezados + filas;
      const fileUri = `${FileSystem.documentDirectory}${configActual.nombreArchivo}`;

      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      console.error('Error al exportar reporte:', error);
      Alert.alert('Error', 'No se pudo generar el archivo de reporte.');
    }
  };

  // 📄 GENERADOR DE REPORTE CSV GENERAL
  const generarReporteCSV = async () => {
    try {
      if (movimientos.length === 0) {
        Alert.alert("Sin datos", "No hay movimientos en este período para exportar.");
        return;
      }

      // 1. Crear las cabeceras de las columnas
      let csvString = "Fecha,Origen,Tipo de Movimiento,Ingresos,Gastos,Bonos Consumidos,Cortesias Regladas,Usuario\n";

      // 2. Recorrer los movimientos y crear una fila por cada uno
      movimientos.forEach(mov => {
        const fecha = (mov.timestamp || mov.fecha || mov.createdAt || '').split('T')[0];
        let origen = mov._origen.toUpperCase();
        let tipo = 'OPERACION NORMAL';
        let ingreso = 0;
        let gasto = 0;
        let bonos = 0;
        let cortesias = 0;
        let usuario = mov.creadoPorNombre || mov.usuario || 'N/A';

        // Clasificación lógica
        if (mov._origen === 'salida') {
          if (mov.modoIntercambio || mov.tipo === 'intercambio') {
            tipo = 'INTERCAMBIO';
          } else {
            tipo = 'VENTA';
            ingreso = parseFloat(mov.total) || 0;
            if (mov.consumoBono) bonos = parseFloat(mov.descuentoMonto) || 0;
            if (mov.descuentoPorcentaje === 100 || mov.total === 0) {
              tipo = 'CORTESIA / CONSUMO PROPIO';
              cortesias = parseFloat(mov.subtotal) || 0;
            }
          }
        } 
        else if (mov._origen === 'entrada') {
          tipo = 'GASTO RESTOCK';
          gasto = parseFloat(mov.costoPagado) || parseFloat(mov.costoBase) || 0;
        } 
        else if (mov._origen === 'escaner') {
          tipo = 'EVENTO ESCANER';
          ingreso = parseFloat(mov.ventaTotal) || parseFloat(mov.totalCobrado) || parseFloat(mov.monto) || 0;
        }

        // Agregar la fila al texto principal
        csvString += `${fecha},${origen},${tipo},${ingreso},${gasto},${bonos},${cortesias},${usuario}\n`;
      });

      // 3. Crear el archivo físicamente en la memoria caché del teléfono
      const fileUri = FileSystem.documentDirectory + `Reporte_VitalHealth_${diasFiltro}dias.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvString, { 
        encoding: FileSystem.EncodingType.UTF8 
      });

      // 4. Invocar el menú nativo para compartir
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exportar Reporte Contable',
          UTI: 'public.comma-separated-values-text' 
        });
      } else {
        Alert.alert("Error", "La función de compartir no está disponible en este dispositivo.");
      }

    } catch (error) {
      console.error("❌ Error exportando CSV:", error);
      Alert.alert("Error", "Hubo un problema al generar el reporte.");
    }
  };

  // COMPONENTE DE BOTON DE FILTRO
  const FiltroBtn = ({ dias, label }) => (
    <TouchableOpacity 
      style={[
        styles.filtroBtn, 
        diasFiltro === dias && styles.filtroBtnActive
      ]}
      onPress={() => setDiasFiltro(dias)}
    >
      <Text style={[
        styles.filtroText, 
        diasFiltro === dias ? styles.filtroTextActive : { color: themeColors.textSecondary }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Configuración visual estándar para los gráficos
  const chartConfig = {
    backgroundGradientFrom: themeColors.cardBg,
    backgroundGradientTo: themeColors.cardBg,
    color: (opacity = 1) => `rgba(36, 197, 197, ${opacity})`, 
    labelColor: (opacity = 1) => themeColors.textSecondary,
    strokeWidth: 2, 
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: COLORS.turquesa
    },
    decimalPlaces: 0, 
  };

  // ==========================================
  // 3. RENDER (UI LIMPIA)
  // ==========================================
  return (
    <View style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg }]}>
      <ScreenHeader 
        title="Analytics" 
        onPress={() => onNavigate('home')} 
        themeColors={themeColors} 
        rightAction={
          <TouchableOpacity onPress={generarReporteCSV} style={styles.headerBtnRight}>
            <Ionicons name="download-outline" size={24} color={themeColors.text} />
          </TouchableOpacity>
        }
      />

      {/* FILTROS RÁPIDOS */}
      <View style={styles.filtrosContainer}>
        <FiltroBtn dias={7} label="7 Días" />
        <FiltroBtn dias={30} label="30 Días" />
        <FiltroBtn dias={90} label="90 Días" />
      </View>

      {/* CONTENIDO PRINCIPAL */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.turquesa} />
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* CARDS PRINCIPALES: VENTAS VS RESTOCK */}
          <View style={styles.cardsRow}>
            
            {/* CARD: VENTAS TOTALES */}
            <TouchableOpacity 
              style={[styles.kpiCard, { backgroundColor: themeColors.cardBg }]}
              onPress={() => abrirReporte('ventas')}
              activeOpacity={0.7}
            >
              <Ionicons name="cash" size={24} color={COLORS.verde} style={styles.kpiIcon} />
              <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>Ventas Totales</Text>
              <Text style={[styles.kpiMonto, { color: themeColors.text }]}>
                ${(kpis.totalVentas || 0).toFixed(2)}
              </Text>
            </TouchableOpacity>
            
            {/* CARD: GASTO RESTOCK */}
            <TouchableOpacity 
              style={[styles.kpiCard, { backgroundColor: themeColors.cardBg }]}
              onPress={() => abrirReporte('restock')}
              activeOpacity={0.7}
            >
              <Ionicons name="cart" size={24} color={COLORS.rojo} style={styles.kpiIcon} />
              <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>Gasto Restock</Text>
              <Text style={[styles.kpiMonto, { color: themeColors.text }]}>
                ${(kpis.totalGastos || 0).toFixed(2)}
              </Text>
            </TouchableOpacity>

          </View>

          {/* CARD DE EVENTOS DE ESCÁNER */}
          <View style={[styles.scannerCard, { backgroundColor: themeColors.cardBg }]}>
            <View style={styles.scannerCardHeader}>
              <Ionicons name="barcode-outline" size={18} color={COLORS.morado || '#7e2b8d'} style={styles.scannerIcon} />
              <Text style={[styles.scannerLabel, { color: themeColors.textSecondary }]}>
                Eventos de Escáner
              </Text>
            </View>
            <Text style={[styles.scannerMonto, { color: themeColors.text }]}>
              +${(kpis.totalEscaneres || 0).toFixed(2)}
            </Text>
          </View>

          {/* RESUMEN FINANCIERO DUAL (GANANCIA VS FLUJO) */}
          <View style={[styles.balanceCard, { backgroundColor: themeColors.cardBg }]}>
            
            <View style={styles.balanceHeader}>
              <Ionicons name="stats-chart" size={16} color={COLORS.morado} />
              <Text style={[styles.balanceTitle, { color: themeColors.textSecondary }]}>
                Rendimiento del Período
              </Text>
            </View>
            
            <View style={styles.balanceRow}>
              {/* Columna Ganancia */}
              <View style={styles.balanceCol}>
                <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>Ganancia Real</Text>
                <Text style={[styles.balanceMonto, { color: kpis.gananciaNeta >= 0 ? COLORS.verde : COLORS.naranja }]}>
                  ${(kpis.gananciaNeta || 0).toFixed(2)}
                </Text>
              </View>
              
              {/* Divisor Visual */}
              <View style={[styles.balanceDivider, { backgroundColor: themeColors.border || COLORS.gris }]} />
              
              {/* Columna Flujo */}
              <View style={styles.balanceCol}>
                <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>Flujo Efectivo</Text>
                <Text style={[styles.balanceMonto, { color: kpis.flujoEfectivo >= 0 ? COLORS.turquesa : COLORS.rojo }]}>
                  ${(kpis.flujoEfectivo || 0).toFixed(2)}
                </Text>
              </View>
            </View>

          </View>

          {/* CARDS SECUNDARIAS: CORTESÍAS Y BONOS */}
          <View style={styles.cardsRow}>
            <View style={[styles.kpiCard, { backgroundColor: themeColors.cardBg }]}>
              <Ionicons name="gift" size={22} color={COLORS.naranja} style={styles.kpiIcon} />
              <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>Cortesías (100%)</Text>
              <Text style={[styles.kpiMonto, { color: themeColors.text }]}>
                ${(kpis.totalCortesias || 0).toFixed(2)}
              </Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: themeColors.cardBg }]}>
              <Ionicons name="star" size={22} color={COLORS.turquesa} style={styles.kpiIcon} />
              <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>Bonos Consumidos</Text>
              <Text style={[styles.kpiMonto, { color: themeColors.text }]}>
                ${(kpis.totalDescuentosBonos || 0).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* ========================================== */}
          {/* 📊 SECCIÓN DE GRÁFICOS VISUALES */}
          {/* ========================================== */}
          
          {/* Gráfico de Líneas: Picos de Ventas */}
          <View style={[styles.chartContainer, { backgroundColor: themeColors.cardBg }]}>
             <Text style={[styles.sectionTitle, { color: themeColors.text }]}>📈 Curva de Ingresos</Text>
             <LineChart
                data={kpis.lineChartData}
                width={screenWidth - (SPACING.content_padding * 2) - 16} 
                height={220}
                chartConfig={chartConfig}
                bezier 
                style={styles.chartStyle}
                yAxisLabel="$"
              />
          </View>

          {/* Gráfico de Pastel: Top 5 */}
          {kpis.pieChartData.length > 0 && (
            <View style={[styles.chartContainer, { backgroundColor: themeColors.cardBg }]}>
              <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Composición del Top 5</Text>
              <PieChart
                data={kpis.pieChartData}
                width={screenWidth - (SPACING.content_padding * 2) - 16}
                height={200}
                chartConfig={chartConfig}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={"15"}
                absolute
              />
            </View>
          )}

          {/* SECCIÓN TOP 5 / BOTTOM 5 EN 2 COLUMNAS */}
          <View style={styles.columnsContainer}>
            
            {/* Columna Izquierda: Más vendidos */}
            <View style={[styles.columnCard, { backgroundColor: themeColors.cardBg }]}>
              <Text style={[styles.columnTitle, { color: COLORS.verde }]}>🔥 Top 5</Text>
              {kpis.top5.map((prod, index) => (
                <View key={`top-${prod.id}-${index}`} style={[styles.rankingItem, { borderBottomColor: themeColors.border }]}>
                  <Text style={[styles.rankingRank, { color: themeColors.textSecondary }]}>#{index + 1}</Text>
                  <Text style={[styles.rankingName, { color: themeColors.text }]} numberOfLines={1}>
                    {prod.nombre}
                  </Text>
                </View>
              ))}
            </View>

            {/* Columna Derecha: Menos vendidos */}
            <View style={[styles.columnCard, { backgroundColor: themeColors.cardBg }]}>
              <Text style={[styles.columnTitle, { color: COLORS.rojo }]}>❄️ Bottom 5</Text>
              {kpis.bottom5.map((prod, index) => (
                <View key={`bot-${prod.id}-${index}`} style={[styles.rankingItem, { borderBottomColor: themeColors.border }]}>
                  <Text style={[styles.rankingRank, { color: themeColors.textSecondary }]}>#{index + 1}</Text>
                  <Text style={[styles.rankingName, { color: themeColors.text }]} numberOfLines={1}>
                    {prod.nombre}
                  </Text>
                </View>
              ))}
            </View>

          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {/* ========================================== */}
      {/* MODAL DINÁMICO ÚNICO DE REPORTES */}
      {/* ========================================== */}
      <Modal
        visible={modalReporte.visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalReporte({ visible: false, tipo: null })}
      >
        {modalReporte.tipo && CONFIGURACION_REPORTES[modalReporte.tipo] && (
          <View style={GLOBAL_STYLES.modalOverlay}>
            <View style={styles.modalContenedorTabla}>
              
              {/* ENCABEZADO DEL MODAL */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitulo}>
                  {CONFIGURACION_REPORTES[modalReporte.tipo].titulo}
                </Text>
                <View style={styles.modalAcciones}>
                  <TouchableOpacity
                    onPress={descargarReporteActivo}
                    style={styles.btnIcono}
                  >
                    <Ionicons name="download-outline" size={22} color={COLORS.turquesa} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setModalReporte({ visible: false, tipo: null })}
                    style={styles.btnIcono}
                  >
                    <Ionicons name="close-circle" size={26} color={COLORS.rojo} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* TABLA CON SCROLL HORIZONTAL Y VERTICAL */}
              <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View>
                  {/* CABECERA DE COLUMNAS CON ONPRESS PARA ORDENAR */}
                  <View style={styles.tablaHeaderFila}>
                    {CONFIGURACION_REPORTES[modalReporte.tipo].columnas.map((col) => {
                      const estaOrdenando = sortConfig.key === col.key;
                      const flecha = estaOrdenando
                        ? sortConfig.direction === 'asc' ? ' ↑' : ' ↓'
                        : '';

                      return (
                        <TouchableOpacity
                          key={col.key}
                          style={[styles.celdaHeader, { width: col.width }]}
                          onPress={() => handleSort(col.key)}
                        >
                          <Text
                            style={[
                              styles.textoHeader,
                              estaOrdenando && styles.textoHeaderActivo,
                            ]}
                            numberOfLines={1}
                          >
                            {col.label}{flecha}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* CUERPO DE DATOS */}
                  <ScrollView showsVerticalScrollIndicator={true}>
                    {CONFIGURACION_REPORTES[modalReporte.tipo].data.length === 0 ? (
                      <View style={styles.vacioContenedor}>
                        <Text style={styles.vacioTexto}>No hay registros en este período.</Text>
                      </View>
                    ) : (
                      CONFIGURACION_REPORTES[modalReporte.tipo].data.map((item, idx) => (
                        <View
                          key={item.id || idx}
                          style={[
                            styles.tablaFila,
                            idx % 2 === 1 && styles.tablaFilaPar,
                          ]}
                        >
                          {CONFIGURACION_REPORTES[modalReporte.tipo].columnas.map((col) => {
                            let valorTexto = item[col.key];
                            if (col.isMoneda) valorTexto = `$${Number(valorTexto).toFixed(2)}`;
                            if (col.isDate) valorTexto = item.fechaFormateada;

                            return (
                              <Text
                                key={col.key}
                                style={[
                                  styles.celdaTexto,
                                  { width: col.width, textAlign: col.align || 'left' },
                                  col.isMoneda && styles.textoMoneda,
                                ]}
                                numberOfLines={1}
                              >
                                {valorTexto ?? 'N/A'}
                              </Text>
                            );
                          })}
                        </View>
                      ))
                    )}
                  </ScrollView>
                </View>
              </ScrollView>

            </View>
          </View>
        )}
      </Modal>

    </View>
  );
}

// ==========================================
// 4. ESTILOS CENTRALIZADOS
// ==========================================
const styles = StyleSheet.create({
  // --- HEADER Y GENERALES ---
  headerBtnRight: {
    marginRight: 10,
  },
  filtrosContainer: {
    flexDirection: 'row',
    padding: SPACING.content_padding,
    justifyContent: 'space-between',
  },
  filtroBtn: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gris,
  },
  filtroBtnActive: {
    backgroundColor: COLORS.turquesa,
    borderColor: COLORS.turquesa,
  },
  filtroText: {
    fontSize: FONT_SIZES.pequeño,
    fontWeight: '600',
  },
  filtroTextActive: {
    color: COLORS.blanco,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: SPACING.content_padding,
  },
  
  // --- CARDS PRINCIPALES ---
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.global,
  },
  kpiCard: {
    flex: 1,
    padding: SPACING.content_padding,
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiIcon: {
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: FONT_SIZES.pequeño,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  kpiMonto: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: 'bold',
  },
  
  // --- CARD ESCÁNER ---
  scannerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: SPACING.content_padding,
    borderRadius: 10,
    marginHorizontal: 4,
    marginBottom: SPACING.global,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  scannerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scannerIcon: {
    marginRight: 8,
  },
  scannerLabel: {
    fontSize: FONT_SIZES.pequeño,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  scannerMonto: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: 'bold',
  },
  
  // --- CARD BALANCE ---
  balanceCard: {
    padding: SPACING.content_padding,
    borderRadius: 12,
    marginHorizontal: 4,
    marginBottom: SPACING.global,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  balanceMonto: {
    fontSize: FONT_SIZES.titulo,
    fontWeight: 'bold',
  },
  
  // --- RANKINGS (TOP / BOTTOM 5) ---
  columnsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.global,
    marginHorizontal: 4,
  },
  columnCard: {
    flex: 1,
    padding: SPACING.content_padding,
    borderRadius: 12,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  columnTitle: {
    fontSize: FONT_SIZES.normal,
    fontWeight: 'bold',
    marginBottom: SPACING.global,
    textAlign: 'center',
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rankingRank: {
    fontSize: FONT_SIZES.pequeño,
    fontWeight: 'bold',
    width: 24,
  },
  rankingName: {
    fontSize: FONT_SIZES.pequeño,
    flex: 1,
    fontWeight: '500',
  },
  
  // --- GRÁFICOS ---
  chartContainer: {
    padding: SPACING.content_padding,
    borderRadius: 12,
    marginHorizontal: 4,
    marginBottom: SPACING.global,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: FONT_SIZES.normal,
    fontWeight: 'bold',
    marginBottom: SPACING.global,
    width: '100%',
  },
  chartStyle: {
    marginVertical: 8,
    borderRadius: 16,
  },
  bottomPadding: {
    height: 100,
  },

  // --- MODAL DINÁMICO DE DETALLES ---
  modalContenedorTabla: {
    width: '95%',
    maxHeight: '85%',
    backgroundColor: COLORS.blanco,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.negro,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.content_padding,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gris,
    backgroundColor: COLORS.blanco,
  },
  modalTitulo: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: 'bold',
    color: COLORS.morado,
  },
  modalAcciones: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  btnIcono: {
    padding: 2,
  },
  tablaHeaderFila: {
    flexDirection: 'row',
    backgroundColor: COLORS.gris,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.turquesa,
  },
  celdaHeader: {
    paddingHorizontal: 6,
    justifyContent: 'center',
  },
  textoHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.negro,
    textTransform: 'uppercase',
  },
  textoHeaderActivo: {
    color: COLORS.turquesa,
  },
  tablaFila: {
    flexDirection: 'row',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gris,
  },
  tablaFilaPar: {
    backgroundColor: '#F9F9FB',
  },
  celdaTexto: {
    fontSize: FONT_SIZES.pequeño,
    color: COLORS.negro,
    paddingHorizontal: 6,
  },
  textoMoneda: {
    fontWeight: 'bold',
    color: COLORS.turquesa,
  },
  vacioContenedor: {
    padding: 30,
    alignItems: 'center',
  },
  vacioTexto: {
    fontSize: FONT_SIZES.cuerpo,
    color: COLORS.grisOscuro,
  },
  // --- CARD BALANCE DUAL ---
  balanceCard: {
    borderRadius: 12,
    marginHorizontal: 4,
    marginBottom: SPACING.global,
    paddingVertical: SPACING.content_padding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 6,
  },
  balanceTitle: {
    fontSize: FONT_SIZES.pequeño,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  balanceCol: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    height: '80%',
  },
  balanceMonto: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: 'bold',
  },
});