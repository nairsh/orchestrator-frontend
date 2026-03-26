import { useEffect, useState, useMemo } from 'react';
import { Sparkles, LayoutTemplate, Loader2 } from 'lucide-react';
import { Tag } from '@lobehub/ui';
import type { ApiConfig } from '../api/client';
import type { WorkflowTemplate } from '../api/types';
import { listTemplates } from '../api/client';

interface TemplatesGalleryProps {
  config: ApiConfig;
  onSelectTemplate: (objective: string) => void;
}

const TAG_ICONS: Record<string, string> = {
  research: '🔍',
  code: '💻',
  writing: '✍️',
  analysis: '📊',
  planning: '📋',
  design: '🎨',
};

export function TemplatesGallery({ config, onSelectTemplate }: TemplatesGalleryProps) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await listTemplates(config);
        setTemplates(res.templates ?? []);
      } catch {
        // Templates may not be available
      } finally {
        setLoading(false);
      }
    })();
  }, [config.baseUrl]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    templates.forEach((t) => t.tags?.forEach((tag) => tags.add(tag)));
    return Array.from(tags);
  }, [templates]);

  const filtered = useMemo(() => {
    if (!selectedTag) return templates;
    return templates.filter((t) => t.tags?.includes(selectedTag));
  }, [templates, selectedTag]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={16} className="animate-spin text-muted" />
      </div>
    );
  }

  if (templates.length === 0) return null;

  return (
    <div className="w-[640px] max-w-[calc(100vw-120px)] mt-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <LayoutTemplate size={14} className="text-muted" />
        <span className="text-xs font-medium text-muted uppercase tracking-wider">Templates</span>
      </div>

      {/* Tag filters */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
            className={`px-2 py-0.5 rounded-full text-2xs font-medium transition-colors cursor-pointer ${
              !selectedTag ? 'bg-info/15 text-info' : 'bg-surface-tertiary text-muted hover:text-primary'
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={`px-2 py-0.5 rounded-full text-2xs font-medium transition-colors cursor-pointer ${
                tag === selectedTag ? 'bg-info/15 text-info' : 'bg-surface-tertiary text-muted hover:text-primary'
              }`}
            >
              {TAG_ICONS[tag] ?? '📌'} {tag}
            </button>
          ))}
        </div>
      )}

      {/* Template cards */}
      <div className="grid grid-cols-2 gap-2">
        {filtered.slice(0, 6).map((template) => {
          const config = template.config as Record<string, unknown>;
          const objective = (config?.objective as string) ?? template.description ?? template.name;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(objective)}
              className="flex items-start gap-2.5 p-3 rounded-lg border border-border-light bg-surface hover:bg-surface-tertiary hover:border-border transition-colors cursor-pointer text-left"
            >
              <Sparkles size={14} className="text-muted flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-primary truncate">{template.name}</div>
                <p className="text-2xs text-muted mt-0.5 line-clamp-2">{template.description}</p>
                {template.tags && template.tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-1.5">
                    {template.tags.slice(0, 2).map((tag) => (
                      <Tag key={tag} size="small">{tag}</Tag>
                    ))}
                    {(template.usage_count ?? 0) > 0 && (
                      <span className="text-2xs text-placeholder ml-auto">{template.usage_count} uses</span>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
