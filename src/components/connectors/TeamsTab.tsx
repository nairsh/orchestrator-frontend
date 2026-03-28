import { Loader2, Users } from 'lucide-react';
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
        <RelayEmpty
          icon={<Users size={26} className="text-muted" />}
          title="Teams coming soon"
          description="Team collaboration is not yet available on this server. Contact your administrator to enable it."
        />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">{teams.length} {teams.length === 1 ? 'team' : 'teams'}</span>
            <Button variant="secondary" disabled={teamsStatus === 'loading'} onClick={() => void onRefresh()} className="gap-1.5">
              {teamsStatus === 'loading' ? <Loader2 size={13} className="animate-spin" /> : null}
              {teamsStatus === 'loading' ? 'Loading…' : 'Refresh'}
            </Button>
          </div>

          {teamsStatus === 'loading' && teams.length === 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-[22px] border border-border-light bg-surface p-6 animate-pulse h-20" />
              ))}
            </div>
          ) : teams.length === 0 ? (
            <RelayEmpty
              icon={<Users size={26} className="text-muted" />}
              title="No teams"
              description="Teams share context and coordinate across members."
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {teams.map((team, idx) => (
                <Card key={String(team.id ?? `team-${idx}`)} padding="lg" className="rounded-[22px] border-border-light bg-surface">
                  <span className="text-sm text-primary">{String(team.name ?? 'Unnamed team')}</span>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <Card padding="lg" className="rounded-[24px] border-border-light bg-surface">
        <div className="text-sm font-semibold text-primary">Shared team context</div>
        <div className="mt-2 text-sm leading-6 text-secondary">
          Your team's shared context is available to AI during tasks.
        </div>
      </Card>
    </div>
  );
}
