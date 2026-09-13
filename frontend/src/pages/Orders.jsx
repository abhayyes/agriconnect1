import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, CheckCircle2, Clock, Ship, User, MapPin, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import RouteMap from '../components/RouteMap';
import { useAuth } from '../App';
import { useLanguage } from '../context/LanguageContext';

const statusColors = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200'
};

export default function Orders() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const isFarmer = user?.role === 'farmer' || user?.role === 'fpo';
  const isBuyer = user?.role === 'consumer' || user?.role === 'bulk_buyer';

  useEffect(() => {
    if (user) {
      loadOrders();
    } else {
      setLoading(false);
    }
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

  const handleStatusChange = async (orderId, status) => {
    setUpdating(true);
    try {
      await api.updateOrderStatus(orderId, status);
      await loadOrders();
      alert(`${t('orders.alert.statusUpdated')} ${status === 'cancelled' ? t('orders.dispatch.statusCancelled') : `${t('orders.dispatch.markedAs')} ${status}`}.`);
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert(`${t('orders.alert.statusUpdateFailed')} ${status} order: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'confirmed': return <CheckCircle2 className="w-5 h-5" />;
      case 'shipped': return <Ship className="w-5 h-5" />;
      case 'delivered': return <CheckCircle2 className="w-5 h-5" />;
      case 'cancelled': return <Ship className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#2D5A38] border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-[#6B7264] mb-4">{t('orders.auth.loginPrompt')}</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2 bg-[#2D5A38] text-white rounded-xl text-sm font-semibold"
        >
          {t('orders.auth.login')}
        </button>
      </div>
    );
  }

  return (
    <div className="py-2 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#232921] font-heading">
            {isBuyer ? t('orders.heading.buyerTitle') : t('orders.heading.farmerTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7264] mt-1">
            {isBuyer
              ? t('orders.heading.buyerDesc')
              : t('orders.heading.farmerDesc')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-[#E5DCCF] shadow-xs">
            <span className="text-[10px] text-[#8E9687] uppercase font-semibold">{t('orders.stats.totalOrders')}</span>
            <div className="text-lg font-bold text-[#232921]">{orders.length}</div>
          </div>
        </div>
      </div>

      {/* Order List */}
      {orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-[#E5DCCF]">
          <ShoppingBag className="w-16 h-16 text-[#E5DCCF] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[#232921] mb-2">{t('orders.empty.title')}</h3>
          <p className="text-[#6B7264] text-sm mb-6">
            {isBuyer
              ? t('orders.empty.buyerDesc')
              : t('orders.empty.farmerDesc')}
          </p>
          {isBuyer ? (
            <button
              onClick={() => navigate('/marketplace')}
              className="px-6 py-2.5 bg-[#2D5A38] text-white rounded-xl text-sm font-semibold shadow-xs hover:bg-[#1E3D27]"
            >
              {t('orders.button.browseMarketplace')}
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 bg-[#2D5A38] text-white rounded-xl text-sm font-semibold shadow-xs hover:bg-[#1E3D27]"
            >
              {t('orders.button.viewMyListings')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="bg-white rounded-2xl border border-[#E5DCCF] shadow-xs overflow-hidden"
            >
              <div className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      order.status === 'delivered' ? 'bg-emerald-100 text-emerald-600' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                      order.status === 'shipped' ? 'bg-indigo-100 text-indigo-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#232921]">{t('orders.card.orderNumber')}{order.id.slice(0, 8)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors[order.status] || statusColors.pending}`}>
                          {t('orders.status.' + order.status) || order.status}
                        </span>
                      </div>
                      <p className="text-xs text-[#6B7264] mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#2D5A38]">
                      ₹{order.total_price}
                    </div>
                    <div className="text-xs text-[#6B7264]">
                      {order.quantity} {order.unit}
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-[#E5DCCF]">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#FAF7F2] rounded-lg text-[#6B7264]">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#8E9687] uppercase font-semibold mb-0.5">{t('orders.card.product')}</p>
                      <p className="text-sm font-medium text-[#232921]">{order.crop}</p>
                      <p className="text-xs text-[#6B7264] mt-1">{order.quantity} {order.unit}</p>
                      {isBuyer && order.payment_method && (
                        <span className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          order.payment_status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {order.payment_method.toUpperCase()}
                          {' · '}
                          {order.payment_status === 'paid' ? t('orders.payment.paid') : t('orders.payment.cod')}
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
                        {isBuyer ? t('orders.card.sellerLabel') : t('orders.card.buyerLabel')}
                      </p>
                      <p className="text-sm font-medium text-[#232921]">
                        {isBuyer ? (order.seller_name || 'Farm') : (order.buyer_name || user.name)}
                      </p>
                      <p className="text-xs text-[#6B7264] mt-1">
                        {isBuyer
                          ? (order.seller_phone || order.seller_email || '')
                          : (order.buyer_phone || order.buyer_email || '')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#FAF7F2] rounded-lg text-[#6B7264]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#8E9687] uppercase font-semibold mb-0.5">{t('orders.card.deliveryTo')}</p>
                      <p className="text-sm font-medium text-[#232921]">
                        {order.delivery_address || (isFarmer && order.buyer_location) || t('orders.card.addressNotProvided')}
                      </p>
                      {(order.route?.pickup_coords) && (
                        (() => {
                          const delC = (order.delivery_lat != null && order.delivery_lng != null)
                            ? { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) }
                            : order.route.delivery_coords;
                          if (!delC) return null;
                          return (
                            <div className="mt-2">
                              <RouteMap
                                pickup={{ ...order.route.pickup_coords, label: 'Farm Pickup' }}
                                delivery={{ ...delC, label: order.delivery_address || 'Delivery' }}
                                polyline={order.route.polyline || null}
                                height={200}
                              />
                            </div>
                          );
                        })()
                      )}
                      {order.route ? (
                        <p className="text-xs text-[#6B7264] mt-1">
                          🚛 {order.route.distance_km ? `${order.route.distance_km} km` : ''}
                          {order.route.estimated_time_min ? ` · ~${order.route.estimated_time_min}${t('common.minutes')}` : ''}
                          {' · ' + t('orders.card.aiRouteOptimized')}
                        </p>
                      ) : (
                        <p className="text-xs text-[#8E9687] mt-1">{t('orders.card.aiRoutePending')}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enhanced Dispatch Timeline */}
                {order.status !== 'cancelled' && (() => {
                  const steps = [
                    { key: 'pending',   icon: <Clock className="w-4 h-4" />,        label: t('timeline.orderPlaced'),  color: 'amber' },
                    { key: 'confirmed', icon: <CheckCircle2 className="w-4 h-4" />, label: t('timeline.confirmed'),     color: 'blue'   },
                    { key: 'shipped',   icon: <Ship className="w-4 h-4" />,         label: t('timeline.shipped'),       color: 'indigo' },
                    { key: 'delivered', icon: <CheckCircle2 className="w-4 h-4" />, label: t('timeline.delivered'),     color: 'emerald' }
                  ];
                  const currentIdx = steps.findIndex(s => s.key === order.status);

                  const colorMap = {
                    amber:   { dot: 'bg-amber-500',  ring: 'ring-amber-100',  text: 'text-amber-700',  line: 'bg-amber-200' },
                    blue:    { dot: 'bg-blue-500',   ring: 'ring-blue-100',   text: 'text-blue-700',   line: 'bg-blue-200' },
                    indigo:  { dot: 'bg-indigo-500',  ring: 'ring-indigo-100', text: 'text-indigo-700', line: 'bg-indigo-200' },
                    emerald: { dot: 'bg-emerald-500', ring: 'ring-emerald-100', text: 'text-emerald-700', line: 'bg-emerald-200' }
                  };

                  return (
                    <div className="mt-4 pt-4 border-t border-[#E5DCCF]">
                      {/* Buyer "dispatch on the move" banner */}
                      {isBuyer && currentIdx >= 2 && (
                        <div className="mb-4 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3">
                          <div className="p-2 bg-indigo-100 rounded-lg">
                            <Ship className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-indigo-800">{t('orders.dispatch.onTheMove')}</p>
                            <p className="text-xs text-indigo-600">
                              {t('orders.dispatch.onItsWay')}{order.delivery_address ? ` ${order.delivery_address}` : ''}
                              {order.route?.estimated_time_min ? ` — ${t('tracking.dispatch.etaMins')} ~${order.route.estimated_time_min}${t('common.minutes')}` : ''}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Farmer route details */}
                      {isFarmer && order.route && (
                        <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <MapPin className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-blue-800">{t('orders.dispatch.aiRoute')}</p>
                            <p className="text-xs text-blue-600">
                              {order.route.distance_km ? `${order.route.distance_km} km` : ''}
                              {order.route.estimated_time_min ? ` · ${t('tracking.dispatch.etaMins')} ${order.route.estimated_time_min}${t('common.minutes')}` : ''}
                              {order.route.waypoints?.length ? ` · ${order.route.waypoints.length}${t('orders.dispatch.stops')}` : ''}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Vertical timeline */}
                      <div className="relative pl-6">
                        {steps.map((step, idx) => {
                          const reached = idx <= currentIdx;
                          const isCurrent = idx === currentIdx;
                          const colors = colorMap[step.color];

                          return (
                            <div key={step.key} className="relative flex items-start gap-4 pb-4 last:pb-0">
                              {/* Connecting line */}
                              {idx < steps.length - 1 && (
                                <div className={`absolute left-0 top-6 w-0.5 h-full ${reached ? colors.line : 'bg-[#E5DCCF]'}`} />
                              )}
                              {/* Dot */}
                              <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ring-4 ${
                                reached ? `${colors.dot} ring-white text-white` : 'bg-white border-2 border-[#E5DCCF] text-[#8E9687]'
                              }`}>
                                {step.icon}
                              </div>
                              {/* Label */}
                              <div className="pt-0.5">
                                <p className={`text-sm font-semibold ${reached ? 'text-[#232921]' : 'text-[#8E9687]'}`}>
                                  {step.label}
                                </p>
                                <p className="text-xs text-[#8E9687]">
                                  {isCurrent
                                    ? (idx === 0 ? t('timeline.now') : t('timeline.currentStep'))
                                    : reached
                                      ? t('timeline.done')
                                      : t('timeline.waiting')
                                  }
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Role-based actions */}
                <div className="mt-4 pt-4 border-t border-[#E5DCCF] flex flex-wrap justify-between items-center gap-2">
                  {/* Track Order Button - always visible */}
                  <button
                    onClick={() => navigate(`/order-tracking?orderId=${order.id}`)}
                    className="px-4 py-2 bg-white text-[#2D5A38] border border-[#2D5A38] rounded-xl text-xs font-semibold hover:bg-[#E8F0E9] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {t('orders.trackOrder')} {order.route && t('orders.viewRoute')}
                  </button>

                  {/* Status action buttons */}
                  {order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <div className="flex flex-wrap gap-2">
                      {isFarmer && order.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChange(order.id, 'confirmed')}
                          disabled={updating}
                          className="px-4 py-2 bg-[#2D5A38] text-white rounded-xl text-xs font-semibold hover:bg-[#1E3D27] transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {t('orders.confirmOrder')}
                        </button>
                      )}
                      {isFarmer && order.status === 'confirmed' && (
                        <button
                          onClick={() => handleStatusChange(order.id, 'shipped')}
                          disabled={updating}
                          className="px-4 py-2 bg-[#2D5A38] text-white rounded-xl text-xs font-semibold hover:bg-[#1E3D27] transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {t('orders.markShipped')}
                        </button>
                      )}
                      {isFarmer && order.status === 'shipped' && (
                        <button
                          onClick={() => handleStatusChange(order.id, 'delivered')}
                          disabled={updating}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {t('orders.markDelivered')}
                        </button>
                      )}
                      {(isBuyer && order.status === 'pending') || (isFarmer && (order.status === 'pending' || order.status === 'confirmed')) ? (
                        <button
                          onClick={() => handleStatusChange(order.id, 'cancelled')}
                          disabled={updating}
                          className="px-4 py-2 bg-white text-[#991B1B] border border-red-200 rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {t('orders.cancelOrder')}
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
