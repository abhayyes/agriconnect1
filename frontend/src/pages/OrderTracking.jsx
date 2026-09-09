import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Truck,
  CheckCircle2,
  Clock,
  Package,
  Ship,
  Navigation,
  ShoppingBag,
  PackageCheck,
  User
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import { useAuth } from '../App';

// Keyed the same way order.status is stored so the timeline stays data-driven.
const STEPS = [
  { key: 'pending',   icon: <Clock className="w-4 h-4" />,        label: 'Order Placed', color: 'amber'   },
  { key: 'confirmed', icon: <CheckCircle2 className="w-4 h-4" />, label: 'Confirmed',    color: 'blue'    },
  { key: 'shipped',   icon: <Ship className="w-4 h-4" />,         label: 'Shipped',      color: 'indigo'  },
  { key: 'delivered', icon: <PackageCheck className="w-4 h-4" />, label: 'Delivered',    color: 'emerald' }
];

const COLOR_MAP = {
  amber:   { dot: 'bg-amber-500',  line: 'bg-amber-200',  text: 'text-amber-700' },
  blue:    { dot: 'bg-blue-500',   line: 'bg-blue-200',   text: 'text-blue-700'  },
  indigo:  { dot: 'bg-indigo-500', line: 'bg-indigo-200', text: 'text-indigo-700' },
  emerald: { dot: 'bg-emerald-500',line: 'bg-emerald-200',text: 'text-emerald-700' }
};

const STATUS_LABEL = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

const statusBadge = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200'
};

