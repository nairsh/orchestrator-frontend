import type { LucideIcon } from 'lucide-react';
import { TIMELINE_RAIL_X, TIMELINE_MARKER_SIZE } from './feedHelpers';

interface TimelineMarkerProps {
  markerKind: 'dot' | 'tool' | 'warning';
  MarkerIcon: LucideIcon;
  isLastUserDot: boolean;
  markerRef?: (el: HTMLDivElement | null) => void;
}

export function TimelineMarker({ markerKind, MarkerIcon, isLastUserDot, markerRef }: TimelineMarkerProps) {
  return (
    <div
      ref={markerRef}
      className="absolute"
      style={{
        left: `${TIMELINE_RAIL_X}px`,
        top: 0,
        width: TIMELINE_MARKER_SIZE,
        height: TIMELINE_MARKER_SIZE,
        transform: 'translateX(-50%)',
      }}
    >
      {markerKind === 'dot' ? (
        <div className="w-6 h-6 flex items-center justify-center">
          <div
            className={[
              'w-3 h-3 rounded-full border-2 border-surface',
              isLastUserDot ? 'bg-ink' : 'bg-muted',
            ].join(' ')}
          />
        </div>
      ) : (
        <div className="w-6 h-6 rounded-full bg-surface flex items-center justify-center border-2 border-surface shadow-sm">
          <MarkerIcon size={14} className={markerKind === 'warning' ? 'text-amber-700' : 'text-muted'} />
        </div>
      )}
    </div>
  );
}
