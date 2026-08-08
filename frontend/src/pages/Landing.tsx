import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bell,
  Check,
  Crown,
  MessageSquareReply,
  Sparkles,
  Star,
  Swords,
  Upload,
  Zap,
} from 'lucide-react';
import Logo from '@/components/layout/Logo';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface text-ink">
      <Nav />
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <Pricing />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ---------------- Nav ---------------- */
function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/[0.06] bg-surface/80 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-8 text-sm font-semibold text-ink/60 md:flex">
          <a href="#features" className="hover:text-ink">Features</a>
          <a href="#how" className="hover:text-ink">How it works</a>
          <a href="#pricing" className="hover:text-ink">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/app" className="hidden sm:block">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link to="/app">
            <Button variant="dark" size="sm">
              Open dashboard <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink-grad text-white">
      <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-brand-500/30 blur-[120px]" />
      <div className="pointer-events-none absolute -right-32 top-20 h-80 w-80 rounded-full bg-violet-500/25 blur-[120px]" />
      <div className="container-page relative grid gap-12 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-28">
        <div className="animate-fade-up">
          <span className="eyebrow rounded-full border border-white/15 bg-white/5 px-3 py-1 text-signal">
            <Sparkles className="h-3.5 w-3.5" /> AI feedback intelligence
          </span>
          <h1 className="mt-6 font-display text-display font-black">
            Your reviews are
            <br />
            <span className="bg-gradient-to-r from-signal via-white to-violet-400 bg-clip-text text-transparent">
              telling you something.
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-lg text-white/70">
            SellerSense reads every customer review across Amazon, Shopify & TikTok Shop, then hands you
            the fixes that grow revenue — themes, alerts, competitor gaps and ready-to-send replies.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/app">
              <Button variant="signal" size="lg">
                Start free — no card <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/app">
              <Button
                size="lg"
                className="border border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                See a live demo
              </Button>
            </Link>
          </div>
          <p className="mt-5 flex items-center gap-4 text-sm text-white/50">
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-signal" /> 50 reviews free
            </span>
            <span className="flex items-center gap-1">
              <Check className="h-4 w-4 text-signal" /> Setup in 2 minutes
            </span>
          </p>
        </div>

        <div className="animate-fade-up [animation-delay:120ms]">
          <HeroPreview />
        </div>
      </div>
    </section>
  );
}

