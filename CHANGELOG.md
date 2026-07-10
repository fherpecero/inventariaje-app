# Changelog - Inventariaje App
## 📅 Fecha
**26 de Junio, 2026**
 
---
 
## ✨ CAMBIOS EN v1.3.2
 
### 🆕 Nuevas Características
 
#### **Catálogo Expandido**
- ✅ **Nuevo producto agregado:** Collagen (barcode: 783495495154)
- ✅ Imagen asociada correctamente en '789232464094' rezised
- ✅ Barcode y archivo sincronizados
---
- ✅ Datos sincronizados en Firebase catalogoGlobal
- ✅ Disponible en ExistenciasScreen y SalidaScreen
---
 
### 🔧 Ajustes
 
#### **HomeScreen - Simplificación**
- 🔇 Sección "Registro de Escáner" **comentada temporalmente**
  - Deferred para Fase 4.a completa
  - Modal ModalRegistroEscaner.jsx se mantiene en components/ para futuro uso
  - Funciones helper (cargarEscanerActual, handleConfirmarEscaner, etc) removidas de render
#### **app.json**
- Version: `1.3.1` → `1.3.2`
- iOS buildNumber: `4` → `5`
- Android versionCode: `4` → `5`
---

 
## 📊 Estado del Producto
 
```
Características Estables (v1.3.1):
├── ✅ Dashboard (3 cards: existencias, sin stock, ventas)
├── ✅ ExistenciasScreen (búsqueda, filtros, ordenamiento)
├── ✅ EntradaScreen (agregar productos)
├── ✅ SalidaScreen (vender productos)
├── ✅ MembersScreen (gestión de usuarios)
├── ✅ ConfiguranzaScreen (dark mode, preferencias)
├── ✅ AnalyticsScreen (reportes básicos)
└── ✅ Catálogo de 32+ productos (actualizado)
└── ✅ Modo oscuro
 
Características en Desarrollo:
├── 🔇 Fase 4.a: Registro de Escáner (deferred)
├── ⏳ Fase 4.b: Analytics Avanzado
├── ⏳ Fase 5: PTP + WhatsApp Alerts
└── ⏳ Fase 6: Backoffice API Integration
```
 
---
 
## 📝 Notas de Desarrollo
 
### **Archivo HomeScreen.jsx**
- **Ahora:** HomeScreen-v1.3.1.jsx (sin escáner, oculto para siguiente release)
- **Ruta:** `screens/HomeScreen.jsx`


 
---
## [v1.3.0] - 2026-06-25

### 🎉 Nuevas Características
- Multi-user management (crear, suspender, eliminar usuarios)
- Toast notifications (automáticas, sin click)
- Dark mode completo en todos los screens
- Sistema de notas en Existencias

### ✨ Mejoras
- Optimized inventory system (entrada/salida)
- Security: user suspension/deletion flags
- Firestore Rules mejoradas
- Validación de estructura de datos

### 🐛 Bug Fixes
- Firebase Rules validation
- Sort filters en ExistenciasScreen
- Dark mode en SalidaScreen, EntradaScreen
- Carga de productos correcta
- Cantidad de inventario visible

### 📦 Cambios Técnicos
- Migración a Firestore completa
- isMountedRef para memory leaks
- Mejor manejo de AsyncStorage
- Componente Toast reutilizable

---

## [v1.2.0] - 2026-06-24

### 🎉 Nuevas Características
- Sistema multi-usuario básico
- Entrada y salida de inventario
- Registro de ventas

### 🐛 Bug Fixes
- Permisos de Firebase
- Estructura de datos en Firestore

---

## [v1.1.0] - 2026-06-20

### 🎉 Inicial
- Autenticación con Firebase
- Catálogo de productos
- Inventario simple
