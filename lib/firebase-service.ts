import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where,
  orderBy,
  Timestamp
} from "firebase/firestore";

/**
 * Firebase Service for TriggerFi
 * 
 * Manages off-chain storage of orders with weather conditions
 * This keeps gas costs low while maintaining order history
 */

// Firebase configuration (set these in your .env file)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Order types
export interface WeatherCondition {
  type: "temperature" | "precipitation" | "wind";
  location: string;
  threshold: number;
  comparison: "above" | "below";
  isBelow?: boolean; // For contract compatibility
}

export interface TriggerOrder {
  // User info
  userId: string;
  userAddress: string;
  
  // Condition
  condition: WeatherCondition;
  
  // Trade details
  trade: {
    sellToken: string;
    sellTokenSymbol: string;
    sellAmount: string;
    buyToken: string;
    buyTokenSymbol: string;
    buyAmount: string;
  };
  
  // 1inch order data
  order: any; // 1inch order structure
  signature: string;
  
  // Status
  status: "active" | "executed" | "cancelled" | "expired";
  createdAt: Timestamp;
  executedAt?: Timestamp;
  txHash?: string;
  
  // Optional fields
  description?: string;
  gasUsed?: string;
  lastError?: string;
}

/**
 * Save a new order to Firebase
 */
export async function saveOrder(orderData: Omit<TriggerOrder, "createdAt">) {
  try {
    const docRef = await addDoc(collection(db, "orders"), {
      ...orderData,
      createdAt: Timestamp.now()
    });
    
    console.log("Order saved with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving order: ", error);
    throw error;
  }
}

/**
 * Get all orders for a user
 */
export async function getUserOrders(userAddress: string): Promise<TriggerOrder[]> {
  try {
    const q = query(
      collection(db, "orders"),
      where("userAddress", "==", userAddress),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    const orders: TriggerOrder[] = [];
    
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as any);
    });
    
    return orders;
  } catch (error) {
    console.error("Error fetching orders: ", error);
    throw error;
  }
}

/**
 * Get all active orders (for the taker bot)
 */
export async function getActiveOrders(): Promise<TriggerOrder[]> {
  try {
    const q = query(
      collection(db, "orders"),
      where("status", "==", "active")
    );
    
    const querySnapshot = await getDocs(q);
    const orders: TriggerOrder[] = [];
    
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as any);
    });
    
    return orders;
  } catch (error) {
    console.error("Error fetching active orders: ", error);
    throw error;
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string, 
  status: TriggerOrder["status"],
  additionalData?: Partial<TriggerOrder>
) {
  try {
    const orderRef = doc(db, "orders", orderId);
    await updateDoc(orderRef, {
      status,
      ...additionalData
    });
    
    console.log("Order updated: ", orderId);
  } catch (error) {
    console.error("Error updating order: ", error);
    throw error;
  }
}

/**
 * Cancel an order
 */
export async function cancelOrder(orderId: string) {
  return updateOrderStatus(orderId, "cancelled", {
    cancelledAt: Timestamp.now()
  } as any);
}

/**
 * Get order statistics for dashboard
 */
export async function getOrderStats(userAddress: string) {
  try {
    const orders = await getUserOrders(userAddress);
    
    const stats = {
      total: orders.length,
      active: orders.filter(o => o.status === "active").length,
      executed: orders.filter(o => o.status === "executed").length,
      cancelled: orders.filter(o => o.status === "cancelled").length,
      totalVolume: orders
        .filter(o => o.status === "executed")
        .reduce((sum, o) => sum + parseFloat(o.trade.sellAmount), 0)
    };
    
    return stats;
  } catch (error) {
    console.error("Error calculating stats: ", error);
    throw error;
  }
}

/**
 * Example order creation
 */
export async function createWeatherOrder(
  userAddress: string,
  location: string,
  tempThreshold: number,
  isBelow: boolean,
  sellToken: string,
  sellAmount: string,
  buyToken: string,
  buyAmount: string,
  order: any,
  signature: string
) {
  const orderData: Omit<TriggerOrder, "createdAt"> = {
    userId: userAddress.toLowerCase(),
    userAddress: userAddress,
    condition: {
      type: "temperature",
      location: location,
      threshold: tempThreshold,
      comparison: isBelow ? "below" : "above",
      isBelow: isBelow
    },
    trade: {
      sellToken: sellToken,
      sellTokenSymbol: "USDC", // In real app, look this up
      sellAmount: sellAmount,
      buyToken: buyToken,
      buyTokenSymbol: "HEDGE", // In real app, look this up
      buyAmount: buyAmount
    },
    order: order,
    signature: signature,
    status: "active",
    description: `Hedge against ${isBelow ? "frost" : "heat"} in ${location}`
  };
  
  return saveOrder(orderData);
}

// Export the Firestore instance if needed elsewhere
export { db };