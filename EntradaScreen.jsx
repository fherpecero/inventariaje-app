import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  Keyboard,
} from 'react-native';
import { getTimestamp } from './utils';

const COLORS = {
  turquesa: '#00BCD4',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  verde: '#4CAF50',
  rojo: '#f44336',
};

export default function EntradaScreen() {
  const [searchText, setSearchText] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [allProducts, setAllProducts] = useState([]);

  // Cargar productos al iniciar
  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
  try {
    const response = await fetch(
      'https://inventariaje-app.vercel.app/api/salida'
    );
    const data = await response.json();

    if (data.exito && data.productos) {
      // Validar que cada producto tenga propiedades requeridas
      const productosValidos = data.productos.filter(p => 
        p && p.nombre && p.codigo
      );
      setAllProducts(productosValidos);
    } else {
      Alert.alert('Error', 'No hay productos disponibles');
    }
  } catch (error) {
    Alert.alert('Error', 'Error al cargar productos: ' + error.message);
    console.error('Error:', error);
  }
};

  // Filtrar productos por búsqueda
  const handleSearch = (text) => {
    setSearchText(text);
    if (text.trim().length > 0) {
      const filtered = allProducts.filter(p =>
        p.nombre.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredProducts(filtered);
      setShowDropdown(true);
    } else {
      setFilteredProducts([]);
      setShowDropdown(false);
    }
  };

  // Seleccionar producto
  const selectProduct = (producto) => {
    setSelectedProduct(producto);
    setSearchText(producto.nombre);
    setShowDropdown(false);
    setCantidad('');
  };

  // Agregar al inventario
  const agregarInventario = async () => {
    if (!cantidad || isNaN(cantidad) || parseInt(cantidad) <= 0) {
      Alert.alert('Error', 'Pero cuantos quieres?');
      return;
    }

    setLoading(true);
    try {
      const timestamp = getTimestamp();

      const response = await fetch(
        'https://inventariaje-app.vercel.app/api/firebase-api',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            producto: selectedProduct.nombre,
            cantidad: parseInt(cantidad),
            precio: selectedProduct.precioVenta,
            evento: 'ENTRADA',
            lugar: 'Bodega',
          }),
        }
      );

      const data = await response.json();

      if (data.exito) {
        Keyboard.dismiss();
        
        Alert.alert(
          '✅ Éxito si pude',
          `${selectedProduct.nombre}\nCantidad agregada: ${cantidad}\nFecha: ${timestamp}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedProduct(null);
                setSearchText('');
                setCantidad('');
                setFilteredProducts([]);
                cargarProductos(); // Recargar lista
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('No pude', 'Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📥 Agregar Inventario</Text>
        </View>

        <View style={styles.content}>
          {/* Búsqueda de producto */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Buscar producto:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: lo que dice despues del V-"
              value={searchText}
              onChangeText={handleSearch}
              editable={!loading}
            />

            {/* Dropdown de resultados */}
            {showDropdown && filteredProducts.length > 0 && (
              <View style={styles.dropdown}>
                {filteredProducts.map((producto) => (
                  <TouchableOpacity
                    key={producto.codigo}
                    style={styles.dropdownItem}
                    onPress={() => selectProduct(producto)}
                  >
                    <Text style={styles.dropdownItemText}>
                      {producto.nombre}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Producto seleccionado */}
          {selectedProduct && (
            <View style={styles.productCard}>
              <Text style={styles.productName}>{selectedProduct.nombre}</Text>
              <Text style={styles.productCode}>
                Código: {selectedProduct.codigo}
              </Text>

              <View style={styles.infoBox}>
                <Text style={styles.infoLabel}>Cantidad actual:</Text>
                <Text style={styles.infoValue}>{selectedProduct.cantidad}</Text>
              </View>

              {/* Cantidad a agregar */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Cantidad a agregar:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 5"
                  value={cantidad}
                  onChangeText={setCantidad}
                  keyboardType="numeric"
                  editable={!loading}
                />
              </View>

              {/* Botones */}
              <TouchableOpacity
                style={styles.addBtn}
                onPress={agregarInventario}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.blanco} />
                ) : (
                  <Text style={styles.addBtnText}>✅ Agregar</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setSelectedProduct(null);
                  setSearchText('');
                  setCantidad('');
                }}
                disabled={loading}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.gris,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.gris,
  },
  header: {
    backgroundColor: COLORS.turquesa,
    paddingTop: 20,
    paddingBottom: 20,
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
  formGroup: {
    marginBottom: 20,
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
    fontSize: 16,
    backgroundColor: COLORS.blanco,
  },
  dropdown: {
    backgroundColor: COLORS.blanco,
    borderWidth: 1,
    borderColor: '#ccc',
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 14,
    color: COLORS.negro,
  },
  productCard: {
    backgroundColor: COLORS.blanco,
    borderRadius: 8,
    padding: 15,
    borderWidth: 2,
    borderColor: COLORS.turquesa,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.negro,
    marginBottom: 5,
  },
  productCode: {
    fontSize: 13,
    color: '#999',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.turquesa,
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
  cancelBtn: {
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.negro,
    fontSize: 14,
    fontWeight: '600',
  },
});