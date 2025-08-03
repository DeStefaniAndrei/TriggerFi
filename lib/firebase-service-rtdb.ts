import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  push,
  query,
  orderByChild,
  equalTo,
  onValue,
  off,
  Database,
  DataSnapshot
} from 'firebase/database';
import { firebaseConfig, OrderStatus } from './firebase-config';
import { LimitOrder } from './1inch-sdk-integration';

/**
 * Firebase Realtime Database Service for TriggerFi
 * 
 * This service uses Firebase Realtime Database (not Firestore)
 * to store orders and predicate configurations.
 */

// Initialize Firebase
let app: FirebaseApp | null = null;
let db: Database | null = null;

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  console.log('Firebase Realtime Database initialized successfully');
} catch (error) {
  console.warn('Firebase initialization failed:', error);
  console.warn('Running in mock mode.');
}

/**
 * Order data structure in Realtime Database
 */
export interface StoredOrder {
  // Order identification
  orderId: string;
  orderHash: string;
  predicateId: string;
  
  // Order details
  order: LimitOrder;
  signature: string;
  
  // Token information
  makerAsset: string;
  takerAsset: string;
  makerAmount: string;
  takerAmount: string;
  
  // API conditions
  apiConditions: any[];
  logicOperator: 'AND' | 'OR';
  
  // Metadata
  maker: string;
  status: OrderStatus;
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  
  // Execution info (optional)
  filledAt?: number;
  filledTxHash?: string;
  filledBy?: string;
  
  // Fee tracking
  updateCount?: number;
  accumulatedFees?: string;
}

/**
 * Mock storage for development without Firebase
 */
const mockStorage = {
  orders: new Map<string, StoredOrder>(),
  predicates: new Map<string, any>()
};

/**
 * Save a new order to Realtime Database
 */
export async function saveOrder(
  order: LimitOrder,
  signature: string,
  predicateId: string,
  apiConditions: any[],
  logicOperator: 'AND' | 'OR',
  orderHash: string
): Promise<string> {
  const orderId = `${order.maker}-${Date.now()}`;
  const orderData: StoredOrder = {
    orderId,
    orderHash,
    predicateId,
    order,
    signature,
    makerAsset: order.makerAsset,
    takerAsset: order.takerAsset,
    makerAmount: order.makingAmount,
    takerAmount: order.takingAmount,
    apiConditions,
    logicOperator,
    maker: order.maker,
    status: OrderStatus.ACTIVE,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    updateCount: 0,
    accumulatedFees: "0"
  };

  if (!db) {
    console.log('Mock: Order saved locally:', orderData);
    mockStorage.orders.set(orderId, orderData);
    return orderId;
  }

  try {
    const ordersRef = ref(db, `orders/${orderId}`);
    await set(ordersRef, orderData);
    console.log('Order saved to Firebase Realtime Database:', orderId);
    return orderId;
  } catch (error) {
    console.error('Error saving order:', error);
    // Fallback to mock storage
    mockStorage.orders.set(orderId, orderData);
    return orderId;
  }
}

/**
 * Get all active orders for monitoring
 */
