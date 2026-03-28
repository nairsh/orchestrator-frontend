import type { RefObject } from 'react';
import { Button, Input, Modal, ModalHeader, ModalBody, ModalFooter } from '../ui';

interface RenameTaskModalProps {
  renameValue: string;
  onRenameValueChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
}

export function RenameTaskModal({
  renameValue,
  onRenameValueChange,
  onClose,
  onSave,
  inputRef,
}: RenameTaskModalProps) {
  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Rename task" onClose={onClose} />
      <ModalBody>
        <div className="space-y-3">
          <Input
            ref={inputRef}
            label="Name"
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && renameValue.trim()) onSave(); }}
          />
          <div className="text-xs text-muted">
            Stored locally in this browser.
          </div>
        </div>
      </ModalBody>
      <ModalFooter className="justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={onSave} disabled={!renameValue.trim()}>Save</Button>
      </ModalFooter>
    </Modal>
  );
}
