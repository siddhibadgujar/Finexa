import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { User, LogOut, Settings, ChevronDown, X, Building2, Mail, Globe, Shield, CheckCircle2, Menu, LayoutDashboard, BarChart3, AlertTriangle } from 'lucide-react';
import { API_URL } from '../config/api';

// ─────────────────────────────────────────────────────────────
// ProfileModal — self-contained: fetches, edits, saves, switches language
// ─────────────────────────────────────────────────────────────
const ProfileModal = ({ onClose }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '', email: '', businessName: '', businessType: '',
    language: localStorage.getItem('language') || 'en', role: ''
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState({ show: false, ok: true });

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch(`${API_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setFormData(prev => ({ ...prev, ...data }));
      } catch (e) {
        console.error('Profile fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Instantly update language app-wide
    if (name === 'language') {
      i18n.changeLanguage(value);
      localStorage.setItem('language', value);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/user/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: formData.name,
          businessName: formData.businessName,
          businessType: formData.businessType,
          language: formData.language
        })
      });
      const ok = res.ok;
      setSaveStatus({ show: true, ok });

      if (ok) {
        const localUser = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...localUser, name: formData.name }));
        const localBusiness = JSON.parse(localStorage.getItem('business') || '{}');
        localStorage.setItem('business', JSON.stringify({ ...localBusiness, businessName: formData.businessName }));
      }
    } catch {
      setSaveStatus({ show: true, ok: false });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus({ show: false, ok: true }), 3000);
    }
  };

  const inputClass  = "w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 focus:border-indigo-500 rounded-xl outline-none transition-all font-semibold text-gray-900 text-sm";
  const disabledClass = "w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl outline-none font-semibold text-gray-400 text-sm cursor-not-allowed";

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
              <User size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-black text-lg leading-tight">{t('settings.title')}</h2>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{t('settings.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            {saveStatus.show && (
              <div className={`flex items-center gap-2 p-3 rounded-2xl text-xs font-black uppercase tracking-widest border ${saveStatus.ok ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'}`}>
                <CheckCircle2 size={16} />
                {saveStatus.ok ? t('settings.success') : t('settings.error')}
              </div>
            )}

            {/* Account */}
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2">{t('settings.sections.account')}</p>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" name="name" value={formData.name} onChange={handleChange}
                placeholder={t('settings.fields.name')} className={inputClass} />
            </div>
            <div className="relative opacity-60">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="email" value={formData.email} disabled
                placeholder={t('settings.fields.email')} className={disabledClass} />
            </div>
            <div className="relative opacity-60">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" value={formData.role} disabled
                placeholder={t('settings.fields.role')} className={disabledClass} />
            </div>

            {/* Business */}
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-4">{t('settings.sections.business')}</p>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" name="businessName" value={formData.businessName} onChange={handleChange}
                placeholder={t('settings.fields.businessName')} className={inputClass} />
            </div>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" name="businessType" value={formData.businessType} onChange={handleChange}
                placeholder={t('settings.fields.businessType')} className={inputClass} />
            </div>

            {/* Preferences */}
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-4">{t('settings.sections.preferences')}</p>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select name="language" value={formData.language} onChange={handleChange}
                className={`${inputClass} appearance-none cursor-pointer`}>
                <option value="en">English (US)</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="mr">मराठी (Marathi)</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div className="px-6 pb-6 pt-2 flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-colors">
              {t('settings.cancel')}
            </button>
            <button onClick={handleSave} disabled={isSaving}
              className={`flex-1 py-3 ${isSaving ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-2xl font-black text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-100`}>
              {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>}
              {isSaving ? t('settings.saving') : t('settings.save')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Navbar
// ─────────────────────────────────────────────────────────────
const Navbar = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const businessStr = localStorage.getItem('business');
  const business = businessStr ? JSON.parse(businessStr) : null;

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('business');
    localStorage.removeItem('lastActive');
    navigate('/login');
    window.location.reload();
  };

  useEffect(() => {
    const handleClickOutside = () => setOpen(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const navLinks = [
    { key: 'nav.dashboard',     path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { key: 'nav.trendAnalysis',  path: '/analysis',  icon: <BarChart3 size={20} /> },
    { key: 'nav.anomaly',       path: '/anomaly',   icon: <AlertTriangle size={20} /> },
  ];

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">

            {/* Brand */}
            <a href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="bg-gradient-to-tr from-indigo-600 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-100 group-hover:scale-105 transition-transform">
                <span className="font-black text-xl text-white italic leading-none block w-6 h-6 flex items-center justify-center">F</span>
              </div>
              <span className="font-black text-xl tracking-tight text-gray-900 leading-none">Finexa</span>
            </a>

            {/* Mobile Menu Button - Left of User Section on small screens */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-500 hover:text-indigo-600 focus:outline-none ml-4"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8 ml-12">
              {navLinks.map((item) => (
                <a key={item.key} href={item.path}
                  className="text-sm font-black text-gray-400 hover:text-indigo-600 transition-all relative group py-2">
                  {t(item.key)}
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-indigo-600 transition-all group-hover:w-full rounded-full"></div>
                </a>
              ))}
            </div>

            <div className="flex-1"></div>

            {/* User Section */}
            <div className="flex items-center gap-6">
              {user ? (
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setOpen((prev) => !prev)}
                    className="flex items-center gap-3 group focus:outline-none"
                  >
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-sm font-black text-gray-900 leading-tight">{user?.name || 'User'}</span>
                      {business && (
                        <span className="text-[9px] text-indigo-500 uppercase font-black tracking-widest leading-none mt-1">
                          {business?.businessName || 'Business'}
                        </span>
                      )}
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100/50 shadow-sm group-hover:shadow-md transition-all">
                      <User size={18} />
                    </div>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown */}
                  {open && (
                    <div className="absolute right-0 top-14 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="py-1">
                        <button
                          onClick={() => { setOpen(false); setShowProfile(true); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                        >
                          <Settings size={16} className="text-indigo-500" />
                          {t('nav.profile')}
                        </button>
                        <div className="h-px bg-gray-100 mx-3"></div>
                        <button
                          onClick={() => { setOpen(false); handleLogout(); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <LogOut size={16} />
                          {t('nav.logout')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <a href="/login" className="text-sm font-black text-gray-400 hover:text-indigo-600 transition-colors">{t('nav.login')}</a>
                  <a href="/signup" className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-black text-sm hover:bg-indigo-700 hover:-translate-y-0.5 transition-all shadow-lg shadow-indigo-100">
                    {t('nav.signup')}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu Drawer - INSIDE nav for correct top positioning */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-md border-b border-gray-100 absolute top-full left-0 w-full z-[49] animate-in slide-in-from-top duration-300">
            <div className="px-4 pt-4 pb-8 space-y-2">
              {navLinks.map((item) => (
                <a
                  key={item.key}
                  href={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-4 px-4 py-4 text-base font-black text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl transition-all group"
                >
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-indigo-600 group-active:text-indigo-600 transition-colors">
                    {item.icon}
                  </div>
                  {t(item.key)}
                </a>
              ))}
            </div>
          </div>
        )}
      </nav>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
};

export default Navbar;
