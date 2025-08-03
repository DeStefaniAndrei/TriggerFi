"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivePredicates = exports.updatePredicateResult = exports.getPredicateConfig = exports.savePredicateConfig = exports.subscribeToActiveOrders = exports.updateOrderFees = exports.markOrderFilled = exports.updateOrderStatus = exports.getOrdersByPredicate = exports.getOrdersByMaker = exports.getActiveOrders = exports.saveOrder = void 0;
const app_1 = require("firebase/app");
const firestore_1 = require("firebase/firestore");
const firebase_config_1 = require("./firebase-config");
// Initialize Firebase
let app = null;
let db = null;
// Initialize Firebase
try {
    app = (0, app_1.initializeApp)(firebase_config_1.firebaseConfig);
    db = (0, firestore_1.getFirestore)(app);
    console.log('Firebase initialized successfully');
}
catch (error) {
    console.warn('Firebase initialization failed:', error);
    console.warn('Running in mock mode.');
}
/**
 * Mock storage for development without Firebase
 */
const mockStorage = {
    orders: new Map(),
    predicates: new Map()
};
/**
 * Save a new order to Firestore
 */
async function saveOrder(order, signature, predicateId, apiConditions, logicOperator, orderHash) {
    const orderId = `${order.maker}-${Date.now()}`;
    const orderData = {
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
        status: firebase_config_1.OrderStatus.ACTIVE,
        createdAt: firestore_1.Timestamp.now(),
        updatedAt: firestore_1.Timestamp.now(),
        updateCount: 0,
        accumulatedFees: "0"
    };
    if (!db) {
        console.log('Mock: Order saved locally:', orderData);
        mockStorage.orders.set(orderId, orderData);
        return orderId;
    }
    try {
        await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, firebase_config_1.COLLECTIONS.ORDERS, orderId), orderData);
        console.log('Order saved to Firebase:', orderId);
        return orderId;
    }
    catch (error) {
        console.error('Error saving order:', error);
        // Fallback to mock storage
        mockStorage.orders.set(orderId, orderData);
        return orderId;
    }
}
exports.saveOrder = saveOrder;
/**
 * Get all active orders for monitoring
 */
async function getActiveOrders() {
    if (!db) {
        const mockOrders = Array.from(mockStorage.orders.values())
            .filter(order => order.status === firebase_config_1.OrderStatus.ACTIVE);
        console.log('Mock: Returning', mockOrders.length, 'active orders');
        return mockOrders;
    }
    try {
        const q = (0, firestore_1.query)((0, firestore_1.collection)(db, firebase_config_1.COLLECTIONS.ORDERS), (0, firestore_1.where)('status', '==', firebase_config_1.OrderStatus.ACTIVE), (0, firestore_1.orderBy)('createdAt', 'desc'));
        const snapshot = await (0, firestore_1.getDocs)(q);
        return snapshot.docs.map(doc => doc.data());
    }
    catch (error) {
        console.error('Error fetching active orders:', error);
        return [];
    }
}
exports.getActiveOrders = getActiveOrders;
/**
 * Get orders by maker address
 */
async function getOrdersByMaker(makerAddress) {
    if (!db) {
        const mockOrders = Array.from(mockStorage.orders.values())
            .filter(order => order.maker.toLowerCase() === makerAddress.toLowerCase())
            .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
        return mockOrders;
    }
    try {
        const q = (0, firestore_1.query)((0, firestore_1.collection)(db, firebase_config_1.COLLECTIONS.ORDERS), (0, firestore_1.where)('maker', '==', makerAddress), (0, firestore_1.orderBy)('createdAt', 'desc'), (0, firestore_1.limit)(50));
        const snapshot = await (0, firestore_1.getDocs)(q);
        return snapshot.docs.map(doc => doc.data());
    }
    catch (error) {
        console.error('Error fetching orders by maker:', error);
        return [];
    }
}
exports.getOrdersByMaker = getOrdersByMaker;
/**
 * Get orders by predicate ID
 */
async function getOrdersByPredicate(predicateId) {
    if (!db) {
        const mockOrders = Array.from(mockStorage.orders.values())
            .filter(order => order.predicateId === predicateId && order.status === firebase_config_1.OrderStatus.ACTIVE);
        return mockOrders;
    }
    try {
        const q = (0, firestore_1.query)((0, firestore_1.collection)(db, firebase_config_1.COLLECTIONS.ORDERS), (0, firestore_1.where)('predicateId', '==', predicateId), (0, firestore_1.where)('status', '==', firebase_config_1.OrderStatus.ACTIVE));
        const snapshot = await (0, firestore_1.getDocs)(q);
        return snapshot.docs.map(doc => doc.data());
    }
    catch (error) {
        console.error('Error fetching orders by predicate:', error);
        return [];
    }
}
exports.getOrdersByPredicate = getOrdersByPredicate;
/**
 * Update order status
 */
