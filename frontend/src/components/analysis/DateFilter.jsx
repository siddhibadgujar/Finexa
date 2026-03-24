import React from 'react';
import { Clock, Layers, Sparkles } from 'lucide-react';

const DateFilter = ({ range, handleRangeChange, groupBy, handleGroupByChange, isAutoAdjusted }) => {
  // Define valid intervals for each range
  const getValidIntervals = (r) => {
    switch (r) {
      case '1h': return ['minute', '5min'];
      case '24h': return ['5min', 'hour'];
      case '7d': return ['hour', 'day'];
      case '30d': return ['day', 'week'];
      default: return ['day'];
    }
  };

  const validIntervals = getValidIntervals(range);

  return (
    <div className="flex flex-wrap items-center gap-6 mb-10 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
      {/* Background decoration for modern feel */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>

      <div className="flex items-center gap-3 relative z-10">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
          <Clock size={20} />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Lookback Range</span>
          <select
            value={range}
            onChange={(e) => handleRangeChange(e.target.value)}
            className="bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <option value="1h">Last 1 Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      <div className="h-10 w-px bg-gray-100 hidden md:block mx-2 relative z-10"></div>

      <div className="flex items-center gap-3 relative z-10">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
          <Layers size={20} />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grouping Interval</span>
            {isAutoAdjusted && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-600 text-white rounded-md text-[8px] font-black uppercase animate-bounce">
                <Sparkles size={8} />
                Auto
              </div>
            )}
          </div>
          <select
            value={groupBy}
            onChange={(e) => handleGroupByChange(e.target.value)}
            className="bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-gray-100 transition-colors min-w-[120px]"
          >
            {validIntervals.includes('minute') && <option value="minute">Minute-by-Minute</option>}
            {validIntervals.includes('5min') && <option value="5min">5 Minutes</option>}
            {validIntervals.includes('hour') && <option value="hour">Hourly</option>}
            {validIntervals.includes('day') && <option value="day">Daily</option>}
            {validIntervals.includes('week') && <option value="week">Weekly</option>}
          </select>
        </div>
      </div>

      <div className="flex-1"></div>
      
      <div className="hidden lg:flex flex-col items-end gap-1 relative z-10">
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-2xl border border-green-100">
          <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></div>
          <span className="text-xs font-black uppercase tracking-widest tracking-tight">System Polling Active</span>
        </div>
        {isAutoAdjusted && (
          <p className="text-[10px] text-indigo-500 font-bold italic pr-2">Interval auto-optimized for range</p>
        )}
      </div>
    </div>
  );
};

export default DateFilter;
