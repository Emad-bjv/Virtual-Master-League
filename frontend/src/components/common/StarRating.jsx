import React from 'react';
import { Star } from 'lucide-react';

/**
 * StarRating component
 * Displays team strength with 5 stars and 0.5 half-star precision.
 * @param {number|string} rating - e.g. 3.5, 4.0, 4.5, 5.0
 * @param {number} size - pixel size of star icons
 * @param {boolean} showNumber - whether to display numeric value (e.g. 4.5)
 * @param {string} className - extra classes
 */
export default function StarRating({ rating = 4.5, size = 13, showNumber = true, className = '' }) {
  const numRating = Math.max(0.5, Math.min(5.0, Number(rating) || 0));

  return (
    <div className={`inline-flex items-center gap-1.5 font-sport select-none ${className}`} dir="ltr">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          let fillPercent = 0;
          if (numRating >= starIndex) {
            fillPercent = 100;
          } else if (numRating >= starIndex - 0.5) {
            fillPercent = 50;
          }

          return (
            <div
              key={starIndex}
              className="relative inline-block shrink-0"
              style={{ width: size, height: size }}
            >
              {/* Background Empty / Dark Star */}
              <Star
                size={size}
                className="text-slate-700/80 stroke-[1.5] fill-[#080d1a]"
              />
              {/* Foreground Golden Filled Star with clip */}
              {fillPercent > 0 && (
                <div
                  className="absolute top-0 left-0 overflow-hidden"
                  style={{ width: `${fillPercent}%`, height: '100%' }}
                >
                  <Star
                    size={size}
                    className="text-amber-400 stroke-amber-500 stroke-[1.2] fill-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.8)]"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showNumber && (
        <span className="text-[10px] font-black text-amber-300 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.2 rounded-md shadow-sm">
          {numRating.toFixed(1)} ★
        </span>
      )}
    </div>
  );
}
