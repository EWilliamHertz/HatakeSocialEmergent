'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Package, Truck, Shield, Mail, Loader2, X, CheckCircle, MapPin } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  gallery_images?: string[];
  features: string[];
  category: string;
  stock: number;
}

// Default products if database is empty
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'toploader-35pt',
    name: '35pt Toploader *25',
    description: 'Hatake TCG 35pt Top-Loaders provide superior protection for your most valuable standard-sized trading cards.',
    price: 30.00,
    currency: 'SEK',
    image: 'https://images.unsplash.com/photo-1612404730960-5c71577fca11?w=400',
    features: ['Clear SKU + product info', 'Bulk-import friendly', 'Shipped from Sweden'],
    category: 'Protection',
    stock: 100
  },
  {
    id: 'playmat',
    name: 'Playmat',
    description: 'Premium quality playmat for comfortable gaming sessions. Designed with TCG players in mind.',
    price: 129.00,
    currency: 'SEK',
    image: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400',
    features: ['Clear SKU + product info', 'Bulk-import friendly', 'Shipped from Sweden'],
    category: 'Accessories',
    stock: 50
  },
  {
    id: 'duffel-bag',
    name: 'Duffel Bag',
    description: 'The Hatake TCG Duffel Bag is the ultimate tournament companion, designed specifically for TCG players who demand both functionality and style. With dimensions of 47*28*55cm, this spacious bag provides ample room for all your gaming essentials.',
    price: 300.00,
    currency: 'SEK',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    features: ['Clear SKU + product info', 'Bulk-import friendly', 'Shipped from Sweden'],
    category: 'Bags',
    stock: 25
  },
  {
    id: 'deckbox-susanoo',
    name: 'Deckbox, Susanoo',
    description: 'The Hatake TCG PU DeckBox combines elegant Nordic design with practical functionality. With a generous 160+ card capacity and secure magnetic closure, this premium deck box keeps your valuable cards protected in style.',
    price: 300.00,
    currency: 'SEK',
    image: 'https://images.unsplash.com/photo-1627634777217-c864268db30c?w=400',
    features: ['Clear SKU + product info', 'Bulk-import friendly', 'Shipped from Sweden'],
    category: 'Storage',
    stock: 40
  },
  {
    id: 'binder-480',
    name: '480 Slot Top-loader Binder',
    description: 'Premium binder with 480 slots designed specifically for top-loaded cards. Perfect for showcasing your collection.',
    price: 360.00,
    currency: 'SEK',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400',
    features: ['Clear SKU + product info', 'Bulk-import friendly', 'Shipped from Sweden'],
    category: 'Storage',
    stock: 30
  },
  {
    id: 'toploader-130pt',
    name: '130pt Toploader *10',
    description: 'Heavy-duty 130pt toploaders for thicker cards, graded card protection, and patch cards.',
    price: 35.00,
    currency: 'SEK',
    image: 'https://images.unsplash.com/photo-1612404730960-5c71577fca11?w=400',
    features: ['Clear SKU + product info', 'Bulk-import friendly', 'Shipped from Sweden'],
    category: 'Protection',
    stock: 80
  },
];

const categories = ['All', 'Protection', 'Storage', 'Accessories', 'Bags'];

