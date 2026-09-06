import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons'; 

const COLORS = {
  turquesa: '#24c5c5',
  blanco: '#fff',
  negro: '#000',
  gris: '#f5f5f5',
  morado: '#7e2b8d',
  verde: '#4CAF50',
  rojo: '#f44336',
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [recordarUsuario, setRecordarUsuario] = useState(false);
  const [cargandoCredenciales, setCargandoCredenciales] = useState(true);
  
  const [showPassword, setShowPassword] = useState(false); 
  
  const { login } = useContext(AuthContext);

  useEffect(() => {
    cargarCredencialesGuardadas();
  }, []);

  const cargarCredencialesGuardadas = async () => {
    try {
      console.log('📱 Buscando credenciales guardadas...');
      
      const emailGuardado = await AsyncStorage.getItem('recordar_email');
      const passwordGuardado = await AsyncStorage.getItem('recordar_password');

      if (emailGuardado) {
        setEmail(emailGuardado);
        console.log('✅ Email prellenado:', emailGuardado);
      }

      if (passwordGuardado) {
        setPassword(passwordGuardado);
        setRecordarUsuario(true);
        console.log('✅ Contraseña prellenada (oculta)');
      }
    } catch (error) {
      console.error('❌ Error cargando credenciales:', error);
    } finally {
      setCargandoCredenciales(false);
    }
  };

  const guardarCredenciales = async () => {
    try {
      if (recordarUsuario) {
        await AsyncStorage.setItem('recordar_email', email);
        console.log('💾 Email guardado:', email);

        await AsyncStorage.setItem('recordar_password', password);
        console.log('💾 Contraseña guardada');
      } else {
        await AsyncStorage.removeItem('recordar_email');
        await AsyncStorage.removeItem('recordar_password');
        console.log('🗑️ Credenciales eliminadas');
      }
    } catch (error) {
      console.error('❌ Error guardando credenciales:', error);
    }
  };

  const olvidarCredenciales = async () => {
    try {
      await AsyncStorage.removeItem('recordar_email');
      await AsyncStorage.removeItem('recordar_password');
      setEmail('');
      setPassword('');
      setRecordarUsuario(false);
      console.log('🗑️ Credenciales borradas');
      Alert.alert('✅ Hecho', 'Credenciales olvidadas. Tendrás que escribirlas de nuevo.');
    } catch (error) {
      console.error('❌ Error:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      setLoading(true);

      if (recordarUsuario) {
        await guardarCredenciales();
      } else {
        await AsyncStorage.removeItem('recordar_email');
        await AsyncStorage.removeItem('recordar_password');
      }

      const result = await login(email, password);

      if (!result.success) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error("Error inesperado en la vista de login:", error);
      Alert.alert('Error', 'Ocurrió un problema inesperado.');
    } finally {
      setLoading(false); 
    }
  };

  if (showRegister) {
    return <RegistroScreen onBackToLogin={() => setShowRegister(false)} />;
  }

  if (cargandoCredenciales) {
    return (
      <View style={styles.container}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.turquesa} />
          <Text style={styles.loaderText}>Cargando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../assets/inventariaje-logo.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Inventariaje</Text>
        <Text style={styles.subtitle}>Gestiona tu negocio VH</Text>
      </View>

      <View style={styles.formContainer}>
        
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          editable={!loading}
          autoCorrect={false}
          keyboardType="email-address"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Contraseña"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword} 
            editable={!loading}
            autoComplete="off"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={showPassword ? "eye-off-outline" : "eye-outline"} 
              size={24} 
              color="#999" 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={[
              styles.checkbox,
              recordarUsuario && styles.checkboxChecked,
            ]}
            onPress={() => setRecordarUsuario(!recordarUsuario)}
            disabled={loading}
          >
            {recordarUsuario && <Text style={styles.checkboxText}>✓</Text>}
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>Recordar usuario</Text>
          
          {email && (
            <TouchableOpacity
              onPress={olvidarCredenciales}
              disabled={loading}
              style={styles.olvidarBtnContainer}
            >
              <Text style={styles.olvidarBtnText}>Olvidar</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          onPress={() => setShowRegister(true)} 
          disabled={loading}
          style={styles.createAccountContainer}
        >
          <Text style={styles.createAccountLink}>¿No tienes cuenta? Crear una</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.blanco} />
          ) : (
            <Text style={styles.buttonText}>Ingresar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RegistroScreen({ onBackToLogin }) {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const { registro } = useContext(AuthContext);

  const handleRegistro = async () => {
    if (!nombre.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    if (password !== passwordConfirm) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setLoading(true);
      console.log('📝 Iniciando registro...');

      const resultado = await registro(email, password, nombre);

      if (resultado.success) {
        console.log('✅ Registro exitoso, cuentaId:', resultado.cuentaId);
        Alert.alert('¡Éxito!', 'Cuenta creada correctamente');
        setNombre('');
        setEmail('');
        setPassword('');
        setPasswordConfirm('');
        onBackToLogin();
      } else {
        Alert.alert('Error', resultado.error || 'Error en el registro');
      }
    } catch (error) {
      console.error('❌ Error en registro:', error);
      Alert.alert('Error', 'Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRegistro}>
        <TouchableOpacity onPress={onBackToLogin} disabled={loading} />
        <Text style={styles.title}>Crear Cuenta</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="Nombre"
          placeholderTextColor="#999"
          value={nombre}
          onChangeText={setNombre}
          editable={!loading}
          autoComplete="off"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          editable={!loading}
          keyboardType="email-address"
          autoComplete="off"
          autoCorrect={false}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Contraseña"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
            autoComplete="off"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={showPassword ? "eye-off-outline" : "eye-outline"} 
              size={24} 
              color="#999" 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Confirmar contraseña"
            placeholderTextColor="#999"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secureTextEntry={!showPasswordConfirm}
            editable={!loading}
            autoComplete="off"
          />
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPasswordConfirm(!showPasswordConfirm)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={showPasswordConfirm ? "eye-off-outline" : "eye-outline"} 
              size={24} 
              color="#999" 
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegistro}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.blanco} />
          ) : (
            <Text style={styles.buttonText}>Crear Cuenta</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={onBackToLogin} disabled={loading}>
          <Text style={styles.footerLink}>← Volver a Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// 📐 STYLESHEET LIMPIO Y CENTRALIZADO
const styles = StyleSheet.create({
  // --- Contenedores Globales ---
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: COLORS.blanco, // 🚀 FONDO BLANCO GENERAL
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 30,
  },
  
  // --- Headers ---
  header: {
    paddingTop: 80,
    paddingBottom: 5,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerRegistro: {
    paddingTop: 80,
    paddingBottom: 5,
    justifyContent: 'space-between', // Para distribuir el boton invisible, titulo y spacer
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerSpacer: {
    width: 60,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: COLORS.turquesa,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },

  // --- Elementos Visuales ---
  logo: {
    width: 180, 
    height: 180,
    alignSelf: 'center',
    marginBottom: 5,
  },

  // --- Inputs y Formularios ---
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 14,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: COLORS.gris, // 🚀 CORREGIDO: (Antes era COLORS.gray)
    color: COLORS.negro,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    borderRadius: 8,
    backgroundColor: COLORS.gris, // 🚀 CORREGIDO
  },
  passwordInput: {
    flex: 1, 
    padding: 14,
    fontSize: 16,
    color: COLORS.negro,
  },
  eyeIcon: {
    padding: 14, 
    justifyContent: 'center',
    alignItems: 'center',
  },

  // --- Opciones adicionales (Checkbox y links) ---
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.turquesa,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: COLORS.blanco,
  },
  checkboxChecked: {
    backgroundColor: COLORS.turquesa,
    borderColor: COLORS.turquesa,
  },
  checkboxText: {
    color: COLORS.blanco,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.negro,
    fontWeight: '500',
  },
  olvidarBtnContainer: {
    marginLeft: 'auto', // 🚀 Extraído del estilo en línea
  },
  olvidarBtnText: {
    fontSize: 12,
    color: COLORS.rojo,
    fontWeight: '600',
    paddingHorizontal: 8,
  },
  createAccountContainer: {
    marginBottom: 20, 
    marginTop: 15, // 🚀 Extraído del estilo en línea
  },
  createAccountLink: {
    color: COLORS.turquesa,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },

  // --- Botones Principales ---
  button: {
    backgroundColor: COLORS.turquesa,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.blanco,
    fontSize: 16,
    fontWeight: '600',
  },

  // --- Footers ---
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  footerLink: {
    color: COLORS.turquesa,
    fontSize: 14,
    fontWeight: '600',
  },
});