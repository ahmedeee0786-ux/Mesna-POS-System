import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Products ──────────────────────────────────────────
export const fetchProducts = async () => {
  const { data } = await api.get('/products');
  return data.products;
};

export const processCheckout = async (payload) => {
  const { data } = await api.post('/checkout', payload);
  return data;
};

// ── Admin ─────────────────────────────────────────────
export const adminCreateProduct = async (payload) => {
  const { data } = await api.post('/admin/products', payload);
  return data;
};

export const adminUpdateProduct = async (id, payload) => {
  const { data } = await api.put(`/admin/products/${id}`, payload);
  return data;
};

export const adminDeleteProduct = async (id) => {
  const { data } = await api.delete(`/admin/products/${id}`);
  return data;
};

export const adminRestockProduct = async (id, quantity) => {
  const { data } = await api.patch(`/admin/products/${id}/restock`, { quantity });
  return data;
};

export const fetchCategories = async () => {
  const { data } = await api.get('/admin/categories');
  return data.categories;
};

export const fetchStats = async () => {
  const { data } = await api.get('/admin/stats');
  return data;
};

export const fetchAdminOrders = async () => {
  const { data } = await api.get('/admin/orders');
  return data.orders;
};

export const fetchTopProducts = async () => {
  const { data } = await api.get('/admin/top-products');
  return data.topProducts;
};

export const adminDeleteOrder = async (orderId, adminPin) => {
  const { data } = await api.delete(`/admin/orders/${orderId}`, { data: { adminPin } });
  return data;
};

export const adminEditOrder = async (orderId, payload) => {
  const { data } = await api.put(`/admin/orders/${orderId}`, payload);
  return data;
};

export const verifyAdminPin = async (pin) => {
  const { data } = await api.post('/admin/verify-pin', { pin });
  return data;
};

export const changeAdminPin = async (currentPin, newPin) => {
  const { data } = await api.post('/admin/change-pin', { currentPin, newPin });
  return data;
};

// ── Settings ──────────────────────────────────────────
export const fetchStoreSettings = async () => {
  const { data } = await api.get('/settings');
  return data;
};

export const updateStoreSettings = async (payload) => {
  const { data } = await api.put('/settings', payload);
  return data;
};

export const fetchActiveCashier = async () => {
  const { data } = await api.get('/cashier/active');
  return data;
};

export const updateCashierName = async (cashierId, newName, adminPin) => {
  const { data } = await api.post('/admin/update-cashier', { cashierId, newName, adminPin });
  return data;
};

export default api;
