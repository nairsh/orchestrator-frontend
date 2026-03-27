import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from '../ui';

interface DeleteProviderModalProps {
  providerName: string;
  deleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteProviderModal({ providerName, deleting, onConfirm, onClose }: DeleteProviderModalProps) {
  return (
    <Modal onClose={onClose} maxWidth="max-w-sm" className="border border-border-light bg-surface">
      <ModalHeader title="Remove AI service" onClose={onClose} />
      <ModalBody>
        <p className="text-sm text-secondary">
          Remove <span className="font-semibold text-primary">{providerName}</span>? Your saved credentials will be deleted. This cannot be undone.
        </p>
      </ModalBody>
      <ModalFooter>
        <div />
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Removing…' : 'Remove'}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
