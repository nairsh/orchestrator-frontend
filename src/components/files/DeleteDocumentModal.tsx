import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from '../ui';

interface DeleteDocumentModalProps {
  deletingDoc: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteDocumentModal({ deletingDoc, onConfirm, onCancel }: DeleteDocumentModalProps) {
  return (
    <Modal onClose={() => { if (!deletingDoc) onCancel(); }} maxWidth="max-w-sm">
      <ModalHeader title="Remove document?" onClose={() => { if (!deletingDoc) onCancel(); }} />
      <ModalBody>
        <p className="text-sm text-secondary">This will permanently remove the document from your knowledge library. This cannot be undone.</p>
      </ModalBody>
      <ModalFooter className="justify-end gap-2">
        <Button variant="ghost" disabled={deletingDoc} onClick={onCancel}>Cancel</Button>
        <Button variant="danger" disabled={deletingDoc} onClick={onConfirm}>{deletingDoc ? 'Removing…' : 'Remove'}</Button>
      </ModalFooter>
    </Modal>
  );
}
