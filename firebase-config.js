// firebase-config.js
// Configuración de Firebase para Dental Art Studio
// Reemplaza los valores de abajo con las credenciales de tu proyecto de Firebase.
// Puedes obtener estas credenciales en la Consola de Firebase -> Configuración del proyecto -> Tus aplicaciones.

const firebaseConfig = {
    apiKey: "AIzaSyDty7fy34XxHI8d-OVmWjb9EUxMgZuE0bs",
    authDomain: "dental-art-studio.firebaseapp.com",
    projectId: "dental-art-studio",
    storageBucket: "dental-art-studio.firebasestorage.app",
    messagingSenderId: "1015551565640",
    appId: "1:1015551565640:web:daab1a110db7cfee5b9d7d"
};

// Indica si Firebase está listo para usarse. 
// Si mantienes "TU_API_KEY" o la dejas vacía, la aplicación usará de forma automática 
// el backend local (server.js/app.py) o LocalStorage.
const useFirebase = firebaseConfig.apiKey && firebaseConfig.apiKey !== "TU_API_KEY";

if (useFirebase) {
    firebase.initializeApp(firebaseConfig);
    window.db = firebase.firestore();
    console.log("🔥 Firebase inicializado con éxito. Conectado a la base de datos en tiempo real.");
} else {
    console.log("ℹ️ Usando modo de desarrollo sin Firebase (se comunicará con el backend local o LocalStorage).");
}
