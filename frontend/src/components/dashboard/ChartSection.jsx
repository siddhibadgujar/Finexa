import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#2563eb', '#7c3aed', '#22c55e', '#ef4444', '#facc15', '#06b6d4', '#ec4899'];

const ChartSection = ({ lineData, pieData }) => {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* Line Chart */}
      <div className="business-card p-8">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">{t('dashboard.charts.incomeExpense')}</h3>
        <div className="w-full h-[300px] min-w-0">
          {lineData && lineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} tickLine={false} axisLine={false} dy={10} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -5px rgba(0,0,0,0.1)', padding: '12px' }}
                  formatter={(value) => [`₹${value}`, undefined]}
                  labelStyle={{ fontWeight: '900', color: '#111827', marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }} />
                <Line type="monotone" dataKey="income" name={t('dashboard.charts.income')} stroke="#22c55e" strokeWidth={4} dot={{ r: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="expense" name={t('dashboard.charts.expense')} stroke="#ef4444" strokeWidth={4} dot={{ r: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-sm font-bold">{t('dashboard.charts.noLine')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Pie Chart */}
      <div className="business-card p-8">
        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">{t('dashboard.charts.byCategory')}</h3>
        <div className="w-full h-[300px] min-w-0">
          {pieData && pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`₹${value}`, undefined]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-sm font-bold">{t('dashboard.charts.noPie')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChartSection;
