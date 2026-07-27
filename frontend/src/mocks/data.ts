/**
 * Mock fixtures for SellerSense.
 *
 * Realistic, self-consistent sample data for the demo. Shapes match src/lib/types
 * exactly, so the real backend can return the same JSON later. The scenario:
 * a mid-size seller "NovaBrew" selling a portable espresso maker across channels.
 */
import type {
  CompetitorComparison,
  DashboardData,
  Dataset,
  FeedbackAlert,
  ReplyDraft,
  Review,
  User,
} from '@/lib/types';

export const MOCK_USER: User = {
  id: 'usr_001',
  email: 'demo@novabrew.co',
  name: 'Yinan He',
  tier: 'premium',
  createdAt: '2026-01-14T09:00:00Z',
};

export const MOCK_DATASETS: Dataset[] = [
  {
    id: 'ds_amazon',
    name: 'Amazon — NovaBrew Go Espresso',
    source: 'amazon',
    productName: 'NovaBrew Go Portable Espresso Maker',
    reviewCount: 184,
    createdAt: '2026-07-06T12:00:00Z',
  },
  {
    id: 'ds_shopify',
    name: 'Shopify — NovaBrew Store',
    source: 'shopify',
    productName: 'NovaBrew Go Portable Espresso Maker',
    reviewCount: 132,
    createdAt: '2026-07-05T12:00:00Z',
  },
  {
    id: 'ds_tiktok',
    name: 'TikTok Shop — NovaBrew Go',
    source: 'tiktok',
    productName: 'NovaBrew Go Portable Espresso Maker',
    reviewCount: 97,
    createdAt: '2026-07-04T12:00:00Z',
  },
];

/* 12-week sentiment trend — a clear story: packaging problem emerges around week 8. */
const TREND = [
  { date: '2026-04-20', positive: 74, neutral: 18, negative: 8 },
  { date: '2026-04-27', positive: 76, neutral: 16, negative: 8 },
  { date: '2026-05-04', positive: 72, neutral: 19, negative: 9 },
  { date: '2026-05-11', positive: 75, neutral: 16, negative: 9 },
  { date: '2026-05-18', positive: 71, neutral: 18, negative: 11 },
  { date: '2026-05-25', positive: 69, neutral: 19, negative: 12 },
  { date: '2026-06-01', positive: 67, neutral: 20, negative: 13 },
  { date: '2026-06-08', positive: 63, neutral: 20, negative: 17 },
  { date: '2026-06-15', positive: 60, neutral: 21, negative: 19 },
  { date: '2026-06-22', positive: 61, neutral: 20, negative: 19 },
  { date: '2026-06-29', positive: 64, neutral: 19, negative: 17 },
  { date: '2026-07-06', positive: 66, neutral: 18, negative: 16 },
].map((p) => ({
  ...p,
  score: Number(((p.positive - p.negative) / 100).toFixed(2)),
}));

