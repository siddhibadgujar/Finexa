import React from 'react';

const HealthScore = ({ score }) => {
  // Determine color based on score
  let colorClass = 'text-finexa-profit';
  let strokeColor = '#22c55e';
  let statusText = 'Excellent';

  if (score < 50) {
    colorClass = 'text-finexa-loss';
    strokeColor = '#ef4444';
    statusText = 'Needs Attention';
  } else if (score < 80) {
    colorClass = 'text-finexa-warning';
    strokeColor = '#facc15';
    statusText = 'Fair';
  }

  // Calculate SVG stroke dasharray properties
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-finexa-card p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center h-full">
      <h3 className="text-lg font-semibold text-finexa-text mb-6 w-full text-left">Business Health</h3>
      
      <div className="relative w-40 h-40 flex items-center justify-center mb-6">
        {/* Background Circle */}
        <svg className="w-full h-full transform -rotate-90 absolute top-0 left-0 drop-shadow-sm" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth="8"
          />
          {/* Progress Circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="z-10 flex flex-col items-center">
          <span className={`text-4xl font-bold tracking-tight ${colorClass}`}>{score}</span>
          <span className="text-xs text-finexa-muted font-bold uppercase tracking-widest mt-1">/ 100</span>
        </div>
      </div>
      
      <p className={`text-lg font-bold ${colorClass}`}>{statusText}</p>
      <p className="text-sm text-finexa-muted mt-2 max-w-[220px]">Based on your profit margins and expense ratios</p>
    </div>
  );
};

export default HealthScore;
