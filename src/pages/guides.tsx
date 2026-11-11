export interface Guide {
  path: string;
  title: string;
  heading: string;
  subtitle: string;
  intro: string;
  faq: { q: string; a: string }[];
}

export const POLYMARKET_GUIDE: Guide = {
  path: '/polymarket',
  title: 'Polymarket Leaderboard — Top Polymarket Traders by Profit | predicting.top',
  heading: 'Polymarket Leaderboard',
  subtitle: 'The top Polymarket traders, ranked by P&L in real time',
  intro:
    "This Polymarket leaderboard ranks the most profitable Polymarket traders by profit and loss over the last day, week, month and all time. Each trader's wallets are combined into one profile with their X account, open positions, recent trades and a P&L history chart.",
  faq: [
    {
      q: 'What is the Polymarket leaderboard?',
      a: 'A ranking of Polymarket traders by profit and loss (P&L). predicting.top tracks known Polymarket traders and updates their daily, weekly, monthly and all-time P&L throughout the day.',
    },
    {
      q: 'How is Polymarket P&L calculated?',
      a: "From Polymarket's public profit and loss data for each wallet. When a trader uses several wallets, their P&L is added together into one profile.",
    },
    {
      q: 'How is this different from the leaderboard on polymarket.com?',
      a: "Polymarket's own leaderboard lists wallets. predicting.top links wallets to the trader behind them, combines a trader's wallets, shows their P&L history over time, lets you hide sports traders, and ranks Kalshi traders alongside them.",
    },
    {
      q: 'How do I get my Polymarket account on the leaderboard?',
      a: 'Submit your wallet and X account on the Get Listed page. Every submission is checked before it is added.',
    },
    {
      q: 'Is there a Polymarket leaderboard API?',
      a: 'Yes. The predicting.top API is free, needs no key, and returns the leaderboard, trader profiles, positions and P&L history as JSON.',
    },
  ],
};

export const KALSHI_GUIDE: Guide = {
  path: '/kalshi',
  title: 'Kalshi Leaderboard — Top 1,000 Kalshi Traders by Profit | predicting.top',
  heading: 'Kalshi Leaderboard',
  subtitle: 'The top Kalshi traders, ranked by profit and tracked over time',
  intro:
    "This Kalshi leaderboard ranks the top 1,000 Kalshi traders by profit over the last day, week, month and all time. P&L is snapshotted every two hours, so you can see how each trader's profit changes over time, by category as well as in total.",
  faq: [
    {
      q: 'What is the Kalshi leaderboard?',
      a: 'A ranking of Kalshi traders by profit. predicting.top tracks the top 1,000 Kalshi traders from their public Kalshi profiles and ranks them by daily, weekly, monthly and all-time profit.',
    },
    {
      q: 'Do I need a Kalshi account to see it?',
      a: "No. Kalshi's own leaderboard lives inside Kalshi and traders have to opt in to appear on it. This page is public and needs no account.",
    },
    {
      q: 'How are daily, weekly and monthly Kalshi profits measured?',
      a: "predicting.top records every tracked trader's Kalshi P&L every two hours. Daily, weekly and monthly profit is the change between those snapshots, so it fills in over the first days a trader is tracked.",
    },
    {
      q: "Can I see a Kalshi trader's P&L history?",
      a: "Yes. Each trader's profile shows their Kalshi P&L over time and their profit by category, such as politics, economics or sports.",
    },
    {
      q: 'How do I get my Kalshi account on the leaderboard?',
      a: 'Make your Kalshi profile public and submit your Kalshi username on the Get Listed page.',
    },
  ],
};

export function LeaderboardGuide({ guide }: { guide: Guide }) {
  const other =
    guide.path === '/kalshi'
      ? { href: '/polymarket', label: 'Polymarket leaderboard' }
      : { href: '/kalshi', label: 'Kalshi leaderboard' };
  return (
    <section className="mt-12 text-sm text-muted-foreground space-y-4" aria-labelledby="leaderboard-guide">
      <h2 id="leaderboard-guide" className="text-base text-foreground">
        About the {guide.heading}
      </h2>
      <p>{guide.intro}</p>
      {guide.faq.map((f) => (
        <div key={f.q}>
          <h3 className="text-foreground">{f.q}</h3>
          <p>{f.a}</p>
        </div>
      ))}
      <p>
        See also:{' '}
        <a href="/" className="underline hover:text-foreground">
          prediction market leaderboard
        </a>{' '}
        ·{' '}
        <a href={other.href} className="underline hover:text-foreground">
          {other.label}
        </a>{' '}
        ·{' '}
        <a href="/submit" className="underline hover:text-foreground">
          Get listed
        </a>{' '}
        ·{' '}
        <a href="/api-docs" className="underline hover:text-foreground">
          API
        </a>
      </p>
    </section>
  );
}

export const PolymarketGuide = () => <LeaderboardGuide guide={POLYMARKET_GUIDE} />;
