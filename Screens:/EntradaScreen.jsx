// screens/EntradaScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../app-inventariaje';

const API_URL = 'https://inventariaje-app.vercel.app';

export default function EntradaScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [productoBuscado, setProductoBuscado] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [usuario, setUsuario] = useState('');
  const [loading, setLoading] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [mostrarScanner, setMostrarScanner] = useState(false);

  useEffect(() => {
    obtenerPermisos();
    obtenerUsuario();
  }, []);

  const obtenerPermisos = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const obtenerUsuario = async () => {
    const user = await AsyncStorage.getItem('usuario');
    setUsuario(user);
  };

  const handleBarCodeScanned = async ({ data }) => {
    setScanned(true);
    setMostrarScanner(false);
    await buscarProducto(data);
  };

  const buscarProducto = async (codigo) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/inventario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getProductByBarcode',
          codigo,
        }),
      });

      const data = await response.json();
      if (data.success && data.producto) {
        setProductoBuscado(data.producto);
        setCantidad('');
      } else {
        Alert.alert('No encontrado', 'El código de barras no existe en el sistema');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo buscar el producto');
    } finally {
      setLoading(false);
    }
  };

  const registrarEntrada = async () => {
    if (!productoBuscado || !cantidad) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/inventario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'registerEntrada',
          nombre: productoBuscado.nombre,
          cantidad: parseInt(cantidad),
          usuario,
        }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('✅ Éxito', `${cantidad} ${productoBuscado.nombre} registrado`);
        
        // Agregar al historial
        setHistorial([
          {
            nombre: productoBuscado.nombre,
            cantidad: parseInt(cantidad),
            fecha: new Date().toLocaleDateString(),
            hora: new Date().toLocaleTimeString(),
          },
          ...historial,
        ]);

        // Limpiar
        setProductoBuscado(null);
        setCantidad('');
        setScanned(false);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar la entrada');
    } finally {
      setLoading(false);
    }
  };

  if (mostrarScanner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.scannerHeader}>
          <TouchableOpacity
            style={styles.botonCerrar}
            onPress={() => setMostrarScanner(false)}
          >
            <Ionicons name="close" size={28} color={COLORS.blanco} />
          </TouchableOpacity>
          <Text style={styles.scannerTitulo}>Escanear código</Text>
          <View style={{ width: 28 }} />
        </View>

        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={styles.scanner}
        />

        {scanned && (
          <View style={styles.scanAgain}>
            <TouchableOpacity
              style={styles.botonScanAgain}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.botonScanAgainTexto}>Escanear de nuevo</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.titulo}>📦 Nueva Entrada</Text>
          <Text style={styles.subtitulo}>Registrar recepción de productos</Text>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={COLORS.turquesa} />
            <Text style={styles.loadingText}>Procesando...</Text>
          </View>
        ) : (
          <>
            {/* Botón Scanner */}
            <TouchableOpacity
              style={styles.botonScanner}
              onPress={() => setMostrarScanner(true)}
            >
              <Ionicons name="camera" size={24} color={COLORS.blanco} />
              <Text style={styles.botonScannerTexto}>Escanear código de barras</Text>
            </TouchableOpacity>

            {/* Producto encontrado */}
            {productoBuscado && (
              <View style={styles.productoCard}>
                <View style={styles.productoHeader}>
                  <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
                  <Text style={styles.productoNombre}>{productoBuscado.nombre}</Text>
                </View>

                <Text style={styles.productoCodigo}>
                  Código: {productoBuscado.codigo || 'N/A'}
                </Text>
                <Text style={styles.productoDescripcion}>
                  {productoBuscado.descripcion}
                </Text>

                {/* Cantidad */}
                <View style={styles.cantidadContainer}>
                  <Text style={styles.cantidadLabel}>Cantidad a recibir:</Text>
                  <TextInput
                    style={styles.cantidadInput}
                    placeholder="Escribe cantidad"
                    keyboardType="numeric"
                    value={cantidad}
                    onChangeText={setCantidad}
                    placeholderTextColor={COLORS.gris}
                  />
                </View>

                {/* Botones de acción */}
                <View style={styles.botonesContainer}>
                  <TouchableOpacity
                    style={styles.botonCancelar}
                    onPress={() => {
                      setProductoBuscado(null);
                      setCantidad('');
                    }}
                  >
                    <Text style={styles.botonCancelarTexto}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.botonRegistrar}
                    onPress={registrarEntrada}
                  >
                    <Ionicons name="checkmark" size={20} color={COLORS.blanco} />
                    <Text style={styles.botonRegistrarTexto}>Registrar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Historial */}
            {historial.length > 0 && (
              <View style={styles.historialContainer}>
                <Text style={styles.historialTitulo}>📋 Últimas Entradas</Text>
                <FlatList
                  data={historial}
                  keyExtractor={(item, idx) => idx.toString()}
                  scrollEnabled={false}
                  renderItem={({ item }) => (
                    <View style={styles.historialItem}>
                      <View style={styles.historialInfo}>
                        <Text style={styles.historialProducto}>{item.nombre}</Text>
                        <Text style={styles.historialDetalle}>
                          {item.fecha} • {item.hora}
                        </Text>
                      </View>
                      <Text style={styles.historialCantidad}>x{item.cantidad}</Text>
                    </View>
                  )}
                />
              </View>
            )}

            {/* Instrucciones */}
            {!productoBuscado && (
              <View style={styles.instrucciones}>
                <Ionicons name="information-circle" size={24} color={COLORS.turquesa} />
                <Text style={styles.instruccionesTexto}>
                  Presiona el botón de cámara para escanear un código de barras
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gris,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.turquesa,
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.blanco,
    marginBottom: 5,
  },
  subtitulo: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  scannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.turquesa,
    paddingVertical: 16,
    paddingHorizontal: 15,
  },
  botonCerrar: {
    padding: 4,
  },
  scannerTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.blanco,
  },
  scanner: {
    flex: 1,
  },
  scanAgain: {
    padding: 15,
    backgroundColor: COLORS.blanco,
  },
  botonScanAgain: {
    backgroundColor: COLORS.turquesa,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botonScanAgainTexto: {
    color: COLORS.blanco,
    fontWeight: '600',
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 10,
    color: COLORS.negro,
    fontSize: 14,
  },
  botonScanner: {
    backgroundColor: COLORS.turquesa,
    marginHorizontal: 15,
    marginVertical: 15,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  botonScannerTexto: {
    color: COLORS.blanco,
    fontWeight: '600',
    marginLeft: 10,
    fontSize: 16,
  },
  productoCard: {
    backgroundColor: COLORS.blanco,
    marginHorizontal: 15,
    marginVertical: 15,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productoNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.negro,
    marginLeft: 10,
  },
  productoCodigo: {
    fontSize: 12,
    color: COLORS.gris,
    marginBottom: 4,
  },
  productoDescripcion: {
    fontSize: 13,
    color: COLORS.gris,
    marginBottom: 16,
    lineHeight: 18,
  },
  cantidadContainer: {
    marginBottom: 16,
  },
  cantidadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.negro,
    marginBottom: 8,
  },
  cantidadInput: {
    backgroundColor: COLORS.gris,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.negro,
    borderWidth: 2,
    borderColor: COLORS.turquesa,
  },
  botonesContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  botonCancelar: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: COLORS.gris,
    alignItems: 'center',
  },
  botonCancelarTexto: {
    color: COLORS.gris,
    fontWeight: '600',
  },
  botonRegistrar: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonRegistrarTexto: {
    color: COLORS.blanco,
    fontWeight: '600',
    marginLeft: 6,
  },
  historialContainer: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  historialTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.negro,
    marginBottom: 12,
  },
  historialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.blanco,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  historialInfo: {
    flex: 1,
  },
  historialProducto: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.negro,
    marginBottom: 2,
  },
  historialDetalle: {
    fontSize: 12,
    color: COLORS.gris,
  },
  historialCantidad: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.turquesa,
  },
  instrucciones: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,188,212,0.1)',
    marginHorizontal: 15,
    marginVertical: 20,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  instruccionesTexto: {
    fontSize: 14,
    color: COLORS.negro,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
});
