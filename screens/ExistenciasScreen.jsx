import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { imagenes } from '../productosData';
import { doc, getDoc, updateDoc } from 'firebase/firestore'; // onSnapshot eliminado
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
// ✅ NUEVO: Importación del Motor Central
import { InventarioContext } from '../context/InventarioContext'; 
import SearchBar from '../components/SearchBar';
import { Ionicons, FontAwesome6, FontAwesome } from '@expo/vector-icons';
import { COLORS, FONT_SIZES, SPACING, ScreenHeader, GLOBAL_STYLES } from '../context/theme';

export default function ExistenciasScreen({ 
    onNavigate, 
    darkMode, 
    themeColors, 
    modoSoloSinStock = false,
    modoBajoStock = false 
}) {
  // =====================================================================
  // 1. ESTADOS Y CONTEXTO
  // =====================================================================
  const { user, cuenta, cuentaId } = useContext(AuthContext);
  // 🔌 CONEXIÓN AL CEREBRO GLOBAL
  const { inventarioGlobal, loadingInventario } = useContext(InventarioContext);
  
  const [productosFiltrados, setProductosFiltrados] = useState([]); // Salida de la barra de búsqueda
  const [isSaving, setIsSaving] = useState(false); // Estado exclusivo para notas
  
  const [modalNotasVisible, setModalNotasVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [notasEdicion, setNotasEdicion] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  // Estados de Filtros y Ordenamiento
  const [ordenamiento, setOrdenamiento] = useState('nombre'); 
  const [filtroDescuentos, setFiltroDescuentos] = useState(false);

  const isMountedRef = useRef(true);

  // =====================================================================
  // 2. EFECTOS
  // =====================================================================
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (user && cuenta) {
      verificarPropietario();
    }
  }, [user, cuenta]);

  // Sincronizar los datos del Contexto con el estado local del buscador
  useEffect(() => {
    setProductosFiltrados(inventarioGlobal);
  }, [inventarioGlobal]);

  // =====================================================================
  // 3. FUNCIONES DE LÓGICA Y DATOS
  // =====================================================================
  const verificarPropietario = async () => {
    try {
      const cuentaRef = doc(db, 'cuentas', cuentaId.toString());
      const cuentaSnap = await getDoc(cuentaRef);
      
      if (cuentaSnap.exists()) {
        const esOwner = cuentaSnap.data().propietarioUid === user.uid;
        if (isMountedRef.current) setIsOwner(esOwner);
      }
    } catch (error) {
      console.error('❌ Error verificando propietario:', error);
    }
  };

  // ✅ FILTRADO Y ORDENAMIENTO (Usando la propiedad stockTotal pre-calculada)
  const listaFinalRenderizada = useMemo(() => {
    let resultado = [...productosFiltrados];

    // 1. Filtro Sin Stock
    if (modoSoloSinStock) {
      resultado = resultado.filter(p => p.stockTotal <= 0);
    }

    // 2. Filtro Bajo Stock
    if (modoBajoStock) {
      resultado = resultado.filter(p => 
        p.limiteStock > 0 && 
        p.stockTotal > 0 && 
        p.stockTotal <= p.limiteStock
      );
    }

    // 3. Filtro Descuentos
    if (filtroDescuentos) {
      resultado = resultado.filter(p => p.piezasConDescuento > 0);
    }

    // 4. Ordenamiento reactivo
    if (ordenamiento === 'nombre') {
      resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (ordenamiento === 'cantidad-asc') {
      resultado.sort((a, b) => a.stockTotal - b.stockTotal);
    } else if (ordenamiento === 'cantidad-desc') {
      resultado.sort((a, b) => b.stockTotal - a.stockTotal);
    }

    return resultado;
  }, [productosFiltrados, modoSoloSinStock, modoBajoStock, filtroDescuentos, ordenamiento]);

  const handleToggleStock = () => {
    if (ordenamiento === 'cantidad-desc') {
      setOrdenamiento('cantidad-asc');
    } else {
      setOrdenamiento('cantidad-desc');
    }
  };

  // =====================================================================
  // 4. FUNCIONES DEL MODAL DE NOTAS
  // =====================================================================
  const openModalNotas = (product) => {
    setSelectedProduct(product);
    setNotasEdicion(product.notas);
    setModalNotasVisible(true);
  };

  const closeModalNotas = () => {
    setModalNotasVisible(false);
    setSelectedProduct(null);
    setNotasEdicion('');
  };

  const limpiarNotas = () => {
    setNotasEdicion('');
  };

  const guardarNotas = async () => {
    if (!selectedProduct) return;

    const claveUnica = selectedProduct.codigo;

    if (!claveUnica) {
      Alert.alert('Error Estructural', 'Este producto no tiene un código asignado.');
      return;
    }

    try {
      setIsSaving(true);
      const inventarioRef = doc(db, 'cuentas', cuentaId.toString(), 'inventarios', 'vital_health_principal');

      await updateDoc(inventarioRef, {
        [`productos.${claveUnica}.notas`]: notasEdicion,
        [`productos.${claveUnica}.updatedAt`]: new Date().toISOString(),
      });

      Alert.alert('✅ Guardado', 'Las notas se actualizaron correctamente', [
        { text: 'OK', onPress: () => closeModalNotas() },
      ]);
    } catch (error) {
      console.error('❌ Error guardando notas:', error);
      Alert.alert('Error', 'No se pudieron guardar las notas');
    } finally {
      if (isMountedRef.current) setIsSaving(false);
    }
  };

  // =====================================================================
  // 5. RENDERIZADO DE PRODUCTO
  // =====================================================================
  const renderProducto = ({ item }) => {
    const imagen = imagenes[item.codigo] || null;
    const tieneNota = item.notas && item.notas.trim() !== '';

    return (
      <TouchableOpacity
        style={[
          GLOBAL_STYLES.cardStandard, 
          { 
            backgroundColor: themeColors.bgSecondary,
            borderColor: themeColors.border || '#E2E8F0'
          }
        ]}
        onPress={() => openModalNotas(item)}
        activeOpacity={0.7}
      >
        <View style={[GLOBAL_STYLES.cardStandardContent, { gap: 12 }]}>
          <View style={styles.imagenContainer}>
            {imagen ? (
              <Image source={imagen} style={styles.imagen} />
            ) : (
              <View style={styles.imagenPlaceholder}>
                <FontAwesome6 name="box" size={24} color={themeColors.textSecondary} />
              </View>
            )}
          </View>

          <View style={GLOBAL_STYLES.cardStandardTextContainer}>
            <Text 
              style={[GLOBAL_STYLES.cardStandardValue, { color: themeColors.text, fontSize: 16 }]} 
              numberOfLines={2}
            >
              {item.nombre}
            </Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              {tieneNota ? (
                <FontAwesome name="sticky-note" size={14} color={themeColors.textSecondary} />
              ) : (
                <FontAwesome6 name="sticky-note" size={14} color={themeColors.textSecondary} />
              )}
              <Text 
                style={[GLOBAL_STYLES.cardStandardTitle, { color: themeColors.textSecondary, marginBottom: 0 }]} 
                numberOfLines={1}
              >
                {tieneNota ? item.notas : ''}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={[GLOBAL_STYLES.cardStandardValue, { color: themeColors.text, fontSize: 16 }]}>
              {filtroDescuentos ? `${item.piezasConDescuento}` : `${item.cantidad}`}
            </Text>
            <Text style={[GLOBAL_STYLES.cardStandardTitle, { color: themeColors.textSecondary, marginBottom: 0 }]}>pz</Text>
            
            {filtroDescuentos && (
              <Ionicons name="star" size={12} color='gold' />
            )}
          </View>
          
          {!filtroDescuentos && item.piezasConDescuento > 0 && (
            <Text style={{ fontSize: 10, color: COLORS.morado, fontWeight: 'bold', marginTop: 2 }}>
              ({item.piezasConDescuento} bono)
            </Text>
          )}

          <Text style={[GLOBAL_STYLES.cardStandardTitle, { color: themeColors.textSecondary, marginTop: 4, marginBottom: 0 }]}>
            ${item.precioVenta}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // 🔥 Pantalla de carga utiliza el booleano del contexto
  if (loadingInventario && productosFiltrados.length === 0) {
    return (
      <View style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg }]}>
        <View style={GLOBAL_STYLES.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.turquesa} />
          <Text style={GLOBAL_STYLES.loaderText}>Cargando existencias...</Text>
        </View>
      </View>
    );
  }

  // =====================================================================
  // 6. RENDERIZADO PRINCIPAL
  // =====================================================================
  return (
    <View style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg }]}>
      
     <ScreenHeader 
        title="Existencias" 
        onPress={() => onNavigate('home')} 
        themeColors={themeColors} 
      />

      <SearchBar 
        data={inventarioGlobal} 
        onSearch={setProductosFiltrados}
        searchKeys={['nombre', 'codigo']}
      />

      <View style={styles.filtrosContainer}>
        <TouchableOpacity
          style={[styles.filtroBtn, ordenamiento === 'nombre' && styles.filtroBtnActive]}
          onPress={() => setOrdenamiento('nombre')}
        >
          <Text style={[styles.filtroBtnText, ordenamiento === 'nombre' && styles.filtroBtnTextActive]}>
            A-Z
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filtroBtn, (ordenamiento === 'cantidad-asc' || ordenamiento === 'cantidad-desc') && styles.filtroBtnActive]}
          onPress={handleToggleStock}
        >
          <Text style={[styles.filtroBtnText, (ordenamiento === 'cantidad-asc' || ordenamiento === 'cantidad-desc') && styles.filtroBtnTextActive]}>
            {ordenamiento === 'cantidad-asc' ? '↑ Stock' : (ordenamiento === 'cantidad-desc' ? '↓ Stock' : 'Stock ↕')}
          </Text>
        </TouchableOpacity>

        {!modoSoloSinStock && (
          <TouchableOpacity
            style={[styles.filtroBtn, filtroDescuentos && styles.filtroBtnDescuentoActive]}
            onPress={() => setFiltroDescuentos(!filtroDescuentos)}
          >
            <Text style={[styles.filtroBtnText, filtroDescuentos && styles.filtroBtnTextActive]}>
              <Ionicons name="star" size={12} color='gold' /> Descuentos
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={listaFinalRenderizada}
        renderItem={renderProducto}
        keyExtractor={(item, index) => item.codigo ? item.codigo.toString() : index.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={GLOBAL_STYLES.emptyContainer}>
            <Text style={[GLOBAL_STYLES.emptyText, { color: themeColors.textSecondary }]}>
              No hay productos
            </Text>
          </View>
        }
      />

      <Modal visible={modalNotasVisible} transparent={true} animationType="fade" onRequestClose={closeModalNotas}>
        <Pressable style={GLOBAL_STYLES.modalOverlay} onPress={closeModalNotas}>
          <Pressable style={[GLOBAL_STYLES.modalContent, { backgroundColor: themeColors.bgSecondary }]} onPress={(e) => e.stopPropagation()}>
            {selectedProduct && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[GLOBAL_STYLES.modalTitle, styles.modalTitleMargin, { color: themeColors.text }]}>
                    {selectedProduct.nombre}
                  </Text>
                  <TouchableOpacity onPress={closeModalNotas}>
                    <Text style={[styles.modalCloseBtn, { color: themeColors.textSecondary }]}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalInfo}>
                  <Text style={[GLOBAL_STYLES.modalLabel, { color: themeColors.text }]}>
                    Cantidad: {selectedProduct.cantidad} unid.
                  </Text>
                </View>

                <View style={styles.notasInputContainer}>
                  <View style={styles.notasHeaderRow}>
                    <Text style={[GLOBAL_STYLES.modalLabel, styles.notasLabelAdjust, { color: themeColors.text }]}>
                      <FontAwesome name="sticky-note" size={12} color={themeColors.textSecondary} /> Notas
                    </Text>
                    {notasEdicion.length > 0 && (
                      <TouchableOpacity onPress={limpiarNotas} style={styles.btnLimpiarNotas}>
                        <Text style={styles.btnLimpiarNotasText}><FontAwesome6 name="trash-can" size={12} color={themeColors.textSecondary} /> Limpiar</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <TextInput
                    style={[
                      GLOBAL_STYLES.inputBase,
                      styles.notasInputArea,
                      { color: themeColors.text, borderColor: COLORS.turquesa, backgroundColor: themeColors.bg },
                    ]}
                    placeholder="Agregar notas (Prestado, Cortesías, etc)..."
                    placeholderTextColor={themeColors.textSecondary}
                    value={notasEdicion}
                    onChangeText={setNotasEdicion}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={GLOBAL_STYLES.modalButtons}>
                  <TouchableOpacity style={[GLOBAL_STYLES.btnDanger, GLOBAL_STYLES.modalBtnHalf]} onPress={closeModalNotas}>
                    <Text style={GLOBAL_STYLES.btnText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[GLOBAL_STYLES.btnSuccess, GLOBAL_STYLES.modalBtnHalf, isSaving && GLOBAL_STYLES.disabledBtn]} onPress={guardarNotas} disabled={isSaving}>
                    <Text style={GLOBAL_STYLES.btnText}>
                      {isSaving ? '⏳' : 'Guardar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// =====================================================================
// 7. HOJA DE ESTILOS PURIFICADA
// =====================================================================
const styles = StyleSheet.create({
  filtrosContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingTop: 4, 
    paddingBottom: 4,
    gap: 8,
  },
  filtroBtn: {
    paddingHorizontal: 12,
    backgroundColor: COLORS.blanco,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  filtroBtnActive: {
    backgroundColor: COLORS.morado,
    borderColor: COLORS.blanco,
  },
  filtroBtnDescuentoActive: {
    backgroundColor: COLORS.morado,
    borderColor: COLORS.blanco,
  },
  filtroBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.negro,
  },
  filtroBtnTextActive: {
    color: COLORS.blanco,
  },
  listContent: {
    padding: 15,
    paddingBottom: 30,
  },
  imagenContainer: {
    width: 60,
    height: 60,
    marginRight: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagen: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagenPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.gris,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  modalTitleMargin: {
    marginBottom: 0, 
    flex: 1,
  },
  modalCloseBtn: {
    fontSize: 24, 
    fontWeight: '700', 
    marginLeft: 10,
  },
  modalInfo: {
    marginBottom: 15,
  },
  notasInputContainer: {
    marginBottom: 20,
  },
  notasHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  notasLabelAdjust: {
    marginBottom: 0, 
  },
  btnLimpiarNotas: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
    borderRadius: 6,
  },
  btnLimpiarNotasText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#EF4444', 
  },
  notasInputArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
});