import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, CheckCircle2, Clock, Ship, User, MapPin, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import RouteMap from '../components/RouteMap';
import { useAuth } from '../App';
import { useLanguage } from '../context/LanguageContext';

const statusColors = {
  pending: 'bg-(--warn-soft) text-amber-700 border-(--warn-soft)',
  confirmed: 'bg-(--info-soft) text-blue-700 border-(--info-soft)',
  shipped: 'bg-(--violet-soft) text-indigo-700 border-(--violet-soft)',
  delivered: 'bg-(--success-soft) text-emerald-700 border-(--success-soft)',
  cancelled: 'bg-(--danger-soft) text-red-700 border-(--danger-soft)'
};

export default function Orders() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updatingFor, setUpdatingFor] = useState(null);

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
    setUpdatingFor(orderId);
    try {
      await api.updateOrderStatus(orderId, status);
      await loadOrders();
      alert(`${t('orders.alert.statusUpdated')} ${status === 'cancelled' ? t('orders.dispatch.statusCancelled') : `${t('orders.dispatch.markedAs')} ${status}`}.`);
    } catch (err) {
      console.error('Failed to update order status:', err);
      alert(`${t('orders.alert.statusUpdateFailed')} ${status} order: ${err.message}`);
    } finally {
      setUpdating(false);
      setUpdatingFor(null);
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
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-(--leaf) border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-(--muted) mb-4">{t('orders.auth.loginPrompt')}</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-2 bg-(--leaf) text-white rounded-xl text-sm font-semibold"
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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--ink) font-heading">
            {isBuyer ? t('orders.heading.buyerTitle') : t('orders.heading.farmerTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-(--muted) mt-1">
            {isBuyer
              ? t('orders.heading.buyerDesc')
              : t('orders.heading.farmerDesc')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-(--card) px-4 py-2 rounded-xl border border-(--line) shadow-xs">
            <span className="text-[10px] text-(--faint) uppercase font-semibold">{t('orders.stats.totalOrders')}</span>
            <div className="text-lg font-bold text-(--ink)">{orders.length}</div>
          </div>
        </div>
      </div>

      {/* Order List */}
      {orders.length === 0 ? (
        <div className="text-center py-16 bg-(--card) rounded-2xl border border-(--line)">
          <ShoppingBag className="w-16 h-16 text-(--line) mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-(--ink) mb-2">{t('orders.empty.title')}</h3>
          <p className="text-(--muted) text-sm mb-6">
            {isBuyer
              ? t('orders.empty.buyerDesc')
              : t('orders.empty.farmerDesc')}
          </p>
          {isBuyer ? (
            <button
              onClick={() => navigate('/marketplace')}
              className="px-6 py-2.5 bg-(--leaf) text-white rounded-xl text-sm font-semibold shadow-xs hover:bg-(--leaf-deep)"
            >
              {t('orders.button.browseMarketplace')}
            </button>
          ) : (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 bg-(--leaf) text-white rounded-xl text-sm font-semibold shadow-xs hover:bg-(--leaf-deep)"
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
              className="bg-(--card) rounded-2xl border border-(--line) shadow-xs overflow-hidden"
            >
              <div className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${
                      order.status === 'delivered' ? 'bg-(--success-soft) text-emerald-600' :
                      order.status === 'cancelled' ? 'bg-(--danger-soft) text-red-600' :
                      order.status === 'shipped' ? 'bg-(--violet-soft) text-indigo-600' :
                      'bg-(--warn-soft) text-amber-600'
                    }`}>
                      {getStatusIcon(order.status)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-(--ink)">{t('orders.card.orderNumber')}{order.id.slice(0, 8)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors[order.status] || statusColors.pending}`}>
                          {t('orders.status.' + order.status) || order.status}
                        </span>
                      </div>
                      <p className="text-xs text-(--muted) mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-(--leaf)">
                      ₹{order.total_price}
                    </div>
                    <div className="text-xs text-(--muted)">
                      {order.quantity} {order.unit}
                    </div>
                  </div>
                </div>

                {/* Order Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-(--line)">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-(--canvas) rounded-lg text-(--muted)">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-(--faint) uppercase font-semibold mb-0.5">{t('orders.card.product')}</p>
                      <p className="text-sm font-medium text-(--ink)">{order.crop}</p>
                      <p className="text-xs text-(--muted) mt-1">{order.quantity} {order.unit}</p>
                      {isBuyer && order.payment_method && (
                        <span className={`inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          order.payment_status === 'paid'
                            ? 'bg-(--success-soft) text-emerald-700 border-(--success-soft)'
                            : 'bg-(--warn-soft) text-amber-700 border-(--warn-soft)'
                        }`}>
                          {order.payment_method.toUpperCase()}
                          {' · '}
                          {order.payment_status === 'paid' ? t('orders.payment.paid') : t('orders.payment.cod')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-(--canvas) rounded-lg text-(--muted)">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-(--faint) uppercase font-semibold mb-0.5">
                        {isBuyer ? t('orders.card.sellerLabel') : t('orders.card.buyerLabel')}
                      </p>
                      <p className="text-sm font-medium text-(--ink)">
                        {isBuyer ? (order.seller_name || 'Farm') : (order.buyer_name || user.name)}
                      </p>
                      <p className="text-xs text-(--muted) mt-1">
                        {isBuyer
                          ? (order.seller_phone || order.seller_email || '')
                          : (order.buyer_phone || order.buyer_email || '')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-(--canvas) rounded-lg text-(--muted)">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-(--faint) uppercase font-semibold mb-0.5">{t('orders.card.deliveryTo')}</p>
                      <p className="text-sm font-medium text-(--ink)">
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
                        <p className="text-xs text-(--muted) mt-1">
                          🚛 {order.route.distance_km ? `${order.route.distance_km} km` : ''}
                          {order.route.estimated_time_min ? ` · ~${order.route.estimated_time_min}${t('common.minutes')}` : ''}
                          {' · ' + t('orders.card.aiRouteOptimized')}
                        </p>
                      ) : (
                        <p className="text-xs text-(--faint) mt-1">{t('orders.card.aiRoutePending')}</p>
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
                    amber:   { dot: 'bg-(--warn-soft)0',  ring: 'ring-(--warn-soft)',  text: 'text-amber-700',  line: 'bg-amber-200' },
                    blue:    { dot: 'bg-(--info-soft)0',   ring: 'ring-(--info-soft)',   text: 'text-blue-700',   line: 'bg-blue-200' },
                    indigo:  { dot: 'bg-(--violet-soft)0',  ring: 'ring-(--violet-soft)', text: 'text-indigo-700', line: 'bg-indigo-200' },
                    emerald: { dot: 'bg-(--success-soft)0', ring: 'ring-(--success-soft)', text: 'text-emerald-700', line: 'bg-emerald-200' }
                  };

                  return (
                    <div className="mt-4 pt-4 border-t border-(--line)">
                      {/* Buyer "dispatch on the move" banner */}
                      {isBuyer && currentIdx >= 2 && (
                        <div className="mb-4 px-4 py-3 bg-(--violet-soft) border border-(--violet-soft) rounded-xl flex items-center gap-3">
                          <div className="p-2 bg-(--violet-soft) rounded-lg">
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
                        <div className="mb-4 px-4 py-3 bg-(--info-soft) border border-(--info-soft) rounded-xl flex items-center gap-3">
                          <div className="p-2 bg-(--info-soft) rounded-lg">
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
                                <div className={`absolute left-0 top-6 w-0.5 h-full ${reached ? colors.line : 'bg-(--line)'}`} />
                              )}
                              {/* Dot */}
                              <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ring-4 ${
                                reached ? `${colors.dot} ring-white text-white` : 'bg-(--card) border-2 border-(--line) text-(--faint)'
                              }`}>
                                {step.icon}
                              </div>
                              {/* Label */}
                              <div className="pt-0.5">
                                <p className={`text-sm font-semibold ${reached ? 'text-(--ink)' : 'text-(--faint)'}`}>
                                  {step.label}
                                </p>
                                <p className="text-xs text-(--faint)">
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
                <div className="mt-4 pt-4 border-t border-(--line) flex flex-wrap justify-between items-center gap-2">
                  {/* Track Order Button - always visible */}
                  <button
                    onClick={() => navigate(`/order-tracking?orderId=${order.id}`)}
                    className="px-4 py-2 bg-(--card) text-(--leaf) border border-(--leaf) rounded-xl text-xs font-semibold hover:bg-(--moss) transition-colors cursor-pointer flex items-center gap-2"
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
                          className="px-4 py-2 bg-(--leaf) text-white rounded-xl text-xs font-semibold hover:bg-(--leaf-deep) transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
                        >
{updating && updatingFor === order.id ? (
                            <>
                              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Calculating route…
                            </>
                          ) : t('orders.confirmOrder')}
                        </button>
                      )}
                      {isFarmer && order.status === 'confirmed' && (
                        <button
                          onClick={() => handleStatusChange(order.id, 'shipped')}
                          disabled={updating}
                          className="px-4 py-2 bg-(--leaf) text-white rounded-xl text-xs font-semibold hover:bg-(--leaf-deep) transition-colors disabled:opacity-50 cursor-pointer"
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
                          className="px-4 py-2 bg-(--card) text-(--danger) border border-(--danger-soft) rounded-xl text-xs font-semibold hover:bg-(--danger-soft) transition-colors disabled:opacity-50 cursor-pointer"
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
