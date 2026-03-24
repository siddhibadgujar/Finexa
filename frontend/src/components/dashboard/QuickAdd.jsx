import React from 'react';
import { Plus } from 'lucide-react';

const QuickAdd = ({ onAdd }) => {
  const quickAmounts = [50, 100, 200];

  return (
    <div className="bg-finexa-card p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
      <h3 className="text-lg font-semibold text-finexa-text mb-4">Quick Add Income</h3>
      <div className="flex flex-wrap gap-4">
        {quickAmounts.map((amount) => (
          <button
            key={amount}
            onClick={() => onAdd(amount)}
            className="flex-1 min-w-[100px] rounded-lg p-[2px] bg-gradient-to-r from-finexa-primary to-finexa-accent shadow-sm hover:shadow-md transition-all active:scale-95 text-center cursor-pointer"
          >
            <div className="bg-white hover:bg-gray-50 transition-colors w-full h-full rounded-[6px] flex items-center justify-center py-3 px-4">
              <span className="font-bold text-finexa-primary text-lg flex items-center gap-1 justify-center">
                <Plus size={18} strokeWidth={3} /> ₹{amount}
              </span>
            </div>
          </button>
        ))}
        {/* Custom button */}
        <button
          onClick={() => onAdd('custom')}
          className="flex-1 min-w-[100px] py-3 px-4 rounded-lg border-2 border-dashed border-gray-300 text-finexa-muted hover:border-finexa-primary hover:text-finexa-primary transition-colors font-medium flex items-center justify-center gap-1 shadow-sm active:scale-95 bg-white cursor-pointer"
        >
          <Plus size={18} /> Custom
        </button>
      </div>
    </div>
  );
};

export default QuickAdd;
