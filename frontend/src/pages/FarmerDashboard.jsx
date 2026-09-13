import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Package,
  IndianRupee,
  Plus,
  ArrowUpRight,
  Truck,
  CheckCircle2,
  Wheat,
  X,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../services/api';
import { useAuth } from '../App';
import { useLanguage } from '../context/LanguageContext';

// NOTE: Inventory is loaded from the logged-in farmer's OWN listings via the
// backend (getProducts filtered by farmer_id). Demo/sample crops only exist as
// real DB rows for the demo accounts — never as a hardcoded frontend fallback,
// so a newly-registered farmer starts empty and lists their own crops.
function listingToInventory(l, t) {
  const cropLower = (l.crop || '').toLowerCase();
  const highDemand = /tomato|onion|potato|mango/.test(cropLower);
  const isActive = l.status === 'active';
  return {
    id: l.id,
    name: l.crop,
    grade: l.variety || 'Grade A+',
    stock: `${l.quantity} ${l.unit}`,
    price: `₹${l.price_per_unit}/${l.unit}`,
    demand: isActive ? (highDemand ? t('farmer.demand.high') : t('farmer.demand.active')) : t('farmer.demand.removed'),
    status: isActive ? t('farmer.status.active') : t('farmer.status.removed'),
    // Raw fields for the adjust modal
    rawId: l.id,
    rawPricePerUnit: Number(l.price_per_unit),
    rawQuantity: Number(l.quantity),
    rawUnit: l.unit || 'kg',
    rawVariety: l.variety || 'Grade A+',
    rawStatus: l.status || 'active'
  };
}

