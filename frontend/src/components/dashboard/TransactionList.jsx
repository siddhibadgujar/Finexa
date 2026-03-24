import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownRight, ArrowUpRight, Calendar } from 'lucide-react';

const TransactionList = ({ transactions }) => {
  const { t } = useTranslation();
  return (
    <div className="business-card p-8 h-full flex flex-col">
      <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 px-1">
        {t('dashboard.transactions.title')}
      </h3>

      {transactions && transactions.length > 0 ? (
        <div className="max-h-[350px] overflow-y-auto overflow-x-hidden pr-3 overscroll-contain [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300">
          <div className="space-y-4 flex-1">
            {transactions.map((t_) => {
              const isIncome = t_.type === 'income';
              return (
                <div key={t_._id} className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 rounded-xl transition-all border border-gray-100 hover:shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${isIncome ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {isIncome ? <ArrowUpRight size={22} strokeWidth={2.5} /> : <ArrowDownRight size={22} strokeWidth={2.5} />}
                    </div>
                    <div>
                      <p className="font-bold text-finexa-text capitalize">{t_.category}</p>
                      <div className="flex items-center gap-1.5 text-xs text-finexa-muted mt-1.5 font-medium">
                        <Calendar size={12} />
                        {new Date(t_.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${isIncome ? 'text-finexa-profit' : 'text-finexa-text'}`}>
                    {isIncome ? '+' : '-'}₹{t_.amount.toLocaleString('en-IN')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
            <Calendar className="text-gray-300" size={24} />
          </div>
          <p className="text-finexa-text font-medium">{t('dashboard.transactions.noData')}</p>
          <p className="text-finexa-muted text-sm mt-1">{t('dashboard.transactions.noDataSub')}</p>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
