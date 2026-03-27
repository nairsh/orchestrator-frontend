import type { KnowledgeDocument, KnowledgeChunk, KnowledgeSearchMatch } from './types';
import type { ApiConfig } from './core';
import { request } from './core';

export async function listKnowledgeDocuments(config: ApiConfig): Promise<{ documents: KnowledgeDocument[] }> {
  return request<{ documents: KnowledgeDocument[] }>(config, '/v1/knowledge/documents');
}

export async function uploadKnowledgeDocument(
  config: ApiConfig,
  input: { filename: string; media_type: string; content_base64: string }
): Promise<{ document: KnowledgeDocument }> {
  return request<{ document: KnowledgeDocument }>(config, '/v1/knowledge/documents', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getKnowledgeDocument(
  config: ApiConfig,
  documentId: string
): Promise<{ document: KnowledgeDocument; chunks: KnowledgeChunk[]; content: string }> {
  return request<{ document: KnowledgeDocument; chunks: KnowledgeChunk[]; content: string }>(
    config,
    `/v1/knowledge/documents/${encodeURIComponent(documentId)}`
  );
}

export async function deleteKnowledgeDocument(
  config: ApiConfig,
  documentId: string
): Promise<{ deleted: boolean; id: string }> {
  return request<{ deleted: boolean; id: string }>(config, `/v1/knowledge/documents/${encodeURIComponent(documentId)}`, {
    method: 'DELETE',
  });
}

export async function searchKnowledge(
  config: ApiConfig,
  input: { query: string; limit?: number }
): Promise<{ matches: KnowledgeSearchMatch[] }> {
  return request<{ matches: KnowledgeSearchMatch[] }>(config, '/v1/knowledge/search', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
