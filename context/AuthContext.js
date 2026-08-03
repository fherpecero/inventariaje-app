import React, { createContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  getAuth,
  updateProfile,
} from 'firebase/auth';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { fetchAndCacheTier } from '../utils/tierUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';

// 🛡️ SINGLE SOURCE OF TRUTH: Estilos e identidad visual centralizada
import { COLORS, FONT_SIZES, GLOBAL_STYLES } from '../context/theme';  

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // 💡 Single Source of Truth para Perfil + Rol
  const [cuenta, setCuenta] = useState(null);
  const [cuentaId, setCuentaId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // 🛟 RUTA DE ESCAPE DE EMERGENCIA
  const handleEmergencyLogout = async () => {
    try {
      setLoading(true);
      const authObj = getAuth();
      await signOut(authObj);
      setUser(null);
      setUserData(null);
      setCuenta(null);
      setCuentaId(null);
      setAuthError(null);
    } catch (err) {
      console.log('❌ Error en logout de emergencia:', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 🔄 LISTENER PRINCIPAL DE AUTENTICACIÓN (Single Source of Truth)
  // ============================================================
  useEffect(() => {
    let unsubscribeCuenta = null;

    // 🚀 FAILSAFE GLOBAL: Cubre tanto Auth como Firestore.
    // Si en 7 segundos no hemos resuelto la sesión Y los datos, forzamos la entrada.
    const failsafeTimeout = setTimeout(() => {
      console.warn('⚠️ [TIMEOUT CRÍTICO] Firebase (Auth/Firestore) se colgó. Abortando loader...');
      setLoading(false); 
    }, 7000);

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Limpiar suscripción previa a /cuentas si existía en un hot-reload
      if (unsubscribeCuenta) {
        unsubscribeCuenta();
        unsubscribeCuenta = null;
      }

      try {
        setLoading(true);

        if (!currentUser) {
          console.log('❌ No hay usuario autenticado (Lanzamiento en blanco)');
          setUser(null);
          setUserData(null);
          setCuenta(null);
          setCuentaId(null);
          setAuthError(null);
          
          clearTimeout(failsafeTimeout); // ✅ Seguro cancelar: apagamos loader
          setLoading(false);
          return;
        }

        console.log('👤 Usuario detectado en Auth (posible sesión fantasma):', currentUser.uid);
        setUser(currentUser);

        if (!db) {
          console.error("❌ Firestore no está disponible");
          clearTimeout(failsafeTimeout);
          setLoading(false);
          return;
        }

        // 1. Cargar Perfil de Usuario (/usuarios/{uid})
        // ⚠️ Aquí es donde las instalaciones nuevas suelen colgarse. El timeout nos protege.
        const usuarioDocRef = doc(db, 'usuarios', currentUser.uid);
        const usuarioDocSnap = await getDoc(usuarioDocRef);

        if (!usuarioDocSnap.exists()) {
          console.warn('⚠️ No existe documento de usuario en /usuarios');
          clearTimeout(failsafeTimeout);
          setLoading(false);
          return;
        }

        const dataUser = usuarioDocSnap.data();
        
        setUserData({
          uid: currentUser.uid,
          email: dataUser.email || currentUser.email,
          nombre: dataUser.nombre || currentUser.displayName || dataUser.email?.split('@')[0] || 'Usuario',
          rol: dataUser.rol || 'user', 
          cuentaId: dataUser.cuentaId,
          suspendido: dataUser.suspendido || false,
        });

        // 2. Verificar suspensión
        if (dataUser.suspendido === true) {
          console.log('🔒 Usuario suspendido detectado');
          setAuthError('Tu acceso ha sido suspendido. Contacta al administrador de la cuenta.');
          clearTimeout(failsafeTimeout);
          setLoading(false);
          return;
        }

        const userCuentaId = dataUser.cuentaId;
        if (!userCuentaId) {
          console.warn('⚠️ El usuario no tiene cuentaId asignado');
          clearTimeout(failsafeTimeout);
          setLoading(false);
          return;
        }

        console.log('🏢 Conectando en tiempo real a cuenta:', userCuentaId);

        // 3. Suscripción en tiempo real a la Cuenta (/cuentas/{cuentaId})
        const cuentaDocRef = doc(db, 'cuentas', userCuentaId.toString());

        unsubscribeCuenta = onSnapshot(
          cuentaDocRef,
          async (cuentaDocSnap) => {
            if (cuentaDocSnap.exists()) {
              const cuentaData = cuentaDocSnap.data();

              const esPropietario = cuentaData.propietarioUid === currentUser.uid;
              const rolFinal = dataUser.rol || (esPropietario ? 'admin' : 'user');

              setUserData(prev => ({ ...prev, rol: rolFinal }));
              setCuentaId(userCuentaId);
              setCuenta(cuentaData);

              try {
                await fetchAndCacheTier(userCuentaId);
              } catch (err) {
                console.log("ℹ️ Nota en tier cache:", err.message);
              }

              setAuthError(null);
              clearTimeout(failsafeTimeout); // ✅ ÉXITO TOTAL: Socket conectado y datos recibidos.
              setLoading(false); 
            } else {
              setAuthError("No se encontró la información de la cuenta asociada.");
              clearTimeout(failsafeTimeout);
              setLoading(false);
            }
          },
          (error) => {
            console.error("❌ Error de permisos en la cuenta:", error.message);
            setAuthError("Error de seguridad: Tus permisos están desincronizados. Cierra sesión y reintenta.");
            clearTimeout(failsafeTimeout);
            setLoading(false);
          }
        );

      } catch (error) {
        console.error('❌ Error en AuthStateChanged:', error);
        setAuthError(error.message);
        clearTimeout(failsafeTimeout);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(failsafeTimeout); // Prevención de fugas de memoria al desmontar
      if (unsubscribeCuenta) unsubscribeCuenta();
      unsubscribeAuth();
    };
  }, []);

  // ============================================================
  // ✏️ ACTUALIZAR PERFIL (Single Source of Truth Updates)
  // ============================================================
  const actualizarPerfil = async (nuevoNombre) => {
    try {
      if (!user) throw new Error('No hay usuario autenticado');
      const nombreLimpio = nuevoNombre.trim();
      if (!nombreLimpio) throw new Error('El nombre no puede estar vacío');

      console.log('✏️ Actualizando nombre globalmente a:', nombreLimpio);

      // 1. Firebase Auth Profile
      await updateProfile(user, { displayName: nombreLimpio });

      // 2. Firestore /usuarios/{uid}
      const usuarioRef = doc(db, 'usuarios', user.uid);
      await updateDoc(usuarioRef, {
        nombre: nombreLimpio,
        updatedAt: new Date().toISOString(),
      });

      // 3. Firestore /usuariosCuenta/{uid} (Si aplica)
      try {
        const usuarioCuentaRef = doc(db, 'usuariosCuenta', user.uid);
        await updateDoc(usuarioCuentaRef, {
          nombre: nombreLimpio,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.log('ℹ️ /usuariosCuenta no requirió actualización:', e.message);
      }

      // 4. Actualizar Estado Global en Memoria (Redibuja toda la App al instante)
      setUserData((prev) => ({
        ...prev,
        nombre: nombreLimpio,
      }));

      console.log('✅ Nombre actualizado en Firestore y AuthContext');
      return { success: true };
    } catch (error) {
      console.error('❌ Error en actualizarPerfil:', error);
      return { success: false, error: error.message };
    }
  };

  // ============================================================
  // 🔢 GENERAR PRÓXIMO ID DE CUENTA
  // ============================================================
  const generarProximoCuentaId = async () => {
    try {
      console.log('🔢 Generando próximo ID de cuenta...');
      const cuentasSnap = await getDocs(collection(db, 'cuentas'));
      const cuentaIds = [];

      cuentasSnap.forEach((docSnap) => {
        const id = parseInt(docSnap.id);
        if (!isNaN(id) && id > 0) {
          cuentaIds.push(id);
        }
      });

      const maxId = cuentaIds.length > 0 ? Math.max(...cuentaIds) : 9999;
      return maxId + 1;
    } catch (error) {
      console.error('❌ Error generando ID:', error);
      throw error;
    }
  };

  // ============================================================
  // 📝 REGISTRO DE CUENTA NUEVA (ADMIN)
  // ============================================================
  const registro = async (email, password, nombre) => {
    try {
      console.log('📝 Registrando cuenta nueva (Admin)...');

            const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const userId = userCredential.user.uid;
      const nombreLimpio = nombre.trim();

      await updateProfile(userCredential.user, { displayName: nombreLimpio });

      // 1. PRIMERO generamos el ID de la cuenta
      const nuevoCuentaId = await generarProximoCuentaId();

      // 2. LUEGO guardamos al usuario UNA SOLA VEZ con todos sus datos completos
      const usuarioDocRef = doc(db, 'usuarios', userId);
      await setDoc(usuarioDocRef, {
        uid: userId,
        email: email.trim().toLowerCase(),
        nombre: nombreLimpio,
        rol: 'admin', 
        cuentaId: nuevoCuentaId, // 🛡️ Inyectado directamente, sin necesidad de hacer un updateDoc después
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // 3. Guardamos la cuenta
      const cuentaRef = doc(db, 'cuentas', nuevoCuentaId.toString());
      await setDoc(cuentaRef, {
        nombre: nombreLimpio,
        propietarioUid: userId,
        miembros: [userId],
        email: email.trim().toLowerCase(),
        tier: 'premium',
        rol: 'admin',
        premiumTrialActive: true,
        trialStartDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 4. Guardamos el inventario
      const inventarioRef = doc(db, `cuentas/${nuevoCuentaId}/inventarios/vital_health_principal`);
      await setDoc(inventarioRef, {
        nombre: 'Vital Health Principal',
        productos: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 🗑️ ELIMINAMOS: El bloque de updateDoc
      // 🗑️ ELIMINAMOS: El bloque de usuariosCuenta

      return { success: true, cuentaId: nuevoCuentaId, userId };

    } catch (error) {
      console.error('❌ Error en registro:', error);
      let mensajeError = 'Error en el registro';
      if (error.code === 'auth/email-already-in-use') mensajeError = 'Este email ya está registrado';
      else if (error.code === 'auth/weak-password') mensajeError = 'La contraseña es muy débil';
      else if (error.code === 'auth/invalid-email') mensajeError = 'Email inválido';
      return { success: false, error: mensajeError };
    }
  };

  // ============================================================
  // 🔓 LOGIN
  // ============================================================
  const login = async (email, password) => {
    try {
      console.log('🔓 Iniciando sesión...');
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      console.log('✅ Auth exitosa para UID:', userCredential.user.uid);
      return { success: true, userId: userCredential.user.uid };
    } catch (error) {
      console.error('❌ Error en login:', error);
      let mensajeError = 'Error en el login';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        mensajeError = 'Usuario o contraseña incorrectos';
      } else if (error.code === 'auth/wrong-password') {
        mensajeError = 'Contraseña incorrecta';
      } else if (error.code === 'auth/invalid-email') {
        mensajeError = 'Email inválido';
      }
      return { success: false, error: mensajeError };
    }
  };

  // ============================================================
  // 🔐 LOGOUT
  // ============================================================
  const logout = async () => {
    try {
      console.log('🔐 Cerrando sesión...');
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setUserData(null);
      setCuenta(null);
      setCuentaId(null);
      setAuthError(null);
      await AsyncStorage.removeItem('cuentaId');
      console.log('✅ Sesión cerrada correctamente');
    } catch (error) {
      console.error('❌ Error en logout:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // 🎨 RENDER: PANTALLAS DE CARGA Y FALLBACK (USANDO THEME.JSX)
  // ============================================================
  if (loading && !authError) {
    return (
      <View style={[GLOBAL_STYLES.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.turquesa} />
        <Text style={{ marginTop: 12, color: COLORS.textSecondary || '#666', fontSize: FONT_SIZES.normal }}>
          Sincronizando cuenta...
        </Text>
      </View>
    );
  }

  if (authError) {
    return (
      <View style={[GLOBAL_STYLES.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ fontSize: 50, marginBottom: 15 }}>🔒</Text>
        
        <Text style={{ fontSize: FONT_SIZES.titulo, fontWeight: 'bold', color: COLORS.negro, marginBottom: 10 }}>
          Acceso Restringido
        </Text>
        
        <Text style={{ fontSize: FONT_SIZES.normal, color: COLORS.textSecondary || '#666', textAlign: 'center', marginBottom: 30 }}>
          {authError}
        </Text>

        <TouchableOpacity 
          onPress={handleEmergencyLogout}
          style={[GLOBAL_STYLES.btnDanger, { width: '100%', paddingVertical: 14 }]}
        >
          <Text style={[GLOBAL_STYLES.btnText, { fontSize: FONT_SIZES.subtitulo }]}>
            Cerrar Sesión
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      userData, 
      cuenta, 
      cuentaId, 
      loading, 
      registro, 
      login, 
      logout, 
      actualizarPerfil,
      handleEmergencyLogout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}