// ==========================================
// 1. IMPORTACIONES
// ==========================================
import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
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
// 🚀 Cambiamos getDocs por onSnapshot
import { collection, query, where, onSnapshot } from 'firebase/firestore';
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
import ReportsHubModal from '../components/ReportsHubModal';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen({ onNavigate, darkMode, themeColors }) {
  // ==========================================
  // 2. LÓGICA Y ESTADOS (HOOKS)
  // ==========================================
  const { cuentaId } = useContext(AuthContext);
  const isMountedRef = useRef(true); // 🛡️ Seguro de vida para componentes desmontados

  const [loading, setLoading] = useState(true);
  const [movimientos, setMovimientos] = useState([]);
  const [diasFiltro, setDiasFiltro] = useState(30);
  const [reportsHubVisible, setReportsHubVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Cargamos el catálogo local una sola vez
  const productosLocales = getProductosActivos();

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ==========================================
  // 🚀 MOTOR LOCAL-FIRST (3 TÚNELES SIMULTÁNEOS)
  // ==========================================
  useEffect(() => {
    if (!cuentaId) return;
    if (isMountedRef.current) setLoading(true);

    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasFiltro);
    const fechaIso = fechaLimite.toISOString();
    
    // 1. Preparar las 3 Consultas
    const qSalidas = query(collection(db, 'cuentas', cuentaId, 'salidas'), where('timestamp', '>=', fechaIso));
    const qEntradas = query(collection(db, 'cuentas', cuentaId, 'entradas'), where('fecha', '>=', fechaIso));
    const qEscaneres = query(collection(db, 'cuentas', cuentaId, 'escaneres'), where('createdAt', '>=', fechaIso));

    // 2. Memoria caché temporal
    let salidasCache = [];
    let entradasCache = [];
    let escaneresCache = [];

    // 3. Semáforos de carga
    let salidasLoaded = false;
    let entradasLoaded = false;
    let escaneresLoaded = false;

    // Función que unifica todo cuando los 3 túneles responden
    const consolidarDatos = () => {
      if (salidasLoaded && entradasLoaded && escaneresLoaded && isMountedRef.current) {
        setMovimientos([...salidasCache, ...entradasCache, ...escaneresCache]);
        setLoading(false); // ⚡ La pantalla se dibuja en 0ms
      }
    };

    // 📡 Túnel 1: Salidas (Ventas)
    const unsubSalidas = onSnapshot(qSalidas, (snap) => {
      salidasCache = snap.docs.map(doc => ({ id: doc.id, _origen: 'salida', ...doc.data() }));
      salidasLoaded = true;
      consolidarDatos();
    }, (error) => {
      console.log('✈️ Silenciador Salidas:', error.message);
      salidasLoaded = true; consolidarDatos();
    });

    // 📡 Túnel 2: Entradas (Restock)
    const unsubEntradas = onSnapshot(qEntradas, (snap) => {
      entradasCache = snap.docs.map(doc => ({ id: doc.id, _origen: 'entrada', ...doc.data() }));
      entradasLoaded = true;
      consolidarDatos();
    }, (error) => {
      console.log('✈️ Silenciador Entradas:', error.message);
      entradasLoaded = true; consolidarDatos();
    });

    // 📡 Túnel 3: Escáneres
    const unsubEscaneres = onSnapshot(qEscaneres, (snap) => {
      escaneresCache = snap.docs.map(doc => ({ id: doc.id, _origen: 'escaner', ...doc.data() }));
      escaneresLoaded = true;
      consolidarDatos();
    }, (error) => {
      console.log('✈️ Silenciador Escáneres:', error.message);
      escaneresLoaded = true; consolidarDatos();
    });

    // Limpieza de los túneles al salir de la pantalla
    return () => {
      unsubSalidas();
      unsubEntradas();
      unsubEscaneres();
    };
  }, [cuentaId, diasFiltro]);

  // ==========================================
  // 🧠 EL CEREBRO MATEMÁTICO (¡Intacto y exacto!)
  // ==========================================
  const kpis = useMemo(() => {
    let totalVentas = 0;
    let totalGastos = 0;
    let totalEscaneres = 0;
    let totalCortesias = 0;       
    let totalDescuentosBonos = 0; 
    
    // Acumulador independiente y exacto de utilidad real
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
          cantidad: 0,
          costoBase: parseFloat(p.precioCostoStandard || p.costo || p.precioCosto || 0) 
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

          gananciaRealAcumulada += gananciaTransaccion;

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
          <TouchableOpacity onPress={() => setReportsHubVisible(true)} style={styles.headerBtnRight}>
            <Ionicons name="document-text" size={24} color={themeColors.text} />
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
            <View style={[styles.kpiCard, { backgroundColor: themeColors.cardBg }]}>
              <Ionicons name="cash" size={24} color={COLORS.verde} style={styles.kpiIcon} />
              <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>Ventas Totales</Text>
              <Text style={[styles.kpiMonto, { color: themeColors.text }]}>
                ${(kpis.totalVentas || 0).toFixed(2)}
              </Text>
            </View>
            
            <View style={[styles.kpiCard, { backgroundColor: themeColors.cardBg }]}>
              <Ionicons name="cart" size={24} color={COLORS.rojo} style={styles.kpiIcon} />
              <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>Gasto Restock</Text>
              <Text style={[styles.kpiMonto, { color: themeColors.text }]}>
                ${(kpis.totalGastos || 0).toFixed(2)}
              </Text>
            </View>
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
              <View style={styles.balanceCol}>
                <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>Margen de Ganancia</Text>
                <Text style={[styles.balanceMonto, { color: kpis.gananciaNeta >= 0 ? COLORS.verde : COLORS.naranja }]}>
                  ${(kpis.gananciaNeta || 0).toFixed(2)}
                </Text>
              </View>
              
              <View style={[styles.balanceDivider, { backgroundColor: themeColors.border || COLORS.gris }]} />
              
              <View style={styles.balanceCol}>
                <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>Flujo de Efectivo</Text>
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
      
      <ReportsHubModal 
        visible={reportsHubVisible} 
        onClose={() => setReportsHubVisible(false)} 
        themeColors={themeColors} 
      />
    </View>
  );
}

// ==========================================
// 4. ESTILOS CENTRALIZADOS
// ==========================================
const styles = StyleSheet.create({
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
});