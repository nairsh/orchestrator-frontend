import { MoreHorizontal, Plus, Sparkles } from 'lucide-react';
import type { SkillRecord } from '../../api/types';
import { Button, DropdownMenu, DropdownMenuItem, SkeletonCard } from '../ui';
import { RelayEmpty } from '../shared/RelayEmpty';
import { formatSkillName } from './helpers';

interface SkillGridProps {
  skills: SkillRecord[];
  selectedId: string | null;
  loading: boolean;
  onSelectSkill: (id: string) => void;
  onEditSkill: (id: string) => void;
  onDeleteSkill: (id: string) => void;
  onCreateSkill: () => void;
}

export function SkillGrid({ skills, selectedId, loading, onSelectSkill, onEditSkill, onDeleteSkill, onCreateSkill }: SkillGridProps) {
  if (skills.length === 0 && loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }, (_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <RelayEmpty
        icon={<Sparkles size={26} className="text-muted" />}
        title="No skills found"
        description="Create your first skill to extend what your AI can do."
        action={<Button onClick={onCreateSkill}><Plus size={14} /> Create skill</Button>}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {skills.map((skill) => (
        <div
          key={skill.id}
          role="button"
          tabIndex={0}
          aria-pressed={selectedId === skill.id}
          onClick={() => onSelectSkill(skill.id)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectSkill(skill.id); } }}
          className={[
            'group rounded-xl border px-5 py-4 text-left transition-all duration-200 flex items-start justify-between gap-3 cursor-pointer',
            selectedId === skill.id
              ? 'border-border-light bg-surface shadow-sm'
              : 'border-border-light bg-surface hover:border-border hover:shadow-sm hover:-translate-y-px active:translate-y-0',
          ].join(' ')}
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-primary">{formatSkillName(skill.id)}</div>
            <div className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted">{skill.description}</div>
          </div>
          <DropdownMenu
            trigger={({ toggle }) => (
              <button
                type="button"
                aria-label={`Actions for ${formatSkillName(skill.id)}`}
                onClick={(e) => { e.stopPropagation(); toggle(); }}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted hover:text-primary hover:bg-surface-hover transition-colors duration-200 flex-shrink-0 cursor-pointer"
              >
                <MoreHorizontal size={16} />
              </button>
            )}
            width={180}
          >
            <DropdownMenuItem onClick={() => onEditSkill(skill.id)}>Edit skill</DropdownMenuItem>
            <DropdownMenuItem destructive onClick={() => onDeleteSkill(skill.id)}>
              Delete skill
            </DropdownMenuItem>
          </DropdownMenu>
        </div>
      ))}
    </div>
  );
}