async function updateOrderStatus(orderId, status, additionalData) {
    const updates = {
        status,
        updatedAt: firestore_1.Timestamp.now(),
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
        await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, firebase_config_1.COLLECTIONS.ORDERS, orderId), updates, { merge: true });
        console.log('Order status updated:', orderId, status);
    }
    catch (error) {
        console.error('Error updating order status:', error);
    }
}
exports.updateOrderStatus = updateOrderStatus;
/**
 * Mark order as filled
 */
async function markOrderFilled(orderId, txHash, filledBy) {
    return updateOrderStatus(orderId, firebase_config_1.OrderStatus.FILLED, {
        filledAt: firestore_1.Timestamp.now(),
        filledTxHash: txHash,
        filledBy
    });
}
exports.markOrderFilled = markOrderFilled;
/**
 * Update order fee tracking
 */
async function updateOrderFees(orderId, updateCount, accumulatedFees) {
    if (!db) {
        const order = mockStorage.orders.get(orderId);
        if (order) {
            order.updateCount = updateCount;
            order.accumulatedFees = accumulatedFees;
            order.updatedAt = firestore_1.Timestamp.now();
        }
        return;
    }
    try {
        await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, firebase_config_1.COLLECTIONS.ORDERS, orderId), {
            updateCount,
            accumulatedFees,
            updatedAt: firestore_1.Timestamp.now()
        }, { merge: true });
    }
    catch (error) {
        console.error('Error updating order fees:', error);
    }
}
exports.updateOrderFees = updateOrderFees;
/**
 * Subscribe to active orders (real-time updates)
 */
function subscribeToActiveOrders(callback) {
    if (!db) {
        // For mock mode, just call with current orders
        const mockOrders = Array.from(mockStorage.orders.values())
            .filter(order => order.status === firebase_config_1.OrderStatus.ACTIVE);
        callback(mockOrders);
        return () => { };
    }
    const q = (0, firestore_1.query)((0, firestore_1.collection)(db, firebase_config_1.COLLECTIONS.ORDERS), (0, firestore_1.where)('status', '==', firebase_config_1.OrderStatus.ACTIVE));
    const unsubscribe = (0, firestore_1.onSnapshot)(q, (snapshot) => {
        const orders = snapshot.docs.map(doc => doc.data());
        callback(orders);
    }, (error) => {
        console.error('Error in order subscription:', error);
        callback([]);
    });
    return unsubscribe;
}
exports.subscribeToActiveOrders = subscribeToActiveOrders;
/**
 * Save predicate configuration (for tracking)
 */
async function savePredicateConfig(predicateId, config) {
    const predicateData = {
        predicateId,
        ...config,
        createdAt: firestore_1.Timestamp.now(),
        lastChecked: firestore_1.Timestamp.now(),
        lastResult: false,
        checkCount: 0
    };
    if (!db) {
        console.log('Mock: Predicate saved locally:', predicateData);
        mockStorage.predicates.set(predicateId, predicateData);
        return;
    }
    try {
        await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, firebase_config_1.COLLECTIONS.PREDICATES, predicateId), predicateData);
        console.log('Predicate config saved:', predicateId);
    }
    catch (error) {
        console.error('Error saving predicate config:', error);
        mockStorage.predicates.set(predicateId, predicateData);
    }
}
exports.savePredicateConfig = savePredicateConfig;
/**
 * Get predicate configuration
 */
async function getPredicateConfig(predicateId) {
    if (!db) {
        return mockStorage.predicates.get(predicateId) || null;
    }
    try {
        const docRef = (0, firestore_1.doc)(db, firebase_config_1.COLLECTIONS.PREDICATES, predicateId);
        const docSnap = await (0, firestore_1.getDoc)(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        else {
            return null;
        }
    }
    catch (error) {
        console.error('Error fetching predicate config:', error);
        return null;
    }
}
exports.getPredicateConfig = getPredicateConfig;
/**
 * Update predicate check result
 */
async function updatePredicateResult(predicateId, result, checkCount) {
    const updates = {
        lastChecked: firestore_1.Timestamp.now(),
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
        await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, firebase_config_1.COLLECTIONS.PREDICATES, predicateId), updates, { merge: true });
    }
    catch (error) {
        console.error('Error updating predicate result:', error);
    }
}
exports.updatePredicateResult = updatePredicateResult;
/**
 * Get all active predicates for monitoring
 */
async function getActivePredicates() {
    if (!db) {
        return Array.from(mockStorage.predicates.values());
    }
    try {
        const snapshot = await (0, firestore_1.getDocs)((0, firestore_1.collection)(db, firebase_config_1.COLLECTIONS.PREDICATES));
        return snapshot.docs.map(doc => doc.data());
    }
    catch (error) {
        console.error('Error fetching predicates:', error);
        return [];
    }
}
exports.getActivePredicates = getActivePredicates;