export default function ShopPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<{ id: string; quantity: number }[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Checkout state
  const [showCheckout, setShowCheckout] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [checkoutNotes, setCheckoutNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadProducts();
    // Try to get logged-in user's email
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          setCurrentUser(data.user);
          setCheckoutEmail(data.user.email || '');
        }
      })
      .catch(() => {});
  }, []);

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/shop');
      const data = await res.json();
      if (data.success && data.products.length > 0) {
        setProducts(data.products);
      } else {
        setProducts(DEFAULT_PRODUCTS);
      }
    } catch (error) {
      console.error('Load products error:', error);
      setProducts(DEFAULT_PRODUCTS);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.category === selectedCategory);

  const renderDescription = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === productId);
      if (existing) {
        return prev.map(item =>
          item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.id);
    return sum + (product?.price || 0) * item.quantity;
  }, 0);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const submitOrder = async () => {
    if (!checkoutEmail) return;
    setSubmitting(true);
    try {
      const items = cart.map(item => {
        const product = products.find(p => p.id === item.id)!;
        return { id: item.id, name: product.name, quantity: item.quantity, price: product.price };
      });

      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          items,
          totalAmount: cartTotal,
          email: checkoutEmail,
          shippingAddress: checkoutAddress,
          notes: checkoutNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOrderSuccess(data.order_id);
        setCart([]);
        setShowCheckout(false);
      } else {
        alert(data.error || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="https://i.imgur.com/B06rBhI.png"
              alt="Hatake.Social Logo"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="font-bold text-xl text-gray-900 dark:text-white">Hatake.Social Shop</span>
          </Link>
          <div className="relative">
            <button
              onClick={() => cartCount > 0 && setShowCheckout(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>{cartCount > 0 ? `${cartCount} items` : 'Cart'}</span>
            </button>
            {cartCount > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Hatake TCG Merch</h1>
          <p className="text-xl opacity-90 mb-8">
            Premium TCG accessories sourced and shipped directly from Sweden
          </p>
          <div className="flex flex-wrap gap-6 justify-center text-sm">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              <span>Quality Products</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              <span>EU Shipping</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span>Secure Checkout</span>
            </div>
          </div>
        </div>
      </section>

      {/* Order Success Banner */}
      {orderSuccess && (
        <div className="container mx-auto px-4 pt-6">
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">Order placed successfully! 🌿</p>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                Your order <strong>{orderSuccess}</strong> has been received. Check your email for a confirmation — we'll be in touch shortly with payment details.
              </p>
            </div>
            <button onClick={() => setOrderSuccess(null)} className="ml-auto text-green-600 hover:text-green-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 rounded-full font-medium transition ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
              data-testid={`category-${category.toLowerCase()}`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading products...</p>
          </div>
        ) : (
          /* Products Grid */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                data-testid={`product-${product.id}`}
                onClick={() => { setSelectedProduct(product); setGalleryIndex(0); }}
              >
                <div className="h-48 relative bg-gray-100 dark:bg-gray-700">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{product.name}</h3>
                    <span className="text-blue-600 dark:text-blue-400 font-bold whitespace-nowrap ml-2">
                      {product.currency} {product.price.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
                    {renderDescription(product.description)}
                  </p>
                  <div className="space-y-2 mb-4">
                    {product.features?.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                        {feature}
                      </div>
                    ))}
                  </div>
                  {product.stock !== undefined && (
                    <p className={`text-xs mb-3 ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </p>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); addToCart(product.id); }}
                    disabled={product.stock === 0}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid={`add-to-cart-${product.id}`}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Wholesale Section */}
        <section className="mt-16 bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Wholesale Inquiries
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-center mb-8 max-w-2xl mx-auto">
            If you're a store or distributor, contact us for wholesale pricing (60-80% of retail).
            Final pricing depends on delivery address and order quantities.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Pick SKUs + quantities</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Build a short list from our catalogue.</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-purple-600 dark:text-purple-400 font-bold">2</span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Send inquiry</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Include destination + timing details.</p>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 dark:text-green-400 font-bold">3</span>
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">We confirm lead time</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">We reply with a quote + dispatch window.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <a
              href="mailto:ernst@hatake.eu?subject=Wholesale Inquiry"
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Mail className="w-5 h-5" />
              Contact for Wholesale
            </a>
          </div>
        </section>
      </div>

      {/* Cart Summary (Fixed) */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 right-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-80 border border-gray-200 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white mb-4">Cart Summary</h3>
          <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
            {cart.map(item => {
              const product = products.find(p => p.id === item.id);
              if (!product) return null;
              return (
                <div key={item.id} className="flex justify-between text-sm items-center">
                  <span className="text-gray-600 dark:text-gray-300 flex-1 truncate">{product.name} ×{item.quantity}</span>
                  <span className="text-gray-900 dark:text-white ml-2">{(product.price * item.quantity).toFixed(2)}</span>
                  <button onClick={() => removeFromCart(item.id)} className="ml-2 text-gray-400 hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-between font-bold mb-4">
              <span className="text-gray-900 dark:text-white">Total</span>
              <span className="text-blue-600">SEK {cartTotal.toFixed(2)}</span>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-4 h-4" />
              Place Order
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 mt-16">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="https://i.imgur.com/B06rBhI.png"
                alt="Hatake.Social Logo"
                width={40}
                height={40}
                className="rounded-lg"
              />
              <span className="font-bold text-xl">Hatake.Social</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/" className="hover:text-white transition">Home</Link>
              <Link href="/shop" className="hover:text-white transition">Shop</Link>
              <Link href="/feed" className="hover:text-white transition">Community</Link>
              <Link href="/about" className="hover:text-white transition">About</Link>
            </div>
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} Hatake.Social. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Complete your order</h3>
              <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Order summary */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2">
                {cart.map(item => {
                  const product = products.find(p => p.id === item.id);
                  if (!product) return null;
                  return (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">{product.name} ×{item.quantity}</span>
                      <span className="text-gray-900 dark:text-white font-medium">SEK {(product.price * item.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="border-t dark:border-gray-600 pt-2 flex justify-between font-bold">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-blue-600">SEK {cartTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email address *
                </label>
                <input
                  type="email"
                  value={checkoutEmail}
                  onChange={e => setCheckoutEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Shipping address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Shipping address
                </label>
                <textarea
                  value={checkoutAddress}
                  onChange={e => setCheckoutAddress(e.target.value)}
                  placeholder="Street address, city, postal code, country"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={checkoutNotes}
                  onChange={e => setCheckoutNotes(e.target.value)}
                  placeholder="Any special requests..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Payment info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm">
                <p className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Payment</p>
                <p className="text-blue-700 dark:text-blue-400 text-xs leading-relaxed">
                  After placing your order, we'll email you payment details. Pay via <strong>Swish 123-587 57 37</strong>, <strong>Bankgiro 5051-0031</strong>, or bank transfer. Include your Order ID in the payment message.
                </p>
              </div>
            </div>

            <div className="p-6 border-t dark:border-gray-700">
              <button
                onClick={submitOrder}
                disabled={submitting || !checkoutEmail}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ShoppingCart className="w-5 h-5" />
                )}
                {submitting ? 'Placing order...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid md:grid-cols-2">
              {/* Image Gallery */}
              <div className="bg-gray-100 dark:bg-gray-700 p-6">
                <div className="aspect-square relative rounded-xl overflow-hidden mb-4">
                  {(() => {
                    const allImages = [selectedProduct.image, ...(selectedProduct.gallery_images || [])].filter(Boolean);
                    const currentImage = allImages[galleryIndex] || selectedProduct.image;
                    return currentImage ? (
                      <Image
                        src={currentImage}
                        alt={selectedProduct.name}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-24 h-24 text-gray-300" />
                      </div>
                    );
                  })()}
                </div>
                {(() => {
                  const allImages = [selectedProduct.image, ...(selectedProduct.gallery_images || [])].filter(Boolean);
                  return allImages.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {allImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setGalleryIndex(idx)}
                          className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition ${
                            galleryIndex === idx
                              ? 'border-blue-500'
                              : 'border-transparent hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <Image
                            src={img}
                            alt={`Gallery ${idx + 1}`}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Product Info */}
              <div className="p-6 flex flex-col">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>

                <span className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">
                  {selectedProduct.category}
                </span>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedProduct.name}
                </h2>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                  {selectedProduct.currency} {selectedProduct.price.toFixed(2)}
                </p>

                <div className="text-gray-600 dark:text-gray-300 mb-6 flex-1">
                  <p className="whitespace-pre-line">{renderDescription(selectedProduct.description)}</p>
                </div>

                {selectedProduct.features && selectedProduct.features.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Features</h3>
                    <div className="space-y-2">
                      {selectedProduct.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t dark:border-gray-700 pt-4">
                  {selectedProduct.stock !== undefined && (
                    <p className={`text-sm mb-4 ${selectedProduct.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedProduct.stock > 0 ? `${selectedProduct.stock} in stock` : 'Out of stock'}
                    </p>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(selectedProduct.id);
                      setSelectedProduct(null);
                    }}
                    disabled={selectedProduct.stock === 0}
                    className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
