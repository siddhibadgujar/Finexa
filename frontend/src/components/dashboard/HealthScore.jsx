import React from 'react';
import { useTranslation } from 'react-i18next';

const HealthScore = ({ score }) => {
  const { t } = useTranslation();

  let colorClass = 'text-finexa-profit';
  let strokeColor = '#22c55e';
  let statusKey = 'dashboard.health.excellent';

  if (score < 50) {
    colorClass = 'text-finexa-loss';
    strokeColor = '#ef4444';
    statusKey = 'dashboard.health.attention';
  } else if (score < 80) {
    colorClass = 'text-finexa-warning';
    strokeColor = '#facc15';
    statusKey = 'dashboard.health.fair';
  }

  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="business-card p-8 flex flex-col items-center justify-center text-center h-full">
      <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-8 w-full text-left">
        {t('dashboard.health.title')}
      </h3>

      <div className="relative w-40 h-40 flex items-center justify-center mb-6">
        <svg className="w-full h-full transform -rotate-90 absolute top-0 left-0 drop-shadow-sm" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
          <circle
            cx="50" cy="50" r={radius} fill="transparent"
            stroke={strokeColor} strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="z-10 flex flex-col items-center">
          <span className={`text-4xl font-bold tracking-tight ${colorClass}`}>{score}</span>
          <span className="text-xs text-finexa-muted font-bold uppercase tracking-widest mt-1">/ 100</span>
        </div>
      </div>

      <p className={`text-lg font-bold ${colorClass}`}>{t(statusKey)}</p>
      <p className="text-sm text-finexa-muted mt-2 max-w-[220px]">{t('dashboard.health.subtitle')}</p>
    </div>
  );
};

export default HealthScore;
