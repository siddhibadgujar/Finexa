import React from 'react';
import { AlertCircle, CheckCircle2, Info, Lightbulb, Zap, TrendingUp } from 'lucide-react';

const InsightsPanel = ({ insights, operationalInsights }) => {
  const financialInsights = (insights || []).filter(i => i.category === 'financial' || !i.category);
  const opInsightsArray = operationalInsights || [];

  const InsightCard = ({ insight }) => {
    let IconCmp = Info;
    let bgColor = 'bg-blue-50';
    let textColor = 'text-blue-800';
    let iconColor = 'text-blue-500';

    if (insight.type === 'critical') {
      IconCmp = AlertCircle;
      bgColor = 'bg-red-50';
      textColor = 'text-red-900';
      iconColor = 'text-red-500';
    } else if (insight.type === 'warning') {
      IconCmp = AlertCircle;
      bgColor = 'bg-yellow-50';
      textColor = 'text-yellow-900';
      iconColor = 'text-yellow-600';
    } else if (insight.type === 'positive') {
      IconCmp = CheckCircle2;
      bgColor = 'bg-green-50';
      textColor = 'text-green-900';
      iconColor = 'text-green-500';
    } else if (insight.message.includes('💡')) {
      IconCmp = Lightbulb;
    }

    const cleanText = insight.message.replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}⚠️📉💰🎉🚨📈👍💡📊]\s*/u, '');

    return (
      <div className={`flex items-start gap-3 p-3 rounded-lg border border-opacity-50 ${bgColor}`} style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
        <IconCmp className={`mt-0.5 shrink-0 ${iconColor}`} size={16} />
        <p className={`text-xs font-medium leading-relaxed ${textColor}`}>{cleanText}</p>
      </div>
    );
  };

  return (
    <div className="business-card p-8 flex flex-col h-full space-y-8">
      
      {/* Financial Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="text-finexa-primary" size={18} />
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Financial Insights</h3>
        </div>
        <div className="space-y-3">
          {financialInsights.length > 0 ? (
            financialInsights.map((i, idx) => <InsightCard key={idx} insight={i} />)
          ) : (
            <p className="text-[10px] text-gray-400 italic">No financial alerts yet.</p>
          )}
        </div>
      </div>

      <div className="border-t border-gray-50 pt-2" />

      {/* Operational Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="text-finexa-accent" size={18} />
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Operational Insights</h3>
        </div>
        <div className="space-y-3">
          {opInsightsArray.length > 0 ? (
            opInsightsArray.map((i, idx) => <InsightCard key={idx} insight={i} />)
          ) : (
            <p className="text-[10px] text-gray-400 italic">No operational data available</p>
          )}
        </div>
      </div>

    </div>
  );
};

export default InsightsPanel;
