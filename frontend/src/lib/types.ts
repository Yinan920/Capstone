/**
 * Shared domain types for SellerSense.
 *
 * These interfaces intentionally mirror the planned backend Pydantic models
 * (see the Iteration 1 data model). The mock API returns exactly these shapes,
 * so when the real FastAPI backend lands, only the fetch layer changes — every
 * component keeps consuming the same types.
 */

export type Tier = 'free' | 'premium';

export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export type Channel = 'amazon' | 'shopify' | 'tiktok' | 'csv';

export interface User {
  id: string;
  email: string;
  name: string;
  tier: Tier;
  createdAt: string;
}

export interface Dataset {
  id: string;
  name: string;
  source: Channel;
  productName: string;
  reviewCount: number;
  createdAt: string;
}

export interface Review {
  id: string;
  datasetId: string;
  author: string;
  rating: number; // 1-5
  text: string;
  createdAt: string;
  sentimentScore: number; // -1..1
  sentimentLabel: SentimentLabel;
  themeId?: string;
}

/** A negative-theme cluster surfaced by the AI pipeline. */
export interface ThemeCluster {
  id: string;
  label: string;
  summary: string;
  reviewCount: number;
  share: number; // 0..1 proportion of reviews in this theme
  avgSentiment: number; // -1..1
  isComplaint: boolean;
  trend: number; // pct-point change vs previous period
}

export interface KeywordStat {
  term: string;
  count: number;
  sentiment: SentimentLabel;
}

export interface SentimentPoint {
  date: string; // ISO date
  positive: number;
  neutral: number;
  negative: number;
  score: number; // net sentiment -1..1
}

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
}

export type JobStatus = 'queued' | 'running' | 'done' | 'failed';

export interface AnalysisJob {
  id: string;
  datasetId: string;
  status: JobStatus;
  progress: number; // 0..100
  createdAt: string;
}

/** Everything the insights dashboard needs for one dataset. */
export interface DashboardData {
  dataset: Dataset;
  kpis: {
    reviewsAnalyzed: number;
    netSentiment: number; // -1..1
    positiveRate: number; // 0..1
    complaintThemes: number;
    avgRating: number;
    responseOpportunities: number;
  };
  trend: SentimentPoint[];
  distribution: SentimentDistribution;
  themes: ThemeCluster[];
  keywords: KeywordStat[];
  reviews: Review[];
}

/* ---- Competitor benchmarking (premium) ---- */

export interface CompetitorAxis {
  axis: string; // e.g. "Shipping", "Quality"
  you: number; // 0..100 satisfaction
  competitor: number; // 0..100
}

export interface Competitor {
  id: string;
  name: string;
  channel: Channel;
  reviewCount: number;
  netSentiment: number;
  avgRating: number;
}

export interface CompetitorComparison {
  you: { name: string; netSentiment: number; avgRating: number; reviewCount: number };
  competitor: Competitor;
  axes: CompetitorAxis[]; // for radar
  sentimentSplit: {
    label: string; // dimension
    youPositive: number;
    competitorPositive: number;
  }[];
  overlapScore: number; // 0..1 how similar the feedback profiles are
  advantages: string[];
  gaps: string[];
}

/* ---- Smart feedback alerts (premium) ---- */

export type AlertSeverity = 'warning' | 'serious' | 'critical';

export interface FeedbackAlert {
  id: string;
  theme: string;
  severity: AlertSeverity;
  share: number; // 0..1 current share of recent reviews
  threshold: number; // 0..1 configured trigger threshold
  previousShare: number;
  windowDays: number;
  sampleReviews: string[];
  emailSentTo: string | null;
  triggeredAt: string;
  isNew?: boolean;
}

/* ---- Reply-draft optimizer (premium) ---- */

export type SellerPortal = 'amazon' | 'shopify' | 'tiktok';

export interface ReplyDraft {
  id: string;
  reviewId: string;
  tone: string;
  body: string;
  portal: SellerPortal;
  portalUrl: string;
}
