import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  Keyboard,
} from 'react-native';

const COLORS = {
  turquesa: '#00BCD4',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  verde: '#4CAF50',
  rojo: '#f44336',
};

export default function EntradaScreen() {
  const [allProducts, setAllProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Cargar productos al iniciar
  useEffect(() => {
    cargarProductos();
  }, []);

  // Cargar productos desde Firebase
  const cargarProductos = async () => {
    setLoadingProducts(true);
    try {
      const response = await fetch(
        'https://inventariaje-app.vercel.app/api/salida'
      );
      const data = await response.json();

      if (data.exito && data.productos) {
        const productosValidos = data.productos.filter(
          (p) => p && p.nombre && p.codigo
        );
        setAllProducts(productosValidos);
        setFilteredProducts(productosValidos);
      } else {
        Alert.alert('Error', 'No hay productos disponibles');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al cargar productos: ' + error.message);
      console.error('Error:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Filtrar productos mientras el usuario escribe
  const handleSearch = (text) => {
    setSearchText(text);

    if (text.trim() === '') {
      setFilteredProducts(allProducts);
    } else {
      const filtered = allProducts.filter((p) =>
        p.nombre.toUpperCase().includes(text.toUpperCase())
      );
      setFilteredProducts(filtered);
    }
  };

  // Seleccionar producto del dropdown
  const selectProduct = (product) => {
    setSelectedProduct(product);
    setSearchText(product.nombre);
    setFilteredProducts([]);
    setCantidad('');
    Keyboard.dismiss();
  };

  // Agregar inventario
  const agregarInventario = async () => {
    // Validaciones
    if (!selectedProduct) {
      Alert.alert('Error', 'Selecciona un producto primero');
      return;
    }

    if (!cantidad || isNaN(cantidad) || parseInt(cantidad) <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida (mayor a 0)');
      return;
    }

    setLoading(true);

    try {
      console.log('Enviando a /api/entrada:', {
        codigo: selectedProduct.codigo,
        producto: selectedProduct.nombre,
        cantidad: parseInt(cantidad),
      });

      const response = await fetch(
        'https://inventariaje-app.vercel.app/api/entrada',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo: selectedProduct.codigo,
            producto: selectedProduct.nombre,
            cantidad: parseInt(cantidad),
          }),
        }
      );

      const data = await response.json();
      console.log('Respuesta:', data);

      if (data.exito) {
        Alert.alert(
          '✅ Inventario Aumentificado Correctamente',
          `Inventario actualizado\n\n${selectedProduct.nombre}\nCantidad agregada: ${cantidad}\nNueva cantidad: ${data.cantidadNueva}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Limpiar formulario
                setSelectedProduct(null);
                setSearchText('');
                setCantidad('');
                setFilteredProducts(allProducts);
                
                // Recargar productos
                cargarProductos();
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', data.mensaje || 'Error al actualizar inventario');
      }
    } catch (error) {
      Alert.alert('Error', 'Error al agregar: ' + error.message);
      console.error('Error completo:', error);
    } finally {
      setLoading(false);
    }
  };

  // Limpiar selección
  const limpiar = () => {
    setSelectedProduct(null);
    setSearchText('');
    setCantidad('');
    setFilteredProducts(allProducts);
  };

  // Renderizar item del dropdown
  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={styles.dropdownItem}
      onPress={() => selectProduct(item)}
    >
      <Text style={styles.dropdownItemText}>{item.nombre}</Text>
      <Text style={styles.dropdownItemCode}>{item.codigo}</Text>
    </TouchableOpacity>
  );

  if (loadingProducts) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📦 Agregar Inventario</Text>
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.turquesa} />
          <Text style={styles.loaderText}>Cargando productos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📦 Agregar Inventario</Text>
      </View>

      <View style={styles.content}>
        {/* Campo de búsqueda */}
        <Text style={styles.label}>Buscar producto:</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej: lo que dice despues del V-"
          value={searchText}
          onChangeText={handleSearch}
          placeholderTextColor="#999"
        />

        {/* Dropdown de productos */}
        {filteredProducts.length > 0 && searchText.trim() !== '' && (
          <View style={styles.dropdown}>
            <FlatList
              data={filteredProducts}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.codigo}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Producto seleccionado */}
        {selectedProduct && (
          <View style={styles.productCard}>
            <Text style={styles.productName}>{selectedProduct.nombre}</Text>
            <Text style={styles.productCode}>
              Código: {selectedProduct.codigo}
            </Text>

            {/* Información actual */}
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Cantidad actual:</Text>
              <Text style={styles.infoValue}>
                {selectedProduct.cantidad} unidades
              </Text>
            </View>

            {/* Campo cantidad */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cantidad a agregar:</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 5"
                value={cantidad}
                onChangeText={setCantidad}
                keyboardType="number-pad"
                placeholderTextColor="#999"
              />
            </View>

            {/* Botón agregar */}
            <TouchableOpacity
              style={[styles.addBtn, loading && styles.disabledBtn]}
              onPress={agregarInventario}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.blanco} />
              ) : (
                <Text style={styles.addBtnText}>✅ Agregar</Text>
              )}
            </TouchableOpacity>

            {/* Botón limpiar */}
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={limpiar}
              disabled={loading}
            >
              <Text style={styles.resetBtnText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sin productos */}
        {!selectedProduct && allProducts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hay productos disponibles</Text>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={cargarProductos}
            >
              <Text style={styles.refreshBtnText}>🔄 Recargar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gris,
  },
  header: {
    backgroundColor: COLORS.turquesa,
    paddingVertical: 15,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.blanco,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.negro,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: COLORS.blanco,
    color: COLORS.negro,
  },
  dropdown: {
    backgroundColor: COLORS.blanco,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    maxHeight: 200,
    marginBottom: 10,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.negro,
  },
  dropdownItemCode: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  productCard: {
    backgroundColor: COLORS.blanco,
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
    borderWidth: 2,
    borderColor: COLORS.turquesa,
  },
  productName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.negro,
    marginBottom: 5,
  },
  productCode: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  infoBox: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 6,
    marginBottom: 15,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.turquesa,
  },
  inputGroup: {
    marginBottom: 15,
  },
  addBtn: {
    backgroundColor: COLORS.verde,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  addBtnText: {
    color: COLORS.blanco,
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  resetBtn: {
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetBtnText: {
    color: COLORS.negro,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 15,
  },
  refreshBtn: {
    backgroundColor: COLORS.turquesa,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: COLORS.blanco,
    fontWeight: 'bold',
  },
});