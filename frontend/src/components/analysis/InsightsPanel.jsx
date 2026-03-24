import React from 'react';
import { Lightbulb, CheckCircle2 } from 'lucide-react';

const InsightsPanel = ({ insights }) => {
  return (
    <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
          <Lightbulb size={24} />
        </div>
        <h2 className="text-xl font-black text-gray-800">Dynamic Insights</h2>
      </div>
      <div className="space-y-4">
        {insights && insights.length > 0 ? (
          insights.map((insight, idx) => (
            <div key={idx} className="flex gap-4 items-start p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-indigo-200 transition-colors">
              <CheckCircle2 className="mt-1 text-indigo-500 shrink-0" size={18} />
              <p className="text-gray-700 font-bold text-sm leading-relaxed">{insight}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-400 font-bold italic text-sm">No insights available for this period.</p>
        )}
      </div>
    </div>
  );
};

export default InsightsPanel;
