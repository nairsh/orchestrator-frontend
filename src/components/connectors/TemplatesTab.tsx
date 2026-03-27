import { useState } from 'react';
import { FileText } from 'lucide-react';
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

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2.5">
        <div className="flex-1">
          <Input label="Objective" value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="What should this template do?" />
        </div>
        <Button variant="secondary" onClick={() => void onRefresh()}>
          {templatesLoading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {templates.length === 0 ? (
        <RelayEmpty
          icon={<FileText size={26} className="text-muted" />}
          title="No templates"
          description="Templates let you save and reuse workflow configurations as starting points."
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
                <Button onClick={async () => {
                  const obj = objective.trim();
                  if (!obj) { toastWarning('Objective required', 'Enter an objective to use a template.'); return; }
                  try {
                    const res = await useTemplate(config, tpl.id, obj);
                    const started = await createWorkflow(config, res.config);
                    toastSuccess('Task started', 'Your task is now running.');
                    onWorkflowStarted?.(started.workflow_id, obj);
                  } catch (err) { toastApiError(err, 'Failed to start task'); }
                }}>Use</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
