import { useState } from 'react';
import { CalendarClock, Clock3 } from 'lucide-react';
import { Alert, Segmented } from '@lobehub/ui';
import type { ApiConfig, CreateScheduleInput } from '../../api/client';
import { createSchedule, deleteSchedule, updateSchedule } from '../../api/client';
import type { ScheduledWorkflow } from '../../api/types';
import { toastApiError, toastSuccess, toastWarning } from '../../lib/toast';
import { Button, Card, Input, Modal, ModalHeader, ModalBody, ModalFooter, Select } from '../ui';
import { RelayEmpty } from '../shared/RelayEmpty';
import { formatWhen, getScheduleLabel, intervalUnits, type IntervalUnit, type ScheduleType } from './connectorsHelpers';

interface SchedulesTabProps {
  schedules: ScheduledWorkflow[];
  schedulesLoading: boolean;
  config: ApiConfig;
  onRefresh: () => Promise<void>;
}

export function SchedulesTab({ schedules, schedulesLoading, config, onRefresh }: SchedulesTabProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [scheduleType, setScheduleType] = useState<ScheduleType>('cron');
  const [scheduleCron, setScheduleCron] = useState('0 * * * *');
  const [scheduleIntervalValue, setScheduleIntervalValue] = useState('6');
  const [scheduleIntervalUnit, setScheduleIntervalUnit] = useState<IntervalUnit>('hours');
  const [scheduleTimezone, setScheduleTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [scheduleObjective, setScheduleObjective] = useState('');
  const [scheduleWorkingDirectory, setScheduleWorkingDirectory] = useState('');
  const [scheduleOverlapPolicy, setScheduleOverlapPolicy] = useState<'skip' | 'queue'>('skip');

  const createPayload = (): CreateScheduleInput | null => {
    const objective = scheduleObjective.trim();
    if (!objective) { toastWarning('Objective required', 'Describe what the schedule should do.'); return null; }

    if (scheduleType === 'cron') {
      const cron = scheduleCron.trim();
      if (!cron) { toastWarning('Cron required', 'Enter a cron expression.'); return null; }
      return {
        objective, schedule_type: 'cron', cron_expression: cron,
        timezone: scheduleTimezone.trim() || 'UTC', overlap_policy: scheduleOverlapPolicy,
        ...(scheduleWorkingDirectory.trim() ? { working_directory: scheduleWorkingDirectory.trim() } : {}),
      };
    }

    const intervalValue = Number(scheduleIntervalValue);
    if (!Number.isFinite(intervalValue) || intervalValue <= 0) { toastWarning('Interval required', 'Set a positive interval value.'); return null; }
    return {
      objective, schedule_type: 'interval', interval_value: intervalValue, interval_unit: scheduleIntervalUnit,
      timezone: scheduleTimezone.trim() || 'UTC', overlap_policy: scheduleOverlapPolicy,
      ...(scheduleWorkingDirectory.trim() ? { working_directory: scheduleWorkingDirectory.trim() } : {}),
    };
  };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">{schedules.length} schedules</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => void onRefresh()}>
              {schedulesLoading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button onClick={() => setShowDialog(true)}>
              <CalendarClock size={14} className="mr-1.5" />
              New schedule
            </Button>
          </div>
        </div>

        {schedules.length === 0 ? (
          <RelayEmpty
            icon={<CalendarClock size={26} className="text-muted" />}
            title="No schedules"
            description="Create a schedule to automate recurring workflows on a cron or interval basis."
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {schedules.map((schedule) => (
              <Card key={schedule.id} padding="lg" className="rounded-[24px] border-border-light bg-surface">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                      {schedule.schedule_type === 'interval' ? <Clock3 size={15} /> : <CalendarClock size={15} />}
                      {getScheduleLabel(schedule)}
                    </div>
                    <div className="mt-2 text-sm text-secondary">{schedule.workflow_config ? JSON.parse(schedule.workflow_config).objective ?? 'Scheduled task' : 'Scheduled task'}</div>
                    <div className="mt-3 text-xs leading-5 text-muted">
                      Next: {formatWhen(schedule.next_run_at)}<br />
                      Timezone: {schedule.timezone} • Overlap: {schedule.overlap_policy}<br />
                      Status: {schedule.status}{schedule.last_run_status ? ` • Last run ${schedule.last_run_status}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={async () => {
                      try { const { triggerSchedule } = await import('../../api/client'); await triggerSchedule(config, schedule.id); toastSuccess('Triggered'); void onRefresh(); }
                      catch (err) { toastApiError(err, 'Failed to trigger schedule'); }
                    }}>Run now</Button>
                    <Button variant="secondary" onClick={async () => {
                      try { await updateSchedule(config, schedule.id, { status: schedule.status === 'paused' ? 'active' : 'paused' }); toastSuccess('Updated'); void onRefresh(); }
                      catch (err) { toastApiError(err, 'Failed to update schedule'); }
                    }}>{schedule.status === 'paused' ? 'Resume' : 'Pause'}</Button>
                    <Button variant="danger" onClick={async () => {
                      try { await deleteSchedule(config, schedule.id); toastSuccess('Deleted'); void onRefresh(); }
                      catch (err) { toastApiError(err, 'Failed to delete schedule'); }
                    }}>Delete</Button>
                  </div>
                </div>
                {schedule.last_error && <Alert className="mt-3" type="error" title={schedule.last_error} variant="outlined" />}
              </Card>
            ))}
          </div>
        )}
      </div>

      {showDialog && (
        <Modal onClose={() => setShowDialog(false)} maxWidth="max-w-lg">
          <ModalHeader title="Create schedule" onClose={() => setShowDialog(false)}>
            <CalendarClock size={18} className="text-muted" />
          </ModalHeader>
          <ModalBody>
            <div className="mb-4">
              <Segmented
                value={scheduleType}
                options={[
                  { label: 'Cron', value: 'cron' as ScheduleType },
                  { label: 'Interval', value: 'interval' as ScheduleType },
                ]}
                onChange={(val) => setScheduleType(val as ScheduleType)}
                size="small"
              />
            </div>
            <div className="grid gap-3">
              {scheduleType === 'cron' ? (
                <Input value={scheduleCron} onChange={(e) => setScheduleCron(e.target.value)} placeholder="0 * * * *" label="Cron expression" />
              ) : (
                <div className="grid grid-cols-[140px_1fr] gap-3">
                  <Input value={scheduleIntervalValue} onChange={(e) => setScheduleIntervalValue(e.target.value)} placeholder="6" label="Interval" />
                  <div>
                    <Select
                      label="Unit"
                      value={scheduleIntervalUnit}
                      onChange={(e) => setScheduleIntervalUnit(e.target.value as IntervalUnit)}
                      options={intervalUnits.map((unit) => ({ value: unit, label: unit }))}
                    />
                  </div>
                </div>
              )}
              <Input value={scheduleObjective} onChange={(e) => setScheduleObjective(e.target.value)} placeholder="Summarize open GitHub issues and Linear blockers" label="Objective" />
              <Input value={scheduleTimezone} onChange={(e) => setScheduleTimezone(e.target.value)} placeholder="UTC" label="Timezone" />
              <Input value={scheduleWorkingDirectory} onChange={(e) => setScheduleWorkingDirectory(e.target.value)} placeholder="/Users/you/projects/app" label="Working directory" />
              <Select
                label="Overlap policy"
                value={scheduleOverlapPolicy}
                onChange={(e) => setScheduleOverlapPolicy(e.target.value as 'skip' | 'queue')}
                options={[
                  { value: 'skip', label: 'Skip if already running' },
                  { value: 'queue', label: 'Queue overlapping run' },
                ]}
              />
            </div>
          </ModalBody>
          <ModalFooter className="justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              const payload = createPayload();
              if (!payload) return;
              try { await createSchedule(config, payload); toastSuccess('Schedule created'); setScheduleObjective(''); setShowDialog(false); void onRefresh(); }
              catch (err) { toastApiError(err, 'Failed to create schedule'); }
            }}>Create schedule</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}
