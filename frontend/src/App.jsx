import { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { Sprout, LayoutDashboard, ShoppingBag, Truck, UserCheck, LogOut, ArrowRight, ShieldCheck, Activity, Package } from 'lucide-react';
import Login from './pages/Login';
import ConsumerMarketplace from './pages/ConsumerMarketplace';
import FarmerDashboard from './pages/FarmerDashboard';
import Tracking from './pages/OrderTracking';
import Orders from './pages/Orders';
import { api } from './services/api';

// Simple lightweight AuthContext for authentic session state
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function Navbar() {
  const { user, logout, backendStatus } = useAuth();
  const navigate = useNavigate();

  const isFarmer = user?.role === 'farmer' || user?.role === 'fpo';
  const isBuyer = user?.role === 'consumer' || user?.role === 'bulk_buyer';

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E5DCCF]">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
            <NavLink to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-[#2D5A38] text-[#FAF7F2] flex items-center justify-center shadow-sm group-hover:bg-[#1E3D27] transition-colors">
                <Sprout className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 font-bold text-lg tracking-tight text-[#232921] font-heading">
                  Agri<span className="text-[#2D5A38]">Connect</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E8F0E9] text-[#2D5A38] border border-[#C2D6C6]">
                    SIH 26033
                  </span>
                  {backendStatus?.status === 'ok' && (
                    <span
                      title="Connected to Backend"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#E8F0E9] text-[#2D5A38] border border-[#C2D6C6]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2D5A38] animate-pulse" />
                      API Live
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#6B7264] hidden sm:block">Direct Farmer to Consumer Network</p>
              </div>
            </NavLink>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1.5 sm:gap-3">
            {isBuyer && (
              <NavLink
                to="/marketplace"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#E8F0E9] text-[#2D5A38] font-semibold shadow-xs'
                      : 'text-[#6B7264] hover:text-[#232921] hover:bg-[#F2ECE1]'
                  }`
                }
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Mandi Market</span>
              </NavLink>
            )}

            {isFarmer && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#E8F0E9] text-[#2D5A38] font-semibold shadow-xs'
                      : 'text-[#6B7264] hover:text-[#232921] hover:bg-[#F2ECE1]'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Farmer Studio</span>
              </NavLink>
            )}

            <NavLink
              to="/orders"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#E8F0E9] text-[#2D5A38] font-semibold shadow-xs'
                    : 'text-[#6B7264] hover:text-[#232921] hover:bg-[#F2ECE1]'
                }`
              }
            >
              <Package className="w-4 h-4" />
              <span>Orders</span>
            </NavLink>

            <NavLink
              to="/tracking"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#E8F0E9] text-[#2D5A38] font-semibold shadow-xs'
                    : 'text-[#6B7264] hover:text-[#232921] hover:bg-[#F2ECE1]'
                }`
              }
            >
              <Truck className="w-4 h-4" />
              <span>Dispatch Track</span>
            </NavLink>

            <div className="h-4 w-px bg-[#E5DCCF] mx-1 hidden sm:block" />

            {/* Auth Profile / Switch role */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-semibold text-[#232921] leading-tight">{user.name}</span>
                  <span className="text-[10px] text-[#6B7264] font-mono capitalize">
                    {isFarmer ? '🌾 Kisan / FPO' : '🛒 Buyer'}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Logout / Switch Account"
                  className="p-2 rounded-lg text-[#6B7264] hover:text-[#991B1B] hover:bg-[#FEE2E2] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D5A38] text-white hover:bg-[#1E3D27] text-xs font-semibold transition-colors shadow-xs"
              >
                <span>Login / Register</span>
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
    <AuthContext.Provider value={{ user, loginUser, logout, backendStatus }}>
      <BrowserRouter>
        <div className="min-h-screen bg-[#FAF7F2] text-[#232921] flex flex-col selection:bg-[#2D5A38] selection:text-[#FAF7F2]">
          <Navbar />

          <main className="flex-1 container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
            <Routes>
              <Route path="/" element={<Navigate to={user ? (user.role === 'farmer' ? '/dashboard' : '/marketplace') : '/login'} replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/marketplace" element={<ConsumerMarketplace />} />
              <Route path="/dashboard" element={<FarmerDashboard />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/tracking" element={<Tracking />} />
            </Routes>
          </main>

          <footer className="border-t border-[#E5DCCF] bg-[#F2ECE1] text-[#6B7264] py-6 text-xs mt-12">
            <div className="container mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#2D5A38]" />
                <span>AgriConnect — Smart India Hackathon 2026</span>
              </div>
              <div className="flex items-center gap-4 text-[#6B7264]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#2D5A38]" />
                  Direct Trade Protocol Active
                </span>
                <span>Zero Middlemen • 100% Fair Value</span>
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
