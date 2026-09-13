import { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { Sprout, LayoutDashboard, ShoppingBag, Truck, UserCheck, LogOut, ArrowRight, ShieldCheck, Activity, Package } from 'lucide-react';
import Login from './pages/Login';
import ConsumerMarketplace from './pages/ConsumerMarketplace';
import FarmerDashboard from './pages/FarmerDashboard';
import Tracking from './pages/OrderTracking';
import Orders from './pages/Orders';
import { api } from './services/api';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import LanguageToggle from './components/LanguageToggle';
import ThemeToggle from './components/ThemeToggle';
import FarmerAssistantChat from './components/FarmerAssistantChat';

// Simple lightweight AuthContext for authentic session state
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function Navbar() {
  const { user, logout, backendStatus } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const isFarmer = user?.role === 'farmer' || user?.role === 'fpo';
  const isBuyer = user?.role === 'consumer' || user?.role === 'bulk_buyer';

  return (
    <header className="sticky top-0 z-40 bg-(--canvas)/90 backdrop-blur-md border-b border-(--line)">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
            <NavLink to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-(--leaf) text-(--canvas) flex items-center justify-center shadow-sm group-hover:bg-(--leaf-deep) transition-colors">
                <Sprout className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-(--ink) font-heading">
                  Agri<span className="text-(--leaf)">Connect</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-(--moss) text-(--leaf) border border-(--line-strong)">
                    SIH 26033
                  </span>
                  {backendStatus?.status === 'ok' && (
                    <span
                      title="Connected to Backend"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-(--moss) text-(--leaf) border border-(--line-strong)"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-(--leaf) animate-pulse" />
                      API Live
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-(--muted) hidden sm:block">{t('nav.tagline')}</p>
              </div>
            </NavLink>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5 sm:gap-3">
            {/* Language Toggle */}
            <LanguageToggle />

            <div className="h-4 w-px bg-(--line) mx-1 hidden sm:block" />

            {isBuyer && (
              <NavLink
                to="/marketplace"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-(--moss) text-(--leaf) font-semibold shadow-xs'
                      : 'text-(--muted) hover:text-(--ink) hover:bg-(--subtle)'
                  }`
                }
              >
                <ShoppingBag className="w-4 h-4" />
                <span>{t('nav.marketplace')}</span>
              </NavLink>
            )}

            {isFarmer && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-(--moss) text-(--leaf) font-semibold shadow-xs'
                      : 'text-(--muted) hover:text-(--ink) hover:bg-(--subtle)'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{t('nav.dashboard')}</span>
              </NavLink>
            )}

            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-(--moss) text-(--leaf) font-semibold shadow-xs'
                    : 'text-(--muted) hover:text-(--ink) hover:bg-(--subtle)'
                }`
              }
            >
              <Package className="w-4 h-4" />
              <span>{t('nav.orders')}</span>
            </NavLink>

            <NavLink
              to="/tracking"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-(--moss) text-(--leaf) font-semibold shadow-xs'
                    : 'text-(--muted) hover:text-(--ink) hover:bg-(--subtle)'
                }`
              }
            >
              <Truck className="w-4 h-4" />
              <span>{t('nav.tracking')}</span>
            </NavLink>

            <div className="h-4 w-px bg-(--line) mx-1 hidden sm:block" />

            {/* Auth Profile / Switch role */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-semibold text-(--ink) leading-tight">{user.name}</span>
                  <span className="text-[10px] text-(--muted) font-mono capitalize">
                    {isFarmer ? t('nav.role.farmer') : t('nav.role.buyer')}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title={t('nav.logout')}
                  className="p-2 rounded-lg text-(--muted) hover:text-(--danger) hover:bg-(--danger-soft) transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-(--leaf) text-white hover:bg-(--leaf-deep) text-xs font-semibold transition-colors shadow-xs"
              >
                <span>{t('nav.login')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </NavLink>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [backendStatus, setBackendStatus] = useState(null);

  useEffect(() => {
    // Check backend connection on mount
    api.checkHealth().then(status => {
      setBackendStatus(status);
    });
  }, []);

  const loginUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    if (userData.token) {
      localStorage.setItem('token', userData.token);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    api.logout();
  };

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthContext.Provider value={{ user, loginUser, logout, backendStatus }}>
          <BrowserRouter>
            <AppContent user={user} />
          </BrowserRouter>
        </AuthContext.Provider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function AppContent({ user }) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-(--canvas) text-(--ink) flex flex-col selection:bg-(--leaf) selection:text-(--canvas)">
      <Navbar />

      <main className="flex-1 container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <Routes>
          <Route path="/" element={<Navigate to={user ? (user.role === 'farmer' ? '/dashboard' : '/marketplace') : '/login'} replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/marketplace" element={<ConsumerMarketplace />} />
          {/* Farmer Studio is strictly for farmer/FPO accounts. Redirect
              buyer accounts elsewhere so roles stay separate. */}
          <Route path="/dashboard" element={
            user && (user.role === 'farmer' || user.role === 'fpo')
              ? <FarmerDashboard />
              : <Navigate to={user ? '/marketplace' : '/login'} replace />
          } />
          <Route path="/orders" element={<Orders />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/order-tracking" element={<Tracking />} />
        </Routes>
      </main>

      <footer className="border-t border-(--line) bg-(--subtle) text-(--muted) py-6 text-xs mt-12">
        <div className="container mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <ShieldCheck className="w-4 h-4 text-(--leaf)" />
            <span>{t('footer.tagline')}</span>
          </div>
          <div className="flex items-center gap-4 text-(--muted)">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-(--leaf)" />
              {t('footer.directTrade')}
            </span>
            <span>{t('footer.zeroMiddlemen')}</span>
          </div>
        </div>
      </footer>
      <ThemeToggle />
      <FarmerAssistantChat />
    </div>
  );
}
