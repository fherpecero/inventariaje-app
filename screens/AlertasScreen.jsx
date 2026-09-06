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
import { Ionicons } from '@expo/vector-icons';
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
  // RENDERIZADORES DE TARJETAS (Estilo Minimalista Centralizado)
  // ==========================================
  const renderAlertaItem = ({ item }) => (
    <View style={[
      GLOBAL_STYLES.cardStandard, 
      { borderColor: COLORS.rojo, backgroundColor: themeColors?.bgSecondary || COLORS.blanco }
    ]}>
      <View style={GLOBAL_STYLES.cardStandardContent}>
        <View style={GLOBAL_STYLES.cardStandardTextContainer}>
          <Text style={[GLOBAL_STYLES.cardStandardValue, { color: themeColors?.text || COLORS.negro, fontSize: 16 }]} numberOfLines={1}>
            {item.nombre}
          </Text>
          <Text style={GLOBAL_STYLES.cardStandardTitle}>
            Límite establecido: {item.limiteStock} pzas
          </Text>
        </View>
      </View>
      
      {/* 🚨 Indicador de Peligro Limpio */}
      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
        <Text style={[GLOBAL_STYLES.cardStandardValue, { color: COLORS.rojo, fontSize: 22 }]}>
          {item.stockActual}
        </Text>
        <Text style={{ fontSize: 12, color: COLORS.rojo, fontWeight: '700' }}>
          en stock
        </Text>
      </View>
    </View>
  );

  const renderConfigItem = ({ item }) => (
    <View style={[
      GLOBAL_STYLES.cardStandard, 
      { backgroundColor: themeColors?.bgSecondary || COLORS.blanco, borderColor: themeColors?.border || '#E2E8F0' }
    ]}>
      <View style={GLOBAL_STYLES.cardStandardContent}>
        <View style={GLOBAL_STYLES.cardStandardTextContainer}>
          <Text style={[GLOBAL_STYLES.cardStandardValue, { color: themeColors?.text || COLORS.negro, fontSize: 16 }]} numberOfLines={1}>
            {item.nombre}
          </Text>
          <Text style={GLOBAL_STYLES.cardStandardTitle}>
            Stock actual: {item.stockActual}
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 10, color: themeColors?.textSecondary || '#64748B', marginBottom: 4, fontWeight: '600' }}>
          Límite mínimo
        </Text>
        <TextInput
          style={[
            GLOBAL_STYLES.inputBase, 
            { 
              width: 60, height: 40, textAlign: 'center', padding: 0, marginBottom: 0, 
              backgroundColor: themeColors?.input, color: themeColors?.text, borderColor: themeColors?.border 
            }
          ]}
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
      <View style={[GLOBAL_STYLES.container, { backgroundColor: themeColors?.bg || '#FFFFFF', justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS?.turquesa || '#0000ff'} />
        <Text style={{ marginTop: 12, color: themeColors?.textSecondary || '#64748B' }}>Cargando inventario...</Text>
      </View>
    );
  }

  return (
    <View style={[GLOBAL_STYLES.container, { backgroundColor: themeColors?.bg || '#FFF' }]}>
      <ScreenHeader 
        title="Alertas" 
        onPress={() => onNavigate('Configuración')} 
        themeColors={themeColors} 
      />

      {/* 🎛️ TABS COMO TARJETAS (Basadas en cardStandard) */}
      <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 15, marginTop: 5 }}>
        
        <TouchableOpacity 
          style={[
            GLOBAL_STYLES.cardStandard, 
            { flex: 1, marginBottom: 0, justifyContent: 'center', paddingVertical: 14 },
            activeTab === 'alertas' ? { borderColor: COLORS.turquesa, borderWidth: 2 } : { borderColor: themeColors?.border }
          ]}
          onPress={() => setActiveTab('alertas')}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="notifications-outline" size={18} color={activeTab === 'alertas' ? COLORS.turquesa : (themeColors?.text || "black")} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: activeTab === 'alertas' ? COLORS.turquesa : (themeColors?.text || COLORS.negro) }}>
              Alertas ({alertas.length})
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            GLOBAL_STYLES.cardStandard, 
            { flex: 1, marginBottom: 0, justifyContent: 'center', paddingVertical: 14 },
            activeTab === 'config' ? { borderColor: COLORS.turquesa, borderWidth: 2 } : { borderColor: themeColors?.border }
          ]}
          onPress={() => setActiveTab('config')}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="settings-outline" size={18} color={activeTab === 'config' ? COLORS.turquesa : (themeColors?.text || "black")} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: activeTab === 'config' ? COLORS.turquesa : (themeColors?.text || COLORS.negro) }}>
              Configurar
            </Text>
          </View>
        </TouchableOpacity>

      </View>

      {guardando && <ActivityIndicator size="small" color={COLORS.turquesa} style={{ marginVertical: 5 }} />}

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {activeTab === 'alertas' ? (
          <FlatList
            data={alertas}
            keyExtractor={item => item.nombre}
            renderItem={renderAlertaItem}
            ListEmptyComponent={
              <View style={GLOBAL_STYLES.emptyContainer}>
                {/* Textos limpios sin emojis */}
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: themeColors?.text || COLORS.negro, marginBottom: 6 }}>
                  ¡Todo excelente!
                </Text>
                <Text style={{ fontSize: 14, fontStyle: 'italic', color: themeColors?.textSecondary || COLORS.grey, textAlign: 'center' }}>
                  Ningún producto ha bajado de su límite mínimo configurado.
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 40, paddingTop: 10 }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            data={configuracion}
            keyExtractor={item => item.nombre}
            renderItem={renderConfigItem}
            ListHeaderComponent={
              <Text style={{ fontSize: 12, fontStyle: 'italic', color: themeColors?.textSecondary || COLORS.grey, marginBottom: 15, textAlign: 'center', paddingHorizontal: 10 }}>
                Define a las cuántas piezas quieres que la app te avise para hacer restock. (0 = Sin alerta)
              </Text>
            }
            contentContainerStyle={{ paddingBottom: 40, paddingTop: 10 }}
            showsVerticalScrollIndicator={false}
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