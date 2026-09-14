import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, Loader2, Sprout, Search, CalendarRange, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';

const dirMeta = {
  up:     { icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,   chip: 'bg-emerald-600/10 text-emerald-700 border-emerald-600/20',   label: 'Rising' },
  down:   { icon: <TrendingDown className="w-5 h-5 text-red-600" />,     chip: 'bg-red-600/10 text-red-700 border-red-600/20',               label: 'Falling' },
  stable: { icon: <Minus className="w-5 h-5 text-amber-600" />,          chip: 'bg-amber-600/10 text-amber-700 border-amber-600/20',         label: 'Stable' }
};

export default function PricePredictions() {
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await api.getPriceForecast();
        if (active) setForecast(data?.forecast || []);
      } catch (e) {
        if (active) setError(e.message || 'Could not load price predictions.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const filtered = forecast.filter((f) =>
    !q || f.crop.toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <div className="py-2 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--ink) font-heading flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-(--leaf)" />
            Price Predictions
          </h1>
          <p className="text-xs sm:text-sm text-(--muted) mt-1">
            Forecast for the next 7 days, based on recent price movement and the seasonal cycle.
          </p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-(--faint) absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search crop…"
            className="pl-9 pr-3 py-2 bg-(--card) border border-(--line) rounded-xl text-sm text-(--ink) focus:outline-none focus:border-(--leaf) w-44 sm:w-56"
          />
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 px-4 py-3 bg-(--moss) border border-(--line-strong) rounded-xl text-xs text-(--leaf)">
        <Info className="w-4 h-4 mt-0.5 shrink-0" />
        <span>
          Predictions are AI estimates based on historical &amp; seasonal price patterns, not a guarantee.
          Actual prices may differ. Post-harvest and off-season swings are normal.
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 gap-3 text-(--muted)">
          <Loader2 className="w-5 h-5 animate-spin text-(--leaf)" />
          Calculating seasonal price trends…
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-(--card) rounded-2xl border border-(--line)">
          <p className="text-(--muted) text-sm">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-(--card) rounded-2xl border border-(--line)">
          <Sprout className="w-12 h-12 text-(--line) mx-auto mb-3" />
          <p className="text-(--muted) text-sm">No crops match "{q}".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((f, i) => {
            const d = dirMeta[f.direction] || dirMeta.stable;
            const pct = f.pct_change > 0 ? `+${f.pct_change.toFixed(1)}%` : `${f.pct_change.toFixed(1)}%`;
            return (
              <motion.div
                key={f.crop + i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className="bg-(--card) rounded-2xl border border-(--line) shadow-xs p-5 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-(--ink) font-heading">{f.crop}</h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-(--muted)">
                      <CalendarRange className="w-3.5 h-3.5" />
                      Next 7 days
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${d.chip}`}>
                    {d.icon}
                    {d.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-(--canvas) rounded-xl p-3">
                  <div>
                    <p className="text-[10px] text-(--faint) uppercase font-semibold">Current</p>
                    <p className="text-lg font-bold text-(--ink)">₹{f.current_price}<span className="text-[11px] font-medium text-(--faint)">/kg</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] text-(--faint) uppercase font-semibold">Predicted</p>
                    <p className="text-lg font-bold text-(--leaf)">₹{f.predicted_price}<span className="text-[11px] font-medium text-(--muted)">/kg</span></p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${f.direction === 'down' ? 'text-red-600' : f.direction === 'up' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {pct}
                  </span>
                  <span className="inline-flex items-center gap-1 text-(--muted)">
                    <Sprout className="w-3.5 h-3.5 text-(--leaf)" />
                    {f.season || 'Seasonal'}
                  </span>
                </div>

                {/* Confidence bar */}
                <div className="mt-auto">
                  <div className="flex items-center justify-between mb-1 text-[10px] text-(--faint) uppercase font-semibold">
                    <span>Confidence</span>
                    <span>{Math.round(f.confidence * 100)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-(--line) overflow-hidden">
                    <div className="h-full bg-(--leaf) rounded-full" style={{ width: `${Math.min(100, f.confidence * 100)}%` }} />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}