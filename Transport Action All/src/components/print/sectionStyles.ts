/**
 * Section color styles — matches the Excel section separator colors.
 * Used by both PrintPreview and the edit view.
 */
export function getSectionStyle(name: string): Record<string, string | number> {
  const upper = name.toUpperCase();
  if (upper.indexOf('ARRIVALS') > -1 || upper.indexOf('DEPARTURES') > -1) {
    return { background: '#7ecfc0', color: '#000', fontWeight: 'bold' };
  }
  if (upper === 'PUGLIA') {
    return { background: '#a8d8ea', color: '#000', fontWeight: 'bold' };
  }
  // Default: ROMA, MILAN, NAPLES, etc.
  return { background: '#c6d44e', color: '#000', fontWeight: 'bold' };
}

/**
 * Tailwind class version for the edit view.
 */
export function getSectionTailwind(name: string): string {
  const upper = name.toUpperCase();
  if (upper.indexOf('ARRIVALS') > -1 || upper.indexOf('DEPARTURES') > -1) {
    return 'bg-[#7ecfc0] text-black';
  }
  if (upper === 'PUGLIA') {
    return 'bg-[#a8d8ea] text-black';
  }
  return 'bg-[#c6d44e] text-black';
}
