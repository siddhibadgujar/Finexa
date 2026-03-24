import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot
} from 'recharts';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border border-gray-100 shadow-xl rounded-xl">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
          {new Date(data.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
        </p>
        <div className="flex items-center gap-3 mb-1">
          <div className={`w-3 h-3 rounded-full ${data.type === 'income' ? 'bg-green-500' : 'bg-red-500 shadow-sm shadow-red-200'}`}></div>
          <p className="text-xl font-black text-gray-900 leading-none">
            ₹{data.amount.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 mt-1">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-tight">{data.type}</p>
            {data.anomaly === 1 && (
                <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase">Anomaly</span>
            )}
        </div>
        
        {data.explanation && data.anomaly === 1 && (
          <div className="mt-3 pt-3 border-t border-gray-50">
            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">AI Reason</p>
            <p className="text-[11px] font-bold text-red-800 leading-tight bg-red-50/50 p-2 rounded-lg">
              {data.explanation}
            </p>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Custom Dot component to highlight anomalies
const RenderCustomDot = (props) => {
  const { cx, cy, payload } = props;
  
  if (payload.anomaly === 1) {
    return (
      <g key={`dot-${payload.date}`}>
        {/* Outer glow for anomaly */}
        <circle cx={cx} cy={cy} r={8} fill="#ef4444" fillOpacity={0.2} />
        <circle 
          cx={cx} 
          cy={cy} 
          r={5} 
          fill="#ef4444" 
          stroke="#fff" 
          strokeWidth={2}
          className="drop-shadow-md"
        />
      </g>
    );
  }

  return (
    <circle 
      key={`dot-${payload.date}`}
      cx={cx} 
      cy={cy} 
      r={3} 
      fill="#6366f1" 
      stroke="#fff" 
      strokeWidth={1.5} 
    />
  );
};

const AnomalyChart = ({ data }) => {
  // Sort data chronologically for the line chart
  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div className="w-full h-[450px] bg-white p-6 md:p-8 rounded-[2.5rem] border-2 border-gray-50 shadow-xl shadow-indigo-50/20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tighter uppercase">Transaction Baselines</h3>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Time-series variance vs outlier detection</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm shadow-indigo-100"></div>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Baseline</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-100 animate-pulse"></div>
            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">ML Anomaly</span>
          </div>
        </div>
      </div>
      
      <div className="w-full h-[75%] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sortedData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f8fafc" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              stroke="#cbd5e1"
              fontSize={10}
              fontWeight="900"
              tickLine={false}
              axisLine={false}
              dy={15}
            />
            <YAxis 
              stroke="#cbd5e1"
              fontSize={10}
              fontWeight="900"
              tickLine={false}
              axisLine={false}
              dx={-10}
              tickFormatter={(value) => `₹${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
            />
            <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ stroke: '#f1f5f9', strokeWidth: 4, strokeLinecap: 'round' }}
                wrapperStyle={{ outline: 'none' }}
            />
            <Line 
              type="monotone" 
              dataKey="amount" 
              stroke="#6366f1" 
              strokeWidth={4}
              dot={<RenderCustomDot />}
              activeDot={{ r: 7, strokeWidth: 2, stroke: '#fff', fill: '#4f46e5' }}
              connectNulls
              isAnimationActive={true}
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AnomalyChart;
