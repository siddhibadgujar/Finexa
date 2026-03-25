import React, { useState, useEffect } from 'react';
import { User, Globe, Shield, Building2, Mail, CheckCircle2 } from 'lucide-react';
import { API_URL } from '../config/api';

const Settings = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        businessName: '',
        businessType: '',
        role: '',
        language: localStorage.getItem('language') || 'en'
    });
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState({ show: false, message: '', type: 'success' });
    const [isSaving, setIsSaving] = useState(false);

    const translations = {
        en: { 
            welcome: "Welcome", 
            profileTitle: "Account Profile", 
            langTitle: "Language & Regional",
            role: "Account Role",
            business: "Business Name",
            businessType: "Business Category",
            saveSuccess: "Settings Updated Successfully",
            saveError: "Failed to update settings",
            saveBtn: "Save Changes",
            saving: "Saving..."
        },
        hi: { 
            welcome: "स्वागत है", 
            profileTitle: "खाता प्रोफ़ाइल", 
            langTitle: "भाषा और क्षेत्रीय",
            role: "खाता भूमिका",
            business: "व्यवसाय का नाम",
            businessType: "व्यवसाय श्रेणी",
            saveSuccess: "सेटिंग्स सफलतापूर्वक अपडेट की गईं",
            saveError: "सेटिंग्स अपडेट करने में विफल",
            saveBtn: "परिवर्तन सहेजें",
            saving: "सहेज रहा है..."
        },
        mr: { 
            welcome: "स्वागत आहे", 
            profileTitle: "खाते प्रोफाइल", 
            langTitle: "भाषा आणि प्रादेशिक",
            role: "खाते भूमिका",
            business: "व्यवसायाचे नाव",
            businessType: "व्यवसाय श्रेणी",
            saveSuccess: "सेटिंग्ज यशस्वीरित्या अपडेट केल्या",
            saveError: "सेटिंग्ज अपडेट करण्यात अयशस्वी",
            saveBtn: "बदल जतन करा",
            saving: "जतन करत आहे..."
        }
    };

    const t = translations[formData.language] || translations.en;

    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('token');
            try {
                const res = await fetch(`${API_URL}/api/user/profile`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                const data = await res.json();
                setFormData(prev => ({
                    ...prev,
                    ...data
                }));
            } catch (err) {
                console.error("Failed to fetch profile", err);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        
        if (name === 'language') {
            localStorage.setItem('language', value);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`${API_URL}/api/user/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formData.name,
                    businessName: formData.businessName,
                    businessType: formData.businessType,
                    language: formData.language
                })
            });

            const data = await res.json();

            if (res.ok) {
                setSaveStatus({ show: true, message: t.saveSuccess, type: 'success' });
                // Update local business name if changed
                if (formData.businessName) {
                    const localBusiness = JSON.parse(localStorage.getItem('business') || '{}');
                    localStorage.setItem('business', JSON.stringify({ ...localBusiness, businessName: formData.businessName }));
                }
            } else {
                setSaveStatus({ show: true, message: data.message || t.saveError, type: 'error' });
            }
        } catch (err) {
            setSaveStatus({ show: true, message: t.saveError, type: 'error' });
        } finally {
            setIsSaving(false);
            setTimeout(() => setSaveStatus({ ...saveStatus, show: false }), 3000);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-finexa-bg">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-full bg-finexa-bg pb-20">
            <div className="section-container space-y-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">
                            Account Settings
                        </h1>
                        <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[9px] opacity-80 mt-2">
                            {t.welcome}, {formData.name} • Personalize your Finexa experience
                        </p>
                    </div>
                    
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-8 py-4 ${isSaving ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100 transition-all active:scale-95 flex items-center gap-2`}
                    >
                        {isSaving ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        ) : null}
                        {isSaving ? t.saving : t.saveBtn}
                    </button>
                </div>

                {saveStatus.show && (
                    <div className={`p-4 rounded-2xl border ${saveStatus.type === 'success' ? 'bg-green-50 border-green-100 text-green-600' : 'bg-red-50 border-red-100 text-red-600'} animate-in fade-in slide-in-from-top-4 flex items-center gap-3`}>
                        <CheckCircle2 size={20} />
                        <p className="text-xs font-black uppercase tracking-widest">{saveStatus.message}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Profile Card */}
                    <div className="business-card p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                                <User size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">
                                {t.profileTitle}
                            </h2>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-4">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 opacity-60">
                                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-4">Email Address (Read-only)</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="email"
                                        value={formData.email}
                                        disabled
                                        className="w-full pl-12 pr-4 py-4 bg-gray-100 border border-gray-200 rounded-2xl outline-none font-bold text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-4">{t.role}</label>
                                <div className="relative">
                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text"
                                        value={formData.role}
                                        disabled
                                        className="w-full pl-12 pr-4 py-4 bg-gray-100 border border-gray-200 rounded-2xl outline-none font-bold text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Business Settings Card */}
                    <div className="business-card p-8">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-100">
                                <Building2 size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">
                                Business Entity
                            </h2>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-4">{t.business}</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text"
                                        name="businessName"
                                        value={formData.businessName}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-4">{t.businessType}</label>
                                <div className="relative">
                                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text"
                                        name="businessType"
                                        value={formData.businessType}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-gray-900"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-4">{t.langTitle}</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <select 
                                        name="language"
                                        value={formData.language}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 focus:border-indigo-500 rounded-2xl outline-none transition-all font-bold text-gray-900 appearance-none cursor-pointer"
                                    >
                                        <option value="en">English (US)</option>
                                        <option value="hi">हिन्दी (Hindi)</option>
                                        <option value="mr">मराठी (Marathi)</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                        <svg className="fill-current h-4 w-4" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
