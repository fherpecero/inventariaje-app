import React, { createContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, addDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { fetchAndCacheTier } from '../utils/tierUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

console.log("DEBUG AUTH:", auth); 
console.log("DEBUG DB:", db); 

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cuenta, setCuenta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cuentaId, setCuentaId] = useState(null);

  // Listener de cambios de autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          console.log('👤 Usuario encontrado:', currentUser.uid);
          setUser(currentUser);

          if (!db) {
            console.error("Firestore no está disponible");
            return;
          }
          
          // Obtener datos del usuario
          const usuarioDocRef = doc(db, 'usuarios', currentUser.uid);
          const usuarioDocSnap = await getDoc(usuarioDocRef);
          
          if (usuarioDocSnap.exists()) {
            const userData = usuarioDocSnap.data();
            const cuentaId = userData.cuentaId;
            
            if (cuentaId) {
              console.log('🏢 Cuenta encontrada:', cuentaId);
              
              // ✅ NUEVO: Obtener documento completo
              const cuentaDocRef = doc(db, 'cuentas', cuentaId.toString());
              const cuentaDocSnap = await getDoc(cuentaDocRef);
              
              if (cuentaDocSnap.exists()) {
                setCuentaId(cuentaId);
                setCuenta(cuentaDocSnap.data()); // ✅ Pasar documento completo
                await fetchAndCacheTier(cuentaId);
              } else {
                console.warn('⚠️ Documento de cuenta no encontrado');
                setCuenta(null);
              }

              await fetchAndCacheTier(cuentaId);
            } else {
              console.log('❌ Usuario no tiene cuentaId en documento');
              setCuenta(null);
            }
          } else {
            console.log('❌ NO se encontró documento de usuario para:', currentUser.uid);
            setCuenta(null);
          }
        } else {
          console.log('❌ No hay usuario autenticado');
          setUser(null);
          setCuenta(null);
        }
      } catch (error) {
        console.error('❌ Error obteniendo cuenta:', error);
        setUser(null);
        setCuenta(null);
      } finally {
        console.log('✅ Fin de verificación de autenticación');
        setLoading(false);
      }
        return () => unsubscribe();
    });
  }, []);

      // En AuthContext.jsx, cuando user cambia
      useEffect(() => {
        if (user && cuenta) {
       
        }
      }, [cuenta, user]);

  

  /**
   * 🔢 FUNCIÓN: Generar próximo ID de cuenta (LOCAL - SIN CLOUD FUNCTIONS)
   * 
   * ¿Cómo funciona?
   * 1. Lista todos los documentos en /cuentas
   * 2. Extrae los IDs numéricos
   * 3. Encuentra el máximo
   * 4. Suma 1 y retorna
   * 
   * ⚠️ NOTA sobre Race Conditions:
   * Si dos usuarios se registran simultáneamente, ambos podrían obtener el mismo ID.
   * Para una solución robusta, usar Cloud Functions (Firestore Transactions).
   * Para MVP/dev, esto es aceptable.
   * 
   * RETORNA: String con el próximo ID secuencial
   */
    const generarProximoCuentaId = async () => {
    try {
      console.log('🔢 Generando próximo ID de cuenta...');
      
      const cuentasSnap = await getDocs(collection(db, 'cuentas'));
      const cuentaIds = [];
      
      cuentasSnap.forEach((doc) => {
        const id = parseInt(doc.id);
        if (!isNaN(id) && id > 0) {
          cuentaIds.push(id);
        }
      });
      
      const maxId = cuentaIds.length > 0 ? Math.max(...cuentaIds) : 9999;
      const proximoId = maxId + 1;
      
      console.log('📈 Contador actual:', maxId);
      return proximoId.toString();
    } catch (error) {
      console.error('❌ Error generando ID:', error);
      throw error; // Propagar error en lugar de fallback
      }
    };

  const registro = async (email, password, nombre) => {
    try {
      console.log('📝 Iniciando registro...');
      
      // 1. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      console.log('✅ Usuario creado en Auth:', userId);

      // 2. Crear documento inicial en /usuarios/{uid}
      const usuarioDocRef = doc(db, 'usuarios', userId);
      await setDoc(usuarioDocRef, {
        uid: userId,
        email: email.trim(),
        nombre: nombre.trim(),
        createdAt: new Date().toISOString(),
      });
      console.log('✅ Usuario creado en /usuarios');

      // 3. Generar próximo ID de cuenta (LOCAL)
      const cuentaId = await generarProximoCuentaId();
      console.log(`📊 Nuevo cuentaId asignado: ${cuentaId}`);

      // 4. Crear la cuenta en /cuentas/{cuentaId}
      const cuentaRef = doc(db, 'cuentas', cuentaId);
      await setDoc(cuentaRef, {
        nombre: `${nombre.trim()} - Inventario`,
        propietarioUid: userId,
        miembros: [userId],
        email: email.trim(),
        tier: 'premium',
        premiumTrialActive: true,
        trialStartDate: new Date().toISOString(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Cuenta creada:', cuentaId);

      // 5. Crear inventario principal
      const inventarioRef = doc(db, `cuentas/${cuentaId}/inventarios/vital_health_principal`);
      await setDoc(inventarioRef, {
        nombre: 'Vital Health Principal',
        productos: {},
        createdAt: new Date(),
        updatedAt: new Date()
      });
      console.log('✅ Inventario creado');

      // 6. Actualizar documento de usuario con cuentaId
      await updateDoc(usuarioDocRef, {
        cuentaId: cuentaId,
        updatedAt: new Date().toISOString(),
      });
      console.log('✅ Usuario actualizado con cuentaId');

      // 7. Crear índice en /usuariosCuenta/{userId}
      const usuarioCuentaRef = doc(db, 'usuariosCuenta', userId);
      await setDoc(usuarioCuentaRef, {
        cuentaId: cuentaId,
        email: email.trim(),
        nombre: nombre.trim(),
        createdAt: new Date().toISOString(),
      });
      console.log('✅ Índice usuariosCuenta creado');

      // 8. Actualizar estado local
      setUser(userCredential.user);
      setCuenta(cuentaId);
      
      console.log('✅ REGISTRO COMPLETADO - Cuenta:', cuentaId);
      
      return { success: true, cuentaId, userId };
    } catch (error) {
      console.error('❌ Error en registro:', error);
      
      // Mensaje más descriptivo para el usuario
      let mensajeError = 'Error en el registro';
      if (error.code === 'auth/email-already-in-use') {
        mensajeError = 'Este email ya está registrado';
      } else if (error.code === 'auth/weak-password') {
        mensajeError = 'La contraseña es muy débil';
      } else if (error.code === 'auth/invalid-email') {
        mensajeError = 'Email inválido';
      }
      
      return { success: false, error: mensajeError };
    }
  };

  /**
   * 🔓 FUNCIÓN: LOGIN
   * 
   * FLUJO:
   * 1. Autentica con email/password
   * 2. El listener de onAuthStateChanged obtiene automáticamente la cuenta
   */
  const login = async (email, password) => {
    try {
      console.log('🔓 Iniciando login...');
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid;
      console.log('✅ Login exitoso:', userCredential.user.uid);

      if (db) {
        const usuarioDocRef = doc(db, 'usuarios', userId);
        const usuarioSnap = await getDoc(usuarioDocRef);

        if (usuarioSnap.exists()) {
          const userData = usuarioSnap.data();

          //Suspendido
          if (userData.suspendido === true) {
            console.log('🔒Usuario Suspendido');
            await signOut(auth);
            return {
              success: false,
              error: '🔒Tu cuenta ha sido suspendida\n\nContacta al admin de la cuenta'
            };
          }
        }
      }
      return { success: true, userId: userCredential.user.uid };
    } catch (error) {
      console.error('❌ Error en login:', error);
      
      let mensajeError = 'Error en el login';
      if (error.code === 'auth/user-not-found') {
        mensajeError = 'Usuario no encontrado';
      } else if (error.code === 'auth/wrong-password') {
        mensajeError = 'Contraseña incorrecta';
      } else if (error.code === 'auth/invalid-email') {
        mensajeError = 'Email inválido';
      }
      
      return { success: false, error: mensajeError };
    }
  };

  /**
   * 🔐 FUNCIÓN: LOGOUT
   * 
   * FLUJO:
   * 1. Cierra sesión en Firebase Auth
   * 2. El listener de onAuthStateChanged limpia el estado local
   */
  const logout = async () => {
    try {
      console.log('🔐 Cerrando sesión...');
      await signOut(auth);
      setUser(null);
      setCuenta(null);
      console.log('✅ Sesión cerrada');
    } catch (error) {
      console.error('❌ Error en logout:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, cuenta, cuentaId, loading, registro, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}