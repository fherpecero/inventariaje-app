import React, { useState } from 'react';
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
} from 'react-native';
import { getImagenProducto } from './productosData';
import { getTimestamp, filtrarClientes } from './utils';

const COLORS = {
  turquesa: '#00BCD4',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  verde: '#4CAF50',
  rojo: '#f44336',
};

const PRODUCTOS_LISTA = [
  { codigo: '783495591689', nombre: 'V-DAILY', cantidad: 1, precioCosto: 800, precioVenta: 1600 },
  { codigo: '704001043645', nombre: 'V-CURCUMAX', cantidad: 1, precioCosto: 425, precioVenta: 850 },
  { codigo: '742761499890', nombre: 'V-LATTEKAFFE', cantidad: 1, precioCosto: 600, precioVenta: 1200 },
  { codigo: '789232455740', nombre: 'KETO + BHB', cantidad: 2, precioCosto: 900, precioVenta: 1800 },
  { codigo: '782706461339', nombre: 'V-TEDETOX', cantidad: 23, precioCosto: 175, precioVenta: 350 },
  { codigo: '782706461278', nombre: 'GLUTATION PLUS', cantidad: 1, precioCosto: 700, precioVenta: 1400 },
  { codigo: '782706461254', nombre: 'V-ASCULAX', cantidad: 0, precioCosto: 350, precioVenta: 700 },
  { codigo: '782706461209', nombre: 'V-ITALAY', cantidad: 2, precioCosto: 350, precioVenta: 700 },
  { codigo: '782706461407', nombre: 'V-NITRO', cantidad: 4, precioCosto: 600, precioVenta: 1200 },
  { codigo: '782706461261', nombre: 'V-GLUCALOSE', cantidad: 3, precioCosto: 350, precioVenta: 700 },
  { codigo: '782706461193', nombre: 'V-ORGANEX', cantidad: 4, precioCosto: 350, precioVenta: 700 },
  { codigo: '782706461186', nombre: 'V-ITAREN', cantidad: 4, precioCosto: 350, precioVenta: 700 },
  { codigo: '723326333682', nombre: 'GENIUS SHAKE', cantidad: 2, precioCosto: 700, precioVenta: 1400 },
  { codigo: '742761499937', nombre: 'V-SMOOTHIE', cantidad: 1, precioCosto: 450, precioVenta: 900 },
  { codigo: '782706461384', nombre: 'V-KETOKAFE BHB', cantidad: 2, precioCosto: 625, precioVenta: 1250 },
  { codigo: '782706461360', nombre: 'V-LOVKAFE', cantidad: 3, precioCosto: 450, precioVenta: 900 },
  { codigo: '782706461230', nombre: 'VITARLY-L', cantidad: 2, precioCosto: 375, precioVenta: 750 },
  { codigo: '782706461247', nombre: 'V-ITALBOOST', cantidad: 3, precioCosto: 425, precioVenta: 850 },
  { codigo: '789232464094', nombre: 'V-TEDETOX MORAS', cantidad: 8, precioCosto: 175, precioVenta: 350 },
  { codigo: '782706461285', nombre: 'V-ITADOL', cantidad: 3, precioCosto: 350, precioVenta: 700 },
  { codigo: '723326333675', nombre: 'SMART BIOTICS KIDS', cantidad: 2, precioCosto: 400, precioVenta: 800 },
  { codigo: '723326333699', nombre: 'DFENCE KIDS', cantidad: 2, precioCosto: 400, precioVenta: 800 },
  { codigo: '782706461322', nombre: 'V-FORTYFLORA', cantidad: 1, precioCosto: 350, precioVenta: 700 },
  { codigo: '742968946739', nombre: 'V-NRGY TROPICAL', cantidad: 1, precioCosto: 400, precioVenta: 800 },
  { codigo: '782706461292', nombre: 'V-control', cantidad: 2, precioCosto: 350, precioVenta: 700 },
  { codigo: '782706461421', nombre: 'V-OMEGA3', cantidad: 0, precioCosto: 750, precioVenta: 1500 },
  { codigo: '782706461346', nombre: 'V-NEUROKAFE', cantidad: 2, precioCosto: 450, precioVenta: 900 },
];

export default function EntradaScreen() {
  const [searchText, setSearchText] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Filtrar productos por búsqueda
  const handleSearch = (text) => {
    setSearchText(text);
    if (text.trim().length > 0) {
      const filtered = PRODUCTOS_LISTA.filter(p =>
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
      Alert.alert('Error', 'Ingresa una cantidad válida');
      return;
    }

    setLoading(true);
    try {
      const nuevaCantidad = selectedProduct.cantidad + parseInt(cantidad);
      const timestamp = getTimestamp();

      const response = await fetch(
        'https://inventariaje-app.vercel.app/api/inventario',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codigo: selectedProduct.codigo,
            cantidad: nuevaCantidad,
            tipoOperacion: 'Entrada',
            timestamp: timestamp,
          }),
        }
      );

      const data = await response.json();

      if (data.exito) {
        Alert.alert(
          '✅ Éxito',
          `${selectedProduct.nombre}\nNueva cantidad: ${nuevaCantidad}\nFecha: ${timestamp}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedProduct(null);
                setSearchText('');
                setCantidad('');
                setFilteredProducts([]);
              },
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Error: ' + error.message);
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
              placeholder="Ej: Vitamina, Proteína..."
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