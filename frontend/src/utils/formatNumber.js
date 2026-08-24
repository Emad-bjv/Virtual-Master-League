/**
 * Formats a raw number string to display with thousand separators.
 * e.g. "1250000" → "1,250,000"
 */
export function formatWithCommas(raw) {
  if (raw === '' || raw === null || raw === undefined) return '';
  const num = String(raw).replace(/,/g, '').replace(/[^0-9]/g, '');
  if (num === '') return '';
  return Number(num).toLocaleString('en-US');
}

/**
 * Strips commas from a display string and returns the raw number string.
 * e.g. "1,250,000" → "1250000"
 */
export function stripCommas(display) {
  return String(display || '').replace(/,/g, '').replace(/[^0-9]/g, '');
}

/**
 * Produces an onChange handler for a formatted text input.
 * Stores raw digits in state, shows comma-formatted display.
 *
 * @param {function} setter - React state setter for raw string
 * @returns {function}      - onChange handler for <input>
 */
export function makeFormattedChangeHandler(setter) {
  return (e) => {
    const raw = stripCommas(e.target.value);
    setter(raw);
  };
}
