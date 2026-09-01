import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
// 🚀 Cambiamos updateDoc por writeBatch
import { doc, onSnapshot, writeBatch } from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLORS, GLOBAL_STYLES, ScreenHeader } from '../context/theme';

import { getProductosActivos } from '../context/productCatalog';
import { AuthContext } from '../context/AuthContext';

export default function AlertasScreen({ onNavigate, themeColors }) {
  const { cuentaId } = useContext(AuthContext); 

  const [activeTab, setActiveTab] = useState('alertas');
  const [inventario, setInventario] = useState({});
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // ==========================================
  // 🚀 LECTURA LOCAL-FIRST (0ms Latencia)
  // ==========================================
  useEffect(() => {
    if (!cuentaId) return;

    const inventarioRef = doc(db, 'cuentas', String(cuentaId), 'inventarios', 'vital_health_principal');
    
    const unsubscribe = onSnapshot(inventarioRef, (docSnap) => {
      if (docSnap.exists()) {
        setInventario(docSnap.data().productos || {});
      } else {
        setInventario({});
      }
      setLoading(false);
    }, (error) => {
      console.log("✈️ Silenciador Offline / Permisos:", error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [cuentaId]);

  // ==========================================
  // 🚀 ESCRITURA OFFLINE-FIRST (Guarda sin internet)
  // ==========================================
  const actualizarLimite = async (productoNombre, nuevoLimiteText) => {
    const limiteNumerico = Number(nuevoLimiteText);
    if (isNaN(limiteNumerico) || limiteNumerico < 0) {
      Alert.alert('Error', 'Ingresa un número válido (0 o mayor)');
      return;
    }

    setGuardando(true);
    try {
      const inventarioRef = doc(db, 'cuentas', String(cuentaId), 'inventarios', 'vital_health_principal');
      
      // 📦 Abrimos el Buzón. Esto escribe directo en tu celular al instante.
      const batch = writeBatch(db);
      
      batch.update(inventarioRef, {
        [`productos.${productoNombre}.limiteStock`]: limiteNumerico
      });

      await batch.commit();

    } catch (error) {
      console.error("Error guardando límite:", error);
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    } finally {
      setGuardando(false);
    }
  };

  // ==========================================
  // 🧮 PROCESAMIENTO EN MEMORIA
  // ==========================================
  const getProductosProcesados = () => {
    let alertas = [];
    let configuracion = [];

    const catalogoLocal = getProductosActivos();
    const firebaseArray = Object.values(inventario);

    catalogoLocal.forEach(prod => {
      // 1. Buscamos por la nueva llave principal (nombre)
      let dataInv = inventario[prod.nombre];
      
      // 2. Fallback de compatibilidad profunda si antes se guardó con ID/Código
      if (!dataInv) {
        dataInv = inventario[prod.id] || inventario[prod.codigo] || 
                  firebaseArray.find(item => item.nombre === prod.nombre || item.codigo === prod.codigo) || {};
      }
      
      const stockActual = Number(dataInv.cantidad) || 0;
      const piezasBono = Number(dataInv.piezasConDescuento) || 0;
      const limite = Number(dataInv.limiteStock) || 0; 

      const item = {
        ...prod,
        stockActual,
        piezasBono,
        limiteStock: limite,
      };

      configuracion.push(item);

      // 🚨 La alerta responde al stock físico total
      if (limite > 0 && stockActual <= limite) {
        alertas.push(item);
      }
    });

    alertas.sort((a, b) => a.stockActual - b.stockActual);
    configuracion.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    return { alertas, configuracion };
  };

  const { alertas, configuracion } = getProductosProcesados();

  // ==========================================
  // RENDERIZADORES
  // ==========================================
  const renderAlertaItem = ({ item }) => (
    <View style={[styles.card, styles.cardAlerta]}>
      <View style={styles.cardInfo}>
        <Text style={[GLOBAL_STYLES.textPrimary, { fontWeight: 'bold' }]}>{item.nombre}</Text>
        <Text style={GLOBAL_STYLES.textSecondary}>Límite establecido: {item.limiteStock} pzas</Text>
      </View>
      <View style={styles.stockBadgeDanger}>
        <Text style={styles.stockBadgeTextDanger}>{item.stockActual} en stock</Text>
      </View>
    </View>
  );

  const renderConfigItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={[GLOBAL_STYLES.textPrimary, { fontWeight: 'bold' }]}>{item.nombre}</Text>
        <Text style={GLOBAL_STYLES.textSecondary}>Stock actual: {item.stockActual}</Text>
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Límite mínimo:</Text>
        <TextInput
          style={styles.numericInput}
          keyboardType="numeric"
          defaultValue={String(item.limiteStock)}
          onEndEditing={(e) => {
            const val = e.nativeEvent.text;
            if (val !== String(item.limiteStock)) {
              actualizarLimite(item.nombre, val); 
            }
          }}
          placeholder="0"
        />
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[GLOBAL_STYLES.safeArea, styles.centerContainer, { backgroundColor: themeColors?.bg || '#FFFFFF' }]}>
        <ActivityIndicator size="large" color={COLORS?.turquesa || '#0000ff'} />
        <Text style={styles.loadingText}>Cargando inventario...</Text>
      </View>
    );
  }

  return (
    <View style={[GLOBAL_STYLES.safeArea, { backgroundColor: themeColors?.bg || '#FFF', flex: 1 }]}>
      <ScreenHeader 
        title="Alertas" 
        onPress={() => onNavigate('Configuranza')} 
        themeColors={themeColors} 
      />

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'alertas' && styles.activeTab]}
          onPress={() => setActiveTab('alertas')}
        >
          <Text style={[styles.tabText, activeTab === 'alertas' && styles.activeTabText]}>
            🔔 Alertas ({alertas.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'config' && styles.activeTab]}
          onPress={() => setActiveTab('config')}
        >
          <Text style={[styles.tabText, activeTab === 'config' && styles.activeTabText]}>
            ⚙️ Configurar Límite
          </Text>
        </TouchableOpacity>
      </View>

      {guardando && <ActivityIndicator size="small" color={COLORS.turquesa} style={{ marginVertical: 5 }} />}

      <View style={styles.listContainer}>
        {activeTab === 'alertas' ? (
          <FlatList
            data={alertas}
            keyExtractor={item => item.nombre}
            renderItem={renderAlertaItem}
            ListEmptyComponent={
              <View style={GLOBAL_STYLES.emptyStateContainer}>
                <Text style={styles.emptyIcon}>✅</Text>
                <Text style={GLOBAL_STYLES.emptyText}>¡Todo excelente!</Text>
                <Text style={[GLOBAL_STYLES.textSecondary, styles.emptySubtext]}>
                  Ningún producto ha bajado de su límite mínimo configurado.
                </Text>
              </View>
            }
            contentContainerStyle={styles.flatListContent}
          />
        ) : (
          <FlatList
            data={configuracion}
            keyExtractor={item => item.nombre}
            renderItem={renderConfigItem}
            ListHeaderComponent={
              <Text style={[GLOBAL_STYLES.textSecondary, styles.configHeader]}>
                Define a las cuántas piezas quieres que la app te avise para hacer restock. (0 = Sin alerta)
              </Text>
            }
            contentContainerStyle={styles.flatListContent}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748B',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#0F172A',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  flatListContent: {
    paddingBottom: 40,
    paddingTop: 10,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptySubtext: {
    textAlign: 'center',
  },
  configHeader: {
    marginBottom: 15,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    fontSize: 10, // aqui le puse el font size a ver si es este 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardAlerta: {
    borderColor: COLORS.rojo,
    borderWidth: 1,
    backgroundColor: '#FEF2F2',
  },
  cardInfo: {
    flex: 1,
  },
  stockBadgeDanger: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  stockBadgeTextDanger: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 14,
  },
  inputContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 4,
  },
  numericInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    width: 50,
    height: 36,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0F172A',
  },
});