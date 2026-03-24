import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

const QuickActions = ({ onAddIncome, onAddExpense }) => {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      <button
        onClick={onAddIncome}
        className="flex items-center justify-center gap-4 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white p-6 rounded-[1.5rem] shadow-lg shadow-green-100 hover:shadow-green-200 transition-all active:scale-95 group"
      >
        <div className="bg-white/20 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
          <ArrowUpRight size={28} strokeWidth={3} />
        </div>
        <span className="text-xl font-bold tracking-tight uppercase italic font-black">{t('dashboard.quickActions.received')}</span>
      </button>

      <button
        onClick={onAddExpense}
        className="flex items-center justify-center gap-4 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white p-6 rounded-[1.5rem] shadow-lg shadow-red-100 hover:shadow-red-200 transition-all active:scale-95 group"
      >
        <div className="bg-white/20 p-2.5 rounded-xl group-hover:scale-110 transition-transform">
          <ArrowDownRight size={28} strokeWidth={3} />
        </div>
        <span className="text-xl font-bold tracking-tight uppercase italic font-black">{t('dashboard.quickActions.spent')}</span>
      </button>
    </div>
  );
};

export default QuickActions;
