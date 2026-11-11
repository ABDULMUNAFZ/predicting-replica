import { useMemo, useState, type ReactNode } from 'react';
import { formatShareAmount } from '../../lib/format';
import type { Platform } from '../../lib/types';

const SITE = typeof window !== 'undefined' ? window.location.origin : '';

function platformName(p?: Platform): string {
  switch (p) {
    case 'kalshi':
      return 'Kalshi';
    case 'both':
      return 'Polymarket and Kalshi';
    case 'hyperliquid':
      return 'Hyperliquid';
    default:
      return 'Polymarket';
  }
}
const upDown = (v: number) => `${v < 0 ? 'down' : 'up'} ${formatShareAmount(v)}`;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const safeFile = (s: string) => s.replace(/[^\w.-]+/g, '_');

interface ShareProps {
  title: string;
  control: ReactNode;
  imageUrl: string;
  alt: string;
  fileName: string;
  shareText: string;
  profileUrl: string;
  previewClassName: string;
}

/** Image card with Share / Copy image / Download / Post on X. */
function ShareCard(p: ShareProps) {
  const [sharing, setSharing] = useState(false);
  const [loaded, setLoaded] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [xHint, setXHint] = useState(false);
  const canCopy = typeof window !== 'undefined' && 'ClipboardItem' in window && !!navigator.clipboard?.write;

  const download = async () => {
    const blob = await (await fetch(p.imageUrl)).blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = p.fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const share = async () => {
    setSharing(true);
    try {
      const blob = await (await fetch(p.imageUrl)).blob();
      const file = new File([blob], p.fileName, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: p.shareText, url: p.profileUrl });
      else await download();
    } catch {
      /* user cancelled the share sheet */
    } finally {
      setSharing(false);
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': fetch(p.imageUrl).then((r) => r.blob()) })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      await download();
    }
  };
  const xIntent = `https://x.com/intent/post?text=${encodeURIComponent(`${p.shareText}\n\n${p.profileUrl}`)}`;
  const onPostX = () => {
    if (!canCopy) return;
    navigator.clipboard
      .write([new ClipboardItem({ 'image/png': fetch(p.imageUrl).then((r) => r.blob()) })])
      .then(() => {
        setXHint(true);
        setTimeout(() => setXHint(false), 15_000);
      })
      .catch(() => setXHint(false));
  };
  const secondary = 'px-4 py-2 text-sm font-medium bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80';

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm text-muted-foreground">{p.title}</h2>
        {p.control}
      </div>
      <div className={`relative mx-auto w-full rounded-lg overflow-hidden bg-muted ${p.previewClassName}`}>
        {loaded !== p.imageUrl && <div className="absolute inset-0 animate-pulse bg-muted" />}
        <img key={p.imageUrl} src={p.imageUrl} alt={p.alt} className="w-full h-full object-contain" loading="lazy" onLoad={() => setLoaded(p.imageUrl)} />
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-3">
        <button
          onClick={share}
          disabled={sharing}
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-60"
        >
          {sharing ? 'Preparing…' : 'Share'}
        </button>
        {canCopy && (
          <button onClick={copy} className={secondary}>
            {copied ? 'Copied!' : 'Copy image'}
          </button>
        )}
        <button onClick={download} className={secondary}>
          Download
        </button>
        <a href={xIntent} target="_blank" rel="noopener noreferrer" onClick={onPostX} className={secondary}>
          Post on X
        </a>
      </div>
      {xHint && (
        <p className="text-center text-xs text-muted-foreground mt-2" role="status">
          Image copied. Paste it into your post (Ctrl/Cmd+V) before posting.
        </p>
      )}
    </div>
  );
}

function lastMonths(n: number, monthStyle: 'long' | 'short') {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return {
      value: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: monthStyle, year: 'numeric', timeZone: 'UTC' }),
      name: d.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }),
    };
  });
}

const pill = (on: boolean) =>
  `px-2.5 py-1 text-xs rounded ${on ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`;

interface CardProps {
  traderId: string;
  traderName: string;
  platform?: Platform;
}

