/** Number and date formatting. Each function matches one display rule on the reference site. */

/** Leaderboard P&L cell. `full` on >=640px, `compact` on phones. */
export function formatPnl(value: number): { full: string; compact: string } {
  const sign = value >= 0 ? '+' : '';
  const abs = Math.abs(value);
  const full = `${sign}$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  let compact: string;
  if (abs >= 1e6) compact = `${sign}$${(value / 1e6).toFixed(1)}M`;
  else if (abs >= 1e5) compact = `${sign}$${(value / 1e3).toFixed(0)}k`;
  else compact = full;
  return { full, compact };
}

/** "Biggest move today" chip under the P&L. */
export function formatMover(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${Math.round(abs / 1e3)}K`;
  return `${sign}$${Math.round(abs)}`;
}

/** Profile page title P&L, e.g. "+$4.92M". */
export function formatTitlePnl(value: number): string {
  const sign = value >= 0 ? '+' : '';
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${sign}$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(value / 1e3).toFixed(1)}K`;
  return `${sign}$${value.toFixed(0)}`;
}

/** Chart axis and tooltip values. */
export function formatAxis(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Overview bar chart (no explicit minus, relies on the number's own sign). */
export function formatOverview(value: number): string {
  const sign = value >= 0 ? '+' : '';
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${sign}$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(value / 1e3).toFixed(0)}K`;
  return `${sign}$${value.toFixed(0)}`;
}

/** Category P&L rows. */
export function formatCategory(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** Calendar: month total, e.g. "+$12,345". */
export function formatWhole(value: number): string {
  const sign = value >= 0 ? '+$' : '-$';
  return `${sign}${Math.round(Math.abs(value)).toLocaleString('en-US')}`;
}

/** Calendar: day tile, e.g. "+$1.2K". */
export function formatDay(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  const abs = Math.abs(value);
  return abs >= 1e3 ? `${sign}$${(abs / 1e3).toFixed(1)}K` : `${sign}$${Math.round(abs)}`;
}

/** Calendar: monthly view tiles and YTD headline. */
export function formatMonthly(value: number): string {
  const sign = value >= 0 ? '+$' : '-$';
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(2)}K`;
  return `${sign}${Math.round(abs)}`;
}

/** Share card text, e.g. "up $1.23M". */
export function formatShareAmount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e6) return `$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(abs / 1e3).toFixed(abs >= 1e5 ? 0 : 1)}K`;
  return `$${Math.round(abs).toLocaleString('en-US')}`;
}

/** Parses join_date, which arrives as ISO, as YYYY-MM-DD, or as "Oct 2025". */
export function parseJoinDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  let d: Date;
  if (raw.includes(' ')) {
    const [mon, year] = raw.split(' ');
    const m = new Date(`${mon} 1, ${year}`).getMonth();
    d = new Date(parseInt(year, 10), m, 1);
  } else {
    d = new Date(raw);
  }
  return isNaN(d.getTime()) ? null : d;
}

/** "Joined" column: whole days since join_date. */
export function daysAgo(raw: string | null | undefined, now: Date = new Date()): { short: string; long: string } {
  const d = parseJoinDate(raw);
  if (!d) return { short: '–', long: '–' };
  const days = Math.floor((now.getTime() - d.getTime()) / 864e5);
  if (days === 0) return { short: '0d', long: 'today' };
  if (days === 1) return { short: '1d', long: '1 day ago' };
  return { short: `${days}d`, long: `${days} days ago` };
}

/** Profile header "Joined Jan 2024". */
export function formatJoinMonth(raw: string): string {
  const m = raw.match(/^([A-Za-z]{3,9})\s+(\d{4})$/);
  if (m) {
    const mon = m[1].slice(0, 3);
    return `${mon.charAt(0).toUpperCase() + mon.slice(1).toLowerCase()} ${m[2]}`;
  }
  const d = new Date(raw);
  return isNaN(d.getTime()) ? raw : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** 0x1234…abcd for wallet-looking names in the table. */
export function shortWalletName(name: string): string {
  return /^0x[0-9a-fA-F]{40}$/.test(name) ? `${name.slice(0, 6)}…${name.slice(-4)}` : name;
}

/** 0x1234...abcd for wallets on the profile page (ASCII dots, 12-char threshold). */
export function shortWallet(w: string): string {
  return w.length <= 12 ? w : `${w.slice(0, 6)}...${w.slice(-4)}`;
}
