import React from 'react';

// eslint-disable-next-line no-unused-vars
const SummaryCard = ({ title, amount, icon: Icon, colorClass }) => {
  return (
    <div className="business-card p-6 flex items-center justify-between">
      <div className="flex flex-col">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">{title}</p>
        <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none italic">₹{amount.toLocaleString('en-IN')}</h3>
      </div>
      <div className={`p-4 rounded-2xl shadow-sm ${colorClass}`}>
        <Icon size={24} />
      </div>
    </div>
  );
};

export default SummaryCard;
