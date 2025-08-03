// Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBfB4-oobyrnq1RX4J4HEujkBPUweSGZ8Y",
  authDomain: "triggerfi.firebaseapp.com",
  databaseURL: "https://triggerfi-default-rtdb.firebaseio.com",
  projectId: "triggerfi",
  storageBucket: "triggerfi.firebasestorage.app",
  messagingSenderId: "69321969889",
  appId: "1:69321969889:web:0316a93174587f095da7a0",
  measurementId: "G-EFLF9QGXML"
};

// Firestore collection names
export const COLLECTIONS = {
  ORDERS: 'orders',
  PREDICATES: 'predicates',
  FILLS: 'fills'
};

// Order status enum
export enum OrderStatus {
  ACTIVE = 'active',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}