const REVIEWS: Review[] = [
  {
    id: 'rv_01',
    datasetId: 'ds_amazon',
    author: 'Marcus T.',
    rating: 2,
    text: 'Great machine but it arrived with the box crushed and the pressure gauge cracked. Second time this has happened.',
    createdAt: '2026-07-05T14:20:00Z',
    sentimentScore: -0.72,
    sentimentLabel: 'negative',
    themeId: 'th_packaging',
  },
  {
    id: 'rv_02',
    datasetId: 'ds_amazon',
    author: 'Priya S.',
    rating: 1,
    text: 'Packaging was flimsy, unit was dented on arrival. Coffee tastes fine when it works though.',
    createdAt: '2026-07-04T08:10:00Z',
    sentimentScore: -0.68,
    sentimentLabel: 'negative',
    themeId: 'th_packaging',
  },
  {
    id: 'rv_03',
    datasetId: 'ds_amazon',
    author: 'Dan W.',
    rating: 5,
    text: 'Best travel espresso I have owned. Rich crema, compact, and the battery lasts all week.',
    createdAt: '2026-07-03T19:00:00Z',
    sentimentScore: 0.88,
    sentimentLabel: 'positive',
    themeId: 'th_quality',
  },
  {
    id: 'rv_04',
    datasetId: 'ds_amazon',
    author: 'Lena K.',
    rating: 3,
    text: 'Love the coffee, but shipping took 11 days and tracking never updated. Frustrating experience.',
    createdAt: '2026-07-02T11:30:00Z',
    sentimentScore: -0.24,
    sentimentLabel: 'negative',
    themeId: 'th_shipping',
  },
  {
    id: 'rv_05',
    datasetId: 'ds_amazon',
    author: 'Omar R.',
    rating: 4,
    text: 'Solid build and easy to clean. Wish the water tank were a little bigger for two shots.',
    createdAt: '2026-07-01T09:15:00Z',
    sentimentScore: 0.42,
    sentimentLabel: 'positive',
    themeId: 'th_quality',
  },
  {
    id: 'rv_06',
    datasetId: 'ds_amazon',
    author: 'Grace H.',
    rating: 2,
    text: 'The battery drains overnight even when off. Had to charge before every use on my trip.',
    createdAt: '2026-06-29T16:45:00Z',
    sentimentScore: -0.55,
    sentimentLabel: 'negative',
    themeId: 'th_battery',
  },
  {
    id: 'rv_07',
    datasetId: 'ds_amazon',
    author: 'Tomás L.',
    rating: 5,
    text: 'Customer support replaced my unit within two days. Really impressed with the service.',
    createdAt: '2026-06-28T13:05:00Z',
    sentimentScore: 0.79,
    sentimentLabel: 'positive',
    themeId: 'th_support',
  },
  {
    id: 'rv_08',
    datasetId: 'ds_amazon',
    author: 'Nadia P.',
    rating: 1,
    text: 'Box was open when it arrived and the manual was missing. Felt like a returned item resold.',
    createdAt: '2026-06-27T10:20:00Z',
    sentimentScore: -0.81,
    sentimentLabel: 'negative',
    themeId: 'th_packaging',
  },
  {
    id: 'rv_09',
    datasetId: 'ds_amazon',
    author: 'Chris B.',
    rating: 4,
    text: 'Makes a genuinely good shot. Setup instructions could be clearer but figured it out.',
    createdAt: '2026-06-26T18:40:00Z',
    sentimentScore: 0.5,
    sentimentLabel: 'positive',
    themeId: 'th_quality',
  },
  {
    id: 'rv_10',
    datasetId: 'ds_amazon',
    author: 'Sofia M.',
    rating: 3,
    text: 'Neutral feelings — works as described, nothing spectacular. Shipping box was a bit banged up.',
    createdAt: '2026-06-25T07:55:00Z',
    sentimentScore: -0.05,
    sentimentLabel: 'neutral',
    themeId: 'th_packaging',
  },
  {
    id: 'rv_11',
    datasetId: 'ds_amazon',
    author: 'Ethan J.',
    rating: 5,
    text: 'Perfect for camping. Heats fast, easy cleanup, and the crema is bar-quality. Highly recommend.',
    createdAt: '2026-06-24T20:10:00Z',
    sentimentScore: 0.91,
    sentimentLabel: 'positive',
    themeId: 'th_quality',
  },
  {
    id: 'rv_12',
    datasetId: 'ds_amazon',
    author: 'Yara F.',
    rating: 2,
    text: 'Arrived late and the outer sleeve was torn. Product itself is decent once you get it going.',
    createdAt: '2026-06-23T12:00:00Z',
    sentimentScore: -0.48,
    sentimentLabel: 'negative',
    themeId: 'th_packaging',
  },
];

