"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getActivePredicates = exports.updatePredicateResult = exports.getPredicateConfig = exports.savePredicateConfig = exports.subscribeToActiveOrders = exports.updateOrderFees = exports.markOrderFilled = exports.updateOrderStatus = exports.getOrdersByPredicate = exports.getOrdersByMaker = exports.getActiveOrders = exports.saveOrder = void 0;
const app_1 = require("firebase/app");
const database_1 = require("firebase/database");
const firebase_config_1 = require("./firebase-config");
/**
 * Firebase Realtime Database Service for TriggerFi
 *
 * This service uses Firebase Realtime Database (not Firestore)
 * to store orders and predicate configurations.
 */
// Initialize Firebase
let app = null;
let db = null;
try {
    app = (0, app_1.initializeApp)(firebase_config_1.firebaseConfig);
    db = (0, database_1.getDatabase)(app);
    console.log('Firebase Realtime Database initialized successfully');
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
 * Save a new order to Realtime Database
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
        const ordersRef = (0, database_1.ref)(db, `orders/${orderId}`);
        await (0, database_1.set)(ordersRef, orderData);
        console.log('Order saved to Firebase Realtime Database:', orderId);
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
        const ordersRef = (0, database_1.ref)(db, 'orders');
        const snapshot = await (0, database_1.get)(ordersRef);
        if (!snapshot.exists()) {
            return [];
        }
        const orders = [];
        snapshot.forEach((childSnapshot) => {
            const order = childSnapshot.val();
            if (order.status === firebase_config_1.OrderStatus.ACTIVE) {
                orders.push(order);
            }
        });
        return orders.sort((a, b) => b.createdAt - a.createdAt);
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
            .sort((a, b) => b.createdAt - a.createdAt);
        return mockOrders;
    }
    try {
        const ordersRef = (0, database_1.ref)(db, 'orders');
        const snapshot = await (0, database_1.get)(ordersRef);
        if (!snapshot.exists()) {
            return [];
        }
        const orders = [];
        snapshot.forEach((childSnapshot) => {
            const order = childSnapshot.val();
            if (order.maker.toLowerCase() === makerAddress.toLowerCase()) {
                orders.push(order);
            }
        });
        return orders.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
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
        const ordersRef = (0, database_1.ref)(db, 'orders');
        const snapshot = await (0, database_1.get)(ordersRef);
        if (!snapshot.exists()) {
            return [];
        }
        const orders = [];
        snapshot.forEach((childSnapshot) => {
            const order = childSnapshot.val();
            if (order.predicateId === predicateId && order.status === firebase_config_1.OrderStatus.ACTIVE) {
                orders.push(order);
            }
        });
        return orders;
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
        const orderRef = (0, database_1.ref)(db, `orders/${orderId}`);
        const snapshot = await (0, database_1.get)(orderRef);
        if (snapshot.exists()) {
            const currentOrder = snapshot.val();
            await (0, database_1.set)(orderRef, { ...currentOrder, ...updates });
            console.log('Order status updated:', orderId, status);
        }
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
        filledAt: Date.now(),
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
            order.updatedAt = Date.now();
        }
        return;
    }
    try {
        const orderRef = (0, database_1.ref)(db, `orders/${orderId}`);
        const snapshot = await (0, database_1.get)(orderRef);
        if (snapshot.exists()) {
            const currentOrder = snapshot.val();
            await (0, database_1.set)(orderRef, {
                ...currentOrder,
                updateCount,
                accumulatedFees,
                updatedAt: Date.now()
            });
        }
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
    const ordersRef = (0, database_1.ref)(db, 'orders');
    const listener = (0, database_1.onValue)(ordersRef, (snapshot) => {
        const orders = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const order = childSnapshot.val();
                if (order.status === firebase_config_1.OrderStatus.ACTIVE) {
                    orders.push(order);
                }
            });
        }
        callback(orders);
    }, (error) => {
        console.error('Error in order subscription:', error);
        callback([]);
    });
    // Return unsubscribe function
    return () => (0, database_1.off)(ordersRef, 'value', listener);
}
exports.subscribeToActiveOrders = subscribeToActiveOrders;
/**
 * Save predicate configuration (for tracking)
 */
async function savePredicateConfig(predicateId, config) {
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
        const predicateRef = (0, database_1.ref)(db, `predicates/${predicateId}`);
        await (0, database_1.set)(predicateRef, predicateData);
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
        const predicateRef = (0, database_1.ref)(db, `predicates/${predicateId}`);
        const snapshot = await (0, database_1.get)(predicateRef);
        if (snapshot.exists()) {
            return snapshot.val();
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
        const predicateRef = (0, database_1.ref)(db, `predicates/${predicateId}`);
        const snapshot = await (0, database_1.get)(predicateRef);
        if (snapshot.exists()) {
            const currentPredicate = snapshot.val();
            await (0, database_1.set)(predicateRef, { ...currentPredicate, ...updates });
        }
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
        const predicatesRef = (0, database_1.ref)(db, 'predicates');
        const snapshot = await (0, database_1.get)(predicatesRef);
        if (!snapshot.exists()) {
            return [];
        }
        const predicates = [];
        snapshot.forEach((childSnapshot) => {
            predicates.push(childSnapshot.val());
        });
        return predicates;
    }
    catch (error) {
        console.error('Error fetching predicates:', error);
        return [];
    }
}
exports.getActivePredicates = getActivePredicates;
