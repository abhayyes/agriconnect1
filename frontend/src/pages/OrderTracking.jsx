import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MapPin,
  Truck,
  CheckCircle2,
  Factory,
  Navigation,
  PhoneCall,
  Route
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';

export default function OrderTracking() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError('No order ID provided');
        setLoading(false);
        return;
      }

      try {
        const response = await api.getOrderById(orderId);
        if (response && response.order) {
          setOrder(response.order);
        } else {
          setError('Order not found');
        }
      } catch (err) {
        console.error('Failed to fetch order:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  // Map order status to timeline steps
  const getSteps = (order) => {
    if (!order) return [];

    const statusMap = {
      pending: 0,
      confirmed: 1,
      shipped: 2,
      delivered: 3,
      cancelled: -1
    };

    const currentStep = statusMap[order.status] ?? 0;
    const route = order.route ? (typeof order.route === 'string' ? JSON.parse(order.route) : order.route) : null;

    return [
      {
        title: "Order Confirmed",
        desc: `Farm Origin: ${order.seller_name || 'Farm Producer'}`,
        time: new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        status: currentStep >= 0 ? 'completed' : 'upcoming',
        icon: Factory,
        details: `${order.crop} • ${order.quantity} ${order.unit || 'kg'}`
      },
      {
        title: "Route Optimized & Dispatch Ready",
        desc: route ? `Optimized Route: ${route.distance_km} km` : "Awaiting dispatch confirmation",
        time: currentStep >= 1 ? new Date(order.updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : "Pending",
        status: currentStep >= 1 ? 'completed' : currentStep === 0 ? 'current' : 'upcoming',
        icon: Route,
        details: route ? `ETA: ${Math.round(route.estimated_time_min)} mins • Cost: ₹${route.cost}` : "Route optimization in progress",
        highlight: currentStep === 1
      },
      {
        title: "In Transit",
        desc: route && route.waypoints ? `Via: ${route.waypoints.slice(1, -1).join(' → ') || 'Direct Route'}` : "Direct delivery route",
        time: currentStep >= 2 ? "Live Transit" : "Awaiting Shipment",
        status: currentStep >= 2 ? 'completed' : currentStep === 1 ? 'current' : 'upcoming',
        icon: Navigation,
        highlight: currentStep === 2,
        details: route ? `${route.waypoints?.length || 2} waypoints optimized for fastest delivery` : "Multi-stop optimization active"
      },
      {
        title: "Delivered",
        desc: `Delivery to: ${order.buyer_name || 'Customer'}`,
        time: currentStep >= 3 ? new Date(order.updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : "Estimated arrival",
        status: currentStep >= 3 ? 'completed' : currentStep === 2 ? 'current' : 'upcoming',
        icon: CheckCircle2,
        details: "Contactless handover with OTP verification"
      }
    ];
  };

  const steps = order ? getSteps(order) : [];

  if (loading) {
    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-2xl border border-[#E5DCCF] shadow-xs text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2D5A38] mx-auto mb-4"></div>
          <p className="text-[#6B7264]">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="bg-white p-8 rounded-2xl border border-[#E5DCCF] shadow-xs text-center">
          <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
          <a href="/orders" className="text-[#2D5A38] hover:underline">← Back to Orders</a>
        </div>
      </div>
    );
  }

  const route = order.route ? (typeof order.route === 'string' ? JSON.parse(order.route) : order.route) : null;

  return (
    <div className="py-2 max-w-4xl mx-auto space-y-6">
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
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F0E9] text-[#2D5A38] border border-[#C2D6C6]">
            <span className="w-2 h-2 rounded-full bg-[#2D5A38] animate-pulse" />
            {order.status === 'shipped' ? 'GPS Satellite Linked' : 'Order Tracked'}
          </span>
        </div>
      </div>

      {/* Main Order Container */}
      <div className="bg-white rounded-2xl border border-[#E5DCCF] shadow-xs p-6 sm:p-8">
        {/* Order Details Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 mb-6 border-b border-[#E5DCCF]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-bold font-mono text-[#232921]">#{order.id.slice(0, 8)}</span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-[#E8F0E9] text-[#2D5A38] border border-[#C2D6C6]">
                {order.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#6B7264]">
              {order.crop} • <strong className="text-[#232921]">{order.quantity} {order.unit || 'kg'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-6 sm:text-right">
            <div>
              <div className="text-[10px] uppercase font-semibold text-[#8E9687]">Total Amount</div>
              <div className="text-2xl font-bold font-mono text-[#2D5A38]">₹{order.total_price}</div>
            </div>
            <div className="h-8 w-px bg-[#E5DCCF] hidden sm:block" />
            <div className="text-left sm:text-right">
              <div className="text-[10px] uppercase font-semibold text-[#8E9687]">Payment</div>
              <div className="text-xs font-semibold text-[#232921]">{order.payment_method?.toUpperCase() || 'COD'}</div>
            </div>
          </div>
        </div>

        {/* Route Optimization Info */}
        {route && (
          <div className="mb-8 p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DCCF]">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-[#E8F0E9] text-[#2D5A38] flex items-center justify-center shrink-0">
                <Route className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-[#232921] mb-1">
                  AI-OPTIMIZED DELIVERY ROUTE
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="text-[#8E9687] font-semibold">Distance</div>
                    <div className="text-[#232921] font-bold">{route.distance_km} km</div>
                  </div>
                  <div>
                    <div className="text-[#8E9687] font-semibold">Est. Time</div>
                    <div className="text-[#232921] font-bold">{Math.round(route.estimated_time_min)} mins</div>
                  </div>
                  <div>
                    <div className="text-[#8E9687] font-semibold">Logistics Cost</div>
                    <div className="text-[#232921] font-bold">₹{route.cost}</div>
                  </div>
                </div>
              </div>
            </div>
            {route.waypoints && route.waypoints.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#E5DCCF]">
                <div className="text-[10px] uppercase font-semibold text-[#8E9687] mb-2">Optimized Waypoints:</div>
                <div className="flex flex-wrap gap-2">
                  {route.waypoints.map((waypoint, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-white border border-[#E5DCCF] text-[#232921]">
                      <MapPin className="w-3 h-3 text-[#2D5A38]" />
                      {waypoint}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Driver & Transit Box (only for shipped orders) */}
        {order.status === 'shipped' && (
          <div className="mb-8 p-4 rounded-xl bg-[#FAF7F2] border border-[#E5DCCF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#E8F0E9] text-[#2D5A38] flex items-center justify-center shrink-0">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#232921] flex items-center gap-2">
                  DISPATCH ON SCHEDULE
                  {route && <span className="text-[11px] font-semibold text-[#2D5A38]">(ETA: {Math.round(route.estimated_time_min)} mins)</span>}
                </div>
                <div className="text-xs text-[#6B7264] mt-0.5">
                  Your order is in transit via optimized route.
                </div>
              </div>
            </div>

            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E5DCCF] hover:border-[#2D5A38] text-xs font-semibold text-[#232921] transition-colors cursor-pointer shadow-xs">
              <PhoneCall className="w-3.5 h-3.5 text-[#2D5A38]" />
              <span>Contact Support</span>
            </button>
          </div>
        )}

        {/* Timeline */}
        <div className="relative pl-6 sm:pl-8 border-l-2 border-[#E5DCCF] space-y-7 py-1 ml-3 sm:ml-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isDone = step.status === 'completed';
            const isCurrent = step.status === 'current';

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.06 }}
                className="relative group"
              >
                {/* Timeline node */}
                <div
                  className={`absolute -left-[33px] sm:-left-[41px] top-0 p-1.5 rounded-full border transition-colors ${
                    isDone
                      ? 'bg-[#2D5A38] border-[#2D5A38] text-white'
                      : isCurrent
                      ? 'bg-white border-[#2D5A38] text-[#2D5A38] ring-4 ring-[#E8F0E9]'
                      : 'bg-white border-[#E5DCCF] text-[#8E9687]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Step info */}
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`font-bold text-sm font-heading ${
                      isCurrent ? 'text-[#2D5A38]' : isDone ? 'text-[#232921]' : 'text-[#8E9687]'
                    }`}>
                      {step.title}
                    </h3>
                    <span className="text-[11px] text-[#8E9687]">[{step.time}]</span>
                    {step.highlight && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E8F0E9] text-[#2D5A38] border border-[#C2D6C6]">
                        Direct Express
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[#232921] font-medium">{step.desc}</p>
                  <p className="text-[11px] text-[#6B7264]">{step.details}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
