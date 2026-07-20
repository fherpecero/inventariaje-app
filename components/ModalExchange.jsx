import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { doc, getDoc, setDoc, addDoc, collection, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLORS, HEADER, FONT_SIZES } from '../context/theme';


export default function ModalExchange({ 
    visible, onClose, peticiones, miCuentaId, miEmail }) {
  const [loading, setLoading] = useState(false);

  // ==========================================
  // HELPER: Actualizar inventarios (Misma lógica de SalidaScreen)
  // ==========================================
  const actualizarInventario = async (cuentaIdTarget, productosSalida, productosEntrada) => {
    const inventarioRef = doc(db, 'cuentas', cuentaIdTarget.toString(), 'inventarios', 'vital_health_principal');
    const docSnap = await getDoc(inventarioRef);
    let productos = docSnap.data()?.productos || {};
    const prodActualizados = { ...productos };

    // Restar lo que sale
    for (let item of productosSalida) {
      const cantActual = prodActualizados[item.codigo]?.cantidad || 0;
      prodActualizados[item.codigo] = {
        ...prodActualizados[item.codigo],
        cantidad: cantActual - item.cantidad,
        codigo: item.codigo,
        nombre: item.nombre,
        updatedAt: new Date().toISOString(),
      };
    }

    // Sumar lo que entra
    for (let prod of productosEntrada) {
      const cantActual = prodActualizados[prod.codigo]?.cantidad || 0;
      prodActualizados[prod.codigo] = {
        ...prodActualizados[prod.codigo],
        cantidad: cantActual + prod.cantidad, // Aseguramos sumar la cantidad enviada
        codigo: prod.codigo,
        nombre: prod.nombre,
        updatedAt: new Date().toISOString(),
      };
    }

    await setDoc(inventarioRef, { productos: prodActualizados, updatedAt: new Date().toISOString() }, { merge: true });
  };

  // ==========================================
  // HELPER: Registrar Analytics (Misma lógica de SalidaScreen)
  // ==========================================
  const registrarAnalytic = async (cuentaIdTarget, socioId, socioNombre, prodsEnviados, prodsRecibidos, diff, saldoPor) => {
    const salidaRef = collection(db, 'cuentas', cuentaIdTarget.toString(), 'salidas');
    const tieneSaldoPend = saldoPor === 'pendiente';
    const ahora = new Date();

    const cantEnviada = prodsEnviados.reduce((sum, item) => sum + (item.cantidad || 0), 0);
    const cantRecibida = prodsRecibidos.reduce((sum, item) => sum + (item.cantidad || 0), 0);

    let ingreso = 0, gasto = 0;
    if (!tieneSaldoPend) {
      if (diff > 0) ingreso = diff;
      else if (diff < 0) gasto = Math.abs(diff);
    }

    await addDoc(salidaRef, {
      tipo: 'intercambio',
      socioId,
      socioNombre,
      esManual: false,
      productosEnviados: prodsEnviados,
      productosRecibidos: prodsRecibidos,
      cantidadTotalEnviada: cantEnviada,
      cantidadTotalRecibida: cantRecibida,
      flujoIngreso: ingreso,
      flujoGasto: gasto,
      mesAnioAnalytics: `${ahora.getMonth() + 1}-${ahora.getFullYear()}`,
      diferencia: diff,
      tieneSaldoPendiente: tieneSaldoPend,
      montoPendiente: tieneSaldoPend ? Math.abs(diff) : 0,
      tipoPagoSaldo: tieneSaldoPend ? 'pendiente' : saldoPor,
      saldoAFavor: diff < 0,
      usuario: miEmail,
      fecha: ahora.toLocaleDateString('es-MX'),
      timestamp: ahora.toISOString(),
    });
  };

  // ==========================================
  // LÓGICA: ACEPTAR O RECHAZAR
  // ==========================================
  const handleAccion = async (peticion, accion) => {
    setLoading(true);
    try {
      const peticionRef = doc(db, 'intercambios_pendientes', peticion.id);

      if (accion === 'rechazado') {
        await updateDoc(peticionRef, { estado: 'rechazado' });
        Alert.alert('Rechazado', `Has rechazado el intercambio de ${peticion.deCuentaNombre}`);
      } 
      
      else if (accion === 'aceptado') {
        console.log('Procesando Intercambio Cruzado...');

        // 1. Actualizar MI Inventario (Receptor)
        // Yo entrego lo que él solicitó, Yo recibo lo que él ofreció
        await actualizarInventario(miCuentaId, peticion.productosSolicitados, peticion.productosOfrecidos);

        // 2. Actualizar SU Inventario (Emisor)
        // Él entrega lo que ofreció, Él recibe lo que solicitó
        await actualizarInventario(peticion.deCuentaId, peticion.productosOfrecidos, peticion.productosSolicitados);

        // 3. Registrar MIS Analytics (Receptor)
        // Mi diferencia es INVERSA a la de él (Si él me debe 100, yo tengo a favor 100)
        await registrarAnalytic(
          miCuentaId, peticion.deCuentaId, peticion.deCuentaNombre,
          peticion.productosSolicitados, peticion.productosOfrecidos,
          (peticion.totales.diferencia * -1), peticion.pagoSaldoPor
        );

        // 4. Registrar SUS Analytics (Emisor)
        await registrarAnalytic(
          peticion.deCuentaId, miCuentaId.toString(), 'Socio (Aprobado por App)',
          peticion.productosOfrecidos, peticion.productosSolicitados,
          peticion.totales.diferencia, peticion.pagoSaldoPor
        );

        // 5. Marcar como aceptado
        await updateDoc(peticionRef, { estado: 'aceptado', aprobadoPor: miEmail, fechaAprobacion: new Date().toISOString() });
        Alert.alert('✅ Éxito', 'Cambio registrado correctamente en ambas cuentas.');
      }

      if (peticiones.length === 1) onClose(); // Cerrar si era la última
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Hubo un problema al procesar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Intercambio de: {item.deCuentaNombre}</Text>
      
      <View style={styles.cajaDoble}>
        <View style={styles.columna}>
          <Text style={styles.labelCol}>Te ofrece:</Text>
          {item.productosOfrecidos.map((p, i) => <Text key={i} style={styles.textoProd}>• {p.cantidad}x {p.nombre}</Text>)}
        </View>
        <View style={styles.columna}>
          <Text style={styles.labelCol}>Te pide:</Text>
          {item.productosSolicitados.map((p, i) => <Text key={i} style={styles.textoProd}>• {p.cantidad}x {p.nombre}</Text>)}
        </View>
      </View>

      <Text style={styles.saldoText}>
        Balance de la propuesta: {
          item.totales.diferencia === 0 ? 'Sin diferencia ($0)' : 
          item.totales.diferencia > 0 ? `A favor $${item.totales.diferencia.toFixed(2)}` : 
          `En contra $${Math.abs(item.totales.diferencia).toFixed(2)}`
        } ({item.pagoSaldoPor})
      </Text>

      <View style={styles.botones}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.rojito }]} onPress={() => handleAccion(item, 'rechazado')} disabled={loading}>
          <Text style={styles.btnText}>❌ Rechazar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.verde }]} onPress={() => handleAccion(item, 'aceptado')} disabled={loading}>
          <Text style={styles.btnText}>✅ Aceptar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.titulo}>Notificaciones</Text>
          {loading && <ActivityIndicator color={COLORS.turquesa} style={{ marginBottom: 10 }} />}
          <FlatList data={peticiones} renderItem={renderItem} keyExtractor={item => item.id} />
          <TouchableOpacity style={styles.btnCerrar} onPress={onClose} disabled={loading}>
            <Text style={styles.btnCerrarText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    padding: 20 
  },
  modalContent: { 
    backgroundColor: '#fff', 
    borderRadius: 15, 
    padding: 20, 
    maxHeight: '80%' 
  },
  titulo: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 15 
  },
  card: { 
    backgroundColor: '#f9f9f9', 
    borderRadius: 10, 
    padding: 15, 
    borderWidth: 1, 
    borderColor: '#e0e0e0', 
    marginBottom: 15 
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: COLORS.turquesa, 
    marginBottom: 10 
  },
  cajaDoble: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 10 
  },
  columna: { 
    flex: 1 
  },
  labelCol: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    color: '#666', 
    marginBottom: 4 
  },
  textoProd: { 
    fontSize: 13, 
    color: '#333' 
  },
  saldoText: { 
    fontSize: 14, 
    fontWeight: '600', 
    backgroundColor: '#fff3e0', 
    padding: 8, 
    borderRadius: 6, 
    textAlign: 'center', 
    marginBottom: 15 
  },
  botones: { 
    flexDirection: 'row', 
    gap: 10 
  },
  btn: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: 8, 
    alignItems: 'center' 
  },
  btnText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 14 
  },
  btnCerrar: { 
    marginTop: 10, 
    paddingVertical: 12, 
    alignItems: 'center', 
    backgroundColor: '#eee', 
    borderRadius: 8 
  },
  btnCerrarText: { 
    fontWeight: 'bold', 
    color: '#555' 
  }
});