import type { SkillRecord } from './types';
import type { ApiConfig } from './core';
import { request } from './core';

export async function listSkills(config: ApiConfig): Promise<{ skills: SkillRecord[] }> {
  return request<{ skills: SkillRecord[] }>(config, '/v1/skills');
}

export async function getSkill(config: ApiConfig, id: string): Promise<{ skill: SkillRecord }> {
  return request<{ skill: SkillRecord }>(config, `/v1/skills/${encodeURIComponent(id)}`);
}

export async function upsertSkill(
  config: ApiConfig,
  id: string,
  input: { name?: string; description: string; prompt_addendum: string; tools?: string[] }
): Promise<{ skill: SkillRecord }> {
  return request<{ skill: SkillRecord }>(config, `/v1/skills/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function removeSkill(config: ApiConfig, id: string): Promise<{ deleted: boolean; id?: string }> {
  return request<{ deleted: boolean; id?: string }>(config, `/v1/skills/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function importSkill(
  config: ApiConfig,
  input: { skill_id: string; markdown: string }
): Promise<{ skill: SkillRecord }> {
  return request<{ skill: SkillRecord }>(config, '/v1/skills/import', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
