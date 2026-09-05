import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export default function StatCard({ label, value, icon: Icon, tone = 'accent', trend }) {
  return (
    <div className="stat-card">
      <div className="stat-card-top">
        {Icon && (
          <div className={`stat-card-icon ${tone}`}>
            <Icon size={19} strokeWidth={2} />
          </div>
        )}
        {trend != null && (
          <span className={`stat-card-trend ${trend >= 0 ? 'up' : 'down'}`}>
            {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}
