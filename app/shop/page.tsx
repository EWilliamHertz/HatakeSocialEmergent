'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, Package, Truck, Shield, Mail, Loader2 } from 'lucide-react';

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

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/shop');
      const data = await res.json();
      if (data.success && data.products.length > 0) {
        setProducts(data.products);
      } else {
        // Use default products if database is empty
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

  // Render description with **bold** support
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

  const cartTotal = cart.reduce((sum, item) => {
    const product = products.find(p => p.id === item.id);
    return sum + (product?.price || 0) * item.quantity;
  }, 0);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

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
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
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
                className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
                data-testid={`product-${product.id}`}
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
                    {product.description}
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
                  <div className="flex gap-2">
                    <button
                      onClick={() => addToCart(product.id)}
                      disabled={product.stock === 0}
                      className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid={`add-to-cart-${product.id}`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </button>
                    <a
                      href="mailto:ernst@hatake.eu?subject=Product Inquiry"
                      className="py-2 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                  </div>
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
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{product.name} x{item.quantity}</span>
                  <span className="text-gray-900 dark:text-white">{(product.price * item.quantity).toFixed(2)}</span>
                </div>
              );
            })}
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex justify-between font-bold mb-4">
              <span className="text-gray-900 dark:text-white">Total</span>
              <span className="text-blue-600">SEK {cartTotal.toFixed(2)}</span>
            </div>
            
            {/* Payment Information */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4 text-xs">
              <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Payment Options:</p>
              <div className="space-y-1 text-gray-600 dark:text-gray-400">
                <p><span className="font-medium">Swish:</span> 123-587 57 37</p>
                <p><span className="font-medium">Kontonummer:</span> 9660-357 25 85</p>
                <p><span className="font-medium">Bankgiro:</span> 5051-0031</p>
              </div>
            </div>
            
            <a
              href={`mailto:ernst@hatake.eu?subject=Order from Hatake.Social Shop&body=I would like to order:%0A%0A${cart.map(item => {
                const product = products.find(p => p.id === item.id);
                return `${product?.name} x${item.quantity}`;
              }).join('%0A')}%0A%0ATotal: SEK ${cartTotal.toFixed(2)}%0A%0A---%0APayment Options:%0ASwish: 123-587 57 37%0AKontonummer: 9660-357 25 85%0ABankgiro: 5051-0031%0A%0APlease include your payment method and delivery address.`}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <Mail className="w-4 h-4" />
              Send Order Inquiry
            </a>
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
    </div>
  );
}
