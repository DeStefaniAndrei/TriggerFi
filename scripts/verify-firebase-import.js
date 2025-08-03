// Quick test to verify Firebase imports work
console.log('🔍 Testing Firebase imports...\n');

try {
  // Test importing Firebase modules
  const { initializeApp } = require('firebase/app');
  const { getFirestore } = require('firebase/firestore');
  const { getDatabase } = require('firebase/database');
  
  console.log('✅ firebase/app imported successfully');
  console.log('✅ firebase/firestore imported successfully');
  console.log('✅ firebase/database imported successfully');
  
  // Test initializing Firebase with the config
  const firebaseConfig = {
    apiKey: "AIzaSyBfB4-oobyrnq1RX4J4HEujkBPUweSGZ8Y",
    authDomain: "triggerfi.firebaseapp.com",
    databaseURL: "https://triggerfi-default-rtdb.firebaseio.com",
    projectId: "triggerfi",
    storageBucket: "triggerfi.firebasestorage.app",
    messagingSenderId: "69321969889",
    appId: "1:69321969889:web:0316a93174587f095da7a0",
    measurementId: "G-EFLF9QGXML"
  };
  
  const app = initializeApp(firebaseConfig);
  console.log('\n✅ Firebase app initialized successfully');
  console.log(`📱 App name: ${app.name}`);
  console.log(`🆔 Project ID: ${app.options.projectId}`);
  
  // Test Firestore connection
  const db = getFirestore(app);
  console.log('\n✅ Firestore instance created');
  
  // Test Realtime Database connection
  const rtdb = getDatabase(app);
  console.log('✅ Realtime Database instance created');
  
  console.log('\n🎉 All Firebase imports and initialization working correctly!');
  
} catch (error) {
  console.error('❌ Error with Firebase:', error.message);
  console.error(error);
}