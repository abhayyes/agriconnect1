import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, ShoppingBag, MapPin, ShieldCheck, Search, Tag, ArrowRight, CheckCircle2, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import DeliveryMapPicker from '../components/DeliveryMapPicker';
import { useAuth } from '../App';
import { useLanguage } from '../context/LanguageContext';

const PAYMENT_METHODS = [
  { id: 'upi', labelKey: 'payment.upi.label', subKey: 'payment.upi.sub', icon: '📲' },
  { id: 'card', labelKey: 'payment.card.label', subKey: 'payment.card.sub', icon: '💳' },
  { id: 'netbanking', labelKey: 'payment.netbanking.label', subKey: 'payment.netbanking.sub', icon: '🏦' },
  { id: 'wallet', labelKey: 'payment.wallet.label', subKey: 'payment.wallet.sub', icon: '👛' },
  { id: 'cod', labelKey: 'marketplace.cod', subKey: 'payment.cod.sub', icon: '💵' }
];

function ProductCard({ product, onBuy, index }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  // Roles are strictly separate: only a buyer account (consumer / bulk_buyer)
  // can place an order. Farmer/FPO accounts are sellers and cannot buy.
  const isBuyer = user && (user.role === 'consumer' || user.role === 'bulk_buyer');
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState(user?.delivery_address || user?.location || '');
  const [saveAddress, setSaveAddress] = useState(true);

  // Map-delivery pin + live route preview
  const [deliveryLat, setDeliveryLat] = useState(null);
  const [deliveryLng, setDeliveryLng] = useState(null);
  const [routePreview, setRoutePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewAttempt, setPreviewAttempt] = useState(0);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Lock body scroll while the buy modal is open. The modal manages its own
  // internal scrolling, so the page behind must stay still.
  useEffect(() => {
    if (!showBuyModal) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prevOverflow; };
  }, [showBuyModal]);

  // Debounced live route preview: recompute whenever the buyer pins a delivery
  // point or changes quantity, so the map reflects the current best route.
  useEffect(() => {
    if (!deliveryLat || !deliveryLng) {
      setRoutePreview(null);
      return;
    }
    setPreviewLoading(true);
    setPreviewError('');
    const t = setTimeout(async () => {
      // The route service cold-starts slowly (Render free tier sleeps after
      // ~15 min idle; wake can take 50s+). Retry with backoff so a cold start
      // doesn't surface as an immediate "could not calculate" error.
      const payload = {
        pickup_location: product.location || 'AgriConnect Mandi',
        delivery_lat: deliveryLat,
        delivery_lng: deliveryLng,
        quantity
      };
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const data = await api.previewRoute(payload);
          setRoutePreview(data);
          setPreviewError('');
          break;
        } catch (e) {
          if (attempt === 3) {
            setRoutePreview(null);
            setPreviewError('Could not calculate route right now. Tap again to retry.');
          } else {
            await new Promise((r) => setTimeout(r, [2500, 6000, 12000][attempt]));
          }
        }
      }
      setPreviewLoading(false);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryLat, deliveryLng, quantity, previewAttempt]);

  // Keep the map pin in sync with the typed delivery address. Debounced so we
  // don't hammer the geocoder on every keystroke; clearing the pin when the
  // address is emptied, and only pinning when the address is long enough to be
  // meaningful. The manual "Find on map" button below is the instant trigger.
  const pinAddress = useCallback(async (addr) => {
    const text = (addr || '').trim();
    if (text.length < 4) return;
    setGeocoding(true);
    setGeoError('');
    // One retry absorbs a transient Nominatim rate-limit/failure; the backend
    // cache means repeat queries for the same address don't re-hit the geocoder.
    let g;
    try {
      g = await api.geocode(text);
    } catch (e) {
      try { g = await api.geocode(text); } catch (e2) { g = null; }
    }
    if (g && g.lat != null && g.lng != null) {
      setDeliveryLat(g.lat);
      setDeliveryLng(g.lng);
      setGeoError('');
    } else {
      // Keep any previously pinned point; never clear a good pin because a
      // geocode failed. Offer the manual map instead - it doesn't block the order.
      setGeoError("Couldn't auto-find that address - tap the map to set your delivery point.");
    }
    setGeocoding(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!deliveryAddress || !deliveryAddress.trim()) {
      setGeoError('');
      return;
    }
    const t = setTimeout(() => pinAddress(deliveryAddress), 1200);
    return () => clearTimeout(t);
  }, [deliveryAddress, pinAddress]);

  const handlePayAndOrder = async () => {
    if (!deliveryAddress.trim()) {
      setError(t('marketplace.error.addressRequired'));
      return;
    }
    if (!deliveryLat || !deliveryLng) {
      setError('Please pin your delivery location on the map.');
      return;
    }
    setError('');
    if (paymentMethod !== 'cod' && !processing) {
      setProcessing(true);
      // Simulate a payment gateway call for demo purposes
      await new Promise(r => setTimeout(r, 1200));
      setProcessing(false);
    }
    // Persist the address to the buyer's profile if requested
    if (saveAddress && deliveryAddress.trim()) {
      try {
        await api.updateProfile({ delivery_address: deliveryAddress });
      } catch (e) {
        console.warn('Could not save delivery address to profile:', e.message);
      }
    }
    onBuy({
      ...product,
      quantity,
      payment_method: paymentMethod,
      delivery_address: deliveryAddress,
      delivery_lat: deliveryLat,
      delivery_lng: deliveryLng
    });
    setShowBuyModal(false);
  };

  return (
    <>
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
                  <ShieldCheck className="w-3 h-3" /> {t('marketplace.badge.directFarm')}
                </span>
              )}
              {product.organic && (
                <span className="bg-(--earth) text-(--canvas) font-semibold text-[11px] px-2 py-0.5 rounded-full shadow-xs">
                  {t('marketplace.badge.organicCertified')}
                </span>
              )}
            </div>

            <div className="absolute bottom-2 right-2 bg-(--card)/95 text-(--ink) text-[11px] font-mono px-2 py-0.5 rounded-md border border-(--line) shadow-xs">
              {t('marketplace.product.stock')} <strong>{product.stock}</strong>
            </div>
          </div>

          {/* Title and Producer */}
          <h3 className="font-bold text-base text-(--ink) font-heading mb-1.5 hover:text-(--leaf) transition-colors">
            {product.name}
          </h3>

          <div className="space-y-1 text-xs text-(--muted) mb-4">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-(--leaf)" />
              <span className="text-(--ink) font-medium">{t('marketplace.product.producer')}</span> {product.farmer}
            </div>
            <div className="flex items-center gap-1.5 text-(--muted)">
              <MapPin className="w-3.5 h-3.5 text-(--faint)" />
              <span>{product.location} • {t('marketplace.product.mandiHub')}</span>
              {product.distance_km != null && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-(--moss) text-(--leaf) border border-(--line-strong)">
                  {product.distance_km < 1 ? '<1 km' : `~${product.distance_km} km`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="pt-3.5 border-t border-(--line) flex items-center justify-between mt-auto">
          <div>
            <div className="text-[10px] uppercase tracking-wider font-semibold text-(--faint)">{t('marketplace.product.directFarmPrice')}</div>
            <div className="text-xl font-bold font-mono text-(--leaf)">
              ₹{product.price}
              <span className="text-xs font-normal text-(--muted)">/{product.unit}</span>
            </div>
          </div>

          {isBuyer ? (
            <button
              onClick={() => setShowBuyModal(true)}
              className="flex items-center gap-1.5 bg-(--leaf) hover:bg-(--leaf-deep) text-(--canvas) font-semibold px-3.5 py-2 rounded-xl shadow-xs active:scale-95 transition-all text-xs cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{t('marketplace.button.buyDirect')}</span>
            </button>
          ) : (
            <span
              title={user ? t('marketplace.tooltip.sellerOnly') : t('marketplace.tooltip.loginRequired')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-(--line) bg-(--canvas) text-(--faint) text-xs font-semibold"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t('marketplace.button.sellingOnly')}</span>
            </span>
          )}
        </div>
      </motion.div>

      {/* Buy Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-(--card) rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[88vh] overflow-y-auto"
          >
            <h3 className="text-xl font-bold text-(--ink) mb-4">{t('order.modal.title')}</h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 bg-(--canvas) rounded-xl">
                <span className="text-sm font-medium">{product.name}</span>
                <span className="text-sm text-(--muted)">{product.farmer}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-(--canvas) p-3 rounded-xl">
                  <span className="text-[10px] text-(--faint) uppercase font-semibold">{t('common.price')}</span>
                  <div className="text-lg font-bold text-(--leaf)">
                    ₹{product.price} <span className="text-xs">/{product.unit}</span>
                  </div>
                </div>
                <div className="bg-(--canvas) p-3 rounded-xl">
                  <span className="text-[10px] text-(--faint) uppercase font-semibold">{t('marketplace.product.available')}</span>
                  <div className="text-lg font-bold text-(--ink)">{product.stock}</div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-(--ink) mb-1.5">
                  {t('order.modal.quantityIn')} {product.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  max={product.stockNumber}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(e.target.value, product.stockNumber)))}
                  className="w-full px-3 py-2 bg-(--canvas) border border-(--line) rounded-xl text-sm font-bold text-(--ink) focus:outline-none focus:border-(--leaf) focus:bg-(--card)"
                />
              </div>

              {/* Delivery Address */}
              <div>
                <label className="block text-xs font-medium text-(--ink) mb-1.5">
                  {t('order.modal.deliveryAddress')}
                </label>
<div className="flex gap-2">
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder={t('order.modal.addressPlaceholder') || 'House no, street, city, state'}
                    className="flex-1 px-3 py-2 bg-(--canvas) border border-(--line) rounded-xl text-sm font-medium text-(--ink) focus:outline-none focus:border-(--leaf) focus:bg-(--card)"
                  />
                  <button
                    type="button"
                    onClick={() => pinAddress(deliveryAddress)}
                    disabled={geocoding || !deliveryAddress.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-(--moss) border border-(--line-strong) text-(--leaf) rounded-xl text-xs font-semibold hover:bg-(--moss-strong) transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {geocoding ? 'Finding…' : 'Find on map'}
                  </button>
                </div>
                {geoError && <p className="text-[11px] text-amber-600 mt-1">{geoError}</p>}
                <label className="mt-2 flex items-center gap-2 text-[11px] text-(--muted) cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                    className="accent-(--leaf)"
                  />
                  {t('order.modal.saveAddressDefault')}
                </label>
              </div>

              {/* Delivery Location Map */}
              <div>
                <label className="block text-xs font-medium text-(--ink) mb-1.5">
                  Delivery Location (map)
                </label>
                <DeliveryMapPicker
                  markerPosition={deliveryLat && deliveryLng ? [deliveryLat, deliveryLng] : null}
                  onPositionChange={(lat, lng) => {
                    setDeliveryLat(lat);
                    setDeliveryLng(lng);
                  }}
                  height={190}
                />

                {/* Live route preview */}
                <div className="mt-2">
                  {previewLoading && (
                    <p className="text-[11px] text-(--muted) flex items-center gap-1.5">
                      <span className="inline-block w-3 h-3 border-2 border-(--leaf) border-t-transparent rounded-full animate-spin" />
                      Calculating best route (first time can take up to a minute)…
                    </p>
                  )}
                  {!previewLoading && routePreview && (
                    <div className="flex items-center gap-3 text-xs font-semibold text-(--leaf) bg-(--moss) px-3 py-2 rounded-xl">
                      <span>🚛 {routePreview.distance_km} km</span>
                      <span>⏱ ~{routePreview.estimated_time_min} min</span>
                      <span>₹{routePreview.cost} delivery</span>
                    </div>
                  )}
                  {!previewLoading && previewError && (
                    <div className="flex items-center gap-2">
                      <p className="text-[11px] text-amber-600">{previewError}</p>
                      <button
                        type="button"
                        onClick={() => { setPreviewError(''); setPreviewLoading(true); setPreviewAttempt(a => a + 1); }}
                        className="text-[11px] font-semibold text-(--leaf) underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-medium text-(--ink) mb-1.5">
                  {t('payment.methodLabel')}
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => setPaymentMethod(m.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-colors ${
                        paymentMethod === m.id
                          ? 'bg-(--moss) border-(--leaf)'
                          : 'bg-(--canvas) border-(--line) hover:border-(--line-strong)'
                      }`}
                    >
                      <span className="text-lg">{m.icon}</span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-(--ink)">{t(m.labelKey)}</span>
                        <span className="block text-[10px] text-(--muted)">{t(m.subKey)}</span>
                      </span>
                      <span className={`w-3.5 h-3.5 rounded-full border-2 ${
                        paymentMethod === m.id ? 'border-(--leaf) bg-(--leaf)' : 'border-(--line)'
                      }`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-6 pt-4 border-t border-(--line)">
              <span className="text-(--muted) text-sm">
                {paymentMethod !== 'cod' ? `${t('order.modal.totalPayableOnline')} (${paymentMethod.toUpperCase()})` : t('order.modal.totalPayableCod')}
              </span>
              <span className="text-2xl font-bold text-(--leaf)">₹{product.price * quantity}</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBuyModal(false)}
                className="flex-1 py-2.5 px-4 bg-(--subtle) hover:bg-(--line) text-(--muted) rounded-xl text-sm font-semibold transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handlePayAndOrder}
                disabled={processing}
                className="flex-1 py-2.5 px-4 bg-(--leaf) hover:bg-(--leaf-deep) text-white rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {processing ? t('order.button.processingPayment') : paymentMethod !== 'cod' ? t('order.button.payConfirm') : t('order.button.confirmCod')}
              </button>
              {error && <span className="text-xs text-red-600">{error}</span>}
            </div>
          </motion.div>
          </div>
        </div>
      )}
    </>
  );
}

export default function Marketplace() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  // Products load from real backend listings (getProducts) keyed to different
  // farmers. Starts empty — no hardcoded sample crops, so buyers only ever see
  // actual listings (demo crops exist only as real DB rows for demo accounts).
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [orders, setOrders] = useState([]);

  // Sort / filter for the mandi market.
  //   sort: 'newest' | 'price_asc' | 'price_desc' | 'nearest'
  //   userCoords: browser-geolocated { lat, lng } used only for 'nearest'.
  const [sort, setSort] = useState('newest');
  const [userCoords, setUserCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [maxPrice, setMaxPrice] = useState(0); // 0 = no price cap

  // Map a crop name to a broad category so the filter pills actually match.
  const CROP_CATEGORY = {
    potato: 'vegetables', tomato: 'vegetables', onion: 'vegetables', carrot: 'vegetables',
    cabbage: 'vegetables', cauliflower: 'vegetables', brinjal: 'vegetables', beans: 'vegetables',
    okra: 'vegetables', bhindi: 'vegetables', spinach: 'vegetables', palak: 'vegetables',
    chilli: 'vegetables', chili: 'vegetables', garlic: 'vegetables', ginger: 'vegetables',
    wheat: 'grains', 'basmati rice': 'grains', basmati: 'grains', rice: 'grains',
    maize: 'grains', corn: 'grains', barley: 'grains', millet: 'grains', jowar: 'grains',
    bajra: 'grains', ragi: 'grains',
    mango: 'fruits', apple: 'fruits', banana: 'fruits', orange: 'fruits', grapes: 'fruits',
    papaya: 'fruits', pomegranate: 'fruits', guava: 'fruits', lemon: 'fruits',
    almond: 'dryfruits', cashew: 'dryfruits', walnut: 'dryfruits', peanut: 'dryfruits'
  };
  const inferCategory = (name) => {
    const n = (name || '').toLowerCase();
    for (const [k, c] of Object.entries(CROP_CATEGORY)) if (n.includes(k)) return c;
    return 'other';
  };

  // Ask the browser for the consumer's location so "nearest listings" can work.
  const locate = () => {
    if (!('geolocation' in navigator)) {
      alert('Your browser does not support location. Falling back to newest.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setSort('nearest');
        setLocating(false);
      },
      () => {
        setLocating(false);
        setSort('newest');
        alert('Location unavailable. Showing newest listings instead.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleSort = (next) => {
    if (next === 'nearest' && !userCoords) { locate(); return; }
    setSort(next);
  };

  // Load listings from backend. Refetches when sort or geolocated coords
  // change; nearest passes the consumer's lat/lng so the backend computes
  // distance + ordering. Also infer a broad category per crop for the pills.
  useEffect(() => {
    const loadListings = async () => {
      setIsLoading(true);
      try {
        const filters = { status: 'active', sort };
        if (sort === 'nearest' && userCoords) {
          filters.lat = userCoords.lat;
          filters.lng = userCoords.lng;
        }
        const data = await api.getProducts(filters);
        if (data.listings) {
          const formatted = data.listings.map(l => ({
            id: l.id,
            name: l.crop,
            farmer: l.farmer_name || 'Farmer',
            location: l.location || 'Unknown',
            price: parseFloat(l.price_per_unit) || 0,
            unit: l.unit || 'kg',
            stock: `${l.quantity} ${l.unit}`,
            stockNumber: parseFloat(l.quantity) || 0,
            isDirect: true,
            organic: false,
            emoji: "🌾",
            category: inferCategory(l.crop),
            distance_km: l.distance_km != null ? l.distance_km : null,
            lat: l.lat != null ? l.lat : null,
            lng: l.lng != null ? l.lng : null
          }));
          setProducts(formatted);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error('Failed to load listings:', err);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadListings();
  }, [sort, userCoords]);

  // Load user's orders
  useEffect(() => {
    const loadOrders = async () => {
      if (user) {
        try {
          const data = await api.getOrders();
          setOrders(data.orders || []);
        } catch (err) {
          console.error('Failed to load orders:', err);
        }
      }
    };
    loadOrders();
  }, [user]);

  const handleBuy = async (product) => {
    if (!user) {
      alert(t('marketplace.alert.loginRequired'));
      navigate('/login');
      return;
    }

    try {
      const order = await api.createOrder({
        listing_id: product.id,
        quantity: product.quantity,
        payment_method: product.payment_method || 'cod',
        delivery_address: product.delivery_address,
        delivery_lat: product.delivery_lat,
        delivery_lng: product.delivery_lng
      });

      alert(`${t('marketplace.alert.orderSuccess')} ${(product.payment_method || 'cod').toUpperCase()}`);
      navigate('/orders');
    } catch (err) {
      alert(`${t('marketplace.alert.orderFailed')} ${err.message}`);
    }
  };

  const categories = ['all', 'vegetables', 'grains', 'fruits', 'dryfruits', 'other'];

  const categoryLabel = (c) => t('category.' + c);

  const filtered = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.farmer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrice = !maxPrice || p.price <= maxPrice;
    return matchesCategory && matchesSearch && matchesPrice;
  });

  return (
    <div className="py-2 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-(--card) p-6 rounded-2xl border border-(--line) shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-(--leaf) mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>{t('marketplace.banner.subtag')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--ink) font-heading">
            {t('marketplace.banner.title')}
          </h1>
          <p className="text-xs sm:text-sm text-(--muted) mt-1">
            {t('marketplace.banner.desc')}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="bg-(--subtle) px-3.5 py-2 rounded-xl border border-(--line)">
            <span className="text-(--faint) block text-[10px] uppercase font-mono">{t('marketplace.banner.verifiedFPOs')}</span>
            <span className="text-sm font-bold text-(--leaf)">{t('marketplace.banner.activeFPOs')}</span>
          </div>
          <div className="bg-(--subtle) px-3.5 py-2 rounded-xl border border-(--line)">
            <span className="text-(--faint) block text-[10px] uppercase font-mono">{t('marketplace.banner.transitEta')}</span>
            <span className="text-sm font-bold text-(--ink)">{t('marketplace.banner.sameDay')}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3">
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
                {categoryLabel(cat)}
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
              placeholder={t('marketplace.search.placeholder')}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-(--card) border border-(--line) text-xs text-(--ink) placeholder-(--faint) focus:outline-none focus:border-(--leaf) transition-colors"
            />
          </div>
        </div>

        {/* Sort + price filter row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Sort dropdown */}
          <div className="relative">
            <SlidersHorizontal className="w-4 h-4 text-(--faint) absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={locating ? 'locating' : sort}
              onChange={(e) => handleSort(e.target.value)}
              disabled={locating}
              className="appearance-none pl-9 pr-8 py-2 rounded-xl bg-(--card) border border-(--line) text-xs text-(--ink) focus:outline-none focus:border-(--leaf) cursor-pointer"
            >
              {locating ? (
                <option value="locating">Locating you…</option>
              ) : (
                <>
                  <option value="newest">Newest first</option>
                  <option value="price_asc">Price: low → high</option>
                  <option value="price_desc">Price: high → low</option>
                  <option value="nearest">Nearest to me</option>
                </>
              )}
            </select>
          </div>

          {/* Max price filter */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-(--faint)">₹</span>
            <input
              type="number"
              min="0"
              value={maxPrice || ''}
              onChange={(e) => setMaxPrice(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="Max ₹/kg"
              className="pl-7 pr-3 py-2 w-32 rounded-xl bg-(--card) border border-(--line) text-xs text-(--ink) focus:outline-none focus:border-(--leaf)"
            />
          </div>

          {/* Nearest hint */}
          {(sort === 'nearest' && userCoords) && (
            <button
              onClick={locate}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-(--moss) text-(--leaf) border border-(--line-strong) hover:bg-(--moss-strong)"
              title="Refresh my location"
            >
              <MapPin className="w-3.5 h-3.5" />
              {t('marketplace.banner.transitEta')} · {filtered.filter(p => p.distance_km != null).length} near
            </button>
          )}
          {sort === 'nearest' && !userCoords && !locating && (
            <button
              onClick={locate}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-(--leaf) text-white hover:bg-(--leaf-deep)"
            >
              <MapPin className="w-3.5 h-3.5" />
              Use my location
            </button>
          )}
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((product, idx) => (
          <ProductCard
            key={product.id}
            product={product}
            index={idx}
            onBuy={handleBuy}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 bg-(--card) rounded-2xl border border-(--line)">
          <p className="text-(--muted) text-sm">{t('marketplace.empty.title')}</p>
          <button
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); setMaxPrice(0); setSort('newest'); setUserCoords(null); }}
            className="mt-2 text-xs font-semibold text-(--leaf) hover:underline"
          >
            {t('marketplace.empty.clearFilters')}
          </button>
        </div>
      )}

      {/* My Orders Link (consumer only) */}
      {user && user.role === 'consumer' && (
        <div className="flex justify-center">
          <button
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2 px-6 py-3 bg-(--leaf) hover:bg-(--leaf-deep) text-white rounded-xl text-sm font-semibold transition-colors shadow-xs"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{t('marketplace.button.myOrders')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