const DASHBOARDS: Record<string, DashboardData> = {
  ds_amazon: {
    dataset: MOCK_DATASETS[0],
    kpis: {
      reviewsAnalyzed: 184,
      netSentiment: 0.5,
      positiveRate: 0.66,
      complaintThemes: 4,
      avgRating: 4.1,
      responseOpportunities: 23,
    },
    trend: TREND,
    distribution: { positive: 66, neutral: 18, negative: 16 },
    themes: [
      {
        id: 'th_packaging',
        label: 'Packaging damage',
        summary:
          'Units arriving with crushed boxes, cracked gauges, or torn sleeves. Spiking sharply over the last 3 weeks.',
        reviewCount: 33,
        share: 0.18,
        avgSentiment: -0.64,
        isComplaint: true,
        trend: 0.07,
      },
      {
        id: 'th_shipping',
        label: 'Slow / opaque shipping',
        summary: 'Long delivery times and tracking that never updates. Concentrated on the Amazon channel.',
        reviewCount: 21,
        share: 0.11,
        avgSentiment: -0.38,
        isComplaint: true,
        trend: 0.02,
      },
      {
        id: 'th_battery',
        label: 'Battery drain',
        summary: 'Battery discharges overnight when idle; customers must recharge before each use.',
        reviewCount: 14,
        share: 0.08,
        avgSentiment: -0.45,
        isComplaint: true,
        trend: 0.01,
      },
      {
        id: 'th_quality',
        label: 'Coffee quality (loved)',
        summary: 'Consistent praise for crema, taste, compact build and easy cleanup — the core strength.',
        reviewCount: 96,
        share: 0.52,
        avgSentiment: 0.74,
        isComplaint: false,
        trend: -0.02,
      },
      {
        id: 'th_support',
        label: 'Support responsiveness',
        summary: 'Fast replacements and helpful replies frequently mentioned by satisfied buyers.',
        reviewCount: 19,
        share: 0.1,
        avgSentiment: 0.62,
        isComplaint: false,
        trend: 0.03,
      },
    ],
    keywords: [
      { term: 'crushed box', count: 27, sentiment: 'negative' },
      { term: 'cracked gauge', count: 18, sentiment: 'negative' },
      { term: 'slow shipping', count: 16, sentiment: 'negative' },
      { term: 'great crema', count: 41, sentiment: 'positive' },
      { term: 'battery drain', count: 14, sentiment: 'negative' },
      { term: 'easy cleanup', count: 33, sentiment: 'positive' },
      { term: 'compact', count: 29, sentiment: 'positive' },
      { term: 'torn sleeve', count: 12, sentiment: 'negative' },
    ],
    reviews: REVIEWS,
  },
  ds_shopify: {
    dataset: MOCK_DATASETS[1],
    kpis: {
      reviewsAnalyzed: 132,
      netSentiment: 0.58,
      positiveRate: 0.71,
      complaintThemes: 3,
      avgRating: 4.3,
      responseOpportunities: 12,
    },
    trend: TREND.map((p) => ({ ...p, positive: p.positive + 4, negative: Math.max(4, p.negative - 3) })),
    distribution: { positive: 71, neutral: 17, negative: 12 },
    themes: [
      {
        id: 'th_packaging',
        label: 'Packaging damage',
        summary: 'Fewer incidents than Amazon but still the top complaint driver on Shopify orders.',
        reviewCount: 15,
        share: 0.11,
        avgSentiment: -0.6,
        isComplaint: true,
        trend: 0.03,
      },
      {
        id: 'th_quality',
        label: 'Coffee quality (loved)',
        summary: 'Direct-store buyers rave about taste and design; strongest positive theme.',
        reviewCount: 78,
        share: 0.59,
        avgSentiment: 0.78,
        isComplaint: false,
        trend: 0.01,
      },
      {
        id: 'th_support',
        label: 'Support responsiveness',
        summary: 'Concierge-style support on the DTC store earns repeat praise.',
        reviewCount: 18,
        share: 0.14,
        avgSentiment: 0.68,
        isComplaint: false,
        trend: 0.04,
      },
    ],
    keywords: [
      { term: 'great crema', count: 38, sentiment: 'positive' },
      { term: 'beautiful design', count: 22, sentiment: 'positive' },
      { term: 'crushed box', count: 11, sentiment: 'negative' },
      { term: 'fast support', count: 17, sentiment: 'positive' },
      { term: 'easy cleanup', count: 24, sentiment: 'positive' },
      { term: 'pricey', count: 9, sentiment: 'neutral' },
    ],
    reviews: REVIEWS.map((r) => ({ ...r, datasetId: 'ds_shopify' })),
  },
  ds_tiktok: {
    dataset: MOCK_DATASETS[2],
    kpis: {
      reviewsAnalyzed: 97,
      netSentiment: 0.34,
      positiveRate: 0.58,
      complaintThemes: 5,
      avgRating: 3.8,
      responseOpportunities: 31,
    },
    trend: TREND.map((p) => ({ ...p, positive: Math.max(45, p.positive - 8), negative: p.negative + 5 })),
    distribution: { positive: 58, neutral: 19, negative: 23 },
    themes: [
      {
        id: 'th_packaging',
        label: 'Packaging damage',
        summary: 'Highest packaging-damage rate across channels — a clear fulfillment issue for viral orders.',
        reviewCount: 24,
        share: 0.25,
        avgSentiment: -0.66,
        isComplaint: true,
        trend: 0.09,
      },
      {
        id: 'th_shipping',
        label: 'Slow / opaque shipping',
        summary: 'Impulse buyers expect fast delivery; delays drive negative sentiment sharply.',
        reviewCount: 18,
        share: 0.19,
        avgSentiment: -0.5,
        isComplaint: true,
        trend: 0.05,
      },
      {
        id: 'th_quality',
        label: 'Coffee quality (loved)',
        summary: 'Still the leading positive theme even on TikTok Shop.',
        reviewCount: 44,
        share: 0.45,
        avgSentiment: 0.7,
        isComplaint: false,
        trend: -0.01,
      },
    ],
    keywords: [
      { term: 'crushed box', count: 21, sentiment: 'negative' },
      { term: 'slow shipping', count: 17, sentiment: 'negative' },
      { term: 'viral worth it', count: 19, sentiment: 'positive' },
      { term: 'great crema', count: 26, sentiment: 'positive' },
      { term: 'dented', count: 13, sentiment: 'negative' },
    ],
    reviews: REVIEWS.map((r) => ({ ...r, datasetId: 'ds_tiktok' })),
  },
};