/** Pure-CSS product preview so the hero shows the app, no image assets needed. */
function HeroPreview() {
  const bars = [62, 71, 55, 78, 66, 84, 73];
  return (
    <div className="relative">
      {/* pb leaves a clear band at the card's bottom edge so the floating alert
          toast below never covers the last theme row */}
      <div className="animate-float rounded-3xl border border-white/10 bg-white p-5 pb-16 text-ink shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Net sentiment</p>
            <p className="text-3xl font-extrabold text-positive">+50%</p>
          </div>
          <span className="rounded-full bg-positive/10 px-2.5 py-1 text-xs font-bold text-positive">
            184 reviews
          </span>
        </div>
        <div className="mt-4 flex h-24 items-end gap-2">
          {bars.map((b, i) => (
            <div key={i} className="flex-1 rounded-md bg-brand-grad" style={{ height: `${b}%` }} />
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {[
            { label: 'Coffee quality', pct: 52, tone: 'bg-positive' },
            { label: 'Packaging damage', pct: 18, tone: 'bg-negative' },
            { label: 'Slow shipping', pct: 11, tone: 'bg-warning' },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-2 text-xs">
              <span className="w-28 truncate text-ink/60">{r.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink/[0.06]">
                <div className={cn('h-full rounded-full', r.tone)} style={{ width: `${r.pct * 2}%` }} />
              </div>
              <span className="w-8 text-right font-semibold tabular-nums">{r.pct}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -bottom-6 -left-4 animate-float rounded-2xl border border-ink/[0.08] bg-white p-3 text-ink shadow-xl [animation-delay:1s]">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-negative/10 text-negative">
            <Bell className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-bold">Packaging spiked 18%</p>
            <p className="text-[10px] text-ink/45">Alert email sent</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Trust bar ---------------- */
function TrustBar() {
  return (
    <div className="border-b border-ink/[0.06] bg-white">
      <div className="container-page flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-6 text-sm font-semibold text-ink/40">
        <span className="flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-warning text-warning" /> Built for Amazon
        </span>
        <span>Shopify</span>
        <span>TikTok Shop</span>
        <span>WooCommerce</span>
        <span>Etsy</span>
        <span className="text-ink/60">+ any CSV export</span>
      </div>
    </div>
  );
}

/* ---------------- Features ---------------- */
const FEATURES = [
  {
    icon: Upload,
    title: 'Dual-track data ingestion',
    body: 'Drop a CSV or paste a product URL. We pull and normalize reviews from any channel into one clean model.',
    accent: 'from-brand-500 to-violet-500',
  },
  {
    icon: BarChart3,
    title: 'AI insight dashboard',
    body: 'Sentiment trends, theme clustering and the exact complaint keywords hurting your rating — drill to the real reviews.',
    accent: 'from-violet-500 to-brand-400',
  },
  {
    icon: Swords,
    title: 'Competitor benchmarking',
    body: 'Overlay your sentiment against any rival. See where you win, where you leak, and how to reposition.',
    accent: 'from-brand-600 to-brand-400',
    premium: true,
  },
  {
    icon: Bell,
    title: 'Smart feedback alerts',
    body: 'When a negative theme breaks its threshold, you get an email instantly — problems caught before they spread.',
    accent: 'from-negative to-warning',
    premium: true,
  },
  {
    icon: MessageSquareReply,
    title: 'Reply-draft optimizer',
    body: 'One-click, on-brand responses for every bad review, with a direct jump to your seller inbox.',
    accent: 'from-brand-500 to-signal',
    premium: true,
  },
  {
    icon: Zap,
    title: 'Async & production-ready',
    body: 'Heavy analysis runs in the background. Fast, reliable, and built to scale with your store.',
    accent: 'from-violet-600 to-brand-500',
  },
];

function Features() {
  return (
    <section id="features" className="container-page py-20 sm:py-28">
      <SectionTitle
        eyebrow="Everything in one place"
        title="From raw reviews to revenue moves"
        subtitle="Six capabilities that turn scattered feedback into a clear, prioritized action plan."
      />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group relative rounded-3xl border border-ink/[0.07] bg-white p-6 shadow-card transition-all hover:-translate-y-1 hover:shadow-lift"
          >
            {f.premium && (
              <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase text-brand-600">
                <Crown className="h-3 w-3" /> Pro
              </span>
            )}
            <span
              className={cn(
                'grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-sm',
                f.accent,
              )}
            >
              <f.icon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-lg font-bold tracking-tight">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/55">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- How it works ---------------- */
function HowItWorks() {
  const steps = [
    { n: '01', title: 'Connect your reviews', body: 'Upload a CSV or paste a product link. We handle the rest.' },
    { n: '02', title: 'AI does the reading', body: 'Sentiment, themes, keywords and competitor gaps in seconds.' },
    { n: '03', title: 'Act on what matters', body: 'Get alerts, draft replies, and watch your rating climb.' },
  ];
  return (
    <section id="how" className="bg-white py-20 sm:py-28">
      <div className="container-page">
        <SectionTitle
          eyebrow="How it works"
          title="Insights in three steps"
          subtitle="No data team required. If you can export a spreadsheet, you can run SellerSense."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <div key={s.n} className="relative">
              <span className="text-5xl font-black text-brand-100">{s.n}</span>
              <h3 className="mt-2 text-xl font-bold tracking-tight">{s.title}</h3>
              <p className="mt-1.5 text-sm text-ink/55">{s.body}</p>
              {i < steps.length - 1 && (
                <ArrowRight className="absolute -right-3 top-6 hidden h-6 w-6 text-ink/15 md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Pricing ---------------- */
function Pricing() {
  return (
    <section id="pricing" className="container-page py-20 sm:py-28">
      <SectionTitle
        eyebrow="Simple pricing"
        title="Start free. Upgrade when it pays off."
        subtitle="No credit card to begin. Cancel anytime."
      />
      <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
        {/* Free */}
        <div className="rounded-3xl border border-ink/[0.09] bg-white p-8 shadow-card">
          <p className="text-sm font-bold uppercase tracking-wide text-ink/45">Free</p>
          <div className="mt-3 flex items-end gap-1">
            <span className="text-5xl font-black">$0</span>
            <span className="mb-1.5 text-ink/45">/forever</span>
          </div>
          <p className="mt-2 text-sm text-ink/55">Perfect for a first look at your feedback.</p>
          <Link to="/app" className="mt-6 block">
            <Button variant="outline" className="w-full">Start free</Button>
          </Link>
          <ul className="mt-6 space-y-3 text-sm">
            {['CSV upload', 'Up to 50 reviews per analysis', 'Sentiment & theme dashboard', 'Complaint keywords'].map(
              (f) => (
                <PricingRow key={f} label={f} />
              ),
            )}
          </ul>
        </div>

        {/* Premium */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-brand-500 bg-ink p-8 text-white shadow-lift">
          <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/40 blur-3xl" />
          <div className="relative">
            <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-signal">
              <Crown className="h-4 w-4" /> Premium
            </p>
            <div className="mt-3 flex items-end gap-1">
              <span className="text-5xl font-black">$29</span>
              <span className="mb-1.5 text-white/50">/month</span>
            </div>
            <p className="mt-2 text-sm text-white/60">For sellers serious about their rating.</p>
            <Link to="/app" className="mt-6 block">
              <Button variant="signal" className="w-full">Go Premium <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                'Everything in Free',
                'One-click URL scraping (Amazon, Shopify, TikTok)',
                'Up to 200 reviews per analysis',
                'Competitor benchmarking board',
                'Smart email alerts',
                'AI reply-draft optimizer',
              ].map((f) => (
                <PricingRow key={f} label={f} light />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function PricingRow({ label, light = false }: { label: string; light?: boolean }) {
  return (
    <li className="flex items-start gap-2.5">
      <Check className={cn('mt-0.5 h-4 w-4 shrink-0', light ? 'text-signal' : 'text-positive')} />
      <span className={light ? 'text-white/80' : 'text-ink/70'}>{label}</span>
    </li>
  );
}

/* ---------------- Final CTA ---------------- */
function FinalCta() {
  return (
    <section className="container-page pb-24">
      <div className="relative overflow-hidden rounded-4xl bg-brand-grad px-8 py-16 text-center text-white shadow-lift">
        <div className="pointer-events-none absolute inset-0 opacity-20 [background:radial-gradient(circle_at_20%_20%,#fff,transparent_40%)]" />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-hero font-black">
            Stop guessing why customers churn.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            Turn your next 50 reviews into a growth plan — free, in about two minutes.
          </p>
          <Link to="/app" className="mt-8 inline-block">
            <Button variant="signal" size="lg">
              Analyze my reviews <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function Footer() {
  return (
    <footer className="border-t border-ink/[0.06] bg-white">
      <div className="container-page flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
        <Logo />
        <p className="text-sm text-ink/40">© 2026 SellerSense. AI feedback intelligence for sellers.</p>
        <div className="flex gap-6 text-sm font-medium text-ink/50">
          <a href="#features" className="hover:text-ink">Features</a>
          <a href="#pricing" className="hover:text-ink">Pricing</a>
          <Link to="/app" className="hover:text-ink">Dashboard</Link>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Shared ---------------- */
function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="eyebrow justify-center text-brand-500">{eyebrow}</p>
      <h2 className="mt-3 text-hero font-black tracking-tight">{title}</h2>
      <p className="mt-3 text-ink/55">{subtitle}</p>
    </div>
  );
}
