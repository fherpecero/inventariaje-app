import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, TextInput, ActivityIndicator, Alert } from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const COLORS = {
  turquesa: '#24c5c5', blanco: '#fff', negro: '#000', verde: '#4CAF50', morado: '#7e2b8d', gris: '#f5f5f5'
};

export default function ModalFeedback({ visible, onClose, usuarioEmail, cuentaId }) {
  const [tipo, setTipo] = useState('mejora'); // 'mejora' o 'bug'
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  const enviarFeedback = async () => {
    if (!mensaje.trim()) {
      Alert.alert('Error', 'Por favor escribe un mensaje antes de enviar.');
      return;
    }

    setLoading(true);
    try {
      const feedbackRef = collection(db, 'app_feedback');
      await addDoc(feedbackRef, {
        tipo: tipo,
        mensaje: mensaje.trim(),
        usuarioEmail: usuarioEmail || 'desconocido',
        cuentaId: cuentaId ? cuentaId.toString() : 'sin-cuenta',
        appVersion: '1.4.0', // Útil para saber en qué versión falló
        estado: 'nuevo', // Para que tú los marques como "resuelto" en tu consola
        timestamp: serverTimestamp()
      });

      Alert.alert('¡Gracias! 🚀', 'Tu comentario ha sido enviado. Nos ayuda mucho a mejorar la app.');
      setMensaje('');
      onClose();
    } catch (error) {
      console.error('Error enviando feedback:', error);
      Alert.alert('Error', 'No pudimos enviar tu mensaje. Intenta de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <Text style={styles.titulo}>💡 Enviar Feedback</Text>
          <Text style={styles.subtitulo}>¿Encontraste un error o tienes una idea para mejorar la app?</Text>

          {/* Selector de Tipo */}
          <View style={styles.selectorContainer}>
            <TouchableOpacity 
              style={[styles.tipoBtn, tipo === 'mejora' && styles.tipoBtnActive]}
              onPress={() => setTipo('mejora')}
            >
              <Text style={[styles.tipoBtnText, tipo === 'mejora' && styles.tipoBtnTextActive]}>✨ Mejora</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.tipoBtn, tipo === 'bug' && styles.tipoBtnActiveBug]}
              onPress={() => setTipo('bug')}
            >
              <Text style={[styles.tipoBtnText, tipo === 'bug' && styles.tipoBtnTextActive]}>🐛 Bug / Error</Text>
            </TouchableOpacity>
          </View>

          {/* Input de Mensaje */}
          <TextInput
            style={styles.inputArea}
            placeholder={tipo === 'bug' ? "¿Qué falló? Describe el error..." : "¿Qué función te gustaría ver en el futuro?"}
            placeholderTextColor="#999"
            multiline
            numberOfLines={5}
            value={mensaje}
            onChangeText={setMensaje}
            editable={!loading}
          />

          {/* Botones de Acción */}
          <View style={styles.botonesContainer}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose} disabled={loading}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.btnEnviar} onPress={enviarFeedback} disabled={loading}>
              {loading ? <ActivityIndicator color={COLORS.blanco} /> : <Text style={styles.btnEnviarText}>Enviar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: COLORS.blanco, borderRadius: 15, padding: 20 },
  titulo: { fontSize: 20, fontWeight: 'bold', color: COLORS.negro, marginBottom: 8, textAlign: 'center' },
  subtitulo: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },
  selectorContainer: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  tipoBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  tipoBtnActive: { backgroundColor: '#e8f5e9', borderColor: COLORS.verde },
  tipoBtnActiveBug: { backgroundColor: '#ffebee', borderColor: '#f44336' },
  tipoBtnText: { fontSize: 14, color: '#666', fontWeight: '600' },
  tipoBtnTextActive: { color: COLORS.negro },
  inputArea: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 15, fontSize: 14, minHeight: 120, textAlignVertical: 'top', backgroundColor: '#fafafa', marginBottom: 20 },
  botonesContainer: { flexDirection: 'row', gap: 10 },
  btnCancel: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#eee', alignItems: 'center' },
  btnEnviar: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: COLORS.morado, alignItems: 'center' },
  btnCancelText: { color: '#555', fontWeight: 'bold', fontSize: 15 },
  btnEnviarText: { color: COLORS.blanco, fontWeight: 'bold', fontSize: 15 }
});