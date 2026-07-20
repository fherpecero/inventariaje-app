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

// ✅ 1. Importamos la Fuente de la Verdad y los componentes globales
import { COLORS, FONT_SIZES, SPACING, ScreenHeader, GLOBAL_STYLES } from '../context/theme';

export default function ExistenciasScreen({ 
    onNavigate, 
    darkMode, 
    themeColors, 
    modoSoloSinStock = false 
}) {
  const { user, cuenta, cuentaId } = useContext(AuthContext);
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalNotasVisible, setModalNotasVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [notasEdicion, setNotasEdicion] = useState('');
  const [ordenamiento, setOrdenamiento] = useState('nombre'); // 'nombre', 'cantidad-asc', 'cantidad-desc'
  const [isOwner, setIsOwner] = useState(false);

  const isMountedRef = useRef(true);

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

  const verificarPropietario = async () => {
    try {
      const cuentaRef = doc(db, 'cuentas', cuentaId.toString());
      const cuentaSnap = await getDoc(cuentaRef);
      
      if (cuentaSnap.exists()) {
        const esOwner = cuentaSnap.data().propietarioUid === user.uid;
        setIsOwner(esOwner);
        console.log('👤 ¿Es propietario?', esOwner);
      }
    } catch (error) {
      console.error('❌ Error verificando propietario:', error);
    }
  };

  const cargarProductos = async () => {
    if (!isMountedRef.current) return;

    try {
      if (isMountedRef.current) setLoading(true);

      console.log('📦 Cargando existencias para cuenta:', cuenta);

      const catalogoRef = collection(db, 'catalogoGlobal');
      const catalogoSnap = await getDocs(catalogoRef);

      const docRef = doc(
        db,
        'cuentas',
        cuentaId.toString(),
        'inventarios',
        'vital_health_principal'
        );
        const docSnap = await getDoc(docRef);
        const productos = docSnap.data()?.productos || {};

        const inventarioMap = {};
        Object.keys(productos).forEach((codigo) => {
          inventarioMap[codigo] = {
            cantidad: productos[codigo].cantidad || 0,
            notas: productos[codigo].notas || '',
          };
        });

      const productosCombinados = catalogoSnap.docs.map((doc) => {
        const catalogo = doc.data();
        const datos = inventarioMap[doc.id] || { cantidad: 0, notas: '' };

        return {
          id: doc.id,
          nombre: catalogo.nombre,
          codigo: catalogo.codigo,
          cantidad: datos.cantidad,
          notas: datos.notas,
          precioCosto: catalogo.precioCostoStandard || 0,
          precioVenta: catalogo.precioVentaStandard || 0,
        };
      });

      if (isMountedRef.current) {
        setProductos(productosCombinados);
        
        if (modoSoloSinStock) {
            const sinStock = productosCombinados.filter(p => p.cantidad === 0);
            setProductosFiltrados(sinStock);
            setOrdenamiento('nombre');
        } else {
            setProductosFiltrados(productosCombinados);
        }
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

  const aplicarFiltrosYOrdenamiento = (lista, orden) => {
    let resultado = [...lista];

    if (orden === 'nombre') {
      resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (orden === 'cantidad-asc') {
      resultado.sort((a, b) => a.cantidad - b.cantidad);
    } else if (orden === 'cantidad-desc') {
      resultado.sort((a, b) => b.cantidad - a.cantidad);
    }

    setProductosFiltrados(resultado);
  };

  const handleOrdenamiento = (nuevoOrden) => {
    setOrdenamiento(nuevoOrden);
    aplicarFiltrosYOrdenamiento(productosFiltrados, nuevoOrden);
  };

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

  const guardarNotas = async () => {
    if (!selectedProduct) return;

    try {
      setLoading(true);

      const inventarioRef = doc(
        db,
        'cuentas',
        cuentaId.toString(),
        'inventarios',
        'vital_health_principal'
      );

      await updateDoc(inventarioRef, {
      [`productos.${selectedProduct.id}.notas`]: notasEdicion,
      [`productos.${selectedProduct.id}.updatedAt`]: new Date().toISOString(),
      });

      Alert.alert('✅ Guardado', 'Las notas se anotaron correctamente', [
        {
          text: 'OK',
          onPress: () => {
            closeModalNotas();
            if (isMountedRef.current) {
              cargarProductos();
            }
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

  const renderProducto = ({ item }) => {
    const imagen = imagenes[item.codigo] || null;
    const tieneNotas = item.notas && item.notas.trim() !== '';

    return (
      <TouchableOpacity
        style={[
          styles.productoCard,
          { backgroundColor: themeColors.bgSecondary },
        ]}
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
            <Text style={[styles.codigo, { color: themeColors.textSecondary }]}>
              {item.notas ? ` ${item.notas}` : ''}
            </Text>
            <Text style={styles.cantidad}>
              {item.cantidad} pz
            </Text>
          </View>          
        </View>

        <View style={[styles.precioContainer, { backgroundColor: themeColors.bg }]}>
          <Text style={[styles.precioLabel, { color: themeColors.textSecondary }]}>
            ${item.precioVenta}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.notasBtn}
          onPress={() => openModalNotas(item)}
        >
          <Text style={styles.notasBtnText}>📝</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const productosParaSearch = useMemo(() => {
    return modoSoloSinStock 
      ? productos.filter(p => p.cantidad === 0)
      : productos;
  }, [productos, modoSoloSinStock]);

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

  return (
    <SafeAreaView style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg }]}>
      
      {/* ✅ 2. Implementamos ScreenHeader */}
      <ScreenHeader
        title={modoSoloSinStock ? '⚠️ Sin Stock' : '📊 Existencias'}
        onBackPress={() => onNavigate('home')}
        themeColors={themeColors}
      />

      <SearchBar 
        data={productosParaSearch}
        onSearch={setProductosFiltrados}
        searchKeys={['nombre', 'codigo']}
      />

      <View style={styles.filtrosContainer}>
        <TouchableOpacity
          style={[styles.filtroBtn, ordenamiento === 'nombre' && styles.filtroBtnActive]}
          onPress={() => handleOrdenamiento('nombre')}
        >
          <Text style={[styles.filtroBtnText, ordenamiento === 'nombre' && styles.filtroBtnTextActive]}>
            A-Z
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filtroBtn, ordenamiento === 'cantidad-asc' && styles.filtroBtnActive]}
          onPress={() => handleOrdenamiento('cantidad-asc')}
        >
          <Text style={[styles.filtroBtnText, ordenamiento === 'cantidad-asc' && styles.filtroBtnTextActive]}>
            ↑ Stock
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filtroBtn, ordenamiento === 'cantidad-desc' && styles.filtroBtnActive]}
          onPress={() => handleOrdenamiento('cantidad-desc')}
        >
          <Text style={[styles.filtroBtnText, ordenamiento === 'cantidad-desc' && styles.filtroBtnTextActive]}>
            ↓ Stock
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={productosFiltrados}
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

      {/* ✅ 3. Modal unificado con GLOBAL_STYLES */}
      <Modal
        visible={modalNotasVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModalNotas}
      >
        <Pressable style={GLOBAL_STYLES.modalOverlay} onPress={closeModalNotas}>
          <Pressable
            style={[GLOBAL_STYLES.modalContent, { backgroundColor: themeColors.bgSecondary }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedProduct && (
              <>
                <View style={styles.modalHeader}>
                  {/* Forzamos marginBottom 0 para que no choque con la 'X' */}
                  <Text style={[GLOBAL_STYLES.modalTitle, { color: themeColors.text, marginBottom: 0, flex: 1 }]}>
                    {selectedProduct.nombre}
                  </Text>
                  <TouchableOpacity onPress={closeModalNotas}>
                    <Text style={{ fontSize: 24, fontWeight: '700', color: themeColors.textSecondary, marginLeft: 10 }}>✕</Text>
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

                <View style={{ marginBottom: 20 }}>
                  <Text style={[GLOBAL_STYLES.modalLabel, { color: themeColors.text }]}>
                    📝 Notas (Prestado, Cortesías, etc)
                  </Text>
                  <TextInput
                    style={[
                      GLOBAL_STYLES.inputBase, // Hereda borde, padding y fuente global
                      styles.notasInputArea, // Mantiene el multiline
                      { color: themeColors.text, borderColor: COLORS.turquesa, backgroundColor: themeColors.bg },
                    ]}
                    placeholder="Agregar notas..."
                    placeholderTextColor={themeColors.textSecondary}
                    value={notasEdicion}
                    onChangeText={setNotasEdicion}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                <View style={GLOBAL_STYLES.modalButtons}>
                  <TouchableOpacity
                    style={[GLOBAL_STYLES.btnDanger, GLOBAL_STYLES.modalBtnHalf]}
                    onPress={closeModalNotas}
                  >
                    <Text style={GLOBAL_STYLES.btnText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[GLOBAL_STYLES.btnSuccess, GLOBAL_STYLES.modalBtnHalf, loading && GLOBAL_STYLES.disabledBtn]}
                    onPress={guardarNotas}
                    disabled={loading}
                  >
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
    </SafeAreaView>
  );
}

// ✅ 4. StyleSheet purificado (Solo estilos de Filtros, Tarjetas y Layout del modal)
const styles = StyleSheet.create({
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
  },
  filtroBtnActive: {
    backgroundColor: COLORS.morado,
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
    marginBottom: 4,
  },
  codigo: {
    fontSize: 11,
  },
  cantidad: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.turquesa,
    textAlign: 'center',
    minWidth: 60,
  },
  notasBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gris,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notasBtnText: {
    fontSize: 18,
  },
  
  // ETIQUETA DE PRECIO
  precioContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.turquesa,
  },
  precioLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  
  // LAYOUT INTERNO DEL MODAL
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  modalInfo: {
    marginBottom: 15,
  },
  notasInputArea: {
    minHeight: 100, // Hace que el input parezca un área de texto grande
    textAlignVertical: 'top',
  },
});