export default function FarmerDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [newCrop, setNewCrop] = useState({ name: '', stock: '', price: '', grade: 'Grade A+' });
  const [inventoryItems, setInventoryItems] = useState([]);
  const [orders, setOrders] = useState([]);

  // Adjust modal state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ price: '', quantity: '' });
  const [adjusting, setAdjusting] = useState(false);

  const handleOpenAdjust = (item) => {
    setAdjustItem(item);
    setAdjustForm({
      price: String(item.rawPricePerUnit || ''),
      quantity: String(item.rawQuantity || '')
    });
    setShowAdjustModal(true);
  };

  const handleSaveAdjust = async () => {
    if (!adjustItem) return;
    const price = parseFloat(adjustForm.price);
    const qty = parseFloat(adjustForm.quantity);
    if (isNaN(price) || price < 0 || isNaN(qty) || qty < 0) {
      alert(t('farmer.alert.invalidPriceQty'));
      return;
    }
    setAdjusting(true);
    try {
      await api.updateListing(adjustItem.rawId, {
        price_per_unit: price,
        quantity: qty
      });
      await loadMyListings();
      setShowAdjustModal(false);
      setAdjustItem(null);
    } catch (err) {
      alert(`${t('farmer.alert.updateFailed')} ${err.message}`);
    } finally {
      setAdjusting(false);
    }
  };

  const handleRemoveListing = async () => {
    if (!adjustItem) return;
    if (!confirm(t('farmer.confirm.removeListingFull').replace('{name}', adjustItem.name))) return;
    setAdjusting(true);
    try {
      await api.updateListing(adjustItem.rawId, { status: 'inactive' });
      await loadMyListings();
      setShowAdjustModal(false);
      setAdjustItem(null);
    } catch (err) {
      alert(`${t('farmer.alert.removeFailed')} ${err.message}`);
    } finally {
      setAdjusting(false);
    }
  };

  // Load this farmer's real listings and orders from the backend
  const loadMyListings = async () => {
    try {
      const data = await api.getProducts({ status: 'all' });
      if (user?.id && data.listings) {
        // Studio mirrors the marketplace: removed (inactive) crops must not
        // appear here. Only active listings are shown.
        const mine = data.listings.filter(l => l.farmer_id === user.id && l.status === 'active');
        setInventoryItems(mine.map(l => listingToInventory(l, t)));
      }
    } catch (err) {
      console.warn('Could not load listings:', err.message);
    }
  };

  const loadOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data.orders || []);
    } catch (err) {
      console.warn('Could not load orders:', err.message);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadMyListings();
      loadOrders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Derive stats from real data — no hardcoded demo values for new accounts.
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const totalRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.total_price || 0), 0);
  const activeListings = inventoryItems.filter(i => i.rawStatus === 'active');

  const stats = [
    {
      title: t('farmer.stats.grossRevenue'),
      value: orders.length > 0 ? `₹${totalRevenue.toLocaleString('en-IN')}` : "₹0",
      change: deliveredOrders.length > 0 ? `${deliveredOrders.length} ${deliveredOrders.length > 1 ? t('farmer.stats.sales') : t('farmer.stats.sale')}` : t('farmer.stats.noSales'),
      isPositive: totalRevenue > 0,
      icon: IndianRupee,
      description: t('farmer.stats.bankSettlement')
    },
    {
      title: t('farmer.stats.activeCrops'),
      value: `${activeListings.length} ${activeListings.length !== 1 ? t('farmer.stats.batches') : t('farmer.stats.batch')}`,
      change: activeListings.length > 0 ? t('farmer.stats.listedOnMandi') : t('farmer.stats.listCropsPrompt'),
      isPositive: activeListings.length > 0,
      icon: Package,
      description: t('farmer.stats.readyProcurement')
    },
    {
      title: t('farmer.stats.totalShipments'),
      value: `${deliveredOrders.length} ${deliveredOrders.length !== 1 ? t('farmer.stats.deliveries') : t('farmer.stats.delivery')}`,
      change: deliveredOrders.length > 0 ? t('farmer.stats.allCompleted') : t('farmer.stats.noDeliveries'),
      isPositive: deliveredOrders.length > 0,
      icon: Truck,
      description: t('farmer.stats.completedOrders')
    }
  ];

  // Build bar chart from last 7 orders (by created_at) when data exists, else empty.
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 7)
    .reverse();

  const barChartData = recentOrders.length > 0 ? recentOrders.map(o => {
    const amt = Number(o.total_price || 0);
    const day = new Date(o.created_at).toLocaleDateString('en-IN', { weekday: 'short' });
    return { day, val: amt, height: `${Math.min(95, (amt / Math.max(1, ...recentOrders.map(x => Number(x.total_price || 1)))) * 90)}%` };
  }) : [];

  const handleAddCrop = async (e) => {
    e.preventDefault();
    if (!newCrop.name || !newCrop.stock || !newCrop.price) return;

    // Persist listing to the backend so it becomes visible in the marketplace
    try {
      await api.createListing({
        crop: newCrop.name,
        variety: newCrop.grade,
        quantity: Number(newCrop.stock),
        unit: 'kg',
        price_per_unit: Number(newCrop.price),
        location: user?.location || 'AgriConnect Mandi'
      });
      await loadMyListings();
      setNewCrop({ name: '', stock: '', price: '', grade: 'Grade A+' });
      setShowModal(false);
      alert(t('farmer.alert.cropListedSuccess'));
    } catch (err) {
      console.error('Failed to create listing:', err);
      alert(`${t('farmer.alert.cropListFailed')} ${err.message}`);
    }
  };

  return (
    <div className="py-2 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5DCCF] shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2D5A38] mb-1">
            <Wheat className="w-4 h-4" />
            <span>{t('farmer.banner.tagline')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#232921] font-heading">
            {t('farmer.banner.title')}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7264] mt-1">
            {t('farmer.banner.desc')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#2D5A38] hover:bg-[#1E3D27] text-white font-semibold rounded-xl text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('farmer.button.listNewCrop')}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.05 }}
              className="bg-white p-5 rounded-2xl border border-[#E5DCCF] shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-[#6B7264] uppercase tracking-wide">{stat.title}</span>
                <div className="p-2 rounded-lg bg-[#E8F0E9] text-[#2D5A38]">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-2xl sm:text-3xl font-bold text-[#232921] font-heading">{stat.value}</div>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className="flex items-center gap-0.5 text-[#2D5A38] font-bold">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    {stat.change}
                  </span>
                  <span className="text-[#8E9687]">({stat.description})</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Main Grid: Inventory & AI Demand Advisory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Column */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#232921] font-heading flex items-center gap-2">
              <Package className="w-4 h-4 text-[#2D5A38]" />
              {t('farmer.inventory.heading')}
            </h2>
            <span className="text-xs text-[#6B7264] font-medium">{inventoryItems.length} {t('farmer.inventory.registeredLots')}</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5DCCF] overflow-hidden shadow-xs">
            {inventoryItems.length === 0 ? (
              <div className="p-10 text-center">
                <Package className="w-12 h-12 text-[#E5DCCF] mx-auto mb-3" />
                <h3 className="text-sm font-bold text-[#232921] mb-1">{t('farmer.inventory.emptyTitle')}</h3>
                <p className="text-xs text-[#6B7264] mb-4 max-w-sm mx-auto">
                  {t('farmer.inventory.emptyDesc')}
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2D5A38] hover:bg-[#1E3D27] text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('farmer.button.listFirstCrop')}</span>
                </button>
              </div>
            ) : (
            <div className="divide-y divide-[#E5DCCF]">
              {inventoryItems.map((item) => (
                <div key={item.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF7F2] transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#232921] font-heading">{item.name}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F2ECE1] text-[#6B7264] border border-[#E5DCCF]">
                        {item.grade}
                      </span>
                    </div>
                    <div className="text-xs text-[#6B7264] flex items-center gap-3">
                      <span>{t('farmer.inventory.available')} <strong className="text-[#232921]">{item.stock}</strong></span>
                      <span>•</span>
                      <span>{t('farmer.inventory.mandiDemand')} <strong className="text-[#2D5A38]">{item.demand}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-left sm:text-right">
                      <div className="text-base font-bold font-mono text-[#2D5A38]">{item.price}</div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B7264]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#2D5A38]" /> {item.status}
                      </span>
                    </div>
                    <button
                      onClick={() => handleOpenAdjust(item)}
                      className="px-3 py-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#F2ECE1] text-[#232921] border border-[#E5DCCF] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      {t('farmer.button.adjust')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        </div>

        {/* Mandi Price Trend & Intelligence Widget */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#232921] font-heading flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#8C6D46]" />
              {t('farmer.intelligence.title')}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5DCCF] p-5 space-y-4 shadow-xs">
            {barChartData.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-10 h-10 text-[#E5DCCF] mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#232921] mb-1">{t('farmer.intelligence.noDataTitle')}</p>
                <p className="text-xs text-[#6B7264]">
                  {t('farmer.intelligence.noDataDesc')}
                </p>
              </div>
            ) : (
              <>
                {/* Advisory note — derived from real order data */}
                <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DCCF]">
                  <div className="flex items-center gap-1.5 text-[#8C6D46] text-xs font-bold mb-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    {t('farmer.intelligence.orderSummary')}
                  </div>
                  <p className="text-xs text-[#6B7264] leading-relaxed">
                    {t('farmer.summary.youHave')}{' '}
                    <strong className="text-[#2D5A38]">
                      {orders.length} {orders.length !== 1 ? t('common.orders') : t('common.order')}
                    </strong>{' '}
                    {t('farmer.summary.total')}
                    {deliveredOrders.length > 0 ? (
                      <>
                        {t('farmer.summary.with')}{' '}
                        <strong className="text-[#2D5A38]">{deliveredOrders.length} {t('farmer.summary.delivered')}</strong>{' '}
                        {t('farmer.summary.and')} ₹
                        {totalRevenue.toLocaleString('en-IN')} {t('farmer.summary.earned')}
                      </>
                    ) : (
                      t('farmer.summary.allPendingOrTransit')
                    )}
                  </p>
                </div>

                {/* Visual Bar Chart */}
                <div>
                  <div className="flex items-center justify-between text-xs text-[#6B7264] font-medium mb-2">
                    <span>{t('farmer.intelligence.recentOrderValues')}</span>
                    <span className="text-[#2D5A38] font-bold">
                      {deliveredOrders.length > 0 ? `${deliveredOrders.length} ${t('farmer.intelligence.completedCount')}` : `${orders.length} ${t('farmer.intelligence.inProgressCount')}`}
                    </span>
                  </div>

                  <div className="h-36 bg-[#FAF7F2] rounded-xl border border-[#E5DCCF] p-3 pt-5 flex items-end justify-between gap-1.5">
                    {barChartData.map((bar, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                        <div className="text-[9px] font-mono text-[#8E9687] group-hover:text-[#232921] transition-colors">
                          ₹{bar.val}
                        </div>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: bar.height }}
                          transition={{ duration: 0.5, delay: i * 0.05 }}
                          className={`w-full rounded-t-md transition-all ${
                            i === barChartData.length - 1
                              ? 'bg-[#2D5A38]'
                              : 'bg-[#C2D6C6] group-hover:bg-[#2D5A38]'
                          }`}
                        />
                        <span className="text-[10px] text-[#6B7264] font-medium">{bar.day.slice(0, 3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal for List Harvest */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#232921]/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="bg-white border border-[#E5DCCF] rounded-2xl p-6 w-full max-w-md shadow-lg relative"
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 p-1 text-[#8E9687] hover:text-[#232921] rounded-lg hover:bg-[#FAF7F2]"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-[#232921] font-heading mb-1">{t('farmer.modal.addCropTitle')}</h3>
              <p className="text-xs text-[#6B7264] mb-4">{t('farmer.modal.addCropDesc')}</p>

              <form onSubmit={handleAddCrop} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#232921] mb-1">{t('farmer.modal.cropName')}</label>
                  <input
                    type="text"
                    required
                    placeholder={t('farmer.modal.cropNamePlaceholder')}
                    value={newCrop.name}
                    onChange={(e) => setNewCrop({ ...newCrop, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E5DCCF] rounded-xl text-xs text-[#232921] focus:outline-none focus:border-[#2D5A38] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#232921] mb-1">{t('farmer.modal.stockQuantity')}</label>
                    <input
                      type="number"
                      required
                      placeholder={t('farmer.modal.stockPlaceholder')}
                      value={newCrop.stock}
                      onChange={(e) => setNewCrop({ ...newCrop, stock: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E5DCCF] rounded-xl text-xs text-[#232921] focus:outline-none focus:border-[#2D5A38] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#232921] mb-1">{t('farmer.modal.pricePerKg')}</label>
                    <input
                      type="number"
                      required
                      placeholder={t('farmer.modal.pricePlaceholder')}
                      value={newCrop.price}
                      onChange={(e) => setNewCrop({ ...newCrop, price: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E5DCCF] rounded-xl text-xs text-[#232921] focus:outline-none focus:border-[#2D5A38] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#232921] mb-1">{t('farmer.modal.qualityGrade')}</label>
                  <select
                    value={newCrop.grade}
                    onChange={(e) => setNewCrop({ ...newCrop, grade: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E5DCCF] rounded-xl text-xs text-[#232921] focus:outline-none focus:border-[#2D5A38] focus:bg-white"
                  >
                    <option value="Grade A+">{t('farmer.grade.gradeAPlus')}</option>
                    <option value="Grade A">{t('farmer.grade.gradeA')}</option>
                    <option value="Grade B+">{t('farmer.grade.gradeBPlus')}</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#FAF7F2] text-[#6B7264] hover:text-[#232921] text-xs font-semibold"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#2D5A38] hover:bg-[#1E3D27] text-white font-semibold text-xs shadow-xs cursor-pointer"
                  >
                    {t('farmer.button.registerCrop')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Adjust Listing Modal */}
      <AnimatePresence>
        {showAdjustModal && adjustItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#232921]/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="bg-white border border-[#E5DCCF] rounded-2xl p-6 w-full max-w-md shadow-lg relative"
            >
              <button
                onClick={() => { setShowAdjustModal(false); setAdjustItem(null); }}
                className="absolute top-4 right-4 p-1 text-[#8E9687] hover:text-[#232921] rounded-lg hover:bg-[#FAF7F2]"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-[#232921] font-heading mb-1">{t('farmer.modal.adjustTitle')}</h3>
              <p className="text-xs text-[#6B7264] mb-4">
                {t('farmer.modal.adjustDesc')} <strong>{adjustItem.name}</strong> ({adjustItem.grade}).
              </p>

              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#232921] mb-1">
                      {t('farmer.modal.pricePerUnit')} {adjustItem.rawUnit})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={adjustForm.price}
                      onChange={(e) => setAdjustForm({ ...adjustForm, price: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E5DCCF] rounded-xl text-xs text-[#232921] focus:outline-none focus:border-[#2D5A38] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#232921] mb-1">
                      {t('farmer.modal.stockUnit')} {adjustItem.rawUnit})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={adjustForm.quantity}
                      onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E5DCCF] rounded-xl text-xs text-[#232921] focus:outline-none focus:border-[#2D5A38] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-between">
                  <button
                    onClick={handleRemoveListing}
                    disabled={adjusting}
                    className="px-3 py-2 rounded-xl bg-white text-[#991B1B] border border-red-200 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t('farmer.button.removeListing')}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowAdjustModal(false); setAdjustItem(null); }}
                      className="px-4 py-2 rounded-xl bg-[#FAF7F2] text-[#6B7264] hover:text-[#232921] text-xs font-semibold"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleSaveAdjust}
                      disabled={adjusting}
                      className="px-4 py-2 rounded-xl bg-[#2D5A38] hover:bg-[#1E3D27] text-white font-semibold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {adjusting ? t('common.saving') : t('common.saveChanges')}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}