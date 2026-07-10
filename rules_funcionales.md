rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ============================================
    // CONFIG - Administrador solo
    // ============================================
    match /_config/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    // ============================================
    // CATÁLOGO GLOBAL - Todos autenticados leen
    // ============================================
    match /catalogoGlobal/{productoId} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }
    
    // ============================================
    // CUENTAS - Control por propietario y miembros
    // ============================================
    match /cuentas/{cuentaId} {
      
      // LECTURA: Todos los miembros y propietario
      allow read: if isMemberOfAccount(cuentaId);
      
      // ESCRITURA: Solo el propietario puede editar cuenta (incluido agregar miembros)
      allow write: if isOwnerOfAccount(cuentaId);
      
      // CREACIÓN: Cualquier usuario autenticado
      allow create: if request.auth != null;
      
      // ========== USUARIOS DE LA CUENTA ==========
      match /usuarios/{usuarioEmail} {
        // LECTURA: Miembros de la cuenta leen usuarios
        allow read: if isMemberOfAccount(cuentaId);
        
        // ESCRITURA: Solo propietario puede agregar/editar usuarios
        allow write: if isOwnerOfAccount(cuentaId);
        
        // CREACIÓN: Solo propietario
        allow create: if isOwnerOfAccount(cuentaId);
      }
      
      // ========== INVENTARIOS ==========
      match /inventarios/{inventarioId} {
        
        // LECTURA: Todos los miembros pueden leer inventarios
        allow read: if isMemberOfAccount(cuentaId);
        
        // ESCRITURA: Todos los miembros pueden editar inventarios
        allow write: if isMemberOfAccount(cuentaId);
        
        // CREACIÓN: Miembros pueden crear
        allow create: if isMemberOfAccount(cuentaId);
        
        // ========== PRODUCTOS ==========
        match /productos/{productoId} {
          // LECTURA: Miembros leen productos
          allow read: if isMemberOfAccount(cuentaId);
          
          // ESCRITURA: Miembros editan productos
          allow write: if isMemberOfAccount(cuentaId);
          
          // CREACIÓN: Miembros agregan productos
          allow create: if isMemberOfAccount(cuentaId);
        }
      }
      
      // ========== SALIDAS (Ventas) ==========
      match /salidas/{salidaId} {
        // LECTURA: Todos los miembros ven ventas
        allow read: if isMemberOfAccount(cuentaId);
        
        // CREACIÓN: Miembros registran ventas
        allow create: if isMemberOfAccount(cuentaId);
        
        // ESCRITURA: Miembros editan ventas
        allow write: if isMemberOfAccount(cuentaId);
      }
      
      // ========== ENTRADAS ==========
      match /entradas/{entradaId} {
        // LECTURA: Miembros ven entradas
        allow read: if isMemberOfAccount(cuentaId);
        
        // CREACIÓN: Miembros registran entradas
        allow create: if isMemberOfAccount(cuentaId);
        
        // ESCRITURA: Miembros editan entradas
        allow write: if isMemberOfAccount(cuentaId);
      }
    }
    
    // ============================================
    // USUARIOS (Perfil global del usuario)
    // ✅ NUEVO: Todos autenticados pueden LEER para buscar por email
    // ============================================
    match /usuarios/{userId} {
      allow read: if request.auth != null;  // ✅ Permite buscar usuarios por email
      allow write: if request.auth.uid == userId;
      allow create: if request.auth.uid != null;
    }
    
    // ============================================
    // USUARIOS CUENTA (Relación usuario-cuenta)
    // ============================================
    match /usuariosCuenta/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
      allow create: if request.auth.uid != null;
    }
    
    // ============================================
    // FUNCIONES AUXILIARES
    // ============================================
    
    function isMemberOfAccount(cuentaId) {
      let account = get(/databases/$(database)/documents/cuentas/$(cuentaId));
      return request.auth != null && 
             request.auth.uid in account.data.miembros;
    }
    
    function isOwnerOfAccount(cuentaId) {
      let account = get(/databases/$(database)/documents/cuentas/$(cuentaId));
      return request.auth != null && 
             request.auth.uid == account.data.propietarioUid;
    }
  }
}