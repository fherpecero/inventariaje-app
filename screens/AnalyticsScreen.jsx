// ==========================================
// 1. IMPORTACIONES
// ==========================================
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
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
import { Alert } from 'react-native';


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
    
    const conteoProductos = {};
    const ventasPorFecha = {}; // Para el gráfico de líneas

    // 1. Inicializar mapa con TODOS los productos en 0 (para el Bottom 5)
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
      // A) SALIDAS
      if (mov._origen === 'salida') {
        const esIntercambio = mov.modoIntercambio === true || mov.tipo === 'intercambio';

        // EXCLUIR INTERCAMBIOS COMPLETAMENTE DE LAS VENTAS
        if (!esIntercambio) {
          const ventaMonto = parseFloat(mov.total) || 0;
          totalVentas += ventaMonto;

          if (mov.descuentoPorcentaje === 100 || mov.total === 0) {
            totalCortesias += (parseFloat(mov.subtotal) || 0);
          } 
          
          if (mov.consumoBono === true) {
            totalDescuentosBonos += (parseFloat(mov.descuentoMonto) || 0);
          }

          // 📊 Agrupación para gráfico de Líneas (Ventas por Día)
          if (mov.timestamp && ventaMonto > 0) {
            const fechaCorta = mov.timestamp.split('T')[0]; // "2026-07-28"
            ventasPorFecha[fechaCorta] = (ventasPorFecha[fechaCorta] || 0) + ventaMonto;
          }

          // Conteo de Productos
          if (mov.codigo) {
            if (!conteoProductos[mov.codigo]) {
              conteoProductos[mov.codigo] = {
                id: mov.codigo,
                nombre: mov.producto || 'Desconocido',
                cantidad: 0
              };
            }
            conteoProductos[mov.codigo].cantidad += (parseInt(mov.cantidad) || 1);
          } else if (mov.productos && Array.isArray(mov.productos)) {
            mov.productos.forEach(item => {
              const idProd = item.codigo || item.producto || item.id;
              if (idProd) {
                if (!conteoProductos[idProd]) {
                  conteoProductos[idProd] = {
                    id: idProd,
                    nombre: item.nombre || item.producto || 'Desconocido',
                    cantidad: 0
                  };
                }
                conteoProductos[idProd].cantidad += (parseInt(item.cantidad) || 1);
              }
            });
          }
        }
      } 
      // B) ENTRADAS (Gasto Restock usando costoPagado o costoBase)
      else if (mov._origen === 'entrada') {
        totalGastos += (parseFloat(mov.costoPagado) || parseFloat(mov.costoBase) || 0);
      }
      // C) ESCÁNERES (Cobros Eventos Escáner)
      else if (mov._origen === 'escaner') {
        const escMonto = parseFloat(mov.ventaTotal) || parseFloat(mov.totalCobrado) || parseFloat(mov.monto) || 0;
        totalEscaneres += escMonto;

        // 📊 Agregar eventos de escáner al gráfico de líneas temporal
        if (mov.createdAt || mov.timestamp || mov.fechaISO) {
          const fechaEv = (mov.createdAt || mov.timestamp || mov.fechaISO).split('T')[0];
          ventasPorFecha[fechaEv] = (ventasPorFecha[fechaEv] || 0) + escMonto;
        }
      }
    });

    // 2. Ganancia Neta (Flujo Libre)
    const gananciaNeta = totalVentas - totalGastos + totalEscaneres;

    // 3. Crear listas de Top 5 y Bottom 5
    const rankingArray = Object.values(conteoProductos);

    // Top 5: Más vendidos (Orden Descendente)
    const top5 = [...rankingArray]
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // Bottom 5: Menos vendidos (Orden Ascendente, trayendo los de 0 ventas)
    const bottom5 = [...rankingArray]
      .sort((a, b) => a.cantidad - b.cantidad)
      .slice(0, 5);

    // 📊 PREPARAR DATOS: GRÁFICO DE LÍNEAS
    const fechasOrdenadas = Object.keys(ventasPorFecha).sort();
    // Tomamos solo los últimos 7 días con actividad para no saturar la pantalla
    const ultimosDias = fechasOrdenadas.slice(-7); 
    
    const lineChartData = {
      labels: ultimosDias.length > 0 ? ultimosDias.map(f => f.substring(5, 10)) : ['Sin datos'], // MM-DD
      datasets: [
        {
          data: ultimosDias.length > 0 ? ultimosDias.map(f => ventasPorFecha[f]) : [0]
        }
      ]
    };

    // 📊 PREPARAR DATOS: GRÁFICO DE PASTEL (Colores de tu paleta)
    const paletaPastel = [COLORS.turquesa, COLORS.morado || '#7e2b8d', COLORS.naranja, COLORS.verde, COLORS.rojito || '#f97272'];
    const pieChartData = top5
      .filter(item => item.cantidad > 0) // Solo dibujar los que sí se vendieron
      .map((item, index) => ({
        name: item.nombre.substring(0, 10), // Truncamos nombre muy largo
        population: item.cantidad,
        color: paletaPastel[index % paletaPastel.length],
        legendFontColor: themeColors.textSecondary,
        legendFontSize: 11
      }));

    return { 
      totalVentas, 
      totalGastos, 
      totalEscaneres, 
      gananciaNeta, 
      totalCortesias, 
      totalDescuentosBonos, 
      top5, 
      bottom5,
      lineChartData,   // <- Exportamos la data de líneas
      pieChartData     // <- Exportamos la data de pastel
    };
  }, [movimientos, productosLocales, themeColors]);

  // ==========================================
  // 3. RENDER (UI LIMPIA)
  // ==========================================
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
    color: (opacity = 1) => `rgba(36, 197, 197, ${opacity})`, // Turquesa (ajustar a HEX a RGBA si es necesario)
    labelColor: (opacity = 1) => themeColors.textSecondary,
    strokeWidth: 2, // Grosor de la línea
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: COLORS.turquesa
    },
    decimalPlaces: 0, // No decimals en el gráfico
  };

  // 📄 GENERADOR DE REPORTE CSV
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

      // 4. Invocar el menú nativo para compartir (WhatsApp, Email, etc.)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exportar Reporte Contable',
          UTI: 'public.comma-separated-values-text' // Específico para iOS
        });
      } else {
        Alert.alert("Error", "La función de compartir no está disponible en este dispositivo.");
      }

    } catch (error) {
      console.error("❌ Error exportando CSV:", error);
      Alert.alert("Error", "Hubo un problema al generar el reporte.");
    }
  };

  return (
    <View style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg }]}>
      <ScreenHeader 
        title="Analytics" 
        onPress={() => onNavigate('home')} 
        themeColors={themeColors} 
         rightAction={
          <TouchableOpacity onPress={generarReporteCSV} style={styles.headerBtnRight}>
            <Ionicons name="download-outline" size={24} color={themeColors.text} />
          </TouchableOpacity>}
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

          {/* CARD DE EVENTOS DE ESCÁNER (3/4 de altura respecto a Ganancia Neta) */}
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

          {/* GANANCIA Neta (FLUJO LIBRE) - CARD PRINCIPAL */}
          <View style={[styles.balanceCard, { backgroundColor: themeColors.cardBg }]}>
            <Text style={[styles.kpiLabel, { color: themeColors.textSecondary }]}>
              Ganancia Neta (Flujo Libre)
            </Text>
            <Text style={[
              styles.balanceMonto, 
              { color: kpis.gananciaNeta >= 0 ? COLORS.verde : COLORS.rojo }
            ]}>
              ${(kpis.gananciaNeta || 0).toFixed(2)}
            </Text>
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
                width={screenWidth - (SPACING.content_padding * 2) - 16} // Ajuste para paddings
                height={220}
                chartConfig={chartConfig}
                bezier // Hace la línea curva en lugar de picuda
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
    </View>
  );
}

// ==========================================
// 4. ESTILOS CENTRALIZADOS
// ==========================================
const styles = StyleSheet.create({
  // HEADER
  headerFlex: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  headerBtnWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleCentered: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
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
  // CARD EVENTOS DE ESCÁNER (Escala 3/4)
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
  // CARD GANANCIA NETA
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
  balanceMonto: {
    fontSize: FONT_SIZES.titulo,
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
   // ESTILOS DE GRÁFICOS
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
    alignItems: 'center'
  },
  sectionTitle: { fontSize: FONT_SIZES.normal, fontWeight: 'bold', marginBottom: SPACING.global, width: '100%' },
  chartStyle: { marginVertical: 8, borderRadius: 16 
  },
  headerBtnRight: {
    marginRight: 10
  },
  bottomPadding: {
    height: 100,
  },
});