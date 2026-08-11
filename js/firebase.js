/**
 * ==========================================================================
 * INICIALIZACIÓN DE FIREBASE (js/firebase.js)
 * Carga los módulos oficiales de Firebase v10.
 * Exporta la base de datos (db), autenticación (auth) y funciones auxiliares.
 * ==========================================================================
 */

// Asegurar que window.fetch tenga un setter writable en el entorno
try {
  if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
    let _fetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      get: () => _fetch,
      set: (fn) => { _fetch = fn; },
      configurable: true,
      enumerable: true
    });
  }
} catch (e) {}

// Importamos la función para inicializar la aplicación de Firebase
import { initializeApp } from "firebase/app";

// Importamos los servicios y funciones de Firestore (Base de datos NoSQL)
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from "firebase/firestore";

// Importamos los servicios de Autenticación (Firebase Auth)
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";

// 1. Configuración del proyecto de Firebase (Credenciales públicas del proyecto)
const firebaseConfig = {
  apiKey: "AIzaSyDKvoeoOizX8FSexcb3d0vIg7R5RpQsRj4",
  authDomain: "proyecto-web-7a96d.firebaseapp.com",
  projectId: "proyecto-web-7a96d",
  storageBucket: "proyecto-web-7a96d.firebasestorage.app",
  messagingSenderId: "1077784939504",
  appId: "1:1077784939504:web:d0fd2c8fd40774fddd2b35",
  measurementId: "G-1K2EMKK8R6"
};

// 2. Inicializamos la aplicación de Firebase con nuestra configuración
const app = initializeApp(firebaseConfig);

// 3. Inicializamos Firestore y Firebase Auth para utilizarlos en la web
const db = getFirestore(app);
const auth = getAuth(app);

// 4. Exportamos las instancias y utilidades para poder importarlas en app.js y admin.js
export {
  db,
  auth,
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
