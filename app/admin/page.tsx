'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Package, Plus, Edit2, Trash2, Save, X, DollarSign, Image as ImageIcon, ShoppingBag, BarChart3, Users, Settings, TrendingUp, FileText, Layers, MessageCircle, RefreshCw, Search, ChevronLeft, ChevronRight, Upload, ClipboardList, Send, CheckCircle, Truck, Ban } from 'lucide-react';

interface Product {
  id: number;
  product_id: string;
  name: string;
  description: string;
  price_consumer: number;
  price_wholesale_min: number;
  price_wholesale_max: number;
  currency: string;
  image_url: string;
  gallery_images: string[];
  category: string;
  stock_quantity: number;
  sku: string;
  features: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface User {
  user_id: string;
  name: string;
  email: string;
  picture?: string;
  created_at: string;
  isAdmin: boolean;
  isOrganizer: boolean;
  stats: {
    posts: number;
    decks: number;
    cards: number;
  };
}

interface Order {
  id: number;
  order_id: string;
  user_id: string | null;
  user_email: string;
  items: any[];
  total_amount: number;
  currency: string;
  status: string;
  shipping_address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Stats {
  users: number;
  posts: number;
  decks: number;
  collections: number;
  trades: number;
  groups: number;
}

const ADMIN_EMAILS = ['zudran@gmail.com', 'ernst@hatake.eu'];
const CATEGORIES = ['Protection', 'Storage', 'Accessories', 'Bags', 'Other'];

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' },
  payment_details_sent: { label: 'Awaiting Payment', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'shop' | 'orders' | 'analytics' | 'users' | 'settings'>('shop');

  // Shop state
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderAction, setOrderAction] = useState<string | null>(null); // order_id being actioned

