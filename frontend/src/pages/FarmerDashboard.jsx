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

// NOTE: Inventory is loaded from the logged-in farmer's OWN listings via the
// backend (getProducts filtered by farmer_id). Demo/sample crops only exist as
// real DB rows for the demo accounts — never as a hardcoded frontend fallback,
// so a newly-registered farmer starts empty and lists their own crops.
function listingToInventory(l) {
  const cropLower = (l.crop || '').toLowerCase();
  const highDemand = /tomato|onion|potato|mango/.test(cropLower);
  return {
    id: l.id,
    name: l.crop,
    grade: l.variety || 'Grade A+',
    stock: `${l.quantity} ${l.unit}`,
    price: `₹${l.price_per_unit}/${l.unit}`,
    demand: highDemand ? 'High Mandi Demand' : 'Active in Mandi',
    status: 'Active in Mandi',
    // Raw fields for the adjust modal
    rawId: l.id,
    rawPricePerUnit: Number(l.price_per_unit),
    rawQuantity: Number(l.quantity),
    rawUnit: l.unit || 'kg',
    rawVariety: l.variety || 'Grade A+'
  };
}

export default function FarmerDashboard() {
  const { user } = useAuth();
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
      alert('Please enter valid price and quantity.');
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
      alert(`Failed to update listing: ${err.message}`);
    } finally {
      setAdjusting(false);
    }
  };

  const handleRemoveListing = async () => {
    if (!adjustItem) return;
    if (!confirm(`Remove "${adjustItem.name}" from your active listings? It will no longer be visible to buyers.`)) return;
    setAdjusting(true);
    try {
      await api.updateListing(adjustItem.rawId, { status: 'inactive' });
      await loadMyListings();
      setShowAdjustModal(false);
      setAdjustItem(null);
    } catch (err) {
      alert(`Failed to remove listing: ${err.message}`);
    } finally {
      setAdjusting(false);
    }
  };

  // Load this farmer's real listings and orders from the backend
  const loadMyListings = async () => {
    try {
      const data = await api.getProducts();
      if (user?.id && data.listings) {
        const mine = data.listings.filter(l => l.farmer_id === user.id);
        setInventoryItems(mine.map(listingToInventory));
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

  const stats = [
    {
      title: "Gross Mandi Revenue",
      value: orders.length > 0 ? `₹${totalRevenue.toLocaleString('en-IN')}` : "₹0",
      change: deliveredOrders.length > 0 ? `${deliveredOrders.length} sale${deliveredOrders.length > 1 ? 's' : ''}` : "No sales yet",
      isPositive: totalRevenue > 0,
      icon: IndianRupee,
      description: "Direct to Bank Account"
    },
    {
      title: "Active Listed Crops",
      value: `${inventoryItems.length} Batch${inventoryItems.length !== 1 ? 'es' : ''}`,
      change: inventoryItems.length > 0 ? "Listed on mandi" : "List crops to sell",
      isPositive: inventoryItems.length > 0,
      icon: Package,
      description: "Ready for procurement"
    },
    {
      title: "Total Shipments",
      value: `${deliveredOrders.length} Deliver${deliveredOrders.length !== 1 ? 'ies' : 'y'}`,
      change: deliveredOrders.length > 0 ? "All completed" : "No deliveries yet",
      isPositive: deliveredOrders.length > 0,
      icon: Truck,
      description: "Completed orders"
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
      alert('Crop listed successfully! It is now visible to buyers in the marketplace.');
    } catch (err) {
      console.error('Failed to create listing:', err);
      alert(`Failed to list crop: ${err.message}`);
    }
  };

  return (
    <div className="py-2 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5DCCF] shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2D5A38] mb-1">
            <Wheat className="w-4 h-4" />
            <span>KISAN & FPO PRODUCER DASHBOARD</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#232921] font-heading">
            Farm Operations & Direct Sales Hub
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7264] mt-1">
            Manage your crop inventory, track live market demand, and view transparent UPI settlement logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#2D5A38] hover:bg-[#1E3D27] text-white font-semibold rounded-xl text-xs shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>List New Crop</span>
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
              Active Harvest Batches
            </h2>
            <span className="text-xs text-[#6B7264] font-medium">{inventoryItems.length} Registered Lots</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5DCCF] overflow-hidden shadow-xs">
            {inventoryItems.length === 0 ? (
              <div className="p-10 text-center">
                <Package className="w-12 h-12 text-[#E5DCCF] mx-auto mb-3" />
                <h3 className="text-sm font-bold text-[#232921] mb-1">No crops listed yet</h3>
                <p className="text-xs text-[#6B7264] mb-4 max-w-sm mx-auto">
                  You haven't listed any crops yet. Add your own harvest to start selling directly to buyers in the marketplace.
                </p>
                <button
                  onClick={() => setShowModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2D5A38] hover:bg-[#1E3D27] text-white font-semibold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>List Your First Crop</span>
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
                      <span>Available: <strong className="text-[#232921]">{item.stock}</strong></span>
                      <span>•</span>
                      <span>Mandi Demand: <strong className="text-[#2D5A38]">{item.demand}</strong></span>
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
                      Adjust
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
              Mandi Demand Intelligence
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5DCCF] p-5 space-y-4 shadow-xs">
            {barChartData.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-10 h-10 text-[#E5DCCF] mx-auto mb-3" />
                <p className="text-sm font-semibold text-[#232921] mb-1">No order data yet</p>
                <p className="text-xs text-[#6B7264]">
                  Mandi demand intelligence and payout charts will appear once buyers start placing orders on your listings.
                </p>
              </div>
            ) : (
              <>
                {/* Advisory note — derived from real order data */}
                <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DCCF]">
                  <div className="flex items-center gap-1.5 text-[#8C6D46] text-xs font-bold mb-1">
                    <TrendingUp className="w-3.5 h-3.5" />
                    ORDER SUMMARY
                  </div>
                  <p className="text-xs text-[#6B7264] leading-relaxed">
                    You have <strong className="text-[#2D5A38]">{orders.length} order{orders.length !== 1 ? 's' : ''}</strong> total
                    {deliveredOrders.length > 0 ? `, with <strong className="text-[#2D5A38]">${deliveredOrders.length} delivered</strong> and ₹${totalRevenue.toLocaleString('en-IN')} earned.` : ' — all pending or in transit.'}
                  </p>
                </div>

                {/* Visual Bar Chart */}
                <div>
                  <div className="flex items-center justify-between text-xs text-[#6B7264] font-medium mb-2">
                    <span>Recent Order Values</span>
                    <span className="text-[#2D5A38] font-bold">
                      {deliveredOrders.length > 0 ? `${deliveredOrders.length} completed` : `${orders.length} in progress`}
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

              <h3 className="text-lg font-bold text-[#232921] font-heading mb-1">List New Harvest Lot</h3>
              <p className="text-xs text-[#6B7264] mb-4">Register your freshly harvested crops to the direct mandi market.</p>

              <form onSubmit={handleAddCrop} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#232921] mb-1">Crop / Product Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Organic Bell Peppers"
                    value={newCrop.name}
                    onChange={(e) => setNewCrop({ ...newCrop, name: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E5DCCF] rounded-xl text-xs text-[#232921] focus:outline-none focus:border-[#2D5A38] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#232921] mb-1">Stock Quantity (kg)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 500"
                      value={newCrop.stock}
                      onChange={(e) => setNewCrop({ ...newCrop, stock: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E5DCCF] rounded-xl text-xs text-[#232921] focus:outline-none focus:border-[#2D5A38] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#232921] mb-1">Price (₹ per kg)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 45"
                      value={newCrop.price}
                      onChange={(e) => setNewCrop({ ...newCrop, price: e.target.value })}
                      className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E5DCCF] rounded-xl text-xs text-[#232921] focus:outline-none focus:border-[#2D5A38] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#232921] mb-1">Quality Grade</label>
                  <select
                    value={newCrop.grade}
                    onChange={(e) => setNewCrop({ ...newCrop, grade: e.target.value })}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#E5DCCF] rounded-xl text-xs text-[#232921] focus:outline-none focus:border-[#2D5A38] focus:bg-white"
                  >
                    <option value="Grade A+">Grade A+ (Certified Organic)</option>
                    <option value="Grade A">Grade A (Prime Mandi Lot)</option>
                    <option value="Grade B+">Grade B+ (Standard Lot)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl bg-[#FAF7F2] text-[#6B7264] hover:text-[#232921] text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#2D5A38] hover:bg-[#1E3D27] text-white font-semibold text-xs shadow-xs cursor-pointer"
                  >
                    Register Crop
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

              <h3 className="text-lg font-bold text-[#232921] font-heading mb-1">Adjust Listing</h3>
              <p className="text-xs text-[#6B7264] mb-4">
                Update price and stock for <strong>{adjustItem.name}</strong> ({adjustItem.grade}).
              </p>

              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#232921] mb-1">
                      Price (₹ per {adjustItem.rawUnit})
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
                      Stock ({adjustItem.rawUnit})
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
                    Remove Listing
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowAdjustModal(false); setAdjustItem(null); }}
                      className="px-4 py-2 rounded-xl bg-[#FAF7F2] text-[#6B7264] hover:text-[#232921] text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveAdjust}
                      disabled={adjusting}
                      className="px-4 py-2 rounded-xl bg-[#2D5A38] hover:bg-[#1E3D27] text-white font-semibold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {adjusting ? 'Saving…' : 'Save Changes'}
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
