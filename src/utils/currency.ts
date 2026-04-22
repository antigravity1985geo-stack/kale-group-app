import { safeFetch } from './safeFetch';

export const CURRENCY_SYMBOLS: Record<string, string> = {
  GEL: '₾', USD: '$', EUR: '€', RUB: '₽', TRY: '₺', GBP: '£',
};

export function formatMoney(amount: number, currency: string = 'GEL'): string {
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  return `${sym}${Number(amount).toLocaleString('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function convertToGel(amount: number, sourceCurrency: string, date?: string): Promise<number> {
  if (sourceCurrency === 'GEL') return amount;
  const iso = (date || new Date().toISOString()).slice(0, 10);
  const res = await safeFetch<{ rate: number }>(`/api/exchange-rates/rate?currency=${sourceCurrency}&date=${iso}`);
  return Number((amount * res.rate).toFixed(2));
}