export async function getActiveOrders(): Promise<StoredOrder[]> {
  if (!db) {
    const mockOrders = Array.from(mockStorage.orders.values())
      .filter(order => order.status === OrderStatus.ACTIVE);
    console.log('Mock: Returning', mockOrders.length, 'active orders');
    return mockOrders;
  }

  try {
    const ordersRef = ref(db, 'orders');
    const snapshot = await get(ordersRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const orders: StoredOrder[] = [];
    snapshot.forEach((childSnapshot) => {
      const order = childSnapshot.val() as StoredOrder;
      if (order.status === OrderStatus.ACTIVE) {
        orders.push(order);
      }
    });
    
    return orders.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error('Error fetching active orders:', error);
    return [];
  }
}

/**
 * Get orders by maker address
 */
export async function getOrdersByMaker(makerAddress: string): Promise<StoredOrder[]> {
  if (!db) {
    const mockOrders = Array.from(mockStorage.orders.values())
      .filter(order => order.maker.toLowerCase() === makerAddress.toLowerCase())
      .sort((a, b) => b.createdAt - a.createdAt);
    return mockOrders;
  }

  try {
    const ordersRef = ref(db, 'orders');
    const snapshot = await get(ordersRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const orders: StoredOrder[] = [];
    snapshot.forEach((childSnapshot) => {
      const order = childSnapshot.val() as StoredOrder;
      if (order.maker.toLowerCase() === makerAddress.toLowerCase()) {
        orders.push(order);
      }
    });
    
    return orders.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
  } catch (error) {
    console.error('Error fetching orders by maker:', error);
    return [];
  }
}

/**
 * Get orders by predicate ID
 */
export async function getOrdersByPredicate(predicateId: string): Promise<StoredOrder[]> {
  if (!db) {
    const mockOrders = Array.from(mockStorage.orders.values())
      .filter(order => order.predicateId === predicateId && order.status === OrderStatus.ACTIVE);
    return mockOrders;
  }

  try {
    const ordersRef = ref(db, 'orders');
    const snapshot = await get(ordersRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const orders: StoredOrder[] = [];
    snapshot.forEach((childSnapshot) => {
      const order = childSnapshot.val() as StoredOrder;
      if (order.predicateId === predicateId && order.status === OrderStatus.ACTIVE) {
        orders.push(order);
      }
    });
    
    return orders;
  } catch (error) {
    console.error('Error fetching orders by predicate:', error);
    return [];
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string, 
  status: OrderStatus,
  additionalData?: Partial<StoredOrder>
): Promise<void> {
  const updates = {
    status,
    updatedAt: Date.now(),
    ...additionalData
  };

  if (!db) {
    const order = mockStorage.orders.get(orderId);
    if (order) {
      Object.assign(order, updates);
      console.log('Mock: Order status updated:', orderId, status);
    }
    return;
  }

  try {
    const orderRef = ref(db, `orders/${orderId}`);
    const snapshot = await get(orderRef);
    
    if (snapshot.exists()) {
      const currentOrder = snapshot.val();
      await set(orderRef, { ...currentOrder, ...updates });
      console.log('Order status updated:', orderId, status);
    }
  } catch (error) {
    console.error('Error updating order status:', error);
  }
}

/**
 * Mark order as filled
 */
export async function markOrderFilled(
  orderId: string,
  txHash: string,
  filledBy: string
): Promise<void> {
  return updateOrderStatus(orderId, OrderStatus.FILLED, {
    filledAt: Date.now(),
    filledTxHash: txHash,
    filledBy
  });
}

/**
 * Update order fee tracking
 */
export async function updateOrderFees(
  orderId: string,
  updateCount: number,
  accumulatedFees: string
): Promise<void> {
  if (!db) {
    const order = mockStorage.orders.get(orderId);
    if (order) {
      order.updateCount = updateCount;
      order.accumulatedFees = accumulatedFees;
      order.updatedAt = Date.now();
    }
    return;
  }

  try {
    const orderRef = ref(db, `orders/${orderId}`);
    const snapshot = await get(orderRef);
    
    if (snapshot.exists()) {
      const currentOrder = snapshot.val();
      await set(orderRef, {
        ...currentOrder,
        updateCount,
        accumulatedFees,
        updatedAt: Date.now()
      });
    }
  } catch (error) {
    console.error('Error updating order fees:', error);
  }
}

/**
 * Subscribe to active orders (real-time updates)
 */
export function subscribeToActiveOrders(
  callback: (orders: StoredOrder[]) => void
): () => void {
  if (!db) {
    // For mock mode, just call with current orders
    const mockOrders = Array.from(mockStorage.orders.values())
      .filter(order => order.status === OrderStatus.ACTIVE);
    callback(mockOrders);
    return () => {};
  }

  const ordersRef = ref(db, 'orders');
  
  const listener = onValue(ordersRef, 
    (snapshot) => {
      const orders: StoredOrder[] = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const order = childSnapshot.val() as StoredOrder;
          if (order.status === OrderStatus.ACTIVE) {
            orders.push(order);
          }
        });
      }
      
      callback(orders);
    },
    (error) => {
      console.error('Error in order subscription:', error);
      callback([]);
    }
  );

  // Return unsubscribe function
  return () => off(ordersRef, 'value', listener);
}

/**
 * Save predicate configuration (for tracking)
 */
export async function savePredicateConfig(
  predicateId: string,
  config: {
    apiConditions: any[];
    logicOperator: 'AND' | 'OR';
    creator: string;
    chainlinkFunction?: string;
  }
): Promise<void> {
  const predicateData = {
    predicateId,
    ...config,
    createdAt: Date.now(),
    lastChecked: Date.now(),
    lastResult: false,
    checkCount: 0
  };

  if (!db) {
    console.log('Mock: Predicate saved locally:', predicateData);
    mockStorage.predicates.set(predicateId, predicateData);
    return;
  }

  try {
    const predicateRef = ref(db, `predicates/${predicateId}`);
    await set(predicateRef, predicateData);
    console.log('Predicate config saved:', predicateId);
  } catch (error) {
    console.error('Error saving predicate config:', error);
    mockStorage.predicates.set(predicateId, predicateData);
  }
}

/**
 * Get predicate configuration
 */
export async function getPredicateConfig(predicateId: string): Promise<any> {
  if (!db) {
    return mockStorage.predicates.get(predicateId) || null;
  }

  try {
    const predicateRef = ref(db, `predicates/${predicateId}`);
    const snapshot = await get(predicateRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching predicate config:', error);
    return null;
  }
}

/**
 * Update predicate check result
 */
export async function updatePredicateResult(
  predicateId: string,
  result: boolean,
  checkCount: number
): Promise<void> {
  const updates = {
    lastChecked: Date.now(),
    lastResult: result,
    checkCount
  };

  if (!db) {
    const predicate = mockStorage.predicates.get(predicateId);
    if (predicate) {
      Object.assign(predicate, updates);
    }
    return;
  }

  try {
    const predicateRef = ref(db, `predicates/${predicateId}`);
    const snapshot = await get(predicateRef);
    
    if (snapshot.exists()) {
      const currentPredicate = snapshot.val();
      await set(predicateRef, { ...currentPredicate, ...updates });
    }
  } catch (error) {
    console.error('Error updating predicate result:', error);
  }
}

/**
 * Get all active predicates for monitoring
 */
export async function getActivePredicates(): Promise<any[]> {
  if (!db) {
    return Array.from(mockStorage.predicates.values());
  }

  try {
    const predicatesRef = ref(db, 'predicates');
    const snapshot = await get(predicatesRef);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    const predicates: any[] = [];
    snapshot.forEach((childSnapshot) => {
      predicates.push(childSnapshot.val());
    });
    
    return predicates;
  } catch (error) {
    console.error('Error fetching predicates:', error);
    return [];
  }
}