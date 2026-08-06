import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import { Field, FormError } from '@/components/auth/AuthLayout';
import { ApiError, getJob, uploadDataset } from '@/lib/api';
import { TIER_LIMITS } from '@/lib/config';
import { useAppStore } from '@/store/appStore';
import type { AnalysisJob, Channel, Dataset } from '@/lib/types';
import { cn } from '@/lib/utils';

const SOURCES: { value: Channel; label: string }[] = [
  { value: 'amazon', label: 'Amazon' },
  { value: 'shopify', label: 'Shopify' },
  { value: 'tiktok', label: 'TikTok Shop' },
  { value: 'csv', label: 'Other (CSV export)' },
];

type Phase =
  | { kind: 'form' }
  | { kind: 'uploading' }
  | { kind: 'processing'; dataset: Dataset; job: AnalysisJob }
  | { kind: 'done'; dataset: Dataset }
  | { kind: 'failed'; message: string };

export default function Upload() {
  const tier = useAppStore((s) => s.tier);
  const setDatasetId = useAppStore((s) => s.setDatasetId);
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [productName, setProductName] = useState('');
  const [source, setSource] = useState<Channel>('amazon');
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'form' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cap = TIER_LIMITS[tier].reviewCap;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError('Choose a CSV file of reviews first.');
      return;
    }
    setPhase({ kind: 'uploading' });
    try {
      const { dataset, job } = await uploadDataset({ file, name, productName, source });
      setPhase({ kind: 'processing', dataset, job });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not reach the server. Is the backend running?';
      setPhase({ kind: 'form' });
      setError(message);
    }
  }

  // Poll the analysis job while processing.
  useEffect(() => {
    if (phase.kind !== 'processing') return;
    if (phase.job.status === 'done') {
      setDatasetId(phase.dataset.id);
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setPhase({ kind: 'done', dataset: phase.dataset });
      return;
    }
    if (phase.job.status === 'failed') {
      setPhase({ kind: 'failed', message: phase.job.error ?? 'Analysis failed. Please try again.' });
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const job = await getJob(phase.job.id);
        setPhase({ kind: 'processing', dataset: phase.dataset, job });
      } catch {
        setPhase({ kind: 'failed', message: 'Lost contact with the analysis job.' });
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [phase, queryClient, setDatasetId]);

  function reset() {
    setPhase({ kind: 'form' });
    setFile(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <>
      <PageHeader
        eyebrow="Upload reviews"
        title="Feed the AI your latest reviews"
        subtitle={`Export reviews as CSV (columns: author, rating, text, created_at) and upload up to ${cap} rows on your ${tier} plan.`}
      />

      <div className="mx-auto max-w-2xl">
        {phase.kind === 'form' || phase.kind === 'uploading' ? (
          <Card>
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              {/* File picker */}
              <div>
                <span className="mb-1.5 block text-sm font-semibold text-ink">Review CSV</span>
                <label
                  htmlFor="csv-file"
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-9 text-center transition-colors',
                    file
                      ? 'border-brand-300 bg-brand-50/60'
                      : 'border-ink/15 bg-surface hover:border-brand-300 hover:bg-brand-50/40',
                  )}
                >
                  {file ? (
                    <>
                      <FileSpreadsheet className="h-8 w-8 text-brand-500" />
                      <p className="text-sm font-semibold text-ink">{file.name}</p>
                      <p className="text-xs text-ink/45">{(file.size / 1024).toFixed(1)} KB — click to change</p>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="h-8 w-8 text-ink/30" />
                      <p className="text-sm font-semibold text-ink">Click to choose a CSV file</p>
                      <p className="text-xs text-ink/45">author, rating, text, created_at</p>
                    </>
                  )}
                </label>
                <input
                  ref={fileInputRef}
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <Field
                id="dataset-name"
                label="Dataset name"
                placeholder="Amazon — NovaBrew Go Espresso"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Field
                id="product-name"
                label="Product name"
                placeholder="NovaBrew Go Portable Espresso Maker"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />

              <label className="block" htmlFor="source">
                <span className="mb-1.5 block text-sm font-semibold text-ink">Sales channel</span>
                <select
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value as Channel)}
                  className="h-11 w-full rounded-xl border border-ink/15 bg-white px-3 text-sm font-medium text-ink focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
                >
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <FormError message={error} />

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={phase.kind === 'uploading' || !name || !productName}
              >
                {phase.kind === 'uploading' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" /> Upload & analyze
                  </>
                )}
              </Button>
            </form>
          </Card>
        ) : phase.kind === 'processing' ? (
          <Card className="text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand-500" />
            <h2 className="mt-4 text-xl font-extrabold tracking-tight text-ink">Analyzing your reviews…</h2>
            <p className="mt-1 text-sm text-ink/55">
              Scoring sentiment, clustering themes, extracting keywords, checking alert rules.
            </p>
            <div className="mx-auto mt-6 max-w-sm">
              <div className="h-2.5 overflow-hidden rounded-full bg-ink/[0.07]">
                <div
                  className="h-full rounded-full bg-brand-grad transition-all duration-500"
                  style={{ width: `${Math.max(6, phase.job.progress)}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-semibold text-ink/45">
                {phase.job.status} · {phase.job.progress}%
              </p>
            </div>
          </Card>
        ) : phase.kind === 'done' ? (
          <Card className="text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-positive" />
            <h2 className="mt-4 text-xl font-extrabold tracking-tight text-ink">Analysis complete</h2>
            <p className="mt-1 text-sm text-ink/55">
              {phase.dataset.reviewCount} reviews from “{phase.dataset.name}” are scored, themed, and ready.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link to="/app">
                <Button size="lg">
                  View insights dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" onClick={reset}>
                <RotateCcw className="h-4 w-4" /> Upload another
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="text-center">
            <XCircle className="mx-auto h-10 w-10 text-negative" />
            <h2 className="mt-4 text-xl font-extrabold tracking-tight text-ink">Analysis failed</h2>
            <p className="mx-auto mt-1 max-w-md text-sm text-ink/55">{phase.message}</p>
            <Button variant="outline" size="lg" className="mt-6" onClick={reset}>
              <RotateCcw className="h-4 w-4" /> Try again
            </Button>
          </Card>
        )}
      </div>
    </>
  );
}
