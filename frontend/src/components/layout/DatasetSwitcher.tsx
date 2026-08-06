import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Store } from 'lucide-react';
import { getDatasets } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import type { Channel } from '@/lib/types';
import { cn } from '@/lib/utils';

const CHANNEL_LABEL: Record<Channel, string> = {
  amazon: 'Amazon',
  shopify: 'Shopify',
  tiktok: 'TikTok Shop',
  csv: 'CSV Upload',
};

export default function DatasetSwitcher() {
  const { data: datasets } = useQuery({ queryKey: ['datasets'], queryFn: getDatasets });
  const datasetId = useAppStore((s) => s.datasetId);
  const setDatasetId = useAppStore((s) => s.setDatasetId);

  // Real datasets have server ids — if the stored selection isn't in the list
  // (fresh login, first upload, mock→real switch), fall back to the newest one.
  useEffect(() => {
    if (datasets?.length && !datasets.some((d) => d.id === datasetId)) {
      setDatasetId(datasets[0].id);
    }
  }, [datasets, datasetId, setDatasetId]);

  if (datasets && datasets.length === 0) return <div />;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-2 py-1.5">
      <Store className="ml-1 h-4 w-4 text-ink/40" />
      <div className="relative">
        <select
          value={datasetId}
          onChange={(e) => setDatasetId(e.target.value)}
          className={cn(
            'appearance-none bg-transparent pr-6 text-sm font-semibold text-ink focus:outline-none',
          )}
        >
          {datasets?.map((d) => (
            <option key={d.id} value={d.id}>
              {CHANNEL_LABEL[d.source]} · {d.reviewCount} reviews
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
      </div>
    </div>
  );
}
