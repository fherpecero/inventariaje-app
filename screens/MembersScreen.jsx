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
import { getAuth, signOut, initializeAuth, updateProfile, createUserWithEmailAndPassword, sendPasswordResetEmail, inMemoryPersistence } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { db, firebaseConfig } from '../config/firebase';
import { AuthContext } from '../context/AuthContext';
import { Ionicons, FontAwesome6 } from '@expo/vector-icons';

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

      Alert.alert('Guardado', 'Cambios aplicados correctamente');
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
      Alert.alert('Enviado', `Se envió un correo de reset a:\n${usuarioSeleccionado.email}`);
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
        'Estatus Actualizado',
        estaSuspendido 
          ? `${usuarioSeleccionado.email} ha sido reactivado` 
          : `${usuarioSeleccionado.email} ha sido suspendido`
      );

      setUserSettingsVisible(false);
      cargarMiembros();
    } catch (error) {
      Alert.alert('Error', 'No se pudo suspender el usuario');
    }
  };

  // Recibimos un usuario temporal para que funcione el botón de la tarjeta
  const eliminarUsuario = async (miembroTarget = null) => {
    const target = miembroTarget || usuarioSeleccionado;
    
    Alert.alert(
      'Eliminación Permanente',
      `¿Eliminar a ${target.email}?\n\nEsto preservará logs para reportes.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const cuentaRef = doc(db, 'cuentas', cuentaId.toString());
              const cuentaSnap = await getDoc(cuentaRef);
              const miembrosActuales = cuentaSnap.data()?.miembros || [];

              const miembrosActualizados = miembrosActuales.filter(
                (uid) => uid !== target.uid
              );

              await updateDoc(cuentaRef, { miembros: miembrosActualizados });

              try {
                const usuarioDocRef = doc(db, 'usuarios', target.uid);
                await updateDoc(usuarioDocRef, {
                  eliminado: true,
                  deletionRequestedAt: new Date().toISOString(),
                  eliminadoPor: user.uid,
                });
              } catch (perfilError) {
                console.warn('Nota: Se borró de la cuenta, pero las reglas de Firebase bloquearon la edición de su perfil personal.');
              }

              setMiembros(miembros.filter((m) => m.uid !== target.uid));
              setUserSettingsVisible(false);

              Alert.alert('Eliminado', `${target.email} ha sido eliminado de la cuenta.`);
            } catch (error) {
              console.error(error);
              Alert.alert('Error al eliminar', error.message);
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
        rol: 'socio',
        createdAt: new Date().toISOString(),
      }, { merge: false });

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

        Alert.alert('Éxito', `Usuario ${emailInput} creado correctamente`);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      if (isMountedRef.current) setCreating(false);
    }
  };

  const renderMiembro = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        GLOBAL_STYLES.cardStandard, 
        { 
          backgroundColor: themeColors.bgSecondary,
          borderColor: themeColors.border,
          marginBottom: 10 
        }
      ]}
      onPress={() => abrirUserSettings(item)}
    >
      <View style={GLOBAL_STYLES.cardStandardContent}>
        {/* Adios emoji 👤 -> Hola Ionicons */}
        <Ionicons name="person-circle-outline" size={36} color={COLORS.turquesa} style={{ marginRight: 14 }} />

        <View style={GLOBAL_STYLES.cardStandardTextContainer}>
          <Text style={[GLOBAL_STYLES.cardStandardValue, { color: themeColors.text, fontSize: 16 }]} numberOfLines={1}>
            {item.nombre || 'Sin nombre'}
          </Text>
          <Text style={GLOBAL_STYLES.cardStandardTitle} numberOfLines={1}>
            {item.email}
          </Text>
        </View>
      </View>

      {item.uid !== user.uid && (
        <TouchableOpacity 
          style={{ padding: 8, marginLeft: 8 }} 
          onPress={() => eliminarUsuario(item)} // Corrección aplicada
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {/* Adios emoji 🗑️ -> Hola Ionicons rojo */}
          <Ionicons name="trash-outline" size={22} color={COLORS.rojo} />
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
          <View style={GLOBAL_STYLES.emptyContainer}>
            <Text style={[GLOBAL_STYLES.emptyText, { color: themeColors.text }]}>No hay usuarios adicionales</Text>
          </View>
        }
      />

      <TouchableOpacity 
        style={[GLOBAL_STYLES.btnSuccess, { marginHorizontal: 15, marginBottom: 40 }]} 
        onPress={() => setModalVisible(true)}
      >
        <Text style={GLOBAL_STYLES.btnText}>Agregar Usuario</Text>
      </TouchableOpacity>

      {/* MODAL CREAR USUARIO */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={GLOBAL_STYLES.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={[GLOBAL_STYLES.modalContent, { backgroundColor: themeColors.bgSecondary }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[GLOBAL_STYLES.modalTitle, { color: themeColors.text }]}>
              <FontAwesome6 name="user-plus" size={18} color={themeColors.text} /> Crear Usuario
            </Text>
            
            <Text style={[GLOBAL_STYLES.modalLabel, { color: themeColors.text }]}>Email del nuevo usuario:</Text>
            <TextInput
              style={[GLOBAL_STYLES.inputBase, { backgroundColor: themeColors.input, color: themeColors.text, borderColor: themeColors.border }]}
              placeholder="usuario@gmail.com"
              placeholderTextColor={themeColors.textSecondary}
              value={emailInput}
              onChangeText={setEmailInput}
              editable={!creating}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[GLOBAL_STYLES.modalLabel, { color: themeColors.text, marginTop: 12 }]}>Contraseña temporal:</Text>
            <TextInput
              style={[GLOBAL_STYLES.inputBase, { backgroundColor: themeColors.input, color: themeColors.text, borderColor: themeColors.border }]}
              placeholder="VH12345"
              placeholderTextColor={themeColors.textSecondary}
              value={passwordInput}
              onChangeText={setPasswordInput}
              editable={!creating}
              secureTextEntry
            />

            <View style={GLOBAL_STYLES.modalButtons}>
              <TouchableOpacity 
                style={[GLOBAL_STYLES.btnDanger, GLOBAL_STYLES.modalBtnHalf]} 
                onPress={() => setModalVisible(false)} 
                disabled={creating}
              >
                <Text style={GLOBAL_STYLES.btnTextDanger}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[GLOBAL_STYLES.btnSuccess, GLOBAL_STYLES.modalBtnHalf, creating && GLOBAL_STYLES.disabledBtn]} 
                onPress={crearUsuarioYAgregarACuenta} 
                disabled={creating}
              >
                <Text style={GLOBAL_STYLES.btnText}>
                  {creating ? 'Creando...' : 'Crear'}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MODAL USER SETTINGS */}
      <Modal visible={userSettingsVisible} transparent animationType="fade" onRequestClose={() => setUserSettingsVisible(false)}>
        <View style={GLOBAL_STYLES.modalOverlay}>
          <Pressable style={styles.modalOverlayPress} onPress={() => setUserSettingsVisible(false)} />
          <View style={[styles.userSettingsModal, { backgroundColor: themeColors.bgSecondary }]}>
            <View style={styles.userSettingsHeader}>
              <Text style={[styles.userSettingsTitle, { color: themeColors.text }]}>
                <Ionicons name="settings-outline" size={20} color={themeColors.text} /> Configurar Usuario
              </Text>
              <TouchableOpacity onPress={() => setUserSettingsVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={28} color={COLORS.rojo} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.compactSection}>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Información</Text>

                <Text style={[GLOBAL_STYLES.modalLabel, { color: themeColors.text }]}>Nombre</Text>
                <TextInput
                  style={[styles.compactInput, { backgroundColor: themeColors.input, color: themeColors.text, borderColor: themeColors.border }]}
                  value={editNombre}
                  onChangeText={setEditNombre}
                  placeholder="Nombre"
                  placeholderTextColor={themeColors.textSecondary}
                />

                <Text style={[GLOBAL_STYLES.modalLabel, { color: themeColors.text, marginTop: 12 }]}>Email</Text>
                <TextInput
                  style={[styles.compactInput, styles.disabledInput, { backgroundColor: '#e3e1e1', color: '#727070', borderColor: themeColors.border }]}
                  value={editEmail}
                  editable={false}
                  placeholder="Email"
                  placeholderTextColor="#999"
                />
                <Text style={[styles.helperText, { color: themeColors.textSecondary }]}>
                  <Ionicons name="information-circle-outline" size={12} color={themeColors.textSecondary} /> Para cambiar email, crea un nuevo usuario
                </Text>

                <Text style={[GLOBAL_STYLES.modalLabel, { color: themeColors.text, marginTop: 12 }]}>Teléfono</Text>
                <TextInput
                  style={[styles.compactInput, { backgroundColor: themeColors.input, color: themeColors.text, borderColor: themeColors.border }]}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+52 81 1234 5678"
                  placeholderTextColor={themeColors.textSecondary}
                  keyboardType="phone-pad"
                />
                
                {/* Botón Guardar adaptado a btnSuccess Outline */}
                <TouchableOpacity style={[GLOBAL_STYLES.btnSuccess, { marginTop: 15, paddingVertical: 10 }]} onPress={guardarCambios}>
                  <Text style={GLOBAL_STYLES.btnText}>
                    <Ionicons name="save-outline" size={16} color={COLORS.turquesa} /> Guardar Cambios
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.quickActionsContainer}>
                {/* Botón Outline Tenue (Morado/Lila) */}
                <TouchableOpacity 
                  style={[styles.quickActionBtn, { borderColor: COLORS.morado }]} 
                  onPress={enviarPasswordReset} 
                  disabled={enviandoReset}
                >
                  {enviandoReset ? (
                    <ActivityIndicator size="small" color={COLORS.morado} style={{ marginBottom: 2 }} />
                  ) : (
                    <Ionicons name="mail-outline" size={18} color={COLORS.morado} />
                  )}
                  <Text style={[styles.quickActionLabel, { color: COLORS.morado }]}>Reset Password</Text>
                </TouchableOpacity>

                {/* Botón Outline Tenue (Naranja/Gris) */}
                <TouchableOpacity 
                  style={[styles.quickActionBtn, { borderColor: COLORS.naranja }]} 
                  onPress={suspenderUsuario}
                >
                  <Ionicons 
                    name={usuarioSeleccionado?.suspendido ? "lock-open-outline" : "lock-closed-outline"} 
                    size={18} 
                    color={COLORS.naranja} 
                  />
                  <Text style={[styles.quickActionLabel, { color: COLORS.naranja }]}>
                    {usuarioSeleccionado?.suspendido ? 'Reactivar' : 'Suspender'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* REGLA ESTRICTA: ELIMINAR VA FULL COLOR ROJO SÓLIDO */}
              <TouchableOpacity style={GLOBAL_STYLES.btnDangerSolid} onPress={() => eliminarUsuario(usuarioSeleccionado)}>
                <Text style={GLOBAL_STYLES.btnTextSolid}>
                  <FontAwesome6 name="trash-can" size={16} color="white" /> Eliminar Usuario
                </Text>
              </TouchableOpacity>

              {/* Botón Cerrar (Outline gris) */}
              <TouchableOpacity 
                style={[GLOBAL_STYLES.btnDanger, { marginTop: 10, paddingVertical: 12, borderColor: themeColors.border }]} 
                onPress={() => setUserSettingsVisible(false)}
              >
                <Text style={[GLOBAL_STYLES.btnTextDanger, { color: themeColors.textSecondary }]}>Cerrar</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({  
  listContent: {
    padding: 15,
  },
  modalOverlayPress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  /* USER SETTINGS MODAL */
  userSettingsModal: {
    borderRadius: 16,
    padding: 16,
    width: '90%',
    maxHeight: '85%',
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
    padding: 4,
  },
  compactSection: {
    backgroundColor: 'rgba(36, 197, 197, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(36, 197, 197, 0.15)',
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
    fontSize: 14,
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
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});