  // Analytics state
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAdmin && activeTab === 'analytics') loadStats();
    if (isAdmin && activeTab === 'users') loadUsers();
    if (isAdmin && activeTab === 'orders') loadOrders();
  }, [isAdmin, activeTab]);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) { router.push('/auth/login'); return; }
      const data = await res.json();
      setUserEmail(data.user.email);
      if (ADMIN_EMAILS.includes(data.user.email) || data.user.is_admin) {
        setIsAdmin(true);
        loadProducts();
      } else {
        setIsAdmin(false);
      }
    } catch (error) {
      router.push('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/admin/shop', { credentials: 'include' });
      const data = await res.json();
      if (data.success) setProducts(data.products || []);
    } catch (error) {
      console.error('Load products error:', error);
    }
  };

  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const url = orderStatusFilter !== 'all'
        ? `/api/admin/orders?status=${orderStatusFilter}`
        : '/api/admin/orders';
      const res = await fetch(url, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setOrders(data.orders || []);
    } catch (error) {
      console.error('Load orders error:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleOrderAction = async (order_id: string, action: string, status?: string) => {
    setOrderAction(order_id);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ order_id, action, status }),
      });
      const data = await res.json();
      if (data.success) {
        loadOrders();
        if (action === 'send_payment') alert(`Payment details sent to ${orders.find(o => o.order_id === order_id)?.user_email}`);
      } else {
        alert(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Order action error:', error);
      alert('Action failed');
    } finally {
      setOrderAction(null);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRecentUsers(data.recentUsers || []);
        setRecentPosts(data.recentPosts || []);
      }
    } catch (error) {
      console.error('Load stats error:', error);
    }
  };

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams({ page: usersPage.toString(), limit: '20', ...(usersSearch && { search: usersSearch }) });
      const res = await fetch(`/api/admin/users?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) { setUsers(data.users || []); setUsersTotalPages(data.totalPages || 1); }
    } catch (error) {
      console.error('Load users error:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This will remove all their data.`)) return;
    try {
      const res = await fetch(`/api/admin/users?user_id=${userId}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) { loadUsers(); loadStats(); } else { alert(data.error || 'Failed to delete user'); }
    } catch (error) { console.error('Delete user error:', error); }
  };

  const toggleAdmin = async (userId: string, userName: string, currentIsAdmin: boolean) => {
    const action = currentIsAdmin ? 'remove admin privileges from' : 'make admin';
    if (!confirm(`Are you sure you want to ${action} "${userName}"?`)) return;
    try {
      const res = await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ user_id: userId, is_admin: !currentIsAdmin }) });
      const data = await res.json();
      if (data.success) { loadUsers(); alert(`${userName} ${currentIsAdmin ? 'is no longer an admin' : 'is now an admin'}`); } else { alert(data.error || 'Failed to update admin status'); }
    } catch (error) { console.error('Toggle admin error:', error); }
  };

  const toggleOrganizer = async (userId: string, userName: string, currentIsOrganizer: boolean) => {
    const action = currentIsOrganizer ? 'remove organizer role from' : 'make organizer';
    if (!confirm(`Are you sure you want to ${action} "${userName}"?`)) return;
    try {
      const res = await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ user_id: userId, is_organizer: !currentIsOrganizer }) });
      const data = await res.json();
      if (data.success) { loadUsers(); alert(`${userName} ${currentIsOrganizer ? 'is no longer an organizer' : 'is now an organizer'}`); } else { alert(data.error || 'Failed to update organizer status'); }
    } catch (error) { console.error('Toggle organizer error:', error); }
  };

  const deletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      const res = await fetch(`/api/admin/posts?post_id=${postId}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) { loadStats(); alert('Post deleted successfully'); } else { alert(data.error || 'Failed to delete post'); }
    } catch (error) { console.error('Delete post error:', error); }
  };

  const openNewProduct = () => {
    setEditingProduct({ product_id: `prod_${Date.now()}`, name: '', description: '', price_consumer: 0, price_wholesale_min: 0, price_wholesale_max: 0, currency: 'SEK', image_url: '', category: 'Protection', stock_quantity: 0, sku: '', features: [], active: true });
    setShowProductModal(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct({ ...product });
    setGalleryImages(product.gallery_images || []);
    setShowProductModal(true);
  };

  const saveProduct = async () => {
    if (!editingProduct) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/shop', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(editingProduct) });
      const data = await res.json();
      if (data.success) { loadProducts(); setShowProductModal(false); setEditingProduct(null); } else { alert(data.error || 'Failed to save product'); }
    } catch (error) { console.error('Save product error:', error); alert('Failed to save product'); } finally { setSaving(false); }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/admin/shop?product_id=${productId}`, { method: 'DELETE', credentials: 'include' });
      const data = await res.json();
      if (data.success) { loadProducts(); } else { alert(data.error || 'Failed to delete product'); }
    } catch (error) { console.error('Delete product error:', error); }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isGallery: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: formData });
      const data = await res.json();
      if (data.success && data.url) {
        if (isGallery) { setGalleryImages(prev => [...prev, data.url]); setEditingProduct(prev => prev ? { ...prev, gallery_images: [...(prev.gallery_images || []), data.url] } : null); }
        else { setEditingProduct(prev => prev ? { ...prev, image_url: data.url } : null); }
      } else { alert('Failed to upload image'); }
    } catch (error) { console.error('Upload error:', error); alert('Failed to upload image'); } finally { setUploadingImage(false); }
  };

  const handleMultipleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingImage(true);
    const uploadedUrls: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: formData });
        const data = await res.json();
        if (data.success && data.url) uploadedUrls.push(data.url);
      }
      if (uploadedUrls.length > 0) { setGalleryImages(prev => [...prev, ...uploadedUrls]); setEditingProduct(prev => prev ? { ...prev, gallery_images: [...(prev.gallery_images || []), ...uploadedUrls] } : null); }
      if (uploadedUrls.length < files.length) alert(`Uploaded ${uploadedUrls.length} of ${files.length} images. Some failed.`);
    } catch (error) { console.error('Upload error:', error); alert('Failed to upload images'); } finally { setUploadingImage(false); e.target.value = ''; }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages(prev => prev.filter((_, i) => i !== index));
    setEditingProduct(prev => prev ? { ...prev, gallery_images: (prev.gallery_images || []).filter((_, i) => i !== index) } : null);
  };

  const filteredOrders = orderStatusFilter === 'all' ? orders : orders.filter(o => o.status === orderStatusFilter);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 max-w-md mx-auto shadow-lg">
            <Settings className="w-16 h-16 text-gray-300 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">You don't have permission to access the admin panel.</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">Logged in as: {userEmail}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Panel</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your shop, orders, users, and analytics</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm overflow-x-auto">
          {[
            { id: 'shop', label: 'Shop Inventory', icon: ShoppingBag },
            { id: 'orders', label: 'Orders', icon: ClipboardList },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-shrink-0 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
              {tab.id === 'orders' && orders.filter(o => o.status === 'pending').length > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {orders.filter(o => o.status === 'pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Shop Inventory Tab */}
        {activeTab === 'shop' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shop Products</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Manage your TCG merchandise inventory</p>
              </div>
              <button onClick={openNewProduct} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2">
                <Plus className="w-5 h-5" />Add Product
              </button>
            </div>

            {products.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No products yet</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Add your first product to get started</p>
                <button onClick={openNewProduct} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">Add Product</button>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Consumer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Wholesale</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {products.map(product => (
                        <tr key={product.product_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {(product.image_url || (product.gallery_images && product.gallery_images.length > 0)) ? (
                                <img src={product.image_url || product.gallery_images[0]} alt={product.name} className="w-12 h-12 object-cover rounded-lg" />
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center"><ImageIcon className="w-6 h-6 text-gray-400" /></div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{product.sku || product.product_id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4"><span className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded">{product.category}</span></td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white font-medium">{product.currency} {Number(product.price_consumer).toFixed(2)}</td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">{product.price_wholesale_min && product.price_wholesale_max ? `${Number(product.price_wholesale_min).toFixed(0)}-${Number(product.price_wholesale_max).toFixed(0)}` : '-'}</td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white">{product.stock_quantity}</td>
                          <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-medium ${product.active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' : 'bg-gray-100 text-gray-600'}`}>{product.active ? 'Active' : 'Inactive'}</span></td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => openEditProduct(product)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg"><Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" /></button>
                              <button onClick={() => deleteProduct(product.product_id)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="w-4 h-4 text-red-600" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Orders</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">{orders.length} total orders</p>
              </div>
              <button onClick={loadOrders} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Refresh
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
              {['all', 'pending', 'payment_details_sent', 'paid', 'shipped', 'cancelled'].map(s => (
                <button
                  key={s}
                  onClick={() => { setOrderStatusFilter(s); }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                    orderStatusFilter === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {s === 'all' ? 'All' : ORDER_STATUS_CONFIG[s]?.label || s}
                  {s !== 'all' && orders.filter(o => o.status === s).length > 0 && (
                    <span className="ml-1.5 text-xs opacity-70">({orders.filter(o => o.status === s).length})</span>
                  )}
                </button>
              ))}
            </div>

            {loadingOrders ? (
              <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center">
                <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No orders yet</h3>
                <p className="text-gray-600 dark:text-gray-400">Orders from your shop will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(order => {
                  const items = Array.isArray(order.items) ? order.items : [];
                  const statusCfg = ORDER_STATUS_CONFIG[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-600' };
                  const isActioning = orderAction === order.order_id;

                  return (
                    <div key={order.order_id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {/* Order Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-gray-900 dark:text-white">{order.order_id}</span>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusCfg.color}`}>{statusCfg.label}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <span>{order.user_email}</span>
                          <span>{new Date(order.created_at).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span className="font-bold text-gray-900 dark:text-white">SEK {Number(order.total_amount).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Order Items */}
                      <div className="px-6 py-4">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {items.map((item: any, idx: number) => (
                            <span key={idx} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
                              {item.name} ×{item.quantity}
                            </span>
                          ))}
                        </div>
                        {order.shipping_address && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">📍 {order.shipping_address}</p>
                        )}
                        {order.notes && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 italic">💬 {order.notes}</p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleOrderAction(order.order_id, 'send_payment')}
                            disabled={isActioning}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                            {isActioning ? 'Sending...' : 'Send Payment Details'}
                          </button>
                        )}
                        {order.status === 'payment_details_sent' && (
                          <button
                            onClick={() => handleOrderAction(order.order_id, 'update', 'paid')}
                            disabled={isActioning}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Mark as Paid
                          </button>
                        )}
                        {order.status === 'paid' && (
                          <button
                            onClick={() => handleOrderAction(order.order_id, 'update', 'shipped')}
                            disabled={isActioning}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
                          >
                            <Truck className="w-4 h-4" />
                            Mark as Shipped
                          </button>
                        )}
                        {/* Re-send payment for awaiting payment status */}
                        {order.status === 'payment_details_sent' && (
                          <button
                            onClick={() => handleOrderAction(order.order_id, 'send_payment')}
                            disabled={isActioning}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                            Resend Payment Details
                          </button>
                        )}
                        {order.status !== 'cancelled' && order.status !== 'shipped' && (
                          <button
                            onClick={() => { if (confirm('Cancel this order?')) handleOrderAction(order.order_id, 'update', 'cancelled'); }}
                            disabled={isActioning}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition disabled:opacity-50 ml-auto"
                          >
                            <Ban className="w-4 h-4" />
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Users', value: stats?.users, icon: Users, color: 'blue' },
                { label: 'Posts', value: stats?.posts, icon: FileText, color: 'purple' },
                { label: 'Decks', value: stats?.decks, icon: Layers, color: 'green' },
                { label: 'Cards', value: stats?.collections, icon: Package, color: 'orange' },
                { label: 'Trades', value: stats?.trades, icon: RefreshCw, color: 'pink' },
                { label: 'Groups', value: stats?.groups, icon: MessageCircle, color: 'teal' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                  <div className={`w-10 h-10 bg-${color}-100 dark:bg-${color}-900/30 rounded-lg flex items-center justify-center mb-3`}>
                    <Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{value || 0}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><Users className="w-5 h-5" /> Recent Users</h3>
                <div className="space-y-3">
                  {recentUsers.length > 0 ? recentUsers.map((user: any) => (
                    <div key={user.user_id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
                      {user.picture ? <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center"><span className="text-blue-600 dark:text-blue-400 font-medium">{user.name?.charAt(0)}</span></div>}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>
                  )) : <p className="text-gray-500 dark:text-gray-400 text-center py-4">No users yet</p>}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5" /> Recent Posts</h3>
                <div className="space-y-3">
                  {recentPosts.length > 0 ? recentPosts.map((post: any) => (
                    <div key={post.post_id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {post.picture ? <img src={post.picture} alt={post.name} className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center"><span className="text-blue-600 dark:text-blue-400 text-xs font-medium">{post.name?.charAt(0)}</span></div>}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{post.name}</span>
                        </div>
                        <button onClick={() => deletePost(post.post_id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded" title="Delete post"><Trash2 className="w-4 h-4 text-red-500" /></button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{post.content}</p>
                    </div>
                  )) : <p className="text-gray-500 dark:text-gray-400 text-center py-4">No posts yet</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" value={usersSearch} onChange={(e) => setUsersSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadUsers()} placeholder="Search users by name or email..." className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg" />
              </div>
              <button onClick={loadUsers} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">Search</button>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              {loadingUsers ? (
                <div className="p-12 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Posts</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Decks</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Cards</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {users.map(user => (
                        <tr key={user.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {user.picture ? <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" /> : <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center"><span className="text-blue-600 dark:text-blue-400 font-medium">{user.name?.charAt(0)}</span></div>}
                              <span className="font-medium text-gray-900 dark:text-white">{user.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{user.email}</td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white">{user.stats.posts}</td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white">{user.stats.decks}</td>
                          <td className="px-6 py-4 text-gray-900 dark:text-white">{user.stats.cards}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${user.isAdmin ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'}`}>{user.isAdmin ? 'Admin' : 'User'}</span>
                              {user.isOrganizer && <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">Organizer</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => toggleAdmin(user.user_id, user.name, user.isAdmin)} className={`px-3 py-1 rounded text-xs font-medium ${user.isAdmin ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 hover:bg-yellow-200' : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 hover:bg-purple-200'}`}>{user.isAdmin ? 'Remove Admin' : 'Make Admin'}</button>
                              <button onClick={() => toggleOrganizer(user.user_id, user.name, user.isOrganizer)} className={`px-3 py-1 rounded text-xs font-medium ${user.isOrganizer ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200' : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 hover:bg-orange-200'}`}>{user.isOrganizer ? 'Remove Organizer' : 'Make Organizer'}</button>
                              {!ADMIN_EMAILS.includes(user.email) && <button onClick={() => deleteUser(user.user_id, user.name)} className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg" title="Delete user"><Trash2 className="w-4 h-4 text-red-600" /></button>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {usersTotalPages > 1 && (
                <div className="px-6 py-4 border-t dark:border-gray-700 flex items-center justify-between">
                  <button onClick={() => { setUsersPage(p => Math.max(1, p - 1)); loadUsers(); }} disabled={usersPage === 1} className="flex items-center gap-1 px-3 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"><ChevronLeft className="w-4 h-4" /> Previous</button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Page {usersPage} of {usersTotalPages}</span>
                  <button onClick={() => { setUsersPage(p => Math.min(usersTotalPages, p + 1)); loadUsers(); }} disabled={usersPage === usersTotalPages} className="flex items-center gap-1 px-3 py-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50">Next <ChevronRight className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Admin Accounts</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">These email addresses have admin access:</p>
              <ul className="space-y-2">
                {ADMIN_EMAILS.map(email => (
                  <li key={email} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center"><span className="text-purple-600 dark:text-purple-400 text-sm font-medium">{email.charAt(0).toUpperCase()}</span></div>
                    <span className="text-gray-900 dark:text-white">{email}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">Platform Info</h3>
              <div className="space-y-3">
                {[['Platform', 'Hatake.Social'], ['Framework', 'Next.js 15'], ['Database', 'PostgreSQL (Neon)'], ['Card APIs', 'Scryfall, TCGdex']].map(([label, value]) => (
                  <div key={label} className="flex justify-between py-2 border-b dark:border-gray-700 last:border-0">
                    <span className="text-gray-600 dark:text-gray-400">{label}</span>
                    <span className="text-gray-900 dark:text-white font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showProductModal && editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold dark:text-white">{editingProduct.id ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => { setShowProductModal(false); setEditingProduct(null); setGalleryImages([]); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name *</label>
                  <input type="text" value={editingProduct.name || ''} onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg" placeholder="e.g., 35pt Toploader *25" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (use **bold** for emphasis)</label>
                  <textarea value={editingProduct.description || ''} onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg font-mono text-sm" placeholder="Product description..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Consumer Price *</label>
                  <div className="flex gap-2">
                    <select value={editingProduct.currency || 'SEK'} onChange={(e) => setEditingProduct({ ...editingProduct, currency: e.target.value })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg">
                      <option value="SEK">SEK</option><option value="EUR">EUR</option><option value="USD">USD</option>
                    </select>
                    <input type="number" step="0.01" value={editingProduct.price_consumer || ''} onChange={(e) => setEditingProduct({ ...editingProduct, price_consumer: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg" placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Wholesale (60-80%)</label>
                  <div className="flex gap-2">
                    <input type="number" step="0.01" value={editingProduct.price_wholesale_min || ''} onChange={(e) => setEditingProduct({ ...editingProduct, price_wholesale_min: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg" placeholder="Min" />
                    <input type="number" step="0.01" value={editingProduct.price_wholesale_max || ''} onChange={(e) => setEditingProduct({ ...editingProduct, price_wholesale_max: parseFloat(e.target.value) || 0 })} className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg" placeholder="Max" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select value={editingProduct.category || 'Protection'} onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg">
                    {CATEGORIES.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock</label>
                  <input type="number" value={editingProduct.stock_quantity || 0} onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU</label>
                  <input type="text" value={editingProduct.sku || ''} onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg" placeholder="e.g., TL-35-25" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Main Product Image</label>
                  <div className="flex items-start gap-4">
                    {editingProduct.image_url ? (
                      <div className="relative"><img src={editingProduct.image_url} alt="Product" className="w-24 h-24 object-cover rounded-lg" /><button onClick={() => setEditingProduct({ ...editingProduct, image_url: '' })} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"><X className="w-3 h-3" /></button></div>
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center"><ImageIcon className="w-8 h-8 text-gray-400" /></div>
                    )}
                    <div className="flex-1">
                      <input type="url" value={editingProduct.image_url || ''} onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg mb-2" placeholder="Image URL or upload below" />
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
                        <Upload className="w-4 h-4" /><span className="text-sm">{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} className="hidden" disabled={uploadingImage} />
                      </label>
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gallery Images</label>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {galleryImages.map((img, idx) => (
                      <div key={idx} className="relative"><img src={img} alt={`Gallery ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg" /><button onClick={() => removeGalleryImage(idx)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"><X className="w-3 h-3" /></button></div>
                    ))}
                    <label className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      <Plus className="w-6 h-6 text-gray-400" /><span className="text-xs text-gray-500">Add</span>
                      <input type="file" accept="image/*" multiple onChange={(e) => handleMultipleImageUpload(e)} className="hidden" disabled={uploadingImage} />
                    </label>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={editingProduct.active} onChange={(e) => setEditingProduct({ ...editingProduct, active: e.target.checked })} className="rounded" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active (visible in shop)</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="p-6 border-t dark:border-gray-700 flex justify-end gap-3">
              <button onClick={() => { setShowProductModal(false); setEditingProduct(null); setGalleryImages([]); }} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Cancel</button>
              <button onClick={saveProduct} disabled={saving || !editingProduct.name || !editingProduct.price_consumer} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
