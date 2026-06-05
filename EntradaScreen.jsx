import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { getImagenProducto } from './productosData';

const COLORS = {
  turquesa: '#00BCD4',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  verde: '#4CAF50',
  rojo: '#f44336',
};

export default function EntradaScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [codigo, setCodigo] = useState('');
  const [producto, setProducto] = useState(null);
  const [cantidad, setCantidad] = useState('');
  const [loading, setLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);

  useEffect(() => {
    const getBarCodeScannerPermissions = async () => {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getBarCodeScannerPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    setCodigo(data);
    setScannerActive(false);
    buscarProducto(data);
  };

  const buscarProducto = async (codigoBarras) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://inventariaje-app.vercel.app/api/inventario?codigo=${codigoBarras}`
      );
      const data = await response.json();

      if (data.existe) {
        setProducto(data);
        setCantidad('');
      } else {
        Alert.alert('Producto no encontrado', `El código ${codigoBarras} no existe.`);
      }
    } catch (error) {
      Alert.alert('Error', 'Error al buscar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const agregarInventario = async () => {
    if (!cantidad || isNaN(cantidad) || parseInt(cantidad) <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida');
      return;
    }

    setLoading(true);
    try {
      const nuevaCantidad = producto.cantidad + parseInt(cantidad);
      
      const response = await fetch(
        'https://inventariaje-app.vercel.app/api/inventario',
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            codigo: producto.codigo,
            cantidad: nuevaCantidad,
          }),
        }
      );

      const data = await response.json();

      if (data.exito) {
        Alert.alert(
          '✅ Éxito',
          `${producto.nombre}\nNueva cantidad: ${nuevaCantidad}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setProducto(null);
                setCodigo('');
                setCantidad('');
                setScanned(false);
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

  if (scannerActive && hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📸 Escanear código</Text>
        </View>
        
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={styles.scanner}
        />

        <View style={styles.scannerFooter}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setScannerActive(false);
              setScanned(false);
            }}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📥 Entrada de Inventario</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.scannerBtn}
          onPress={() => setScannerActive(true)}
        >
          <Text style={styles.scannerBtnText}>🔍 Abrir Scanner</Text>
        </TouchableOpacity>

        <Text style={styles.divider}>O ingresa manualmente:</Text>

        <TextInput
          style={styles.input}
          placeholder="Código de barras"
          value={codigo}
          onChangeText={setCodigo}
          keyboardType="numeric"
        />

        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => buscarProducto(codigo)}
          disabled={loading}
        >
          <Text style={styles.searchBtnText}>🔎 Buscar</Text>
        </TouchableOpacity>

        {loading && <ActivityIndicator size="large" color={COLORS.turquesa} style={styles.loader} />}

        {producto && !loading && (
          <View style={styles.productCard}>
            <Text style={styles.productName}>{producto.nombre}</Text>
            <Text style={styles.productCode}>Código: {producto.codigo}</Text>

            <View style={styles.imageContainer}>
              <Image
                source={getImagenProducto(producto.codigo)}
                style={styles.productImage}
              />
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Cantidad actual:</Text>
              <Text style={styles.infoValue}>{producto.cantidad} unidades</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cantidad a agregar:</Text>
              <TextInput
                style={styles.input}
                placeholder="Ej: 5"
                value={cantidad}
                onChangeText={setCantidad}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity
              style={styles.addBtn}
              onPress={agregarInventario}
              disabled={loading}
            >
              <Text style={styles.addBtnText}>✅ Agregar al inventario</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resetBtn}
              onPress={() => {
                setProducto(null);
                setCodigo('');
                setCantidad('');
              }}
            >
              <Text style={styles.resetBtnText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gris,
  },
  header: {
    backgroundColor: COLORS.turquesa,
    paddingTop: 40,
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
  scanner: {
    flex: 1,
  },
  scannerFooter: {
    backgroundColor: COLORS.blanco,
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
  },
  scannerBtn: {
    backgroundColor: COLORS.turquesa,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  scannerBtnText: {
    color: COLORS.blanco,
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 15,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: COLORS.blanco,
  },
  searchBtn: {
    backgroundColor: COLORS.turquesa,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  searchBtnText: {
    color: COLORS.blanco,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 20,
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
  imageContainer: {
    alignItems: 'center',
    marginVertical: 15,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  productImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.negro,
    marginBottom: 8,
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
  cancelBtn: {
    backgroundColor: COLORS.rojo,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.blanco,
    fontSize: 16,
    fontWeight: 'bold',
  },
});