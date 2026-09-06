import React from 'react';
import { ChevronRight, ChevronLeft, ChevronsRight, ChevronsLeft } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  totalItems = null,
  pageSize = null,
  className = "",
}) {
  if (totalPages <= 1 && (!totalItems || totalItems <= (pageSize || 0))) {
    return null;
  }

  const handlePageClick = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  // Generate page numbers to show (window around current page)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);

      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');

      pages.push(totalPages);
    }
    return pages;
  };

  const startItem = pageSize && totalItems ? (currentPage - 1) * pageSize + 1 : null;
  const endItem = pageSize && totalItems ? Math.min(currentPage * pageSize, totalItems) : null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 font-sans dir-rtl text-xs ${className}`}>
      {/* Item count summary */}
      {totalItems != null && (
        <div className="text-slate-400 font-medium text-[11px] sm:text-xs">
          {startItem && endItem ? (
            <span>
              نمایش <strong className="text-white font-mono">{Number(startItem).toLocaleString('fa-IR')}</strong> تا{' '}
              <strong className="text-white font-mono">{Number(endItem).toLocaleString('fa-IR')}</strong> از{' '}
              <strong className="text-cyan-300 font-mono">{Number(totalItems).toLocaleString('fa-IR')}</strong> مورد
            </span>
          ) : (
            <span>
              مجموع: <strong className="text-cyan-300 font-mono">{Number(totalItems).toLocaleString('fa-IR')}</strong> مورد
            </span>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => handlePageClick(1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer disabled:cursor-not-allowed"
          title="صفحه اول"
        >
          <ChevronsRight size={15} />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed font-medium text-[11px]"
          title="صفحه قبلی"
        >
          <ChevronRight size={14} />
          <span className="hidden sm:inline">قبلی</span>
        </button>

        {/* Page Number Pills */}
        <div className="flex items-center gap-1 mx-1">
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1 text-slate-500 font-bold">
                  ...
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => handlePageClick(p)}
                className={`min-w-[32px] h-8 px-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border border-cyan-400/50 shadow-md shadow-cyan-950/50 scale-105'
                    : 'bg-slate-900/70 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white'
                }`}
              >
                {Number(p).toLocaleString('fa-IR')}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => handlePageClick(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed font-medium text-[11px]"
          title="صفحه بعدی"
        >
          <span className="hidden sm:inline">بعدی</span>
          <ChevronLeft size={14} />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => handlePageClick(totalPages)}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer disabled:cursor-not-allowed"
          title="صفحه آخر"
        >
          <ChevronsLeft size={15} />
        </button>
      </div>
    </div>
  );
}
