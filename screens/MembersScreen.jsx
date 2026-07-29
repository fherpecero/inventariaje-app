import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  FlatList,
  TextInput,
  ScrollView,
} from 'react-native';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, setDoc, query, where, getFirestore } from 'firebase/firestore';
import { getAuth, signOut, initializeAuth, updateProfile,
  createUserWithEmailAndPassword, sendPasswordResetEmail, inMemoryPersistence } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { db, firebaseConfig } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';

// 🎨 Importamos el ecosistema visual centralizado
import { COLORS, ScreenHeader, GLOBAL_STYLES } from '../context/theme';

export default function MembersScreen({ onNavigate, darkMode, themeColors }) {
  const { user, cuenta, cuentaId } = useContext(AuthContext);
  const [miembros, setMiembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [creating, setCreating] = useState(false);

  // ✅ USER SETTINGS MODAL
  const [userSettingsVisible, setUserSettingsVisible] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [enviandoReset, setEnviandoReset] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (user && cuenta) {
      cargarMiembros();
    }
  }, [user, cuenta]);

  const cargarMiembros = async () => {
    if (!isMountedRef.current) return;

    try {
      if (isMountedRef.current) setLoading(true);

      const cuentaRef = doc(db, 'cuentas', String(cuentaId));
      const cuentaSnap = await getDoc(cuentaRef);
      const miembrosUIDs = cuentaSnap.data()?.miembros || [];

      // 🛡️ Filtramos la consulta para NO descargar toda la base de datos
      const qUsuarios = query(
        collection(db, 'usuarios'),
        where('cuentaId', '==', String(cuentaId))
      );
      
      const usuariosSnap = await getDocs(qUsuarios);

      const miembrosInfo = [];
      usuariosSnap.forEach((doc) => {
        const data = doc.data();
        if (miembrosUIDs.includes(data.uid)) {
          miembrosInfo.push({
            uid: data.uid,
            email: data.email,
            nombre: data.nombre || 'Sin nombre',
            phone: data.phone || '',
          });
        }
      });

      if (isMountedRef.current) {
        setMiembros(miembrosInfo);
      }
    } catch (error) {
      if (!error.message.includes('permission-denied') && isMountedRef.current) {
        Alert.alert('Error', 'No se pudieron cargar los usuarios');
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  };

  const abrirUserSettings = (miembro) => {
    setUsuarioSeleccionado(miembro);
    setEditNombre(miembro.nombre);
    setEditEmail(miembro.email);
    setEditPhone(miembro.phone || '');
    setUserSettingsVisible(true);
  };

  const guardarCambios = async () => {
    if (!editNombre.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }

    try {
      const usuarioDocRef = doc(db, 'usuarios', usuarioSeleccionado.uid);
      await updateDoc(usuarioDocRef, {
        nombre: editNombre.trim(),
        phone: editPhone.trim(),
        updatedAt: new Date().toISOString(),
      });

      const miembrosActualizados = miembros.map((m) =>
        m.uid === usuarioSeleccionado.uid 
          ? { ...m, nombre: editNombre.trim(), phone: editPhone.trim() } 
          : m
      );
      setMiembros(miembrosActualizados);

      Alert.alert('✅ Guardado', 'Cambios aplicados correctamente');
      setUserSettingsVisible(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron guardar los cambios');
    }
  };

  const enviarPasswordReset = async () => {
    try {
      setEnviandoReset(true);
      const auth = getAuth();
      await sendPasswordResetEmail(auth, usuarioSeleccionado.email);
      Alert.alert('✅ Enviado', `Se envió un correo de reset a:\n${usuarioSeleccionado.email}`);
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el correo');
    } finally {
      setEnviandoReset(false);
    }
  };

  const suspenderUsuario = async () => {
    try {
      const usuarioDocRef = doc(db, 'usuarios', usuarioSeleccionado.uid);
      const usuarioSnap = await getDoc(usuarioDocRef);
      const estaSuspendido = usuarioSnap.data()?.suspendido || false;

      await updateDoc(usuarioDocRef, {
        suspendido: !estaSuspendido,
        updatedAt: new Date().toISOString(),
      });

      Alert.alert(
        '✅ Éxito',
        estaSuspendido 
          ? `${usuarioSeleccionado.email} ha sido REACTIVADO` 
          : `${usuarioSeleccionado.email} ha sido SUSPENDIDO`
      );

      setUserSettingsVisible(false);
      cargarMiembros();
    } catch (error) {
      Alert.alert('Error', 'No se pudo suspender el usuario');
    }
  };

  const eliminarUsuario = async () => {
    Alert.alert(
      '⚠️ ELIMINACIÓN PERMANENTE',
      `¿Eliminar a ${usuarioSeleccionado.email}?\n\nEsto preservará logs para reportes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const usuarioDocRef = doc(db, 'usuarios', usuarioSeleccionado.uid);
              await updateDoc(usuarioDocRef, {
                eliminado: true,
                deletionRequestedAt: new Date().toISOString(),
                eliminadoPor: user.uid,
              });

              const cuentaRef = doc(db, 'cuentas', cuentaId.toString());
              const cuentaSnap = await getDoc(cuentaRef);
              const miembrosActuales = cuentaSnap.data()?.miembros || [];

              const miembrosActualizados = miembrosActuales.filter(
                (uid) => uid !== usuarioSeleccionado.uid
              );

              await updateDoc(cuentaRef, { miembros: miembrosActualizados });

              setMiembros(miembros.filter((m) => m.uid !== usuarioSeleccionado.uid));
              setUserSettingsVisible(false);

              Alert.alert('✅ Eliminado', `${usuarioSeleccionado.email} ha sido eliminado\n\n📊 Los registros se mantienen`);
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el usuario');
            }
          },
        },
      ]
    );
  };

  const crearUsuarioYAgregarACuenta = async () => {
    if (!isMountedRef.current) return;

    if (!emailInput.trim()) {
      Alert.alert('Error', 'Ingresa un email válido');
      return;
    }
    if (!passwordInput || passwordInput.length < 6) {
      Alert.alert('Error', 'Contraseña mínimo 6 caracteres');
      return;
    }
    const yaExiste = miembros.find((m) => m.email === emailInput.trim());
    if (yaExiste) {
      Alert.alert('Error', 'Este email ya está en la cuenta');
      return;
    }

    if (isMountedRef.current) setCreating(true);

    try {
      let secondaryApp;
      let secondaryAuth;
      const apps = getApps();
      const existingApp = apps.find(app => app.name === "SecondaryApp");

      if (!existingApp) {
        secondaryApp = initializeApp(firebaseConfig, "SecondaryApp");
        secondaryAuth = initializeAuth(secondaryApp, { persistence: inMemoryPersistence });
      } else {
        secondaryApp = existingApp;
        secondaryAuth = getAuth(secondaryApp);
      }

      const secondaryDb = getFirestore(secondaryApp);

      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, emailInput.trim(), passwordInput);
      const nuevoUID = userCredential.user.uid;
      const nombreUsuario = emailInput.split('@')[0];

      await updateProfile(userCredential.user, { displayName: nombreUsuario });

      const usuarioDocRef = doc(secondaryDb, 'usuarios', nuevoUID);
      await setDoc(usuarioDocRef, {
        uid: nuevoUID,
        email: emailInput.trim(),
        nombre: emailInput.split('@')[0],
        cuentaId: cuentaId,
        createdAt: new Date().toISOString(),
      }, { merge: false });

      await setDoc(doc(secondaryDb, 'usuariosCuenta', nuevoUID), { cuentaId: cuentaId, rol: 'socio' });

      const cuentaRef = doc(db, 'cuentas', cuentaId.toString());
      await updateDoc(cuentaRef, { miembros: arrayUnion(nuevoUID) });

      await signOut(secondaryAuth);

      if (isMountedRef.current) {
        setMiembros([
          ...miembros,
          { uid: nuevoUID, email: emailInput.trim(), nombre: emailInput.split('@')[0], phone: '' },
        ]);
        setEmailInput('');
        setPasswordInput('');
        setModalVisible(false);

        Alert.alert('✅ Éxito', `Usuario ${emailInput} creado correctamente`);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      if (isMountedRef.current) setCreating(false);
    }
  };

  const renderMiembro = ({ item }) => (
    <TouchableOpacity
      style={[styles.miembroCard, { backgroundColor: themeColors.cardBg }]}
      onPress={() => abrirUserSettings(item)}
    >
      <View style={styles.miembroInfo}>
        <Text style={[styles.miembroEmail, { color: themeColors.text }]}>{item.email}</Text>
        <Text style={[styles.miembroNombre, { color: themeColors.textSecondary }]}>{item.nombre}</Text>
      </View>

      {item.uid !== user.uid && (
        <TouchableOpacity style={styles.deleteBtn} onPress={() => eliminarUsuario()}>
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.turquesa} />
      </View>
    );
  }

  return (
    <View style={[GLOBAL_STYLES.container, { backgroundColor: themeColors.bg }]}>
      
      {/* 🚀 COMPONENTE CENTRALIZADO DEL THEME */}
      <ScreenHeader 
        title="Usuarios" 
        onPress={() => onNavigate('home')}  
        themeColors={themeColors}
      />

      <FlatList
        data={miembros}
        renderItem={renderMiembro}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: themeColors.text }]}>No hay usuarios adicionales</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.addBtnText}>+ Agregar Usuario</Text>
      </TouchableOpacity>

      {/* MODAL CREAR USUARIO */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: themeColors.bgSecondary }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>🆕 Crear Usuario</Text>
            
            <Text style={[styles.modalLabel, { color: themeColors.text }]}>Email del nuevo usuario:</Text>
            <TextInput
              style={[styles.input, { backgroundColor: themeColors.input, color: themeColors.text, borderColor: themeColors.border }]}
              placeholder="usuario@gmail.com"
              placeholderTextColor={themeColors.textSecondary}
              value={emailInput}
              onChangeText={setEmailInput}
              editable={!creating}
              keyboardType="email-address"
            />

            <Text style={[styles.modalLabel, { color: themeColors.text, marginTop: 12 }]}>Contraseña temporal:</Text>
            <TextInput
              style={[styles.input, { backgroundColor: themeColors.input, color: themeColors.text, borderColor: themeColors.border }]}
              placeholder="VH12345"
              placeholderTextColor={themeColors.textSecondary}
              value={passwordInput}
              onChangeText={setPasswordInput}
              editable={!creating}
              secureTextEntry
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={creating}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.createBtn, creating && styles.disabledBtn]} onPress={crearUsuarioYAgregarACuenta} disabled={creating}>
                <Text style={styles.createBtnText}>{creating ? '⏳ Creando...' : '✅ Crear'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL USER SETTINGS */}
      <Modal visible={userSettingsVisible} transparent animationType="fade" onRequestClose={() => setUserSettingsVisible(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalOverlayPress} onPress={() => setUserSettingsVisible(false)} />
          <View style={[styles.userSettingsModal, { backgroundColor: themeColors.bgSecondary }]}>
            <View style={styles.userSettingsHeader}>
              <Text style={[styles.userSettingsTitle, { color: themeColors.text }]}>⚙️ Configurar Usuario</Text>
              <TouchableOpacity onPress={() => setUserSettingsVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.compactSection}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>📋 Información</Text>

                <Text style={[styles.modalLabel, { color: themeColors.text }]}>Nombre</Text>
                <TextInput
                  style={[styles.compactInput, { backgroundColor: themeColors.input, color: themeColors.text, borderColor: themeColors.border }]}
                  value={editNombre}
                  onChangeText={setEditNombre}
                  placeholder="Nombre"
                  placeholderTextColor={themeColors.textSecondary}
                />

                <Text style={[styles.modalLabel, { color: themeColors.text, marginTop: 12 }]}>Email</Text>
                <TextInput
                  style={[styles.compactInput, styles.disabledInput, { backgroundColor: '#e3e1e1', color: '#727070', borderColor: themeColors.border }]}
                  value={editEmail}
                  editable={false}
                  placeholder="Email"
                  placeholderTextColor="#999"
                />
                <Text style={[styles.helperText, { color: themeColors.textSecondary }]}>ℹ️ Para cambiar email, crea un nuevo usuario</Text>

                <Text style={[styles.modalLabel, { color: themeColors.text, marginTop: 12 }]}>Teléfono</Text>
                <TextInput
                  style={[styles.compactInput, { backgroundColor: themeColors.input, color: themeColors.text, borderColor: themeColors.border }]}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+52 81 1234 5678"
                  placeholderTextColor={themeColors.textSecondary}
                  keyboardType="phone-pad"
                />
                
                <TouchableOpacity style={styles.saveBtnCompact} onPress={guardarCambios}>
                  <Text style={styles.saveBtnText}>💾 Guardar Cambios</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.quickActionsContainer}>
                <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: COLORS.verde }]} onPress={enviarPasswordReset} disabled={enviandoReset}>
                  <Text style={styles.quickActionText}>{enviandoReset ? '⏳' : '📧'}</Text>
                  <Text style={styles.quickActionLabel}>Reset Pass</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickActionBtn, { backgroundColor: COLORS.morado }]} onPress={suspenderUsuario}>
                  <Text style={styles.quickActionText}>🔒</Text>
                  <Text style={styles.quickActionLabel}>Suspender</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.deleteUserBtn} onPress={eliminarUsuario}>
                <Text style={styles.deleteUserBtnText}>🗑️ Eliminar Usuario</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setUserSettingsVisible(false)}>
                <Text style={styles.closeModalBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // 🧹 Se borraron los estilos: container, header, backBtn, headerTitle
  
  listContent: {
    padding: 15,
  },
  miembroCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.morado,
  },
  miembroInfo: {
    flex: 1,
  },
  miembroEmail: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  miembroNombre: {
    fontSize: 12,
    color: '#999',
  },
  deleteBtn: {
    padding: 8,
  },
  deleteBtnText: {
    fontSize: 18,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  addBtn: {
    backgroundColor: COLORS.verde,
    marginHorizontal: 15,
    marginBottom: 70,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalOverlayPress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
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
    fontWeight: '600',
    color: COLORS.blanco,
  },
  createBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.turquesa,
    borderRadius: 8,
    alignItems: 'center',
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.blanco,
  },
  disabledBtn: {
    opacity: 0.5,
  },

  /* USER SETTINGS MODAL */
  userSettingsModal: {
    borderRadius: 16,
    padding: 16,
    width: '90%',
    maxHeight: '75%',
    maxWidth: 380,
    zIndex: 10,
  },
  userSettingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  userSettingsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.rojo,
  },
  compactSection: {
    backgroundColor: 'rgba(26, 158, 161, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  compactInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
  },
  disabledInput: {
    opacity: 0.6,
  },
  helperText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
    marginBottom: 8,
  },
  saveBtnCompact: {
    backgroundColor: COLORS.turquesa,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  quickActionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionText: {
    fontSize: 20,
    marginBottom: 2,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.blanco,
  },
  deleteUserBtn: {
    backgroundColor: COLORS.rojo,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteUserBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.blanco,
  },
  closeModalBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.turquesa,
  },
  closeModalBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.turquesa,
  },
});