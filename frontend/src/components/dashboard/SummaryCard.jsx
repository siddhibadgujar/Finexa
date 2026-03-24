import React from 'react';

// eslint-disable-next-line no-unused-vars
const SummaryCard = ({ title, amount, icon: Icon, colorClass }) => {
  return (
    <div className="bg-finexa-card p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-sm text-finexa-muted font-medium mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-finexa-text">₹{amount.toLocaleString('en-IN')}</h3>
      </div>
      <div className={`p-4 rounded-full ${colorClass}`}>
        <Icon size={24} />
      </div>
    </div>
  );
};

export default SummaryCard;
