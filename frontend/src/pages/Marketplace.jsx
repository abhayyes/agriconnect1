import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, ShoppingBag, MapPin, ShieldCheck, Search, Tag, ArrowUpRight, CheckCircle2, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';

// Map a backend listing to the frontend product card shape
const CROP_EMOJI = [
  { k: 'tomato', e: '🍅', c: 'Vegetables' },
  { k: 'wheat', e: '🌾', c: 'Grains' },
  { k: 'rice', e: '🍚', c: 'Grains' },
  { k: 'onion', e: '🧅', c: 'Vegetables' },
  { k: 'apple', e: '🍎', c: 'Fruits' },
  { k: 'walnut', e: '🥜', c: 'Dry Fruits' },
  { k: 'pea', e: '🫛', c: 'Vegetables' },
  { k: 'banana', e: '🍌', c: 'Fruits' },
  { k: 'mango', e: '🥭', c: 'Fruits' },
  { k: 'potato', e: '🥔', c: 'Vegetables' },
  { k: 'carrot', e: '🥕', c: 'Vegetables' },
  { k: 'almond', e: '🌰', c: 'Dry Fruits' }
];

function listingToProduct(l) {
  const cropLower = (l.crop || '').toLowerCase();
  const match = CROP_EMOJI.find(({ k }) => cropLower.includes(k));
  return {
    id: l.id,
    name: l.crop,
    farmer: l.farmer_name || 'Verified FPO',
    location: l.location || 'India',
    price: Number(l.price_per_unit),
    unit: l.unit || 'kg',
    stock: `${l.quantity} ${l.unit || 'kg'}`,
    stockNum: Number(l.quantity),
    isDirect: true,
    organic: /organic|natural/i.test(cropLower),
    emoji: match ? match.e : '🌿',
    category: match ? match.c : 'Vegetables'
  };
}

function ProductCard({ product, onBuy, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
      className="bg-(--card) rounded-2xl border border-(--line) hover:border-(--line-strong) p-5 flex flex-col justify-between craft-card-hover"
    >
      <div>
        {/* Visual Crop Header */}
        <div className="relative h-44 rounded-xl overflow-hidden bg-(--canvas) border border-(--line) mb-4 flex items-center justify-center">
          <span className="text-6xl select-none">{product.emoji}</span>

          <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
            {product.isDirect && (
              <span className="inline-flex items-center gap-1 bg-(--leaf) text-(--canvas) font-semibold text-[11px] px-2.5 py-0.5 rounded-full shadow-xs">
                <ShieldCheck className="w-3 h-3" /> Direct Farm
              </span>
            )}
            {product.organic && (
              <span className="bg-(--earth) text-(--canvas) font-semibold text-[11px] px-2 py-0.5 rounded-full shadow-xs">
                Organic Certified
              </span>
            )}
          </div>

          <div className="absolute bottom-2 right-2 bg-(--card)/95 text-(--ink) text-[11px] font-mono px-2 py-0.5 rounded-md border border-(--line) shadow-xs">
            Stock: <strong>{product.stock}</strong>
          </div>
        </div>

        {/* Title and Producer */}
        <h3 className="font-bold text-base text-(--ink) font-heading mb-1.5 hover:text-(--leaf) transition-colors">
          {product.name}
        </h3>

        <div className="space-y-1 text-xs text-(--muted) mb-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-(--leaf)" />
            <span className="text-(--ink) font-medium">Producer:</span> {product.farmer}
          </div>
          <div className="flex items-center gap-1.5 text-(--muted)">
            <MapPin className="w-3.5 h-3.5 text-(--faint)" />
            <span>{product.location} • Mandi Hub 04</span>
          </div>
        </div>
      </div>

      {/* Pricing & CTA */}
      <div className="pt-3.5 border-t border-(--line) flex items-center justify-between mt-auto">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold text-(--faint)">Direct Farm Price</div>
          <div className="text-xl font-bold font-mono text-(--leaf)">
            ₹{product.price}
            <span className="text-xs font-normal text-(--muted)">/{product.unit}</span>
          </div>
        </div>

        <button
          onClick={() => onBuy(product)}
          className="flex items-center gap-1.5 bg-(--leaf) hover:bg-(--leaf-deep) text-(--canvas) font-semibold px-3.5 py-2 rounded-xl shadow-xs active:scale-95 transition-all text-xs cursor-pointer"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Buy Direct</span>
        </button>
      </div>
    </motion.div>
  );
}

