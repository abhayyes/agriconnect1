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

// Fallback/seed inventory shown when no live listings load yet
const DEFAULT_INVENTORY = [
  { id: 1, name: "Organic Vine Tomatoes", grade: "Grade A+", stock: "450 kg", price: "₹35/kg", demand: "High Demand", status: "Active in Mandi" },
  { id: 2, name: "Golden Sharbati Wheat", grade: "Grade A", stock: "1,200 kg", price: "₹28/kg", demand: "Surging Demand", status: "Active in Mandi" },
  { id: 3, name: "Nashik Red Onions", grade: "Grade B+", stock: "800 kg", price: "₹24/kg", demand: "Peak Demand", status: "Dispatched (In Transit)" },
  { id: 4, name: "Aromatic Basmati Rice", grade: "Grade A+", stock: "350 kg", price: "₹85/kg", demand: "Stable", status: "Active in Mandi" }
];

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
  const [inventoryItems, setInventoryItems] = useState(DEFAULT_INVENTORY);

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

  // Load this farmer's real listings from the backend
  const loadMyListings = async () => {
    try {
      const data = await api.getProducts();
      if (user?.id && data.listings) {
        const mine = data.listings.filter(l => l.farmer_id === user.id);
        if (mine.length > 0) {
          setInventoryItems(mine.map(listingToInventory));
        }
      }
    } catch (err) {
      console.warn('Could not load listings:', err.message);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadMyListings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const stats = [
    {
      title: "Gross Mandi Revenue",
      value: "₹1,48,200",
      change: "+24.5%",
      isPositive: true,
      icon: IndianRupee,
      description: "Direct to Bank Account"
    },
    {
      title: "Active Listed Crops",
      value: `${inventoryItems.length} Batches`,
      change: "+2 this week",
      isPositive: true,
      icon: Package,
      description: "Ready for procurement"
    },
    {
      title: "Direct FPO Shipments",
      value: "34 Deliveries",
      change: "100% on-time",
      isPositive: true,
      icon: Truck,
      description: "Zero transit damage"
    }
  ];

  const barChartData = [
    { day: "Mon", height: "45%", val: "₹18k" },
    { day: "Tue", height: "60%", val: "₹24k" },
    { day: "Wed", height: "35%", val: "₹14k" },
    { day: "Thu", height: "80%", val: "₹32k" },
    { day: "Fri", height: "65%", val: "₹26k" },
    { day: "Sat", height: "95%", val: "₹38k" },
    { day: "Sun (Proj)", height: "100%", val: "₹42k", highlight: true }
  ];

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
            {/* Advisory note */}
            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#E5DCCF]">
              <div className="flex items-center gap-1.5 text-[#8C6D46] text-xs font-bold mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                REGIONAL PRICE ADVISORY (NORTH ZONE)
              </div>
              <p className="text-xs text-[#6B7264] leading-relaxed">
                Market trends show a <strong className="text-[#2D5A38]">+18% price surge</strong> for Tomatoes & Onions over the next 5 days due to festival procurement.
              </p>
            </div>

            {/* Visual Bar Chart */}
            <div>
              <div className="flex items-center justify-between text-xs text-[#6B7264] font-medium mb-2">
                <span>7-Day Daily Mandi Payout</span>
                <span className="text-[#2D5A38] font-bold">+28% growth</span>
              </div>

              <div className="h-36 bg-[#FAF7F2] rounded-xl border border-[#E5DCCF] p-3 pt-5 flex items-end justify-between gap-1.5">
                {barChartData.map((bar, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="text-[9px] font-mono text-[#8E9687] group-hover:text-[#232921] transition-colors">
                      {bar.val}
                    </div>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: bar.height }}
                      transition={{ duration: 0.5, delay: i * 0.05 }}
                      className={`w-full rounded-t-md transition-all ${
                        bar.highlight
                          ? 'bg-[#2D5A38]'
                          : 'bg-[#C2D6C6] group-hover:bg-[#2D5A38]'
                      }`}
                    />
                    <span className="text-[10px] text-[#6B7264] font-medium">{bar.day.slice(0, 3)}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-[#6B7264]">
              Tip: Holding 30% onion stock until Thursday can maximize average realisation.
            </p>
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
