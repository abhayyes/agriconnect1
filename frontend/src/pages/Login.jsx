import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sprout,
  CheckCircle2,
  ShieldCheck,
  Eye,
  EyeOff,
  Wheat,
  Store,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../App';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { loginUser } = useAuth();

  // Role: 'FARMER' | 'BUYER'
  const [role, setRole] = useState('FARMER');
  // Mode: 'LOGIN' | 'REGISTER'
  const [mode, setMode] = useState('LOGIN');

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    location: '',
    fpoName: '', // Farmer specific
    buyerType: 'Retail Consumer' // Buyer specific
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      alert(t('login.alert.enterCredentials'));
      return;
    }

    setIsSubmitting(true);

    const credentials = {
      email: formData.email,
      password: formData.password,
      name: formData.name,
      role: role === 'FARMER' ? 'farmer' : 'consumer',
      phone: formData.phone,
      location: formData.location,
      fpoName: formData.fpoName,
      buyerType: formData.buyerType
    };

    try {
      const response = mode === 'REGISTER'
        ? await api.register(credentials)
        : await api.login(credentials);
      const authUser = {
        ...response.user,
        token: response.token
      };
      loginUser(authUser);
      setIsSubmitting(false);
      if (role === 'FARMER') {
        navigate('/dashboard');
      } else {
        navigate('/marketplace');
      }
    } catch (err) {
      setIsSubmitting(false);
      alert(err.message || t('login.alert.authFailed'));
    }
  };

  return (
    <div className="py-6 sm:py-10 max-w-4xl mx-auto">
      {/* Intro Header */}
      <div className="text-center max-w-xl mx-auto mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-(--moss) border border-(--line-strong) text-(--leaf) text-xs font-semibold mb-3">
          <Sprout className="w-3.5 h-3.5" />
          <span>{t('login.badge.tagline')}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-(--ink) font-heading">
          {t('login.hero.title')}
        </h1>
        <p className="text-sm text-(--muted) mt-2 leading-relaxed">
          {t('login.hero.description')}
        </p>
      </div>

      {/* Main Auth Container */}
      <div className="bg-(--card) rounded-2xl border border-(--line) shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Side: Role Selector & Trust badge */}
        <div className="md:col-span-5 bg-(--subtle) p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-(--line)">
          <div>
            <span className="text-[11px] uppercase tracking-wider font-semibold text-(--faint)">{t('login.roleSelector.title')}</span>
            <div className="space-y-3 mt-3">
              {/* Farmer Radio Card */}
              <button
                type="button"
                onClick={() => setRole('FARMER')}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                  role === 'FARMER'
                    ? 'bg-(--card) border-(--leaf) shadow-xs ring-1 ring-(--leaf)'
                    : 'bg-(--canvas) border-(--line) hover:bg-(--card) text-(--muted)'
                }`}
              >
                <div className={`p-2.5 rounded-lg shrink-0 ${
                  role === 'FARMER' ? 'bg-(--leaf) text-(--canvas)' : 'bg-(--line) text-(--muted)'
                }`}>
                  <Wheat className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-sm font-bold ${role === 'FARMER' ? 'text-(--ink)' : 'text-(--muted)'}`}>
                    {t('login.role.farmerTitle')}
                  </div>
                  <p className="text-xs text-(--muted) mt-0.5 leading-snug">
                    {t('login.role.farmerDesc')}
                  </p>
                </div>
              </button>

              {/* Buyer Radio Card */}
              <button
                type="button"
                onClick={() => setRole('BUYER')}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 ${
                  role === 'BUYER'
                    ? 'bg-(--card) border-(--leaf) shadow-xs ring-1 ring-(--leaf)'
                    : 'bg-(--canvas) border-(--line) hover:bg-(--card) text-(--muted)'
                }`}
              >
                <div className={`p-2.5 rounded-lg shrink-0 ${
                  role === 'BUYER' ? 'bg-(--leaf) text-(--canvas)' : 'bg-(--line) text-(--muted)'
                }`}>
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className={`text-sm font-bold ${role === 'BUYER' ? 'text-(--ink)' : 'text-(--muted)'}`}>
                    {t('login.role.buyerTitle')}
                  </div>
                  <p className="text-xs text-(--muted) mt-0.5 leading-snug">
                    {t('login.role.buyerDesc')}
                  </p>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-(--line) text-xs text-(--muted) space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-(--leaf)" />
              <span>{t('login.trust.verifiedKisan')}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-(--leaf)" />
              <span>{t('login.trust.zeroBrokerage')}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Form (Login / Register Tabs) */}
        <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
          <div>
            {/* Toggle: Login vs Register */}
            <div className="flex items-center gap-1 bg-(--subtle) p-1 rounded-xl mb-6 border border-(--line)">
              <button
                type="button"
                onClick={() => { setMode('LOGIN'); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                  mode === 'LOGIN'
                    ? 'bg-(--card) text-(--ink) shadow-xs'
                    : 'text-(--muted) hover:text-(--ink)'
                }`}
              >
                {t('login.tabs.login')}
              </button>
              <button
                type="button"
                onClick={() => { setMode('REGISTER'); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                  mode === 'REGISTER'
                    ? 'bg-(--card) text-(--ink) shadow-xs'
                    : 'text-(--muted) hover:text-(--ink)'
                }`}
              >
                {t('login.tabs.register')}
              </button>
            </div>

            {/* Title */}
            <div className="mb-5">
              <h2 className="text-lg font-bold text-(--ink) font-heading">
                {mode === 'LOGIN' ? t('login.heading.signIn') : (role === 'FARMER' ? t('login.heading.registerRoleFarmer') : t('login.heading.registerRoleBuyer'))}
              </h2>
              <p className="text-xs text-(--muted)">
                {mode === 'LOGIN'
                  ? t('login.subheading.signIn')
                  : t('login.subheading.register')}
              </p>
            </div>

            {/* Forms */}
            {mode === 'LOGIN' ? (
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-(--ink) mb-1.5">
                    {t('common.emailAddress')} <span className="text-(--danger)">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={t('login.placeholder.email')}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2.5 bg-(--canvas) border border-(--line) rounded-xl text-sm text-(--ink) placeholder-(--faint) focus:outline-none focus:border-(--leaf) focus:bg-(--card) transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-(--ink) mb-1.5">
                    {t('common.password')} <span className="text-(--danger)">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2.5 bg-(--canvas) border border-(--line) rounded-xl text-sm text-(--ink) placeholder-(--faint) focus:outline-none focus:border-(--leaf) focus:bg-(--card) transition-colors pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-(--faint) hover:text-(--ink)"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-(--leaf) hover:bg-(--leaf-deep) disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>{isSubmitting ? t('login.button.signingIn') : t('login.button.signIn')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* Registration Form */
              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-(--ink) mb-1">
                    {t('login.label.fullName')} <span className="text-(--danger)">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={role === 'FARMER' ? t('login.placeholder.nameFarmer') : t('login.placeholder.nameBuyer')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-(--canvas) border border-(--line) rounded-xl text-xs text-(--ink) placeholder-(--faint) focus:outline-none focus:border-(--leaf) focus:bg-(--card) transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-(--ink) mb-1">
                    {t('common.emailAddress')} <span className="text-(--danger)">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={t('login.placeholder.email')}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-(--canvas) border border-(--line) rounded-xl text-xs text-(--ink) placeholder-(--faint) focus:outline-none focus:border-(--leaf) focus:bg-(--card) transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-(--ink) mb-1">
                    {t('common.password')} <span className="text-(--danger)">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength="6"
                    placeholder={t('login.placeholder.passwordMin')}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-(--canvas) border border-(--line) rounded-xl text-xs text-(--ink) placeholder-(--faint) focus:outline-none focus:border-(--leaf) focus:bg-(--card) transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-(--ink) mb-1">
                      {t('login.label.mobileNumber')} <span className="text-(--danger)">*</span>
                    </label>
                    <input
                      type="tel"
                      maxLength={10}
                      required
                      placeholder={t('login.placeholder.mobileNumber')}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                      className="w-full px-3 py-2 bg-(--canvas) border border-(--line) rounded-xl text-xs text-(--ink) placeholder-(--faint) focus:outline-none focus:border-(--leaf) focus:bg-(--card) transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-(--ink) mb-1">
                      {t('login.label.location')} <span className="text-(--danger)">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t('login.placeholder.location')}
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 bg-(--canvas) border border-(--line) rounded-xl text-xs text-(--ink) placeholder-(--faint) focus:outline-none focus:border-(--leaf) focus:bg-(--card) transition-colors"
                    />
                  </div>
                </div>

                {role === 'FARMER' ? (
                  <div>
                    <label className="block text-xs font-medium text-(--ink) mb-1">
                      {t('login.label.fpoName')}
                    </label>
                    <input
                      type="text"
                      placeholder={t('login.placeholder.fpoName')}
                      value={formData.fpoName}
                      onChange={(e) => setFormData({ ...formData, fpoName: e.target.value })}
                      className="w-full px-3 py-2 bg-(--canvas) border border-(--line) rounded-xl text-xs text-(--ink) placeholder-(--faint) focus:outline-none focus:border-(--leaf) focus:bg-(--card) transition-colors"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-(--ink) mb-1">
                      {t('login.label.buyerCategory')} <span className="text-(--danger)">*</span>
                    </label>
                    <select
                      value={formData.buyerType}
                      onChange={(e) => setFormData({ ...formData, buyerType: e.target.value })}
                      className="w-full px-3 py-2 bg-(--canvas) border border-(--line) rounded-xl text-xs text-(--ink) focus:outline-none focus:border-(--leaf) focus:bg-(--card) transition-colors"
                    >
                      <option value="Retail Consumer">{t('login.buyerType.consumer')}</option>
                      <option value="Restaurant / Hotel">{t('login.buyerType.restaurant')}</option>
                      <option value="Wholesale Mandi Trader">{t('login.buyerType.trader')}</option>
                      <option value="Retail Supermarket Chain">{t('login.buyerType.supermarket')}</option>
                    </select>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-(--leaf) hover:bg-(--leaf-deep) text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <span>{t('login.button.completeRegistration')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>

          <p className="text-[11px] text-(--faint) text-center mt-6">
            {t('login.footer.terms')}
          </p>
        </div>
      </div>
    </div>
  );
}
