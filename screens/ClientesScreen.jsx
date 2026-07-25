import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { 
  collection,
  getDoc, 
  doc, 
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot
} from 'firebase/firestore'; // 🛡️ Quitamos getDocs, añadimos onSnapshot
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';

// Importas GLOBAL_STYLES
import { COLORS, FONT_SIZES, SPACING, ScreenHeader, Header, GLOBAL_STYLES } from '../context/theme';

export default function ClientesScreen({ onNavigate, darkMode, themeColors }) {
  const { cuentaId, user } = useContext(AuthContext);

  // ==========================================
  // ESTADO: Créditos y clientes
  // ==========================================
  const [creditosActivos, setCreditosActivos] = useState([]);
  const [loading, setLoading] = useState(true);

  // ==========================================
  // ESTADO: Modal de edición de crédito
  // ==========================================
  const [modalEditVisible, setModalEditVisible] = useState(false);
  const [creditoEditando, setCreditoEditando] = useState(null);
  const [montoActualizado, setMontoActualizado] = useState('');
  const [notasActualizadas, setNotasActualizadas] = useState('');
  const [productosDelCredito, setProductosDelCredito] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ==========================================
  // EFECTO: Cargar créditos activos EN TIEMPO REAL
  // ==========================================
  useEffect(() => {
    if (!cuentaId) return;
    
    setLoading(true);
    console.log('💳 Conectando créditos en tiempo real...');
    
    const creditosRef = collection(db, 'cuentas', cuentaId.toString(), 'creditos');
    const q = query(creditosRef, where('estado', '==', 'pendiente'));
    
    // 🛡️ REFACTOR: onSnapshot reemplaza a cargarCreditosActivos()
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let creditos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Ordenar por fechaPTP (próximos vencimientos primero)
      creditos.sort((a, b) => {
        const fechaA = a.fechaPTP?.seconds || 0;
        const fechaB = b.fechaPTP?.seconds || 0;
        return fechaA - fechaB;
      });

      // 🛡️ REFACTOR: Eliminamos el Promise.all() que hacía lecturas inútiles a Firebase
      
      if (isMountedRef.current) {
        setCreditosActivos(creditos);
        setLoading(false);
      }
    }, (error) => {
      console.error('❌ Error en snapshot de créditos:', error.message);
      if (isMountedRef.current) setLoading(false);
    });

    return () => unsubscribe();
  }, [cuentaId]);

  // ==========================================
  // FUNCIÓN: Abrir modal de edición
  // ==========================================
  const abrirModalEdicion = async (credito) => {
    setCreditoEditando(credito);
    // 🛡️ UX REFACTOR: Dejamos el input en blanco para que escriban el abono
    setMontoActualizado(''); 
    setNotasActualizadas(credito.notas || '');
    await cargarProductosDelCredito(credito.ventasIds);
    setModalEditVisible(true);
  };

  // ==========================================
  // FUNCIÓN: Cargar productos del crédito (Solo se ejecuta al abrir el modal)
  // ==========================================
  const cargarProductosDelCredito = async (ventasIds) => {
    if (!ventasIds || ventasIds.length === 0) {
      setProductosDelCredito([]);
      return;
    }

    try {
      const salidaRef = collection(db, 'cuentas', cuentaId.toString(), 'salidas');
      const productos = [];
      for (const ventaId of ventasIds) {
        try {
          const ventaDoc = doc(salidaRef, ventaId);
          const ventaSnap = await getDoc(ventaDoc);
          if (ventaSnap.exists()) {
            const data = ventaSnap.data();
            productos.push({
              nombre: data.producto,
              cantidad: data.cantidad,
            });
          }
        } catch (err) {
          console.error('Error cargando venta:', ventaId);
        }
      }
      setProductosDelCredito(productos);
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  };

  // ==========================================
  // FUNCIÓN: Actualizar crédito (adelanto o liquidación)
  // ==========================================
  const actualizarCredito = async () => {
    if (!montoActualizado || isNaN(montoActualizado) || parseFloat(montoActualizado) <= 0) {
      Alert.alert('Error', 'Ingresa un monto de adelanto válido');
      return;
    }
    
    const adelantoRecibido = parseFloat(montoActualizado);
    const deudaVigente = creditoEditando.monto; 

    if (adelantoRecibido > deudaVigente) {
      Alert.alert('Error', 'El adelanto no puede ser mayor al monto adeudado');
      return;
    }

    const nuevoSaldoPendiente = deudaVigente - adelantoRecibido; 
    const nuevoEstado = nuevoSaldoPendiente === 0 ? 'pagado' : 'pendiente';
    const esLiquidacionTotal = nuevoSaldoPendiente === 0;

    setLoadingModal(true);
    try {
      const creditoRef = doc(db, 'cuentas', cuentaId.toString(), 'creditos', creditoEditando.id);
      const ahora = new Date();

      const actualizacion = {
        monto: nuevoSaldoPendiente,
        estado: nuevoEstado,
        notas: notasActualizadas,
        updatedAt: ahora.toISOString(),
      };

      await updateDoc(creditoRef, actualizacion);

      // ============================================
      // NUEVO: CREAR TICKET DE INGRESO A CAJA
      // ============================================
      const salidaRef = collection(db, 'cuentas', cuentaId.toString(), 'salidas');
      await addDoc(salidaRef, {
        tipo: 'abono_credito',
        tipoPago: 'efectivo', // Lo registramos como entrada de efectivo
        producto: `Abono de crédito: ${creditoEditando.clienteNombre}`,
        cantidad: 1,
        total: adelantoRecibido,
        timestamp: ahora.toISOString(),
        usuario: user?.email || 'App'
      });

      const mensaje = esLiquidacionTotal
        ? `✅ Crédito liquidado\nCliente: ${creditoEditando.clienteNombre}`
        : `✅ Adelanto registrado\nAdelanto: $${adelantoRecibido.toFixed(2)}\nMonto restante: $${nuevoSaldoPendiente.toFixed(2)}`;

      Alert.alert('Actualización completada', mensaje, [
        {
          text: 'OK',
          onPress: () => {
            setModalEditVisible(false);
            // 🛡️ REFACTOR: Ya no llamamos cargarCreditosActivos(), onSnapshot lo hace solo
          },
        },
      ]);
    } catch (error) {
      console.error('❌ Error actualizando crédito:', error.message);
      Alert.alert('Error', 'Error al actualizar crédito: ' + error.message);
    } finally {
      setLoadingModal(false);
    }
  };
  
  // ==========================================
  // RENDERERS
  // ==========================================
  const renderCreditoItem = ({ item }) => (
    <View>
      <TouchableOpacity
        style={styles.tableRow}
        onPress={() => abrirModalEdicion(item)}
      >
        <Text style={[styles.cellCliente, { color: themeColors.text }]}>
          {item.clienteNombre}
        </Text>
        <Text style={[styles.cellFecha, { color: themeColors.textSecondary }]}>
          {new Date(item.fechaPTP.seconds * 1000).toLocaleDateString('es-MX')}
        </Text>
        <Text style={styles.cellMonto}>
          ${item.monto.toFixed(2)}
        </Text>
      </TouchableOpacity>

      {item.ventasIds && item.ventasIds.length > 0 && (
        <View style={styles.productosSubrow}>
          <Text style={[styles.productosText, { color: themeColors.textSecondary }]}>
            📦 {item.ventasIds.length} producto{item.ventasIds.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      <View style={[styles.separator, { backgroundColor: darkMode ? '#333' : '#e8e8e8' }]} />
    </View>
  );

  return (
    <View style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg }]}>
      <ScreenHeader
        title="👥 Clientes"
        onBackPress={() => onNavigate('home')}
        themeColors={themeColors}
      />

      {loading && creditosActivos.length === 0 ? (
        <View style={GLOBAL_STYLES.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.turquesa} />
          <Text style={[GLOBAL_STYLES.loaderText, { color: themeColors.text }]}>
            Cargando créditos...
          </Text>
        </View>
      ) : (
        <ScrollView style={GLOBAL_STYLES.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
              Ventas a Crédito ({creditosActivos.length})
            </Text>

            {creditosActivos.length === 0 ? (
              <Text style={[GLOBAL_STYLES.emptyText, { color: themeColors.textSecondary }]}>
                No hay créditos pendientes
              </Text>
            ) : (
              <>
                <View style={[styles.tableHeader, { borderBottomColor: darkMode ? '#555' : '#ccc' }]}>
                  <Text style={[styles.headerCell, styles.headerCliente]}>Cliente</Text>
                  <Text style={[styles.headerCell, styles.headerFecha]}>Vencimiento</Text>
                  <Text style={[styles.headerCell, styles.headerMonto]}>Monto</Text>
                </View>

                <FlatList
                  data={creditosActivos}
                  renderItem={renderCreditoItem}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                />
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* Modal: Editar Crédito */}
      <Modal
        visible={modalEditVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalEditVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={GLOBAL_STYLES.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ width: '100%', alignItems: 'center' }}
              // IMPORTANTE: En Android a veces el teclado se come un margen.
              // keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0} 
            >
              <View style={[GLOBAL_STYLES.modalContent, { backgroundColor: themeColors.bg }]}>
                {creditoEditando && (
                  <>
                    <Text style={[GLOBAL_STYLES.modalTitle, { color: themeColors.text }]}>
                      💳 Actualizar Crédito
                    </Text>

                    <View style={styles.headerInfo}>
                      <View>
                        <Text style={[styles.clienteModalName, { color: themeColors.text }]}>
                          {creditoEditando.clienteNombre}
                        </Text>
                        <Text style={[styles.montoOriginal, { color: COLORS.rojo }]}>
                          Pendiente: ${creditoEditando.monto.toFixed(2)}
                        </Text>
                      </View>
                      <Text style={[styles.fechaModal, { color: themeColors.textSecondary }]}>
                        Vence:{'\n'}{new Date(creditoEditando.fechaPTP.seconds * 1000).toLocaleDateString('es-MX')}
                      </Text>
                    </View>

                    {productosDelCredito && productosDelCredito.length > 0 && (
                      <View style={[styles.productosBox, { backgroundColor: darkMode ? '#2a2a2a' : '#f9f9f9' }]}>
                        <Text style={[styles.productosTitle, { color: themeColors.text }]}>
                          Productos:
                        </Text>
                        {productosDelCredito.map((producto, idx) => (
                          <Text key={idx} style={[styles.productoItem, { color: themeColors.textSecondary }]}>
                            • {producto.nombre} ({producto.cantidad})
                          </Text>
                        ))}
                      </View>
                    )}

                    <View style={styles.formGroup}>
                      <Text style={[GLOBAL_STYLES.modalLabel, { color: themeColors.text }]}>
                        Abono Recibido ($):
                      </Text>
                      <TextInput
                        style={[
                          GLOBAL_STYLES.inputBase,
                          { backgroundColor: darkMode ? '#333' : COLORS.blanco, color: themeColors.text, borderColor: themeColors.border }
                        ]}
                        placeholder="0"
                        placeholderTextColor={themeColors.textSecondary}
                        value={montoActualizado}
                        onChangeText={setMontoActualizado}
                        keyboardType="decimal-pad"
                        editable={!loadingModal}
                      />
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={[GLOBAL_STYLES.modalLabel, { color: themeColors.text }]}>Notas:</Text>
                      <TextInput
                        style={[
                          GLOBAL_STYLES.inputBase,
                          styles.inputArea,
                          { backgroundColor: darkMode ? '#333' : COLORS.blanco, color: themeColors.text, borderColor: themeColors.border }
                        ]}
                        placeholder="Actualiza las notas del crédito"
                        placeholderTextColor={themeColors.textSecondary}
                        value={notasActualizadas}
                        onChangeText={setNotasActualizadas}
                        multiline={true}
                        editable={!loadingModal}
                      />
                    </View>

                    <View style={GLOBAL_STYLES.modalButtons}>
                      
                      <TouchableOpacity
                        style={[GLOBAL_STYLES.btnDanger, GLOBAL_STYLES.modalBtnHalf]}
                        onPress={() => setModalEditVisible(false)}
                        disabled={loadingModal}
                      >
                        <Text style={GLOBAL_STYLES.btnText}>Cancelar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[GLOBAL_STYLES.btnSuccess, GLOBAL_STYLES.modalBtnHalf, loadingModal && GLOBAL_STYLES.disabledBtn]}
                        onPress={actualizarCredito}
                        disabled={loadingModal}
                      >
                        {loadingModal ? (
                          <ActivityIndicator color={COLORS.blanco} />
                        ) : (
                          <Text style={GLOBAL_STYLES.btnText}>✅ Registrar</Text>
                        )}
                      </TouchableOpacity>

                    </View>
                  </>
                )}
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { 
    flex: 1, 
    padding: SPACING.content_padding 
  },
  centerContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: 10, 
    fontSize: FONT_SIZES.normal 
  },
  section: { 
    marginBottom: 30 
  },
  sectionTitle: { 
    fontSize: FONT_SIZES.subtitulo, 
    fontWeight: '700', 
    marginBottom: 15 
  },
  tableHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 0, 
    borderBottomWidth: 2, 
    marginBottom: 8 
  },
  headerCell: { 
    fontSize: FONT_SIZES.pequeño, 
    fontWeight: '700', 
    color: COLORS.turquesa, 
    textTransform: 'uppercase' 
  },
  headerCliente: { 
    flex: 1, 
    textAlign: 'left' 
  },
  headerFecha: { 
    flex: 1, 
    textAlign: 'center' 
  },
  headerMonto: { 
    flex: 1, 
    textAlign: 'right' 
  },
  tableRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 0 
  },
  cellCliente: { 
    flex: 1, 
    fontSize: FONT_SIZES.normal, 
    fontWeight: '600' 
  },
  cellFecha: { 
    flex: 1, 
    fontSize: FONT_SIZES.pequeño, 
    textAlign: 'center' 
  },
  cellMonto: { 
    flex: 1, 
    fontSize: FONT_SIZES.normal, 
    fontWeight: 'bold', 
    color: COLORS.rojo, 
    textAlign: 'right' 
  },
  productosSubrow: { 
    paddingVertical: 6, 
    paddingHorizontal: 0, 
    backgroundColor: 'transparent', 
    marginBottom: 8 
  },
  productosText: { 
    fontSize: FONT_SIZES.muy_pequeño, 
    fontStyle: 'italic' 
  },
  separator: { 
    height: 1.5, 
    marginVertical: 12 
  },
  clienteModalName: { 
    fontSize: FONT_SIZES.normal, 
    fontWeight: '700', 
    marginBottom: 4 
  },
  montoOriginal: { 
    fontSize: FONT_SIZES.normal, 
    fontWeight: 'bold' 
  },
  fechaModal: { 
    fontSize: FONT_SIZES.muy_pequeño, 
    textAlign: 'right', 
    lineHeight: 16 
  },
  productosBox: { 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 15 
  },
  productosTitle: { 
    fontSize: FONT_SIZES.pequeño, 
    fontWeight: '600', 
    marginBottom: 8 
  },
  productoItem: { 
    fontSize: FONT_SIZES.muy_pequeño, 
    marginBottom: 4 
  },
  formGroup: { 
    marginBottom: 15 
  },
  label: { 
    fontSize: FONT_SIZES.normal, 
    fontWeight: '600', 
    marginBottom: 4 
  },
  input: { 
    borderWidth: 1, 
    borderRadius: 8, 
    padding: 12, 
    fontSize: FONT_SIZES.normal 
  },
  inputArea: { 
    borderWidth: 1, 
    borderRadius: 8, 
    padding: 12, 
    fontSize: FONT_SIZES.normal, 
    minHeight: 60, 
    textAlignVertical: 'top' 
  },
});