export function getMockDashboard(datasetId: string): DashboardData {
  return DASHBOARDS[datasetId] ?? DASHBOARDS.ds_amazon;
}

/* ---- Competitor comparisons (premium) ---- */

export const MOCK_COMPETITORS: CompetitorComparison[] = [
  {
    you: { name: 'NovaBrew Go', netSentiment: 0.5, avgRating: 4.1, reviewCount: 184 },
    competitor: {
      id: 'cmp_wanderbean',
      name: 'WanderBean Mini',
      channel: 'amazon',
      reviewCount: 236,
      netSentiment: 0.41,
      avgRating: 3.9,
    },
    axes: [
      { axis: 'Coffee quality', you: 88, competitor: 72 },
      { axis: 'Packaging', you: 54, competitor: 78 },
      { axis: 'Shipping', you: 61, competitor: 66 },
      { axis: 'Battery life', you: 63, competitor: 58 },
      { axis: 'Support', you: 82, competitor: 55 },
      { axis: 'Value', you: 70, competitor: 74 },
    ],
    sentimentSplit: [
      { label: 'Coffee quality', youPositive: 88, competitorPositive: 72 },
      { label: 'Packaging', youPositive: 54, competitorPositive: 78 },
      { label: 'Shipping', youPositive: 61, competitorPositive: 66 },
      { label: 'Support', youPositive: 82, competitorPositive: 55 },
      { label: 'Value', youPositive: 70, competitorPositive: 74 },
    ],
    overlapScore: 0.68,
    advantages: [
      'Coffee quality praised 16 pts higher than WanderBean',
      'Support responsiveness is your standout moat (+27 pts)',
      'Better battery life sentiment',
    ],
    gaps: [
      'Packaging complaints 24 pts worse than competitor',
      'Slightly weaker on perceived value',
      'Shipping speed trails by 5 pts',
    ],
  },
  {
    you: { name: 'NovaBrew Go', netSentiment: 0.5, avgRating: 4.1, reviewCount: 184 },
    competitor: {
      id: 'cmp_pocketpress',
      name: 'PocketPress Pro',
      channel: 'shopify',
      reviewCount: 158,
      netSentiment: 0.55,
      avgRating: 4.2,
    },
    axes: [
      { axis: 'Coffee quality', you: 88, competitor: 84 },
      { axis: 'Packaging', you: 54, competitor: 71 },
      { axis: 'Shipping', you: 61, competitor: 80 },
      { axis: 'Battery life', you: 63, competitor: 52 },
      { axis: 'Support', you: 82, competitor: 68 },
      { axis: 'Value', you: 70, competitor: 62 },
    ],
    sentimentSplit: [
      { label: 'Coffee quality', youPositive: 88, competitorPositive: 84 },
      { label: 'Packaging', youPositive: 54, competitorPositive: 71 },
      { label: 'Shipping', youPositive: 61, competitorPositive: 80 },
      { label: 'Support', youPositive: 82, competitorPositive: 68 },
      { label: 'Value', youPositive: 70, competitorPositive: 62 },
    ],
    overlapScore: 0.74,
    advantages: [
      'Higher value-for-money sentiment (+8 pts)',
      'Support and battery life both lead',
      'Comparable coffee-quality perception',
    ],
    gaps: [
      'Shipping sentiment trails badly (−19 pts)',
      'Packaging still a relative weakness (−17 pts)',
    ],
  },
];

