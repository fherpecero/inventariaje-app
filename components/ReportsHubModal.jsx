import React, { useState, useContext } from 'react';
import { 
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore'; // ⚠️ Quitamos query y where para filtrar de forma segura localmente
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import { COLORS, FONT_SIZES, SPACING, GLOBAL_STYLES } from '../context/theme';
import DatePickerField from './DatePickerField';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// 3. Y 4. DROP DOWN Y TEXTOS DINÁMICOS
const TIPOS_REPORTE = [
  { id: 'ventas', label: 'Ventas y Ganancias', icon: 'cash', description: 'Muestra el precio de venta público, costo y margen de ganancia real por cada producto vendido.' },
  { id: 'creditos', label: 'Estado de Créditos', icon: 'wallet', description: 'Detalle de todas las deudas, pagos parciales y fechas de vencimiento de tus clientes.' },
  { id: 'intercambios', label: 'Historial de Intercambios', icon: 'swap-horizontal', description: 'Registro de trueques con socios, mostrando los productos dados, recibidos y saldos a favor.' },
  { id: 'compras', label: 'Gasto en Restock', icon: 'cart', description: 'Reporte de todo el dinero invertido en reabastecer tu inventario (entradas).' },
  { id: 'escaneres', label: 'Eventos de Escáner', icon: 'barcode', description: 'Desglose de cobros y número de invitados registrados en eventos.' },
];

// ==========================================
// 🧠 MOTOR DE TRADUCCIÓN DE FECHAS (Protege contra choques de formatos)
// ==========================================
const obtenerMilisegundos = (docData) => {
  if (docData.timestamp && typeof docData.timestamp.toDate === 'function') return docData.timestamp.toDate().getTime();
  if (docData.createdAt && typeof docData.createdAt.toDate === 'function') return docData.createdAt.toDate().getTime();
  if (typeof docData.timestamp === 'string' && docData.timestamp.includes('T')) return new Date(docData.timestamp).getTime();
  if (typeof docData.createdAt === 'string' && docData.createdAt.includes('T')) return new Date(docData.createdAt).getTime();
  if (typeof docData.fecha === 'string') {
    if (docData.fecha.includes('-')) return new Date(docData.fecha).getTime();
    if (docData.fecha.includes('/')) {
      const p = docData.fecha.split('/');
      if (p.length === 3) return new Date(`${p[2]}-${p[1]}-${p[0]}T12:00:00Z`).getTime();
    }
  }
  return 0; 
};

const formatearFechaDisplay = (docData) => {
  if (docData.timestamp && typeof docData.timestamp.toDate === 'function') return docData.timestamp.toDate().toISOString().split('T')[0];
  if (docData.createdAt && typeof docData.createdAt.toDate === 'function') return docData.createdAt.toDate().toISOString().split('T')[0];
  if (typeof docData.timestamp === 'string' && docData.timestamp.includes('T')) return docData.timestamp.split('T')[0];
  if (typeof docData.createdAt === 'string' && docData.createdAt.includes('T')) return docData.createdAt.split('T')[0];
  if (typeof docData.fecha === 'string') {
    if (docData.fecha.includes('/')) {
      const p = docData.fecha.split('/');
      if (p.length === 3) return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    }
    return docData.fecha;
  }
  return 'N/A';
};

export default function ReportsHubModal({ visible, onClose, themeColors }) {
  const { cuentaId } = useContext(AuthContext);
  const [reporteSeleccionado, setReporteSeleccionado] = useState(TIPOS_REPORTE[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Rango de fechas por defecto (Últimos 30 días)
  const hoy = new Date();
  const hace30Dias = new Date();
  hace30Dias.setDate(hoy.getDate() - 30);
  
  const [fechaInicio, setFechaInicio] = useState(hace30Dias);
  const [fechaFin, setFechaFin] = useState(hoy);
  
  const [loading, setLoading] = useState(false);
  const [datosReporte, setDatosReporte] = useState([]);

  // --- LÓGICA DE EXTRACCIÓN ---
const generarReporte = async () => {
  if (!cuentaId) return;
  setLoading(true); // 👈 (Update 4: El activity indicator ya está activo aquí)
  setDatosReporte([]); 

  try {
    // 🛡️ Filtro local seguro en milisegundos
    const inicioMs = new Date(fechaInicio.setHours(0,0,0,0)).getTime();
    const finMs = new Date(fechaFin.setHours(23,59,59,999)).getTime();
    let data = [];

    // 1. VENTAS Y PROFIT
    if (reporteSeleccionado.id === 'ventas') {
      const snap = await getDocs(collection(db, 'cuentas', cuentaId, 'salidas'));
      snap.forEach(doc => {
        const d = doc.data();
        const docMs = obtenerMilisegundos(d);

        // 🚨 UPDATE 9: Eliminamos "d.descuentoPorcentaje !== 100" para que SÍ registre cortesías y bonos
        if (docMs >= inicioMs && docMs <= finMs && d.tipo !== 'intercambio' && !d.modoIntercambio) {

          let nombreProductoStr = 'N/A';
          if (typeof d.producto === 'string') {
            nombreProductoStr = d.producto; 
          } else if (Array.isArray(d.productos)) {
            nombreProductoStr = d.productos.map(p => p.nombre || p.producto).join(', '); 
          }
          
          data.push({
            id: doc.id,
            _ms: docMs, // 👈 (Variable oculta para ordenar fechas al final)
            fecha: formatearFechaDisplay(d),
            cliente: d.cliente || 'Público General',
            producto: nombreProductoStr,
            precioVenta: parseFloat(d.precioUnitario || d.total || 0),
            costo: parseFloat(d.costoUnitarioReal || d.costoTotalVenta || 0),
            ganancia: parseFloat(d.total || 0) - parseFloat(d.costoTotalVenta || 0),
            evento: d.nombreEvento || 'N/A',
            // Opcional: Para que sea visualmente claro si fue regalado
            etiqueta: d.descuentoPorcentaje === 100 ? 'Cortesía' : (d.descuentoPorcentaje > 0 ? 'Con Descuento' : 'Venta Normal')
          });
        }
      });
    }

    // 2. CRÉDITOS (🚨 UPDATE 3: Blindado contra undefined)
    else if (reporteSeleccionado.id === 'creditos') {
      const snap = await getDocs(collection(db, 'cuentas', cuentaId, 'creditos'));
      snap.forEach(doc => {
        const d = doc.data();
        const docMs = obtenerMilisegundos(d);

        if (docMs >= inicioMs && docMs <= finMs) {
          data.push({
            id: doc.id,
            _ms: docMs,
            fecha: formatearFechaDisplay(d),
            cliente: d.clienteNombre || d.cliente || 'Sin Nombre', // Fallback anti-crash
            montoTotal: parseFloat(d.monto || 0),
            estado: d.estado || 'pendiente'
          });
        }
      });
    }

    // 3. INTERCAMBIOS (🚨 MEJORA 7: Tabla de diferencial)
    else if (reporteSeleccionado.id === 'intercambios') {
      const snap = await getDocs(collection(db, 'cuentas', cuentaId, 'salidas'));
      snap.forEach(doc => {
        const d = doc.data();
        const docMs = obtenerMilisegundos(d);

        // Aseguramos que solo tome intercambios reales
        if (docMs >= inicioMs && docMs <= finMs && (d.tipo === 'intercambio' || d.modoIntercambio)) {
          data.push({
            id: doc.id,
            _ms: docMs,
            fecha: formatearFechaDisplay(d),
            socio: d.socioNombre || d.socio || 'Desconocido',
            productosDamos: Array.isArray(d.productosEnviados) ? d.productosEnviados.map(p => p.nombre).join(' + ') : 'N/A',
            productosRecibimos: Array.isArray(d.productosRecibidos) ? d.productosRecibidos.map(p => p.nombre).join(' + ') : 'N/A',
            diferencialEfectivo: parseFloat(d.diferenciaIntercambio || d.diferencia || 0),
            saldoPendiente: parseFloat(d.montoPendiente || 0)
          });
        }
      });
    }

    // 4. COMPRAS / RESTOCK (🚨 MEJORA 8: Precio Unitario y Descuento detallados)
    else if (reporteSeleccionado.id === 'compras') {
      const snap = await getDocs(collection(db, 'cuentas', cuentaId, 'entradas'));
      snap.forEach(doc => {
        const d = doc.data();
        const docMs = obtenerMilisegundos(d);

        if (docMs >= inicioMs && docMs <= finMs) {
          if (Array.isArray(d.productos)) {
            d.productos.forEach((item, index) => {
              data.push({
                id: `${doc.id}_${index}`, // Evita IDs duplicados en filas
                _ms: docMs,
                fecha: formatearFechaDisplay(d),
                producto: item.nombre || 'N/A',
                cantidad: parseInt(item.cantidad || 1),
                precioUnitarioBase: parseFloat(item.precioCosto || 0),
                precioPagadoUnitario: parseFloat(item.costoUnitarioAplicado || item.precioCosto || 0),
                totalPagado: parseFloat(item.costoUnitarioAplicado || item.precioCosto || 0) * parseInt(item.cantidad || 1)
              });
            });
          }
        }
      });
    }

    // 5. ESCÁNERES
    else if (reporteSeleccionado.id === 'escaneres') {
      const snap = await getDocs(collection(db, 'cuentas', cuentaId, 'escaneres'));
      snap.forEach(doc => {
        const d = doc.data();
        const docMs = obtenerMilisegundos(d);

        if (docMs >= inicioMs && docMs <= finMs) {
          data.push({
            id: doc.id,
            _ms: docMs,
            fecha: formatearFechaDisplay(d),
            evento: d.evento || d.nombreEvento || 'N/A',
            invitados: parseInt(d.personas || d.invitados || 0),
            montoCobrado: parseFloat(d.montoCobrado || d.ventaTotal || 0)
          });
        }
      });
    }

    // 🚨 UPDATE 2: Ordenamiento Maestro (Más recientes primero)
    // Usamos el campo oculto `_ms` para ordenar matemáticamente perfecto y no por texto.
    data.sort((a, b) => b._ms - a._ms);

    // Limpiamos el campo oculto `_ms` antes de renderizar la tabla/CSV para que no aparezca
    const dataFinal = data.map(({ _ms, ...resto }) => resto);

    setDatosReporte(dataFinal);

  } catch (error) {
    console.error("Error al extraer datos:", error);
    Alert.alert('Error', 'Hubo un problema procesando la información del reporte.');
  } finally {
    setLoading(false); // 👈 (Update 4: Apagamos el loader al terminar)
  }
};

  // --- EXPORTAR A CSV ---
  const exportarCSV = async () => {
    if (datosReporte.length === 0) return;

    try {
      let csvString = '';
      const llaves = Object.keys(datosReporte[0]).filter(k => k !== 'id');
      csvString += llaves.map(k => k.toUpperCase()).join(',') + '\n';

      datosReporte.forEach(item => {
        const fila = llaves.map(llave => `"${String(item[llave] ?? '').replace(/"/g, '""')}"`).join(',');
        csvString += fila + '\n';
      });

      const fileName = `Reporte_${reporteSeleccionado.id}_${new Date().getTime()}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, { dialogTitle: 'Guardar Reporte' });
    } catch (error) {
      Alert.alert('Error', 'No se pudo exportar el archivo.');
    }
  };

  // --- RENDER DE LA TABLA (PREVIEW) ---
  const renderTablaPrevia = () => {
    if (datosReporte.length === 0) return null;
    const llaves = Object.keys(datosReporte[0]).filter(k => k !== 'id');

    return (
      <View style={styles.previewContainer}>
        <View style={styles.previewHeaderRow}>
          <Text style={styles.previewTitle}>Vista Previa ({datosReporte.length} registros)</Text>
          <TouchableOpacity onPress={exportarCSV} style={styles.exportBtn}>
            <Ionicons name="download-outline" size={20} color={COLORS.blanco} />
            <Text style={styles.exportBtnText}>Guardar en Drive</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal style={styles.tableScroll}>
          <View>
            <View style={styles.tableHeader}>
              {llaves.map(k => (
                <Text key={k} style={styles.tableHeaderText}>{k.toUpperCase()}</Text>
              ))}
            </View>
            <ScrollView style={{ maxHeight: 250 }}>
              {datosReporte.map((item, idx) => (
                <View key={item.id || idx} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                  {llaves.map(llave => (
                    <Text key={llave} style={styles.tableCell} numberOfLines={1}>
                      {item[llave]}
                    </Text>
                  ))}
                </View>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      
      {/* 1. CIERRE CON TAP EXTERIOR */}
      <TouchableOpacity style={GLOBAL_STYLES.modalOverlay} activeOpacity={1} onPress={onClose}>
        
        {/* Envoltorio para que el clic dentro del modal no lo cierre */}
        <TouchableOpacity activeOpacity={1} style={[styles.modalBox, { backgroundColor: themeColors.bg }]}>
          
          {/* 6. TÍTULO DEL MODAL (HEADER) */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: themeColors.text }]}>Generador de Reportes</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
              <Ionicons name="close" size={28} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            
            {/* --- PASO 1: SELECCIÓN DE REPORTE (DROPDOWN) --- */}
            <Text style={[styles.sectionLabel, { color: themeColors.textSecondary }]}>Paso 1: Selecciona el reporte</Text>
            
            <View style={{ zIndex: 10 }}>
              <TouchableOpacity 
                style={[styles.dropdownSelector, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]} 
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <View style={styles.dropdownSelectorInner}>
                  <Ionicons name={reporteSeleccionado.icon} size={20} color={COLORS.turquesa} />
                  <Text style={[styles.dropdownSelectedText, { color: themeColors.text }]}>{reporteSeleccionado.label}</Text>
                </View>
                <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>

              {/* Menú Desplegable */}
              {showDropdown && (
                <View style={[styles.dropdownMenu, { backgroundColor: themeColors.cardBg, borderColor: themeColors.border }]}>
                  {TIPOS_REPORTE.map((tipo) => (
                    <TouchableOpacity 
                      key={tipo.id} 
                      style={[styles.dropdownItem, reporteSeleccionado.id === tipo.id && { backgroundColor: themeColors.border }]}
                      onPress={() => {
                        setReporteSeleccionado(tipo);
                        setShowDropdown(false);
                        setDatosReporte([]);
                      }}
                    >
                      <Ionicons name={tipo.icon} size={18} color={COLORS.turquesa} />
                      <Text style={[styles.dropdownItemText, { color: themeColors.text }]}>{tipo.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* 4. TEXTO DINÁMICO (DISCLAIMER) */}
            <Text style={[styles.disclaimerText, { color: themeColors.textSecondary }]}>
              ℹ️ {reporteSeleccionado.description}
            </Text>


            {/* --- PASO 2: RANGO DE FECHAS --- */}
            <Text style={[styles.sectionLabel, { color: themeColors.textSecondary, marginTop: SPACING.l }]}>Paso 2: Rango de Fechas</Text>
            <View style={styles.datesRow}>
              <View style={styles.dateWrapper}>
                <DatePickerField label="Desde" value={fechaInicio} onDateChange={setFechaInicio} />
              </View>
              <View style={styles.dateWrapper}>
                <DatePickerField label="Hasta" value={fechaFin} onDateChange={setFechaFin} />
              </View>
            </View>


            {/* --- PASO 3: BOTÓN DE GENERAR --- */}
            {/* 5. DISEÑO DE BOTÓN REAL */}
            <TouchableOpacity 
              style={[styles.primaryButton]} 
              onPress={generarReporte}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={COLORS.blanco} /> : (
                <>
                  <Text style={styles.primaryButtonText}>Generar Reporte</Text>
                </>
              )}
            </TouchableOpacity>

            {/* --- RESULTADOS --- */}
            {renderTablaPrevia()}
            
            <View style={{ height: 40 }} />
          </ScrollView>

        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBox: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  headerTitle: {
    fontSize: FONT_SIZES.subtitulo,
    fontWeight: 'bold',
  },
  closeIcon: {
    padding: 4,
  },
  scrollBody: {
    padding: SPACING.m,
  },
  sectionLabel: {
    fontSize: FONT_SIZES.pequeño,
    fontWeight: '700',
    marginBottom: 8,
  },
  dropdownSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  dropdownSelectorInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownSelectedText: {
    fontSize: FONT_SIZES.normal,
    fontWeight: '600',
    marginLeft: 10,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 55,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: FONT_SIZES.normal,
    marginLeft: 10,
  },
  disclaimerText: {
    fontSize: FONT_SIZES.xs,
    fontStyle: 'italic',
    marginTop: 8,
    marginBottom: 8,
    lineHeight: 16,
  },
  datesRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
  },
  dateWrapper: { 
    flex: 1, 
    marginHorizontal: 4, 
    marginBottom: 5,
  },
  primaryButton: {
    width: '60%',
    backgroundColor: COLORS.turquesa,
    marginLeft: 'auto',
    marginRight: 'auto',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12, // 👈 Ajuste para que se vea más como botón
    borderRadius: 12,
    shadowColor: COLORS.turquesa,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  primaryButtonText: {
    color: COLORS.blanco,
    fontSize: FONT_SIZES.normal,
    fontWeight: 'bold' // 👈 Letra en negrita para resaltar
  },
  previewContainer: { 
    borderWidth: 1, 
    borderColor: COLORS.gris, 
    borderRadius: 12, 
    overflow: 'hidden',
    marginTop: SPACING.xl,
  },
  previewHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: '#f5f5f5', 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.gris 
  },
  previewTitle: { 
    fontSize: FONT_SIZES.pequeño, 
    fontWeight: 'bold', 
    color: COLORS.negro 
  },
  exportBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.turquesa, 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8 
  },
  exportBtnText: { 
    color: COLORS.blanco, 
    fontWeight: 'bold', 
    fontSize: 12, 
    marginLeft: 4 
  },
  tableScroll: { 
    backgroundColor: COLORS.blanco 
  },
  tableHeader: { 
    flexDirection: 'row', 
    backgroundColor: '#eaeaea', 
    paddingVertical: 10 
  },
  tableHeaderText: { 
    width: 120, 
    fontSize: 11, 
    fontWeight: 'bold', 
    color: COLORS.negro, 
    textAlign: 'center' 
  },
  tableRow: { 
    flexDirection: 'row', 
    paddingVertical: 10, 
    borderBottomWidth: StyleSheet.hairlineWidth, 
    borderBottomColor: '#ccc' 
  },
  tableRowAlt: { 
    backgroundColor: '#fdfdfd' 
  },
  tableCell: { 
    width: 120, 
    fontSize: 12, 
    color: COLORS.negro, 
    textAlign: 'center', 
    paddingHorizontal: 4 
  },
});