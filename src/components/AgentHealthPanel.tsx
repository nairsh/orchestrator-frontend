import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { Empty, Tooltip } from '@lobehub/ui';
import type { AgentHealthStatus } from '../api/types';
import type { ApiConfig } from '../api/client';
import { getAgentHealth } from '../api/client';
import { Button } from './ui/Button';

interface AgentHealthPanelProps {
  config: ApiConfig;
}

const AGENT_COLORS: Record<string, string> = {
  research: 'text-accent',
  analyze: 'text-secondary',
  write: 'text-primary',
  code: 'text-warning',
  file: 'text-muted',
  deep_research: 'text-info',
};

const AGENT_LABELS: Record<string, string> = {
  research: 'Research',
  analyze: 'Analysis',
  write: 'Writing',
  code: 'Coding',
  file: 'File Ops',
  deep_research: 'Deep Research',
};

function StatusIcon({ status }: { status: AgentHealthStatus['status'] }) {
  switch (status) {
    case 'healthy':
      return <CheckCircle2 size={16} className="text-success" />;
    case 'degraded':
      return <AlertTriangle size={16} className="text-warning" />;
    case 'unavailable':
      return <XCircle size={16} className="text-danger" />;
  }
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`;
}

export function AgentHealthPanel({ config }: AgentHealthPanelProps) {
  const [agents, setAgents] = useState<AgentHealthStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getAgentHealth(config);
      setAgents(res.agents ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agent health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHealth();
  }, [config.baseUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-sm text-muted">{error}</p>
        <Button variant="ghost" size="sm" onClick={() => void fetchHealth()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-muted" />
          <span className="text-sm font-medium text-primary">Model Health</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void fetchHealth()} className="gap-1.5">
          <RefreshCw size={12} />
          Refresh
        </Button>
      </div>

      {agents.length === 0 ? (
        <div className="py-4">
          <Empty description="No health data available" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {agents.map((agent) => (
            <div
              key={agent.agent_type}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border-light bg-surface"
            >
              <Tooltip title={agent.status}>
                <StatusIcon status={agent.status} />
              </Tooltip>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${AGENT_COLORS[agent.agent_type] ?? 'text-primary'}`}>
                    {AGENT_LABELS[agent.agent_type] ?? agent.agent_type}
                  </span>
                  <span className="text-2xs text-muted font-mono truncate">{agent.model}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted">
                <Tooltip title="Success rate (1h)">
                  <span>{formatRate(agent.success_rate_1h)}</span>
                </Tooltip>
                <Tooltip title="Average latency">
                  <span>{formatMs(agent.avg_latency_ms)}</span>
                </Tooltip>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
