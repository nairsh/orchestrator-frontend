import { useState } from 'react';
import { Brain } from 'lucide-react';
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
  const [memoryKey, setMemoryKey] = useState('');
  const [memoryCategory, setMemoryCategory] = useState('general');
  const [memoryContent, setMemoryContent] = useState('');

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">{memories.length} memories</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => void onRefresh()}>
              {memoriesLoading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button onClick={() => setShowDialog(true)}>Save memory</Button>
          </div>
        </div>

        {memories.length === 0 ? (
          <RelayEmpty
            icon={<Brain size={26} className="text-muted" />}
            title="No memories"
            description="Save key-value memories so your workflows can recall context across runs."
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
                  <Button variant="danger" onClick={async () => {
                    try { await deleteMemory(config, memory.id); toastSuccess('Deleted'); void onRefresh(); }
                    catch (err) { toastApiError(err, 'Failed to delete memory'); }
                  }}>Delete</Button>
                </div>
                <div className="mt-2.5 whitespace-pre-wrap text-sm text-muted">{memory.content}</div>
              </Card>
            ))}
          </div>
        )}
      </div>

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
            <Button variant="secondary" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={async () => {
              const key = memoryKey.trim();
              const content = memoryContent.trim();
              if (!key || !content) { toastWarning('Missing fields', 'key and content are required.'); return; }
              try {
                await saveMemory(config, { key, content, category: memoryCategory.trim() || undefined });
                toastSuccess('Saved'); setMemoryKey(''); setMemoryContent(''); setShowDialog(false); void onRefresh();
              } catch (err) { toastApiError(err, 'Failed to save memory'); }
            }}>Save memory</Button>
          </ModalFooter>
        </Modal>
      )}
    </>
  );
}
