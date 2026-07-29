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
  SafeAreaView,
} from 'react-native';
import { imagenes } from '../productosData';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import SearchBar from '../components/SearchBar';
import { LinearGradient } from 'expo-linear-gradient';

// ✅ 1. Importamos la Fuente de la Verdad y los componentes globales
import { COLORS, FONT_SIZES, SPACING, ScreenHeader, GLOBAL_STYLES, HEADER } from '../context/theme';

export default function ExistenciasScreen({ 
    onNavigate, 
    darkMode, 
    themeColors, 
    modoSoloSinStock = false 
}) {
  // =====================================================================
  // 1. ESTADOS Y CONTEXTO
  // =====================================================================
  const { user, cuenta, cuentaId } = useContext(AuthContext);
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]); // Salida de la barra de búsqueda
  const [loading, setLoading] = useState(false);
  
  const [modalNotasVisible, setModalNotasVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [notasEdicion, setNotasEdicion] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  // Estados de Filtros y Ordenamiento
  const [ordenamiento, setOrdenamiento] = useState('nombre'); // 'nombre', 'cantidad-asc', 'cantidad-desc'
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
      cargarProductos();
      verificarPropietario();
    }
  }, [user, cuenta]);

  // =====================================================================
  // 3. FUNCIONES DE LÓGICA Y DATOS
  // =====================================================================
  const verificarPropietario = async () => {
    try {
      const cuentaRef = doc(db, 'cuentas', cuentaId.toString());
      const cuentaSnap = await getDoc(cuentaRef);
      
      if (cuentaSnap.exists()) {
        const esOwner = cuentaSnap.data().propietarioUid === user.uid;
        setIsOwner(esOwner);
      }
    } catch (error) {
      console.error('❌ Error verificando propietario:', error);
    }
  };

  const cargarProductos = async () => {
    if (!isMountedRef.current) return;

    try {
      if (isMountedRef.current) setLoading(true);

      const catalogoRef = collection(db, 'catalogoGlobal');
      const catalogoSnap = await getDocs(catalogoRef);

      const docRef = doc(db, 'cuentas', cuentaId.toString(), 'inventarios', 'vital_health_principal');
      const docSnap = await getDoc(docRef);
      const productosData = docSnap.data()?.productos || {};

      const inventarioMap = {};
      Object.keys(productosData).forEach((codigo) => {
        inventarioMap[codigo] = {
          cantidad: productosData[codigo].cantidad || 0,
          notas: productosData[codigo].notas || '',
          piezasConDescuento: productosData[codigo].piezasConDescuento || 0, 
        };
      });

      const productosCombinados = catalogoSnap.docs.map((document) => {
        const catalogo = document.data();
        const datos = inventarioMap[document.id] || { cantidad: 0, notas: '', piezasConDescuento: 0 };

        return {
          id: document.id,
          nombre: catalogo.nombre,
          codigo: catalogo.codigo,
          cantidad: datos.cantidad,
          notas: datos.notas,
          piezasConDescuento: datos.piezasConDescuento,
          precioCosto: catalogo.precioCostoStandard || 0,
          precioVenta: catalogo.precioVentaStandard || 0,
        };
      });

      if (isMountedRef.current) {
        setProductos(productosCombinados);
        setProductosFiltrados(productosCombinados); 
      }
    } catch (error) {
      console.error('❌ Error cargando existencias:', error);
      Alert.alert('Error', 'No existen las existencias');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // ✅ SOLUCIÓN DE RE-ORDENAMIENTO EN CASCADA
  // Tomamos los resultados del SearchBar y AHORA aplicamos los filtros/orden
  const listaFinalRenderizada = useMemo(() => {
    let resultado = [...productosFiltrados]; // Inicia con lo que coincida en el texto de búsqueda

    // 1. Filtro Sin Stock
    if (modoSoloSinStock) {
      resultado = resultado.filter(p => p.cantidad === 0);
    }

    // 2. Filtro Descuentos (Bono Influencer)
    if (filtroDescuentos) {
      resultado = resultado.filter(p => p.piezasConDescuento > 0);
    }

    // 3. Ordenamiento reactivo
    if (ordenamiento === 'nombre') {
      resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (ordenamiento === 'cantidad-asc') {
      resultado.sort((a, b) => a.cantidad - b.cantidad);
    } else if (ordenamiento === 'cantidad-desc') {
      resultado.sort((a, b) => b.cantidad - a.cantidad);
    }

    return resultado;
  }, [productosFiltrados, modoSoloSinStock, filtroDescuentos, ordenamiento]);

  // Alternador de botón de Stock
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

    try {
      setLoading(true);

      const inventarioRef = doc(db, 'cuentas', cuentaId.toString(), 'inventarios', 'vital_health_principal');

      await updateDoc(inventarioRef, {
        [`productos.${selectedProduct.id}.notas`]: notasEdicion,
        [`productos.${selectedProduct.id}.updatedAt`]: new Date().toISOString(),
      });

      Alert.alert('✅ Guardado', 'Las notas se actualizaron correctamente', [
        {
          text: 'OK',
          onPress: () => {
            closeModalNotas();
            if (isMountedRef.current) cargarProductos();
          },
        },
      ]);
    } catch (error) {
      console.error('❌ Error guardando notas:', error);
      Alert.alert('Error', 'No se pudieron anotar las notas');
    } finally {
      setLoading(false);
    }
  };

  // =====================================================================
  // 5. RENDERIZADO DE PRODUCTO
  // =====================================================================
  const renderProducto = ({ item }) => {
    const imagen = imagenes[item.codigo] || null;

    return (
      <TouchableOpacity
        style={[styles.productoCard, { backgroundColor: themeColors.bgSecondary }]}
        onPress={() => openModalNotas(item)}
        activeOpacity={0.7}
      >
        <View style={styles.imagenContainer}>
          {imagen ? (
            <Image source={imagen} style={styles.imagen} />
          ) : (
            <View style={styles.imagenPlaceholder}>
              <Text style={styles.imagenPlaceholderText}>📦</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={[styles.nombre, { color: themeColors.text }]} numberOfLines={2}>
            {item.nombre}
          </Text>

          <View style={styles.detalles}>
            <Text style={[styles.codigo, { color: themeColors.textSecondary, flex: 1 }]} numberOfLines={1}>
              {item.notas ? `📝 ${item.notas}` : ''}
            </Text>
          </View>          
        </View>

        {/* 👁️ VISIBILIDAD INTELIGENTE DE STOCK */}
            <View style={{alignItems: 'center'}}>
              <Text style={styles.cantidad}>
                {filtroDescuentos ? `${item.piezasConDescuento} pz ⭐` : `${item.cantidad} pz`}
              </Text>
              
              {/* Si no está filtrado, mostramos una pequeña pista debajo de que hay piezas con bono */}
              {!filtroDescuentos && item.piezasConDescuento > 0 && (
                <Text style={{ fontSize: 10, color: COLORS.morado, fontWeight: 'bold' }}>
                  ({item.piezasConDescuento} con bono)
                </Text>
              )}
            </View>

        <View style={styles.accionesDerecha}>
          <Text style={[styles.precioTexto, { color: themeColors.textSecondary }]}>
            ${item.precioVenta}
          </Text>
          <TouchableOpacity style={styles.notasBtn} onPress={() => openModalNotas(item)}>
            <Text style={styles.notasBtnText}>📝</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && productos.length === 0) {
    return (
      <SafeAreaView style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg }]}>
        <View style={GLOBAL_STYLES.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.turquesa} />
          <Text style={GLOBAL_STYLES.loaderText}>Cargando existencias...</Text>
        </View>
      </SafeAreaView>
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

      {/* Buscador: Filtra el catálogo crudo */}
      <SearchBar 
        data={productos} 
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
              ⭐ Descuentos
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* FlatList renderiza la lista re-ordenada y filtrada */}
      <FlatList
        data={listaFinalRenderizada}
        renderItem={renderProducto}
        keyExtractor={(item) => item.codigo}
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

      {/* Modal de Notas */}
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
                  <Text style={[GLOBAL_STYLES.modalLabel, { color: themeColors.textSecondary }]}>
                    Código: {selectedProduct.codigo}
                  </Text>
                </View>

                <View style={styles.notasInputContainer}>
                  
                  {/* ✅ Fila de Encabezado: Título y Botón de Eliminar Notas */}
                  <View style={styles.notasHeaderRow}>
                    <Text style={[GLOBAL_STYLES.modalLabel, styles.notasLabelAdjust, { color: themeColors.text }]}>
                      📝 Notas
                    </Text>
                    {notasEdicion.length > 0 && (
                      <TouchableOpacity onPress={limpiarNotas} style={styles.btnLimpiarNotas}>
                        <Text style={styles.btnLimpiarNotasText}>🗑️ Limpiar</Text>
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

                  <TouchableOpacity style={[GLOBAL_STYLES.btnSuccess, GLOBAL_STYLES.modalBtnHalf, loading && GLOBAL_STYLES.disabledBtn]} onPress={guardarNotas} disabled={loading}>
                    <Text style={GLOBAL_STYLES.btnText}>
                      {loading ? '⏳' : '💾 Guardar'}
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
  // HEADER
  headerFlex: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
  },
  headerBtnWrapper: {
    width: 40,
  },
  headerIconText: {
    fontSize: 24,
  },
  headerTitleText: {
    flex: 1, 
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },

  // FILTROS
  filtrosContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 8,
  },
  filtroBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.morado,
    justifyContent: 'center',
  },
  filtroBtnActive: {
    backgroundColor: COLORS.morado,
  },
  filtroBtnDescuentoActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#C084FC',
  },
  filtroBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.morado,
  },
  filtroBtnTextActive: {
    color: COLORS.blanco,
  },

  // LISTA Y TARJETAS DE PRODUCTO
  listContent: {
    padding: 15,
    paddingBottom: 30,
  },
  productoCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.morado,
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
  imagenPlaceholderText: {
    fontSize: 28,
  },
  info: {
    flex: 1,
  },
  nombre: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  detalles: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  codigo: {
    fontSize: 11,
    marginRight: 10,
  },
  cantidad: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.turquesa,
    textAlign: 'center',
    minWidth: 40,
  },
  
  // ACCIONES DERECHA
  accionesDerecha: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 10,
  },
  precioTexto: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  notasBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gris,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notasBtnText: {
    fontSize: 16,
  },
  
  // LAYOUT INTERNO DEL MODAL DE NOTAS
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