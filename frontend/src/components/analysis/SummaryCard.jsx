import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const SummaryCard = ({ title, trend, prefix = '', suffix = '' }) => {
  const isPositive = trend > 0;
  const isNegative = trend < 0;
  
  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <p className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-2">{title}</p>
      <div className="flex items-end justify-between">
        <div>
          <h3 className={`text-2xl font-black ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-800'}`}>
            {prefix}{Math.abs(trend).toFixed(1)}{suffix}
          </h3>
          <p className="text-[10px] text-gray-400 font-bold mt-1">VS PREVIOUS PERIOD</p>
        </div>
        <div className={`p-2 rounded-xl ${isPositive ? 'bg-green-50 text-green-600' : isNegative ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>
          {isPositive ? <ArrowUpRight size={20} /> : isNegative ? <ArrowDownRight size={20} /> : <Minus size={20} />}
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