export function ShareCombo({ traderId, traderName, platform, allTimePnl }: CardProps & { allTimePnl?: number }) {
  const months = useMemo(() => lastMonths(6, 'short'), []);
  const [month, setMonth] = useState(months[0].value);
  const [tone, setTone] = useState<'light' | 'dark'>('light');
  const m = months.find((x) => x.value === month);
  const label = m?.label ?? month;
  const id = encodeURIComponent(traderId);
  return (
    <ShareCard
      title="Share month + all-time"
      control={
        <div className="flex flex-wrap justify-end gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-background border border-border rounded px-2 py-1 text-xs"
            aria-label="Month"
          >
            {months.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
          <div className="flex gap-1" role="group" aria-label="Colour">
            <button onClick={() => setTone('light')} aria-pressed={tone === 'light'} className={pill(tone === 'light')}>
              Light
            </button>
            <button onClick={() => setTone('dark')} aria-pressed={tone === 'dark'} className={pill(tone === 'dark')}>
              Black
            </button>
          </div>
        </div>
      }
      imageUrl={`/api/og/combo/${id}?month=${month}${tone === 'dark' ? '&theme=dark' : ''}`}
      alt={`${traderName} ${label} P&L calendar and all-time P&L chart`}
      fileName={`${safeFile(traderName)}-${month}-pnl${tone === 'dark' ? '-black' : ''}.png`}
      shareText={`${traderName}'s ${m?.name ?? label} on ${platformName(platform)}${isNum(allTimePnl) ? `, ${upDown(allTimePnl)} all-time` : ''}`}
      profileUrl={`${SITE}/account/${id}`}
      previewClassName="max-w-[800px] aspect-video"
    />
  );
}

const RANGES = [
  { value: 'all', label: 'All time', text: 'all-time' },
  { value: '30d', label: '30D', text: '30-day' },
  { value: '7d', label: '7D', text: '7-day' },
] as const;

export function SharePnlChart({ traderId, traderName, platform, pnl }: CardProps & { pnl: Record<string, number | undefined> }) {
  const [range, setRange] = useState<(typeof RANGES)[number]['value']>('all');
  const r = RANGES.find((x) => x.value === range)!;
  const id = encodeURIComponent(traderId);
  const v = pnl[range];
  const pn = platformName(platform);
  const text = isNum(v)
    ? range === 'all'
      ? `${traderName} is ${upDown(v)} all-time on ${pn}`
      : `${traderName} is ${upDown(v)} over the last ${range === '30d' ? '30' : '7'} days on ${pn}`
    : `${traderName}'s ${r.text} P&L on ${pn}`;
  return (
    <ShareCard
      title="Share P&L chart"
      control={
        <div className="flex gap-1" role="group" aria-label="Range">
          {RANGES.map((x) => (
            <button key={x.value} onClick={() => setRange(x.value)} aria-pressed={range === x.value} className={pill(range === x.value)}>
              {x.label}
            </button>
          ))}
        </div>
      }
      imageUrl={`/api/og/pnl/${id}?range=${range}`}
      alt={`${traderName} ${r.text} P&L chart`}
      fileName={`${safeFile(traderName)}-pnl-${range}.png`}
      shareText={text}
      profileUrl={`${SITE}/account/${id}`}
      previewClassName="max-w-[720px] aspect-[40/21]"
    />
  );
}

export function ShareMonth({ traderId, traderName, platform }: CardProps) {
  const months = useMemo(() => lastMonths(6, 'long'), []);
  const [month, setMonth] = useState(months[0].value);
  const label = months.find((x) => x.value === month)?.label ?? month;
  const id = encodeURIComponent(traderId);
  return (
    <ShareCard
      title="Share month"
      control={
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="bg-background border border-border rounded px-2 py-1 text-sm"
          aria-label="Month"
        >
          {months.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </select>
      }
      imageUrl={`/api/og/calendar/${id}?month=${month}`}
      alt={`${traderName} ${label} P&L calendar`}
      fileName={`${safeFile(traderName)}-${month}.png`}
      shareText={`${traderName}'s ${label} P&L on ${platformName(platform)}`}
      profileUrl={`${SITE}/account/${id}`}
      previewClassName="max-w-[360px] aspect-[4/5]"
    />
  );
}
