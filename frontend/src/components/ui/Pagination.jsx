import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Builds the list of page numbers/ellipses to render, e.g.
// [1, '…', 4, 5, 6, '…', 12] — always shows first, last, current, and one
// neighbour on each side so the bar stays a fixed, compact width.
function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const withEllipses = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) withEllipses.push('…');
    withEllipses.push(p);
  });
  return withEllipses;
}

// Shared server-side pagination bar. `page`/`totalPages` are 1-indexed.
// `onPageChange` is called with the target page number; callers are
// expected to re-fetch that page from the backend.
export default function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const goTo = (next) => {
    if (next < 1 || next > totalPages || next === page) return;
    onPageChange(next);
  };

  return (
    <div className="pagination-bar">
      <button
        className="btn btn-small btn-secondary pagination-nav-btn"
        onClick={() => goTo(page - 1)}
        disabled={page <= 1}
      >
        <ChevronLeft size={14} /> Previous
      </button>

      <div className="pagination-numbers">
        {getPageNumbers(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
          ) : (
            <button
              key={p}
              className={`pagination-number${p === page ? ' active' : ''}`}
              onClick={() => goTo(p)}
              disabled={p === page}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        className="btn btn-small btn-secondary pagination-nav-btn"
        onClick={() => goTo(page + 1)}
        disabled={page >= totalPages}
      >
        Next <ChevronRight size={14} />
      </button>
    </div>
  );
}
