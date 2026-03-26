import { Snippet } from '@lobehub/ui';
import { Users } from 'lucide-react';
import { Button, Card } from '../ui';
import { RelayEmpty } from '../shared/RelayEmpty';

interface TeamsTabProps {
  teams: Array<Record<string, unknown>>;
  teamsStatus: 'idle' | 'loading' | 'disabled' | 'ready';
  onRefresh: () => Promise<void>;
}

export function TeamsTab({ teams, teamsStatus, onRefresh }: TeamsTabProps) {
  return (
    <div className="space-y-4">
      {teamsStatus === 'disabled' ? (
        <Card padding="lg" className="rounded-[24px] border-border-light bg-surface">
          <span className="text-sm text-muted">
            Teams is disabled on this server. Enable it with <Snippet copyable={false} variant="borderless">TEAMS_BETA_ENABLED=1</Snippet>.
          </span>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">{teams.length} teams</span>
            <Button variant="secondary" onClick={() => void onRefresh()}>
              {teamsStatus === 'loading' ? 'Loading...' : 'Refresh'}
            </Button>
          </div>

          {teams.length === 0 ? (
            <RelayEmpty
              icon={<Users size={26} className="text-muted" />}
              title="No teams"
              description="Teams share context and coordinate across workflows and members."
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {teams.map((team) => (
                <Card key={String(team.id ?? Math.random())} padding="lg" className="rounded-[22px] border-border-light bg-surface">
                  <span className="text-sm text-primary">{String(team.name ?? team.id)}</span>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Card padding="lg" className="rounded-[24px] border-border-light bg-surface">
        <div className="text-sm font-semibold text-primary">Shared team context</div>
        <div className="mt-2 text-sm leading-6 text-secondary">
          Teams data is live from the API. Use this surface to verify membership and shared context availability before rolling out team workflows.
        </div>
        <div className="mt-4 text-xs text-muted">
          The server already owns full team context APIs; this screen now exposes the current team inventory instead of a placeholder action.
        </div>
      </Card>
    </div>
  );
}
