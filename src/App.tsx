import { lazy, Suspense } from 'react';
import { Link, Route, Switch } from 'wouter';
import { ReplicaBadge } from './components/ReplicaBadge';
import { useTitle } from './lib/seo';

const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const TraderProfile = lazy(() => import('./pages/TraderProfile'));
const KalshiLeaderboard = lazy(() => import('./pages/KalshiLeaderboard'));
const Terms = lazy(() => import('./pages/Terms'));
const Submit = lazy(() => import('./pages/Submit'));
const ApiDocs = lazy(() => import('./pages/ApiDocs'));
const Replica = lazy(() => import('./pages/Replica'));
const Compare = lazy(() => import('./pages/Compare'));

function ListFallback() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-12 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
const Blank = () => <div className="min-h-screen bg-background" />;

function NotFound() {
  useTitle('Page not found');
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground px-4" data-testid="not-found">
      <div className="max-w-md text-center">
        <p className="text-sm text-muted-foreground mb-2">404</p>
        <h1 className="text-2xl font-bold mb-3">Page not found</h1>
        <p className="text-sm text-muted-foreground mb-6">This page doesn't exist. The trader may have been renamed or removed.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition text-sm font-medium"
        >
          View the leaderboard
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Switch>
        <Route path="/">
          <Suspense fallback={<ListFallback />}>
            <Leaderboard />
          </Suspense>
        </Route>
        <Route path="/account/:wallet">
          <Suspense fallback={<Blank />}>
            <TraderProfile />
          </Suspense>
        </Route>
        <Route path="/polymarket">
          <Suspense fallback={<ListFallback />}>
            <Leaderboard platform="polymarket" />
          </Suspense>
        </Route>
        <Route path="/kalshi">
          <Suspense fallback={<Blank />}>
            <KalshiLeaderboard />
          </Suspense>
        </Route>
        <Route path="/terms">
          <Suspense fallback={<Blank />}>
            <Terms />
          </Suspense>
        </Route>
        <Route path="/submit">
          <Suspense fallback={<Blank />}>
            <Submit />
          </Suspense>
        </Route>
        <Route path="/api-docs">
          <Suspense fallback={<Blank />}>
            <ApiDocs />
          </Suspense>
        </Route>
        <Route path="/replica">
          <Suspense fallback={<Blank />}>
            <Replica />
          </Suspense>
        </Route>
        <Route path="/compare">
          <Suspense fallback={<Blank />}>
            <Compare />
          </Suspense>
        </Route>
        <Route component={NotFound} />
      </Switch>
      <ReplicaBadge />
    </>
  );
}
