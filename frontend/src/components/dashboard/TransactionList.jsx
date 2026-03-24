import React from 'react';
import { ArrowDownRight, ArrowUpRight, Calendar } from 'lucide-react';

const TransactionList = ({ transactions }) => {
  return (
    <div className="bg-finexa-card p-6 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
      <h3 className="text-lg font-semibold text-finexa-text mb-6">Recent Transactions</h3>
      
      {transactions && transactions.length > 0 ? (
        <div className="space-y-4 flex-1">
          {transactions.map((t) => {
            const isIncome = t.type === 'income';
            return (
              <div key={t._id} className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 rounded-xl transition-all border border-gray-100 hover:shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${isIncome ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {isIncome ? <ArrowUpRight size={22} strokeWidth={2.5} /> : <ArrowDownRight size={22} strokeWidth={2.5} />}
                  </div>
                  <div>
                    <p className="font-bold text-finexa-text capitalize">{t.category}</p>
                    <div className="flex items-center gap-1.5 text-xs text-finexa-muted mt-1.5 font-medium">
                      <Calendar size={12} />
                      {new Date(t.date).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
                <div className={`text-lg font-bold ${isIncome ? 'text-finexa-profit' : 'text-finexa-text'}`}>
                  {isIncome ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
           <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <Calendar className="text-gray-300" size={24} />
           </div>
          <p className="text-finexa-text font-medium">No transactions yet</p>
          <p className="text-finexa-muted text-sm mt-1">Your recent activity will appear here</p>
        </div>
      )}
    </div>
  );
};

export default TransactionList;
