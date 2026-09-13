import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Truck,
  CheckCircle2,
  Factory,
  Navigation,
  PhoneCall,
  Route,
  Package
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import RouteMap from '../components/RouteMap';
import { useLanguage } from '../context/LanguageContext';

export default function OrderTracking() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState(null);
  const [ordersList, setOrdersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      // Dispatch-track board: no order selected -> show every order and the
      // route path it followed, instead of dead-ending to /orders.
      if (!orderId) {
        setOrdersList([]);
        try {
          const data = await api.getOrders();
          setOrdersList(data.orders || []);
        } catch (err) {
          console.error('Failed to load orders for dispatch track:', err);
        } finally {
          setLoading(false);
        }
        return;
      }

      const fetchOrder = async () => {
        try {
          const response = await api.getOrderById(orderId);
          if (response && response.order) {
            setOrder(response.order);
          } else {
            setError(t('tracking.error.notFound'));
          }
        } catch (err) {
          console.error('Failed to fetch order:', err);
          setError(t('tracking.error.loadFailed'));
        } finally {
          setLoading(false);
        }
      };

      fetchOrder();
    };

    load();
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
        title: t('tracking.steps.orderConfirmed'),
        desc: `${t('tracking.deliveryTo')}: ${order.seller_name || t('tracking.steps.farmOrigin')}`,
        time: new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        status: currentStep >= 0 ? 'completed' : 'upcoming',
        icon: Factory,
        details: `${order.crop} • ${order.quantity} ${order.unit || 'kg'}`
      },
      {
        title: t('tracking.steps.dispatchReady'),
        desc: route ? `${t('tracking.steps.optimizedRoute')} ${route.distance_km} km` : t('tracking.steps.awaitingDispatch'),
        time: currentStep >= 1 ? new Date(order.updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : t('common.pending'),
        status: currentStep >= 1 ? 'completed' : currentStep === 0 ? 'current' : 'upcoming',
        icon: Route,
        details: route ? `${t('tracking.steps.etaCost')} ${Math.round(route.estimated_time_min)}${t('tracking.route.minutes')} • ₹${route.cost}` : t('tracking.steps.optimizing'),
        highlight: currentStep === 1
      },
      {
        title: t('tracking.steps.inTransit'),
        desc: route && route.waypoints ? `${t('tracking.steps.viaRoute')} ${route.waypoints.slice(1, -1).join(' → ') || t('tracking.steps.directRoute')}` : t('tracking.steps.directRoute'),
        time: currentStep >= 2 ? t('tracking.steps.liveTransit') : t('tracking.steps.awaitingShipment'),
        status: currentStep >= 2 ? 'completed' : currentStep === 1 ? 'current' : 'upcoming',
        icon: Navigation,
        highlight: currentStep === 2,
        details: route ? `${route.waypoints?.length || 2} ${t('tracking.steps.waypointsOptimized')}` : t('tracking.steps.multiStopActive')
      },
      {
        title: t('tracking.steps.delivered'),
        desc: `${t('tracking.steps.deliveryTo')} ${order.buyer_name || 'Customer'}`,
        time: currentStep >= 3 ? new Date(order.updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : t('tracking.steps.estimatedArrival'),
        status: currentStep >= 3 ? 'completed' : currentStep === 2 ? 'current' : 'upcoming',
        icon: CheckCircle2,
        details: t('tracking.steps.otpVerification')
      }
    ];
  };

  const steps = order ? getSteps(order) : [];

  if (loading) {
    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="bg-(--card) p-8 rounded-2xl border border-(--line) shadow-xs text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-(--leaf) mx-auto mb-4"></div>
          <p className="text-(--muted)">{t('tracking.loading')}</p>
        </div>
      </div>
    );
  }

  // Dispatch-track board: no specific order selected -> list every order with
  // the delivery path it followed, so the "Tracking / dispatch" page shows the
  // routes of all placed orders instead of redirecting to /orders.
  if (!orderId) {
    return (
      <div className="py-2 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-[#E5DCCF] shadow-xs">
          <div className="flex items-center gap-2 text-[#2D5A38] mb-1">
            <Route className="w-5 h-5" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#232921] font-heading">
              Dispatch Track
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#6B7264]">
            Every order and the delivery path it took — tap <strong>View Route</strong> for step-by-step tracking.
          </p>
        </div>

        {ordersList.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-[#E5DCCF]">
            <Truck className="w-12 h-12 text-[#E5DCCF] mx-auto mb-3" />
            <p className="text-sm text-[#6B7264]">No orders placed yet.</p>
            <a
              href="/orders"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-[#2D5A38] border border-[#2D5A38] rounded-xl text-xs font-semibold hover:bg-[#E8F0E9] transition-colors"
            >
              <Package className="w-4 h-4" />
              View My Orders
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {ordersList.map((o) => {
              const r = o.route
                ? (typeof o.route === 'string' ? JSON.parse(o.route) : o.route)
                : null;
              const delC =
                (o.delivery_lat != null && o.delivery_lng != null)
                  ? { lat: Number(o.delivery_lat), lng: Number(o.delivery_lng) }
                  : r?.delivery_coords || null;
              const show = r && r.pickup_coords && delC;

              return (
                <div key={o.id} className="bg-white rounded-2xl border border-[#E5DCCF] shadow-xs overflow-hidden">
                  <div className="p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono text-[#232921]">#{o.id.slice(0, 8)}</span>
                        <span className="text-xs text-[#6B7264]">{o.crop} • {o.quantity} {o.unit || 'kg'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase border border-[#C2D6C6] bg-[#E8F0E9] text-[#2D5A38]">
                          {o.status}
                        </span>
                        <button
                          onClick={() => navigate(`/order-tracking?orderId=${o.id}`)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2D5A38] text-white rounded-lg text-xs font-semibold hover:bg-[#1E3D27] transition-colors cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          View Route
                        </button>
                      </div>
                    </div>

                    {show ? (
                      <div className="mb-3">
                        <RouteMap
                          pickup={{ ...r.pickup_coords, label: 'Farm Pickup' }}
                          delivery={{ ...delC, label: o.delivery_address || 'Delivery' }}
                          polyline={r.polyline || null}
                          height={200}
                        />
                      </div>
                    ) : (
                      <div className="mb-3 px-3 py-2 rounded-lg bg-[#FAF7F2] border border-[#E5DCCF] text-[11px] text-[#8E9687]">
                        Route not optimized yet for this order.
                      </div>
                    )}

                    {r && (
                      <p className="text-[11px] text-[#6B7264]">
                        🚛 {r.distance_km} km • ~{Math.round(r.estimated_time_min)}{t('common.minutes')}
                        {r.waypoints?.length ? ` • ${r.waypoints.length} ${t('tracking.steps.waypointsOptimized')}` : ''}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="bg-(--card) p-8 rounded-2xl border border-(--line) shadow-xs text-center">
          <Truck className="w-16 h-16 text-(--line) mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-(--ink) mb-2">
            {error === t('tracking.error.noOrderId') ? t('tracking.error.noOrderSelectedTitle') : t('tracking.error.notFoundTitle')}
          </h3>
          <p className="text-(--muted) mb-6">
            {error === t('tracking.error.noOrderId')
              ? t('tracking.error.noOrderSelectedDesc')
              : error || t('tracking.error.notFoundDesc')}
          </p>
          <a
            href="/orders"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-(--leaf) text-white rounded-xl text-sm font-semibold hover:bg-(--leaf-deep) transition-colors"
          >
            <Package className="w-4 h-4" />
            {t('tracking.button.viewMyOrders')}
          </a>
        </div>
      </div>
    );
  }

  const route = order.route ? (typeof order.route === 'string' ? JSON.parse(order.route) : order.route) : null;

  // Resolve delivery coords: prefer the order's stored map pin, else the
  // route's delivery coords (for orders that predate the stored-pin feature).
  const deliveryCoords =
    (order.delivery_lat != null && order.delivery_lng != null)
      ? { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) }
      : route?.delivery_coords || null;
  const showMap = route && route.pickup_coords && deliveryCoords;

  return (
    <div className="py-2 max-w-4xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-(--card) p-6 rounded-2xl border border-(--line) shadow-xs">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-(--leaf) mb-1">
            <Truck className="w-4 h-4" />
            <span>{t('tracking.banner.tagline')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--ink) font-heading">
            {t('tracking.banner.title')}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-(--moss) text-(--leaf) border border-(--line-strong)">
            <span className="w-2 h-2 rounded-full bg-(--leaf) animate-pulse" />
            {order.status === 'shipped' ? t('tracking.badge.gpsLinked') : t('tracking.badge.tracked')}
          </span>
        </div>
      </div>

      {/* Main Order Container */}
      <div className="bg-(--card) rounded-2xl border border-(--line) shadow-xs p-6 sm:p-8">
        {/* Order Details Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-6 mb-6 border-b border-(--line)">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl font-bold font-mono text-(--ink)">#{order.id.slice(0, 8)}</span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-(--moss) text-(--leaf) border border-(--line-strong)">
                {order.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-(--muted)">
              {order.crop} • <strong className="text-(--ink)">{order.quantity} {order.unit || 'kg'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-6 sm:text-right">
            <div>
              <div className="text-[10px] uppercase font-semibold text-(--faint)">{t('common.totalAmount')}</div>
              <div className="text-2xl font-bold font-mono text-(--leaf)">₹{order.total_price}</div>
            </div>
            <div className="h-8 w-px bg-(--line) hidden sm:block" />
            <div className="text-left sm:text-right">
              <div className="text-[10px] uppercase font-semibold text-(--faint)">{t('common.payment')}</div>
              <div className="text-xs font-semibold text-(--ink)">{order.payment_method?.toUpperCase() || 'COD'}</div>
            </div>
          </div>
        </div>

        {/* Route Optimization Info */}
        {route && (
          <div className="mb-8 p-4 rounded-xl bg-(--canvas) border border-(--line)">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-(--moss) text-(--leaf) flex items-center justify-center shrink-0">
                <Route className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-bold text-(--ink) mb-1">
                  {t('tracking.route.heading')}
                </div>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="text-(--faint) font-semibold">{t('tracking.route.distance')}</div>
                    <div className="text-(--ink) font-bold">{route.distance_km} km</div>
                  </div>
                  <div>
                    <div className="text-(--faint) font-semibold">{t('tracking.route.estTime')}</div>
                    <div className="text-(--ink) font-bold">{Math.round(route.estimated_time_min)}{t('tracking.route.minutes')}</div>
                  </div>
                  <div>
                    <div className="text-(--faint) font-semibold">{t('tracking.route.cost')}</div>
                    <div className="text-(--ink) font-bold">₹{route.cost}</div>
                  </div>
                </div>
              </div>
            </div>
            {route.waypoints && route.waypoints.length > 0 && (
              <div className="mt-3 pt-3 border-t border-(--line)">
<div className="text-[10px] uppercase font-semibold text-(--faint) mb-2">Delivery Stops ({route.waypoints.length}):</div>
                <div className="flex flex-col gap-1.5">
                  {route.waypoints.map((waypoint, idx) => {
                    const isPickup = idx === 0;
                    const isFinal = idx === route.waypoints.length - 1;
                    return (
                      <div key={idx} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-(--card) border border-(--line)">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isPickup ? 'bg-(--leaf) text-white' : isFinal ? 'bg-(--danger) text-white' : 'bg-(--moss) text-(--leaf)'
                        }`}>{idx + 1}</span>
                        <span className="text-[11px] text-(--ink) flex-1">{waypoint}</span>
                        <span className={`text-[9px] font-semibold uppercase shrink-0 ${isPickup ? 'text-(--leaf)' : isFinal ? 'text-(--danger)' : 'text-(--faint)'}`}>
                          {isPickup ? 'Pickup' : isFinal ? 'Delivery' : `Stop ${idx}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {showMap && (
              <div className="mt-3 pt-3 border-t border-(--line)">
                <div className="text-[10px] uppercase font-semibold text-(--faint) mb-2">Route Path on Map:</div>
                <RouteMap
                  pickup={{ ...route.pickup_coords, label: 'Farm Pickup' }}
                  delivery={{ ...deliveryCoords, label: order.delivery_address || 'Delivery' }}
                  polyline={route.polyline || null}
                  height={260}
                />
              </div>
            )}
          </div>
        )}

        {/* Live Driver & Transit Box (only for shipped orders) */}
        {order.status === 'shipped' && (
          <div className="mb-8 p-4 rounded-xl bg-(--canvas) border border-(--line) flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-(--moss) text-(--leaf) flex items-center justify-center shrink-0">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-(--ink) flex items-center gap-2">
                  {t('tracking.dispatch.onSchedule')}
                  {route && <span className="text-[11px] font-semibold text-(--leaf)">({t('tracking.dispatch.etaMins')} {Math.round(route.estimated_time_min)}{t('tracking.route.minutes')})</span>}
                </div>
                <div className="text-xs text-(--muted) mt-0.5">
                  {t('tracking.dispatch.inTransitDesc')}
                </div>
              </div>
            </div>

            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--card) border border-(--line) hover:border-(--leaf) text-xs font-semibold text-(--ink) transition-colors cursor-pointer shadow-xs">
              <PhoneCall className="w-3.5 h-3.5 text-(--leaf)" />
              <span>{t('tracking.button.contactSupport')}</span>
            </button>
          </div>
        )}

        {/* Timeline */}
        <div className="relative pl-6 sm:pl-8 border-l-2 border-(--line) space-y-7 py-1 ml-3 sm:ml-4">
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
                      ? 'bg-(--leaf) border-(--leaf) text-white'
                      : isCurrent
                      ? 'bg-(--card) border-(--leaf) text-(--leaf) ring-4 ring-(--moss)'
                      : 'bg-(--card) border-(--line) text-(--faint)'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>

                {/* Step info */}
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`font-bold text-sm font-heading ${
                      isCurrent ? 'text-(--leaf)' : isDone ? 'text-(--ink)' : 'text-(--faint)'
                    }`}>
                      {step.title}
                    </h3>
                    <span className="text-[11px] text-(--faint)">[{step.time}]</span>
                    {step.highlight && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-(--moss) text-(--leaf) border border-(--line-strong)">
                        {t('tracking.badge.directExpress')}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-(--ink) font-medium">{step.desc}</p>
                  <p className="text-[11px] text-(--muted)">{step.details}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
