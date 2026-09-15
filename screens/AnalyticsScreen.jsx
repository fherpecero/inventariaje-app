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
import { Ionicons, FontAwesome6, Entypo, FontAwesome, Feather, Fontisto, MaterialCommunityIcons, Foundation } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import { calcularMetricasAnalytics } from '../utils/businessRules';
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
  // 🧠 EL CEREBRO MATEMÁTICO (Desacoplado y Centralizado)
  // ==========================================
  const kpis = useMemo(() => {
    // 1. Ejecutamos las Reglas de Negocio Puras
    const metricas = calcularMetricasAnalytics(movimientos, productosLocales, diasFiltro);

    // 2. Preparamos las estructuras visuales para Chart.js (Lógica UI)
    const round2 = (num) => Math.round(num * 100) / 100;
    const rawLabels = metricas.rangoFechas.map(f => f.substring(5, 10)); // Formato MM-DD
    
    const getResponsiveLabels = () => {
      if (diasFiltro <= 7) return rawLabels;
      if (diasFiltro === 30) return rawLabels.map((l, i) => (i % 5 === 0 || i === rawLabels.length - 1) ? l : '');
      return rawLabels.map((l, i) => (i % 15 === 0 || i === rawLabels.length - 1) ? l : '');
    };

    const lineChartData = {
      labels: getResponsiveLabels(),
      datasets: [{ data: metricas.rangoFechas.map(f => round2(metricas.ventasPorFecha[f])) }]
    };

    const paletaPastel = [COLORS.turquesa, COLORS.morado || '#7e2b8d', COLORS.naranja, COLORS.verde, COLORS.rojito || '#f97272'];
    const pieChartData = metricas.top5
      .filter(item => item.cantidad > 0) 
      .map((item, index) => ({
        name: item.nombre.substring(0, 10), 
        population: item.cantidad,
        color: paletaPastel[index % paletaPastel.length],
        legendFontColor: themeColors.textSecondary,
        legendFontSize: 11
      }));

    return { 
      ...metricas,
      lineChartData, 
      pieChartData
    };
  }, [movimientos, productosLocales, themeColors, diasFiltro]);

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
              <FontAwesome6 name="heart-pulse" size={18} color={COLORS.morado || '#7e2b8d'} style={styles.scannerIcon} />
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
              <Ionicons name="stats-chart" size={18} color={COLORS.morado} />
              <Text style={[styles.balanceTitle, { color: themeColors.textSecondary }]}>
                Rendimiento del Período
              </Text>
            </View>
            
            <View style={styles.balanceRow}>
              <View style={styles.balanceCol}>
                <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>Margen de Ganancia</Text>
                <Text style={[styles.balanceMonto, { color: kpis.gananciaNeta >= 0 ? themeColors.text : COLORS.rojo }]}>
                  ${(kpis.gananciaNeta || 0).toFixed(2)}
                </Text>
              </View>
              
              <View style={[styles.balanceDivider, { backgroundColor: themeColors.border || COLORS.gris }]} />
              
              <View style={styles.balanceCol}>
                <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>Flujo de Efectivo</Text>
                <Text style={[styles.balanceMonto, { color: kpis.flujoEfectivo >= 0 ? themeColors.text : COLORS.rojo }]}>
                  ${(kpis.flujoEfectivo || 0).toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* CARDS SECUNDARIAS: CORTESÍAS Y BONOS */}
          <View style={styles.cardsRow}>
            <View style={[styles.kpiCard, { backgroundColor: themeColors.cardBg }]}>
              <Ionicons name="gift" size={18} color={COLORS.morado} style={styles.kpiIcon} />
              <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>Cortesías (100%)</Text>
              <Text style={[styles.kpiMonto, { color: themeColors.text }]}>
                ${(kpis.totalCortesias || 0).toFixed(2)}
              </Text>
            </View>

            <View style={[styles.kpiCard, { backgroundColor: themeColors.cardBg }]}>
              <Ionicons name="star" size={18} color={COLORS.morado} style={styles.kpiIcon} />
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
             <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Curva de Ingresos</Text>
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
              <Text style={[styles.columnTitle, { color: COLORS.themeColors }]}><FontAwesome6 name="hand-point-up" size={14} color={ COLORS.verde } 
              /> Top 5</Text>
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
              <Text style={[styles.columnTitle, { color: COLORS.themeColors }]}><FontAwesome6 name="hand-point-down" size={14} color={ COLORS.rojo } 
                /> Bottom 5</Text>
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
    alignItems: 'center',
    justifyContent: 'center'
  },
  kpiIcon: {
    marginBottom: 6,
  },
  kpiLabel: {
    fontSize: FONT_SIZES.pequeño,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center'
  },
  kpiMonto: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: 'bold',
    textAlign: 'center'
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
    justifyContent: 'center'
  },
  balanceDivider: {
    width: 1,
    height: '80%',
  },
  balanceMonto: {
    fontSize: 24,
    fontWeight: 'bold',
    justifyContent: 'center'
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