export default function Marketplace() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState([
    {
      id: 1,
      name: "Organic Vine Tomatoes",
      farmer: "Ramesh Kumar (Kisan FPO)",
      location: "Ludhiana, Punjab",
      price: 35,
      unit: "kg",
      stock: "500 kg",
      isDirect: true,
      organic: true,
      emoji: "🍅",
      category: "Vegetables"
    },
    {
      id: 2,
      name: "Golden Sharbati Wheat",
      farmer: "Malwa Agri Cooperative",
      location: "Karnal, Haryana",
      price: 28,
      unit: "kg",
      stock: "1,200 kg",
      isDirect: true,
      organic: true,
      emoji: "🌾",
      category: "Grains"
    },
    {
      id: 3,
      name: "Aromatic Basmati Rice",
      farmer: "Suresh Singh Rawat",
      location: "Bareilly, UP",
      price: 85,
      unit: "kg",
      stock: "850 kg",
      isDirect: true,
      organic: false,
      emoji: "🍚",
      category: "Grains"
    },
    {
      id: 4,
      name: "Nashik Red Onions",
      farmer: "Sahyadri Farmers Collective",
      location: "Nashik, Maharashtra",
      price: 24,
      unit: "kg",
      stock: "2,000 kg",
      isDirect: true,
      organic: false,
      emoji: "🧅",
      category: "Vegetables"
    },
    {
      id: 5,
      name: "Himachal Royal Gala Apples",
      farmer: "Devbhoomi Orchard FPO",
      location: "Shimla, HP",
      price: 130,
      unit: "kg",
      stock: "400 kg",
      isDirect: true,
      organic: true,
      emoji: "🍎",
      category: "Fruits"
    },
    {
      id: 6,
      name: "Kashmiri Walnuts (In Shell)",
      farmer: "Gulmarg Valley Growers",
      location: "Anantnag, J&K",
      price: 340,
      unit: "kg",
      stock: "150 kg",
      isDirect: true,
      organic: true,
      emoji: "🥜",
      category: "Dry Fruits"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Attempt to load products from backend
    api.getProducts({ status: 'active' })
      .then((res) => {
        const remoteListings = res?.listings;
        if (Array.isArray(remoteListings) && remoteListings.length > 0) {
          setProducts(remoteListings.map(listingToProduct));
        }
      })
      .catch((err) => console.warn('Could not load listings:', err.message));
  }, []);

  const categories = ['All', 'Vegetables', 'Grains', 'Fruits', 'Dry Fruits'];

  const filtered = products.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.farmer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [buyQuantity, setBuyQuantity] = useState(1);

  const handleBuy = (product) => {
    setSelectedProduct(product);
    setBuyQuantity(1);
  };

  const handlePlaceOrder = async () => {
    if (!selectedProduct) return;

    try {
      const response = await api.createOrder({
        listing_id: selectedProduct.id,
        quantity: buyQuantity,
        price_per_unit: selectedProduct.price,
        crop: selectedProduct.name,
        unit: selectedProduct.unit
      });

      alert(`Order placed successfully! Order ID: ${response.order?.id?.slice(0, 8) || 'AC-' + Math.floor(Math.random() * 100000)}`);
      setSelectedProduct(null);
      setBuyQuantity(1);
    } catch (err) {
      alert(`Failed to place order: ${err.message}`);
    }
  };

  return (
    <div className="py-2 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-(--card) p-6 rounded-2xl border border-(--line) shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-(--leaf) mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>DIRECT FARM MANDI MARKETPLACE • 0% MIDDLEMAN COMMISSIONS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--ink) font-heading">
            Farm-Fresh Mandi Harvests
          </h1>
          <p className="text-xs sm:text-sm text-(--muted) mt-1">
            Browse authentic lots directly from verified FPOs and local agricultural cooperatives.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="bg-(--subtle) px-3.5 py-2 rounded-xl border border-(--line)">
            <span className="text-(--faint) block text-[10px] uppercase font-mono">Verified FPOs</span>
            <span className="text-sm font-bold text-(--leaf)">12 Active</span>
          </div>
          <div className="bg-(--subtle) px-3.5 py-2 rounded-xl border border-(--line)">
            <span className="text-(--faint) block text-[10px] uppercase font-mono">Transit ETA</span>
            <span className="text-sm font-bold text-(--ink)">Same Day</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-(--leaf) text-white shadow-xs'
                  : 'bg-(--card) text-(--muted) hover:text-(--ink) hover:bg-(--subtle) border border-(--line)'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-(--faint) absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search crop, farmer, or district..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-(--card) border border-(--line) text-xs text-(--ink) placeholder-(--faint) focus:outline-none focus:border-(--leaf) transition-colors"
          />
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((product, idx) => (
          <ProductCard
            key={product.id}
            product={product}
            index={idx}
            onBuy={() => handleBuy(product)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-(--card) rounded-2xl border border-(--line)">
          <p className="text-(--muted) text-sm">No farm harvests match your search criteria.</p>
          <button
            onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
            className="mt-2 text-xs font-semibold text-(--leaf) hover:underline"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Buy Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-(--card) rounded-2xl p-6 max-w-md w-full shadow-2xl border border-(--line)"
            >
              <h3 className="text-xl font-bold text-(--ink) mb-4">Place Order</h3>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-4 bg-(--canvas) rounded-xl">
                  <span className="text-4xl">{selectedProduct.emoji}</span>
                  <div>
                    <h4 className="font-bold text-(--ink)">{selectedProduct.name}</h4>
                    <p className="text-xs text-(--muted)">{selectedProduct.farmer}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-(--canvas) p-3 rounded-xl text-center">
                    <span className="text-[10px] text-(--faint) uppercase font-semibold block">Price</span>
                    <span className="text-lg font-bold text-(--leaf)">₹{selectedProduct.price} <span className="text-xs">/{selectedProduct.unit}</span></span>
                  </div>
                  <div className="bg-(--canvas) p-3 rounded-xl text-center">
                    <span className="text-[10px] text-(--faint) uppercase font-semibold block">Available</span>
                    <span className="text-lg font-bold text-(--ink)">{selectedProduct.stock}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-(--ink) mb-1.5">
                    Quantity ({selectedProduct.unit})
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={parseInt(selectedProduct.stock) || 100}
                    value={buyQuantity}
                    onChange={(e) => setBuyQuantity(Math.max(1, Math.min(parseInt(e.target.value) || 1, parseInt(selectedProduct.stock) || 100)))}
                    className="w-full px-3 py-2 bg-(--canvas) border border-(--line) rounded-xl text-sm font-bold text-(--ink) focus:outline-none focus:border-(--leaf) focus:bg-(--card) transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-(--line)">
                  <span className="text-(--muted) text-sm">Total Amount</span>
                  <span className="text-2xl font-bold text-(--leaf)">₹{selectedProduct.price * buyQuantity}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 py-2.5 px-4 bg-(--subtle) hover:bg-(--line) text-(--muted) rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePlaceOrder}
                  className="flex-1 py-2.5 px-4 bg-(--leaf) hover:bg-(--leaf-deep) text-white rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-95"
                >
                  Confirm Order
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
