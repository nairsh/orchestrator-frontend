import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import type { ApiConfig } from '../../api/client';
import { createWorkflow, useTemplate } from '../../api/client';
import type { WorkflowTemplate } from '../../api/types';
import { toastApiError, toastSuccess, toastWarning } from '../../lib/toast';
import { Button, Card, Input } from '../ui';
import { RelayEmpty } from '../shared/RelayEmpty';

interface TemplatesTabProps {
  templates: WorkflowTemplate[];
  templatesLoading: boolean;
  config: ApiConfig;
  onRefresh: () => Promise<void>;
  onWorkflowStarted?: (workflowId: string, objective: string) => void;
}

export function TemplatesTab({ templates, templatesLoading, config, onRefresh, onWorkflowStarted }: TemplatesTabProps) {
  const [objective, setObjective] = useState('');
  const [startingId, setStartingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2.5">
        <div className="flex-1">
          <Input label="Goal" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Describe what you want to accomplish…" />
        </div>
        <Button variant="secondary" disabled={templatesLoading} onClick={() => void onRefresh()} className="gap-1.5">
          {templatesLoading ? <Loader2 size={13} className="animate-spin" /> : null}
          {templatesLoading ? 'Loading…' : 'Refresh'}
        </Button>
      </div>

      {templates.length === 0 ? (
        <RelayEmpty
          icon={<FileText size={26} className="text-muted" />}
          title="No templates"
          description="Templates let you save and reuse task configurations as starting points."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {templates.map((tpl) => (
            <Card key={tpl.id} padding="lg" className="rounded-[24px] border-border-light bg-surface">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-primary">{tpl.name}</div>
                  <div className="mt-2 text-sm leading-6 text-muted">{tpl.description}</div>
                  <div className="mt-3 text-xs text-placeholder">Uses: {tpl.usage_count} • {tpl.is_public ? 'Public' : 'Private'}</div>
                </div>
                <Button disabled={!!startingId} onClick={async () => {
                  const obj = objective.trim();
                  if (!obj) { toastWarning('Goal required', 'Enter a goal to start from this template.'); return; }
                  setStartingId(tpl.id);
                  try {
                    const res = await useTemplate(config, tpl.id, obj);
                    const started = await createWorkflow(config, res.config);
                    toastSuccess('Task started', 'Your task is now running.');
                    onWorkflowStarted?.(started.workflow_id, obj);
                  } catch (err) { toastApiError(err, 'Couldn\'t start task'); }
                  finally { setStartingId(null); }
                }}>{startingId === tpl.id ? <><Loader2 size={14} className="animate-spin inline mr-1" />Starting…</> : 'Use'}</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
