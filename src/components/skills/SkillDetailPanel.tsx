import { X } from 'lucide-react';
import { Tag } from '@lobehub/ui';
import type { SkillRecord } from '../../api/types';
import { Markdown } from '../markdown/Markdown';
import { Button } from '../ui';
import { formatSkillName } from './helpers';
import { humanizeToolName } from '../../lib/toolLabels';

interface SkillDetailPanelProps {
  skill: SkillRecord;
  onClose: () => void;
  onEdit: () => void;
}

export function SkillDetailPanel({ skill, onClose, onEdit }: SkillDetailPanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={formatSkillName(skill.id)} className="bg-surface rounded-2xl border border-border-light shadow-modal w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-border-light">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-primary">{formatSkillName(skill.id)}</h2>
              <p className="mt-2 text-sm text-secondary">{skill.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={onEdit}>Edit</Button>
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-full text-muted hover:text-primary hover:bg-surface-hover transition-colors duration-200 cursor-pointer"
                aria-label="Close skill details"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          {skill.tools.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {skill.tools.map((tool) => (
                <Tag key={tool} size="small">{humanizeToolName(tool)}</Tag>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-5">
          <Markdown content={skill.prompt_addendum || '_No instructions yet._'} />
        </div>
      </div>
    </div>
  );
}