// Build a vertical timeline for one order from its current status.
function DispatchTimeline({ order, isFarmer }) {
  const currentIdx = STEPS.findIndex(s => s.key === order.status);

  return (
    <div className="mt-4 pt-4 border-t border-[#E5DCCF]">
      {/* Buyer "dispatch on the move" banner — only once order has shipped */}
      {!isFarmer && order.status === 'shipped' && (
        <div className="mb-4 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Navigation className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-800">Dispatch on the move</p>
            <p className="text-xs text-indigo-600">
              Your order is on its way{order.delivery_address ? ` to ${order.delivery_address}` : ''}
              {order.route?.estimated_time_min ? ` — ETA ~${order.route.estimated_time_min} min` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Farmer AI route summary */}
      {isFarmer && order.route && (
        <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MapPin className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-800">AI Optimized Route</p>
            <p className="text-xs text-blue-600">
              {order.route.distance_km ? `${order.route.distance_km} km` : ''}
              {order.route.estimated_time_min ? ` · ETA ${order.route.estimated_time_min} min` : ''}
              {order.route.waypoints?.length ? ` · ${order.route.waypoints.length} stops` : ''}
            </p>
          </div>
        </div>
      )}

      {/* Vertical timeline */}
      <div className="relative pl-6">
        {STEPS.map((step, idx) => {
          const reached = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          const colors = COLOR_MAP[step.color];

          return (
            <div key={step.key} className="relative flex items-start gap-4 pb-4 last:pb-0">
              {idx < STEPS.length - 1 && (
                <div className={`absolute left-0 top-6 w-0.5 h-full ${reached ? colors.line : 'bg-[#E5DCCF]'}`} />
              )}
              <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ring-4 ${
                reached ? `${colors.dot} ring-white text-white` : 'bg-white border-2 border-[#E5DCCF] text-[#8E9687]'
              }`}>
                {step.icon}
              </div>
              <div className="pt-0.5">
                <p className={`text-sm font-semibold ${reached ? 'text-[#232921]' : 'text-[#8E9687]'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-[#8E9687]">
                  {isCurrent ? (idx === 0 ? 'Now' : 'Current step') : reached ? 'Done' : 'Waiting'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Single order card used in both the Ongoing and Delivered sections.
function OrderCard({ order, isFarmer, index }) {
  const dateStr = order.created_at
    ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: (index % 6) * 0.05 }}
      className="bg-white rounded-2xl border border-[#E5DCCF] shadow-xs overflow-hidden"
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              order.status === 'delivered' ? 'bg-emerald-100 text-emerald-600'
              : order.status === 'shipped' ? 'bg-indigo-100 text-indigo-600'
              : order.status === 'confirmed' ? 'bg-blue-100 text-blue-600'
              : 'bg-amber-100 text-amber-600'
            }`}>
              {order.status === 'shipped' ? <Ship className="w-5 h-5" />
                : order.status === 'delivered' ? <PackageCheck className="w-5 h-5" />
                : <Package className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#232921] font-mono">#{String(order.id || '').slice(0, 8)}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusBadge[order.status] || statusBadge.pending}`}>
                  {STATUS_LABEL[order.status] || order.status}
                </span>
              </div>
              <p className="text-xs text-[#6B7264] mt-0.5">{dateStr}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-[#2D5A38]">₹{order.total_price}</div>
            <div className="text-xs text-[#6B7264]">{order.quantity} {order.unit}</div>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#E5DCCF]">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#FAF7F2] rounded-lg text-[#6B7264]">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[#8E9687] uppercase font-semibold mb-0.5">Product</p>
              <p className="text-sm font-medium text-[#232921]">{order.crop}</p>
              <p className="text-xs text-[#6B7264] mt-1">{order.quantity} {order.unit}</p>
              {!isFarmer && order.payment_method && (
                <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border
                  bg-emerald-50 text-emerald-700 border-emerald-200">
                  {order.payment_method.toUpperCase()} · {order.payment_status === 'paid' ? 'Paid' : 'Pay on delivery'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#FAF7F2] rounded-lg text-[#6B7264]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[#8E9687] uppercase font-semibold mb-0.5">
                {isFarmer ? 'Buyer' : 'Seller'}
              </p>
              <p className="text-sm font-medium text-[#232921]">
                {isFarmer ? (order.buyer_name || '—') : (order.seller_name || 'Farm')}
              </p>
              <p className="text-xs text-[#6B7264] mt-1">
                {isFarmer ? (order.buyer_location || '') : (order.seller_phone || order.seller_email || '')}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#FAF7F2] rounded-lg text-[#6B7264]">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[#8E9687] uppercase font-semibold mb-0.5">Delivery To</p>
              <p className="text-sm font-medium text-[#232921]">
                {order.delivery_address || ((isFarmer && order.buyer_location) || 'Address not provided')}
              </p>
              {order.route ? (
                <p className="text-xs text-[#6B7264] mt-1">🚛 {order.route.distance_km || ''} · Route optimized via AI</p>
              ) : (
                <p className="text-xs text-[#8E9687] mt-1">AI route assigned on confirm</p>
              )}
            </div>
          </div>
        </div>

        {/* Timeline (only meaningful while an order is live) */}
        {order.status !== 'cancelled' && <DispatchTimeline order={order} isFarmer={isFarmer} />}
      </div>
    </motion.div>
  );
}

export default function OrderTracking() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const isFarmer = user?.role === 'farmer' || user?.role === 'fpo';

  useEffect(() => {
    if (user) {
      loadOrders();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  // ONGOING orders only — the "live dispatch" feed.
  const ongoing = orders.filter(o => ['pending', 'confirmed', 'shipped'].includes(o.status));
  // Separate Delivered section.
  const delivered = orders.filter(o => o.status === 'delivered');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#2D5A38] border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <Truck className="w-16 h-16 text-[#E5DCCF] mx-auto mb-4" />
        <p className="text-[#6B7264] mb-4">Please login to see your live dispatch tracking.</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2.5 bg-[#2D5A38] text-white rounded-xl text-sm font-semibold"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="py-2 max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E5DCCF] shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#2D5A38] mb-1">
            <Truck className="w-4 h-4" />
            <span>LIVE CONSIGNMENT DISPATCH TRACKER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#232921] font-heading">
            Live Order & Logistics Status
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7264] mt-1">
            {isFarmer
              ? 'Live dispatch for orders placed on your listed harvests'
              : 'Track your farm-fresh orders in real time'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#FAF7F2] px-4 py-2 rounded-xl border border-[#E5DCCF] text-center">
            <span className="text-[10px] text-[#8E9687] uppercase font-semibold">Ongoing</span>
            <div className="text-lg font-bold text-[#232921]">{ongoing.length}</div>
          </div>
          <div className="bg-[#FAF7F2] px-4 py-2 rounded-xl border border-[#E5DCCF] text-center">
            <span className="text-[10px] text-[#8E9687] uppercase font-semibold">Delivered</span>
            <div className="text-lg font-bold text-[#2D5A38]">{delivered.length}</div>
          </div>
        </div>
      </div>

      {/* ── ONGOING ORDERS ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-[#2D5A38] animate-pulse" />
          <h2 className="text-sm font-bold text-[#232921] font-heading uppercase tracking-wide">
            Live Dispatch — Ongoing Orders
          </h2>
        </div>

        {ongoing.length === 0 ? (
          <div className="text-center py-14 bg-white rounded-2xl border border-[#E5DCCF]">
            <Truck className="w-14 h-14 text-[#E5DCCF] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#232921] mb-1">No ongoing orders</h3>
            <p className="text-[#6B7264] text-sm mb-6 max-w-md mx-auto">
              {isFarmer
                ? 'When buyers place orders on your listings and they are confirmed or shipped, their live dispatch status will appear here.'
                : 'When you place an order and the farmer confirms it, the live dispatch status will appear here.'}
            </p>
            {!isFarmer && (
              <button
                onClick={() => navigate('/marketplace')}
                className="px-6 py-2.5 bg-[#2D5A38] text-white rounded-xl text-sm font-semibold shadow-xs hover:bg-[#1E3D27] cursor-pointer"
              >
                Browse Marketplace
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {ongoing.map((order, idx) => (
              <OrderCard key={order.id} order={order} isFarmer={isFarmer} index={idx} />
            ))}
          </div>
        )}
      </section>

      {/* ── DELIVERED ORDERS ── */}
      <section>
        <div className="flex items-center gap-2 mb-3 mt-8">
          <CheckCircle2 className="w-4 h-4 text-[#2D5A38]" />
          <h2 className="text-sm font-bold text-[#232921] font-heading uppercase tracking-wide">
            Delivered Orders
          </h2>
        </div>

        {delivered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E5DCCF]">
            <PackageCheck className="w-14 h-14 text-[#E5DCCF] mx-auto mb-4" />
            <p className="text-[#6B7264] text-sm">
              No delivered orders yet. Completed orders will be listed here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {delivered.map((order, idx) => (
              <OrderCard key={order.id} order={order} isFarmer={isFarmer} index={idx} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}