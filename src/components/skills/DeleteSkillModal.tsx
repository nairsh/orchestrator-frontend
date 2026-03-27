import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from '../ui';
import { formatSkillName } from './helpers';

interface DeleteSkillModalProps {
  skillId: string;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteSkillModal({ skillId, deleting, onConfirm, onClose }: DeleteSkillModalProps) {
  return (
    <Modal onClose={onClose} maxWidth="max-w-sm" className="border border-border-light bg-surface">
      <ModalHeader title="Delete skill" onClose={onClose} />
      <ModalBody>
        <p className="text-sm text-secondary">
          Delete <span className="font-semibold text-primary">{formatSkillName(skillId)}</span>? This cannot be undone.
        </p>
      </ModalBody>
      <ModalFooter>
        <div />
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
