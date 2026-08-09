import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2 } from 'lucide-react';
import { ApiError, deleteDataset } from '@/lib/api';
import Button from '@/components/ui/Button';
import { useAppStore } from '@/store/appStore';
import type { Dataset } from '@/lib/types';

/**
 * Deletes the dataset currently on screen, along with its whole analysis.
 *
 * Two-step by design: the first click only arms the action. Deleting throws
 * away an analysis that took real time (and real model calls) to produce, so a
 * single stray click shouldn't be able to do it.
 */
export default function DeleteDataset({ dataset }: { dataset: Dataset }) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const setDatasetId = useAppStore((s) => s.setDatasetId);

  const mutation = useMutation({
    mutationFn: () => deleteDataset(dataset.id),
    onSuccess: () => {
      // Clear the selection so the switcher picks whatever remains — or the
      // dashboard falls through to its empty state if that was the last one.
      setDatasetId('');
      queryClient.invalidateQueries();
      setArmed(false);
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Could not reach the server.'),
  });

  if (!armed) {
    return (
      <Button
        variant="ghost"
        onClick={() => {
          setError(null);
          setArmed(true);
        }}
        title={`Delete “${dataset.name}” and its analysis`}
      >
        <Trash2 className="h-4 w-4" /> Delete dataset
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-ink/60">Delete this dataset and its analysis?</span>
        <Button variant="ghost" size="sm" onClick={() => setArmed(false)} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="bg-negative shadow-none hover:bg-negative/90"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting…
            </>
          ) : (
            <>
              <Trash2 className="h-3.5 w-3.5" /> Yes, delete
            </>
          )}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-negative">
          {error}
        </p>
      )}
    </div>
  );
}
