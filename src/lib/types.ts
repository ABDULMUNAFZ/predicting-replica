export type Platform = 'polymarket' | 'kalshi' | 'both' | 'hyperliquid' | 'myriad';

export interface SmartScore {
  tier: 'Elite' | 'Great' | 'Good' | 'Average' | string;
  score: number;
  winRate: number;
  sharpeRatio: number;
  sharpe1d?: number;
  sharpe1w?: number;
  sharpe1m?: number;
  maxDrawdownPercent: number;
  profitFactor: number;
  rSquared: number;
}

export interface PeriodStats {
  pnl: number;
  buys: number;
  sells: number;
}

export interface LeaderboardTrader {
  rank: number;
  name: string;
  wallet: string | null;
  additional_wallets: string[];
  wallet_count: number;
  twitter: string;
  pfp: string;
  polymarket_profile: string;
  platform: Platform;
  kalshi_profile: string;
  kalshi_username: string | null;
  myriad_profile: string;
  myriad_username: string | null;
  hyperliquid_profile?: string;
  stats: PeriodStats;
  allTimePnl: number;
  join_date: string;
  smart_score: SmartScore | null;
  affiliated: boolean;
  sports_share?: number;
  esports_share?: number;
  roi?: number;
  day_mover?: { label: string; change: number; icon?: string };
}

export interface LeaderboardResponse {
  traders: LeaderboardTrader[];
  lastUpdated?: string;
  _snapshot?: boolean;
}

export interface DailyProfit {
  daily_profit: string;
  raw: number;
  traders_count: number;
}

export interface TraderDetail extends Omit<LeaderboardTrader, 'stats' | 'rank'> {
  stats: { '1d': PeriodStats; '7d': PeriodStats; '30d': PeriodStats; all: PeriodStats };
  views?: number;
}

export interface HistoryPoint {
  timestamp: number;
  pnl: number;
  date?: string;
  polymarket?: number;
  kalshi?: number;
}

export type UiPeriod = 'all' | 'ytd' | '1m' | '1d' | '1w' | '1q';
export type SortKey = 'pnl' | 'score' | 'r2' | 'winrate' | 'maxdd' | 'pf' | 'sharpe' | 'roi' | 'joined';
export type PlatformFilter = 'all' | 'polymarket' | 'kalshi' | 'hyperliquid';
