import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { ContextFileUpload } from '../api/client';
import { fileToContextUpload, MAX_CONTEXT_FILE_BYTES, MAX_TOTAL_CONTEXT_BYTES } from '../lib/files';
import { toastError, toastWarning } from '../lib/toast';

export type Attachment = ContextFileUpload & { id: string; size: number };

export function useFileAttachments() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const attachmentsRef = useRef(attachments);
  useEffect(() => { attachmentsRef.current = attachments; }, [attachments]);

  const contextFiles = useMemo(
    () => attachments.map(({ id: _id, size: _size, ...rest }) => rest),
    [attachments],
  );

  const handleUploadFiles = useCallback(async (files: File[]) => {
    let runningTotal = attachmentsRef.current.reduce((sum, a) => sum + a.size, 0);
    for (const file of files) {
      if (file.size > MAX_CONTEXT_FILE_BYTES) {
        toastError('File too large', `${file.name} exceeds ${Math.round(MAX_CONTEXT_FILE_BYTES / (1024 * 1024))}MB.`);
        continue;
      }
      if (runningTotal + file.size > MAX_TOTAL_CONTEXT_BYTES) {
        toastWarning('Total file size too large', 'Remove some files before adding more.');
        break;
      }
      try {
        const upload = await fileToContextUpload(file);
        runningTotal += file.size;
        setAttachments((prev) => [...prev, { ...upload, id: crypto.randomUUID() }]);
      } catch (err) {
        toastError('Upload failed', err instanceof Error ? err.message : 'Something went wrong.');
      }
    }
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAttachments = useCallback(() => {
    setAttachments([]);
  }, []);

  return { attachments, contextFiles, handleUploadFiles, removeAttachment, clearAttachments };
}
