import type { ContextFileUpload } from '../api/client';

// Backend Fastify bodyLimit is 10MB; base64 expands payload size.
export const MAX_CONTEXT_FILE_BYTES = 6 * 1024 * 1024; // 6 MiB
export const MAX_TOTAL_CONTEXT_BYTES = 8 * 1024 * 1024; // 8 MiB

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

export async function fileToContextUpload(file: File): Promise<ContextFileUpload & { size: number }> {
  const dataUrl = await readAsDataUrl(file);
  const comma = dataUrl.indexOf(',');
  const prefix = comma >= 0 ? dataUrl.slice(0, comma) : '';
  const content_base64 = comma >= 0 ? dataUrl.slice(comma + 1) : '';

  const match = prefix.match(/^data:(.*);base64$/);
  const media_type = file.type || match?.[1] || 'application/octet-stream';

  return {
    filename: file.name,
    media_type,
    content_base64,
    size: file.size,
  };
}
