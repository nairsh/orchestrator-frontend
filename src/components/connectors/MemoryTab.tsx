import { useState } from 'react';
import { Brain, Loader2 } from 'lucide-react';
import type { ApiConfig } from '../../api/client';
import { deleteMemory, saveMemory } from '../../api/client';
import type { Memory } from '../../api/types';
import { toastApiError, toastSuccess, toastWarning } from '../../lib/toast';
import { Button, Card, Input, Textarea, Modal, ModalHeader, ModalBody, ModalFooter } from '../ui';
import { RelayEmpty } from '../shared/RelayEmpty';

interface MemoryTabProps {
  memories: Memory[];
  memoriesLoading: boolean;
  config: ApiConfig;
  onRefresh: () => Promise<void>;
}

export function MemoryTab({ memories, memoriesLoading, config, onRefresh }: MemoryTabProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memoryKey, setMemoryKey] = useState('');
  const [memoryCategory, setMemoryCategory] = useState('general');
  const [memoryContent, setMemoryContent] = useState('');

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">{memories.length} memories</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={memoriesLoading} onClick={() => void onRefresh()} className="gap-1.5">
              {memoriesLoading ? <Loader2 size={13} className="animate-spin" /> : null}
              {memoriesLoading ? 'Loading…' : 'Refresh'}
            </Button>
            <Button onClick={() => setShowDialog(true)}>Save memory</Button>
          </div>
        </div>

        {memories.length === 0 ? (
          <RelayEmpty
            icon={<Brain size={26} className="text-muted" />}
            title="No memories"
            description="Save key-value memories so your AI can recall context across tasks."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {memories.map((memory) => (
              <Card key={memory.id} padding="md" className="rounded-[22px] border-border-light bg-surface">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-primary">{memory.key}</div>
                    <div className="mt-1 text-xs text-placeholder">{memory.category}</div>
                  </div>
                  <Button variant="danger" onClick={() => setDeleteConfirmId(memory.id)}>Delete</Button>
                </div>
                <div className="mt-2.5 whitespace-pre-wrap text-sm text-muted">{memory.content}</div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {deleteConfirmId && (
        <Modal onClose={() => setDeleteConfirmId(null)} maxWidth="max-w-sm">
          <ModalHeader title="Delete memory?" onClose={() => setDeleteConfirmId(null)} />
          <ModalBody>
            <p className="text-sm text-secondary">This will permanently remove the memory. This cannot be undone.</p>
          </ModalBody>
          <ModalFooter className="justify-end gap-2">
            <Button variant="ghost" disabled={deleting} onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="danger" disabled={deleting} onClick={async () => {
              const id = deleteConfirmId;
              setDeleting(true);
              try { await deleteMemory(config, id); setDeleteConfirmId(null); toastSuccess('Memory deleted'); void onRefresh(); }
              catch (err) { toastApiError(err, 'Failed to delete memory'); }
              finally { setDeleting(false); }
            }}>{deleting ? 'Deleting…' : 'Delete'}</Button>
          </ModalFooter>
        </Modal>
      )}

      {showDialog && (
        <Modal onClose={() => setShowDialog(false)} maxWidth="max-w-md">
          <ModalHeader title="Save memory" onClose={() => setShowDialog(false)} />
          <ModalBody>
            <div className="grid gap-3">
              <Input value={memoryKey} onChange={(e) => setMemoryKey(e.target.value)} placeholder="key" label="Key" />
              <Input value={memoryCategory} onChange={(e) => setMemoryCategory(e.target.value)} placeholder="category" label="Category" />
              <Textarea
                value={memoryContent}
                onChange={(e) => setMemoryContent(e.target.value)}
                placeholder="Content to remember..."
                maxHeight={200}
                className="rounded-lg border border-border-light bg-surface px-3 py-2"
              />
            </div>
          </ModalBody>
          <ModalFooter className="justify-end gap-2">
            <Button variant="secondary" disabled={saving} onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button disabled={saving} onClick={async () => {
              const key = memoryKey.trim();
              const content = memoryContent.trim();
              if (!key) { toastWarning('Name required', 'Enter a name for this memory.'); return; }
              if (!content) { toastWarning('Content required', 'Enter the content to remember.'); return; }
              setSaving(true);
              try {
                await saveMemory(config, { key, content, category: memoryCategory.trim() || undefined });
                toastSuccess('Saved'); setMemoryKey(''); setMemoryContent(''); setShowDialog(false); void onRefresh();
              } catch (err) { toastApiError(err, 'Failed to save memory'); }
              finally { setSaving(false); }
            }}>{saving ? 'Saving…' : 'Save memory'}</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}