/* ---- Smart feedback alerts (premium) ---- */

export const MOCK_ALERTS: FeedbackAlert[] = [
  {
    id: 'al_01',
    theme: 'Packaging damaged',
    severity: 'critical',
    share: 0.18,
    threshold: 0.15,
    previousShare: 0.09,
    windowDays: 14,
    sampleReviews: [
      'Arrived with the box crushed and the pressure gauge cracked.',
      'Packaging was flimsy, unit was dented on arrival.',
      'Box was open when it arrived and the manual was missing.',
    ],
    emailSentTo: 'demo@novabrew.co',
    triggeredAt: '2026-07-06T08:02:00Z',
  },
  {
    id: 'al_02',
    theme: 'Slow shipping',
    severity: 'serious',
    share: 0.11,
    threshold: 0.1,
    previousShare: 0.07,
    windowDays: 14,
    sampleReviews: [
      'Shipping took 11 days and tracking never updated.',
      'Arrived late and the outer sleeve was torn.',
    ],
    emailSentTo: 'demo@novabrew.co',
    triggeredAt: '2026-07-05T15:40:00Z',
  },
  {
    id: 'al_03',
    theme: 'Battery drain',
    severity: 'warning',
    share: 0.08,
    threshold: 0.08,
    previousShare: 0.05,
    windowDays: 14,
    sampleReviews: [
      'The battery drains overnight even when off.',
      'Had to charge before every use on my trip.',
    ],
    emailSentTo: null,
    triggeredAt: '2026-07-04T09:10:00Z',
  },
];

/* ---- Reply drafts (premium) ---- */

const PORTAL_URLS: Record<ReplyDraft['portal'], string> = {
  amazon: 'https://sellercentral.amazon.com/messaging',
  shopify: 'https://admin.shopify.com/reviews',
  tiktok: 'https://seller.tiktok.com/messages',
};

export function getMockReplyDraft(review: Review): ReplyDraft {
  const drafts: Record<string, string> = {
    th_packaging: `Hi ${review.author.split(' ')[0]}, I'm so sorry your NovaBrew Go arrived damaged — that's not the unboxing moment we want for you. I've flagged this batch with our fulfillment team and we're upgrading to reinforced packaging this week. I'd love to ship a free replacement right away; just reply and it's on its way, no return needed. Thank you for giving us the chance to make it right. — The NovaBrew Team`,
    th_shipping: `Hi ${review.author.split(' ')[0]}, thank you for your patience — an 11-day wait with silent tracking is genuinely frustrating and we own that. We've switched to a faster carrier with live tracking for your region. As an apology, I've added store credit to your account. We'd be grateful for the chance to earn a better experience next time. — The NovaBrew Team`,
    th_battery: `Hi ${review.author.split(' ')[0]}, appreciate you flagging the overnight battery drain. A firmware update ships next week that fixes idle discharge — I'll email you the moment it's live. In the meantime, our team can send a replacement cell if you'd like. Thanks for helping us make the Go better. — The NovaBrew Team`,
  };
  const body =
    drafts[review.themeId ?? ''] ??
    `Hi ${review.author.split(' ')[0]}, thank you for the honest feedback — it genuinely helps us improve. We'd love to make this right; reply here and our team will take care of you personally. — The NovaBrew Team`;

  const portal: ReplyDraft['portal'] = 'amazon';
  return {
    id: `draft_${review.id}`,
    reviewId: review.id,
    tone: 'Warm · Accountable · On-brand',
    body,
    portal,
    portalUrl: PORTAL_URLS[portal],
  };
}
