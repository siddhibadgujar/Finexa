import React from 'react';
import { Package, ShoppingBag, ClipboardList, CheckSquare, Zap, Clock, AlertCircle, TrendingUp } from 'lucide-react';

const OperationalMetrics = ({ metrics }) => {
  const { 
    unitsProduced, totalItemsSold, ordersReceived, totalOrdersCompleted, 
    totalPendingOrders, latestInventory, deliveryTimeAvg, totalReturns, defects 
  } = metrics || {};

  const cards = [
    { 
      label: 'Units Produced', 
      value: unitsProduced || 0, 
      icon: Zap, 
      color: 'text-indigo-600', 
      bg: 'bg-indigo-50' 
    },
    { 
      label: 'Items Sold', 
      value: totalItemsSold || 0, 
      icon: ShoppingBag, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      label: 'Orders Recv.', 
      value: ordersReceived || 0, 
      icon: TrendingUp, 
      color: 'text-cyan-600', 
      bg: 'bg-cyan-50' 
    },
    { 
      label: 'Orders Comp.', 
      value: totalOrdersCompleted || 0, 
      icon: CheckSquare, 
      color: 'text-green-600', 
      bg: 'bg-green-50' 
    },
    { 
      label: 'Pending Orders', 
      value: totalPendingOrders || 0, 
      icon: ClipboardList, 
      color: 'text-yellow-600', 
      bg: 'bg-yellow-50' 
    },
    { 
      label: 'Inventory Level', 
      value: latestInventory || 0, 
      icon: Package, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50' 
    },
    { 
      label: 'Avg Deliv. (h)', 
      value: deliveryTimeAvg || 0, 
      icon: Clock, 
      color: 'text-orange-600', 
      bg: 'bg-orange-50' 
    },
    { 
      label: 'Returns / Defects', 
      value: (totalReturns || 0) + (defects || 0), 
      icon: AlertCircle, 
      color: 'text-red-600', 
      bg: 'bg-red-50' 
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, index) => (
        <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className={`p-3 rounded-lg ${card.bg}`}>
            <card.icon className={card.color} size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.label}</p>
            <p className="text-xl font-extrabold text-gray-900">{card.value.toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OperationalMetrics;
