import React, { useState, useEffect, useRef, useContext } from 'react';
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

const COLORS = {
  turquesa: '#1a9ea1',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  verde: '#4CAF50',
  rojo: '#f44336',
  naranja: '#FF9800',
  morado: '#7e2b8d',
  rojito: '#f97272',
};

const FONT_SIZES = {
  titulo: 20,
  subtitulo: 16,
  normal: 14,
  pequeño: 12,
};

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
  const [busqueda, setBusqueda] = useState('');
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

  // ¿Es el propietario de la cuenta?
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

  /**
   * FUNCIÓN: Cargar productos con notas
    */
  const cargarProductos = async () => {
    if (!isMountedRef.current) return;

    try {
      if (isMountedRef.current) setLoading(true);

      console.log('📦 Cargando existencias para cuenta:', cuenta);

      // PASO 1: Leer catálogo global
      const catalogoRef = collection(db, 'catalogoGlobal');
      const catalogoSnap = await getDocs(catalogoRef);

      // PASO 2: Leer inventario de la cuenta
      const docRef = doc(
        db,
        'cuentas',
        cuentaId.toString(),
        'inventarios',
        'vital_health_principal'
        );
        const docSnap = await getDoc(docRef);
        const productos = docSnap.data()?.productos || {};

        // Crear mapa de inventario
        const inventarioMap = {};
        Object.keys(productos).forEach((codigo) => {
          inventarioMap[codigo] = {
            cantidad: productos[codigo].cantidad || 0,
            notas: productos[codigo].notas || '',
          };
        });

      // PASO 3: Combinar catálogo + inventario
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
        aplicarFiltrosYOrdenamiento(productosCombinados, busqueda, ordenamiento);
        console.log('✅ Existencias cargadas:', productosCombinados.length);

        // Si es modo "sin stock", filtrar automáticamente
        if (modoSoloSinStock) {
            const sinStock = productosCombinados.filter(p => p.cantidad === 0);
            setProductosFiltrados(sinStock);
            setOrdenamiento('nombre');
            console.log('📊 Modo Sin Stock - Mostrando:', sinStock.length, 'productos');
        } else {
            aplicarFiltrosYOrdenamiento(productosCombinados, busqueda, ordenamiento);
        }
        
        console.log('✅ inExistencias cargadas:', productosCombinados.length);
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

  /**
   * FUNCIÓN: Aplicar búsqueda y ordenamiento
   */
  const aplicarFiltrosYOrdenamiento = (lista, textobus, orden) => {
    let resultado = [...lista];

    // FILTRO: Búsqueda por nombre o código
    if (textobus.trim()) {
      resultado = resultado.filter((p) =>
        p.nombre.toLowerCase().includes(textobus.toLowerCase()) ||
        p.codigo.includes(textobus)
      );
    }

    // ORDENAMIENTO
    if (orden === 'nombre') {
      resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
    } else if (orden === 'cantidad-asc') {
      resultado.sort((a, b) => a.cantidad - b.cantidad);
    } else if (orden === 'cantidad-desc') {
      resultado.sort((a, b) => b.cantidad - a.cantidad);
    }

    setProductosFiltrados(resultado);
  };

  // ✅ ÚNICA función para búsqueda
  const handleBusqueda = (texto) => {
    setBusqueda(texto);
    aplicarFiltrosYOrdenamiento(productos, texto, ordenamiento);
  };

  // ✅ ÚNICA función para ordenamiento
  const handleOrdenamiento = (nuevoOrden) => {
    setOrdenamiento(nuevoOrden);
    aplicarFiltrosYOrdenamiento(productos, busqueda, nuevoOrden);
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

  /**
   * FUNCIÓN: Guardar notas del producto
   * 
   * PERMISOS: Todos los miembros pueden editar notas
   */
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
      

      console.log('✅ Anotado:', selectedProduct.nombre);

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
        {/* IMAGEN */}
        <View style={styles.imagenContainer}>
          {imagen ? (
            <Image source={imagen} style={styles.imagen} />
          ) : (
            <View style={styles.imagenPlaceholder}>
              <Text style={styles.imagenPlaceholderText}>📦</Text>
            </View>
          )}
        </View>

        {/* INFO */}
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

        {/* 💰 PRECIO */}
        <View style={[styles.precioContainer, { backgroundColor: themeColors.bg }]}>
          <Text style={[styles.precioLabel, { color: themeColors.textSecondary }]}>
            ${item.precioVenta}
          </Text>
        </View>

        {/* ICONO NOTAS */}
        <TouchableOpacity
          style={styles.notasBtn}
          onPress={() => openModalNotas(item)}
        >
          <Text style={styles.notasBtnText}>{tieneNotas ? '📝' : '📝'}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading && productos.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.turquesa} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.bg }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.backBtn}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{modoSoloSinStock ? '⚠️ Sin Stock' : '📊 Existencias'}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* BÚSQUEDA */}
      <View style={[styles.searchContainer, { backgroundColor: themeColors.bgSecondary }]}>
        <TextInput
          style={[styles.searchInput, { color: themeColors.text }]}
          placeholder="Buscar por nombre o código..."
          placeholderTextColor={themeColors.textSecondary}
          value={busqueda}
          onChangeText={handleBusqueda}
        />
      </View>

      {/* FILTROS */}
      <View style={styles.filtrosContainer}>
        <TouchableOpacity
          style={[
            styles.filtroBtn,
            ordenamiento === 'nombre' && styles.filtroBtnActive,
          ]}
          onPress={() => handleOrdenamiento('nombre')}
        >
          <Text
            style={[
              styles.filtroBtnText,
              ordenamiento === 'nombre' && styles.filtroBtnTextActive,
            ]}
          >
            A-Z
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filtroBtn,
            ordenamiento === 'cantidad-asc' && styles.filtroBtnActive,
          ]}
          onPress={() => handleOrdenamiento('cantidad-asc')}
        >
          <Text
            style={[
              styles.filtroBtnText,
              ordenamiento === 'cantidad-asc' && styles.filtroBtnTextActive,
            ]}
          >
            ↑ Stock
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filtroBtn,
            ordenamiento === 'cantidad-desc' && styles.filtroBtnActive,
          ]}
          onPress={() => handleOrdenamiento('cantidad-desc')}
        >
          <Text
            style={[
              styles.filtroBtnText,
              ordenamiento === 'cantidad-desc' && styles.filtroBtnTextActive,
            ]}
          >
            ↓ Stock
          </Text>
        </TouchableOpacity>
      </View>

      {/* LISTA */}
      <FlatList
        data={productosFiltrados}
        renderItem={renderProducto}
        keyExtractor={(item) => item.codigo}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: themeColors.text }]}>
              No hay productos
            </Text>
          </View>
        }
      />

      {/* MODAL - EDITAR NOTAS */}
      <Modal
        visible={modalNotasVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeModalNotas}
      >
        <Pressable style={styles.modalOverlay} onPress={closeModalNotas}>
          <Pressable
            style={[styles.modalContent, { backgroundColor: themeColors.bgSecondary }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedProduct && (
              <>
                {/* HEADER MODAL */}
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                    {selectedProduct.nombre}
                  </Text>
                  <TouchableOpacity onPress={closeModalNotas}>
                    <Text style={styles.modalCloseBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* INFO */}
                <View style={styles.modalInfo}>
                  <Text style={[styles.modalLabel, { color: themeColors.text }]}>
                    Cantidad: {selectedProduct.cantidad} unid.
                  </Text>
                  <Text style={[styles.modalLabel, { color: themeColors.textSecondary }]}>
                    Código: {selectedProduct.codigo}
                  </Text>
                </View>

                {/* NOTAS INPUT */}
                <View style={styles.notasInputContainer}>
                  <Text style={[styles.notasInputLabel, { color: themeColors.text }]}>
                    📝 Notas (Prestado, Cortesías, etc)
                  </Text>
                  <TextInput
                    style={[
                      styles.notasInput,
                      { color: themeColors.text, borderColor: COLORS.turquesa },
                    ]}
                    placeholder="Agregar notas..."
                    placeholderTextColor={themeColors.textSecondary}
                    value={notasEdicion}
                    onChangeText={setNotasEdicion}
                    multiline
                    numberOfLines={4}
                  />
                </View>

                {/* BOTONES */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={closeModalNotas}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.acceptBtn, loading && styles.disabledBtn]}
                    onPress={guardarNotas}
                    disabled={loading}
                  >
                    <Text style={styles.acceptBtnText}>
                      {loading ? '⏳' : '💾'} Guardar
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.blanco,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // HEADER
  header: {
    backgroundColor: COLORS.turquesa,
    paddingHorizontal: 15,
    paddingVertical: 15,
    paddingTop: 65,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.blanco,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.blanco,
  },

  // BÚSQUEDA
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: COLORS.gris,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
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

  // LISTA
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
    textAlign: 'center',  // ← AGREGAR SOLO ESTA LÍNEA
    minWidth: 60,         // ← Para que tome espacio suficiente
  },
  notasBadge: {
    backgroundColor: COLORS.naranja,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  notasText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.blanco,
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

  // EMPTY
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseBtn: {
    fontSize: 24,
    fontWeight: '700',
  },
  modalInfo: {
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 12,
    marginBottom: 4,
  },

  // NOTAS INPUT
  notasInputContainer: {
    marginBottom: 20,
  },
  notasInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  notasInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
  },

  // BOTONES MODAL
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.rojito,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.verde,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  // 🆕 PRECIO TAG
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
precioValue: {
  fontSize: 12,
  fontWeight: '700',
  color: COLORS.turquesa,
},
});
