import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

const QuickActions = ({ onAddIncome, onAddExpense }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      <button
        onClick={onAddIncome}
        className="flex items-center justify-center gap-4 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 group border-b-4 border-green-700"
      >
        <div className="bg-white/20 p-2 rounded-full group-hover:scale-110 transition-transform">
          <ArrowUpRight size={28} strokeWidth={3} />
        </div>
        <span className="text-xl font-bold tracking-wide">Received (+)</span>
      </button>

      <button
        onClick={onAddExpense}
        className="flex items-center justify-center gap-4 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white p-5 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-95 group border-b-4 border-red-700"
      >
        <div className="bg-white/20 p-2 rounded-full group-hover:scale-110 transition-transform">
          <ArrowDownRight size={28} strokeWidth={3} />
        </div>
        <span className="text-xl font-bold tracking-wide">Spent (-)</span>
      </button>
    </div>
  );
};

export default QuickActions;
