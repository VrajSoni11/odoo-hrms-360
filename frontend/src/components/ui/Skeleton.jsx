import React from 'react';

export function Skeleton({ width, height = 13, style = {}, className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width: width || '100%', height, ...style }}
    />
  );
}

export function SkeletonTable({ rows = 5, columns = 5 }) {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, r) => (
        <div className="skeleton-row" key={r}>
          {Array.from({ length: columns }).map((__, c) => (
            <Skeleton key={c} width={c === 0 ? '22%' : undefined} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatGrid({ count = 4 }) {
  return (
    <div className="skeleton-stat-grid">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="skeleton-stat-card" height={96} />
      ))}
    </div>
  );
}

export default Skeleton;
