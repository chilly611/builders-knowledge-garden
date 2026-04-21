'use client';

/**
 * ProjectCompassSVG
 * =================
 * Legacy SVG journey map + budget river. Used by GlobalJourneyMapHeader.
 * Replaced by typographic dashboard for demo-project route.
 */

import type { CSSProperties } from 'react';
import type { StageProgress } from '@/lib/journey-progress';
import type { LifecycleStage } from '@/components/JourneyMapHeader';
import type {
  PaymentPool,
  ProfitSignal,
} from '@/lib/project-compass-data';

const VB_W = 1100;
const VB_H = 200;

const RIVER_Y = 40;
const RIVER_H = 34;
const TIMELINE_Y = 130;

const STAGE_PAD_X = 90;
const STAGE_SPACING = (VB_W - STAGE_PAD_X * 2) / 6;

const STATUS_COLORS = {
  done: '#22C55E',
  partial: '#14B8A6',
  attention: '#EF4444',
  seen: '#9CA3AF',
  unseen: '#E5E7EB',
  current: '#2563EB',
  riverFill: '#BAE6FD',
  riverStroke: '#38BDF8',
  poolIn: '#2563EB',
  poolOut: '#F59E0B',
};

const PROFIT_COLORS: Record<ProfitSignal, string> = {
  profit: '#22C55E',
  breakeven: '#F59E0B',
  loss: '#EF4444',
  unknown: '#9CA3AF',
};

function stageX(stageId: number): number {
  return STAGE_PAD_X + (stageId - 1) * STAGE_SPACING;
}

function statusOf(
  stageId: number,
  currentStageId: number | null,
  progress: StageProgress | undefined,
  visited: Set<number>
): keyof typeof STATUS_COLORS {
  const p = progress ?? { worked: 0, done: 0, needsAttention: 0, total: 0 };
  if (p.needsAttention > 0) return 'attention';
  if (p.total > 0 && p.done === p.total) return 'done';
  if (p.worked > 0) return 'partial';
  if (visited.has(stageId) || stageId === currentStageId) return 'seen';
  return 'unseen';
}

function poolRadius(pool: PaymentPool): number {
  const amount = Math.max(pool.amountIn, pool.amountOut);
  if (amount === 0) return 0;
  const r = 6 + Math.log10(Math.max(amount, 100)) * 3.2;
  return Math.min(r, 18);
}

function formatMoney(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function riverPathD(w: number, y: number, h: number): string {
  const top = y;
  const bottom = y + h;
  const step = w / 6;
  const amp = 5;

  let top_d = `M 0 ${top}`;
  for (let i = 0; i < 6; i++) {
    const x1 = step * i + step / 3;
    const x2 = step * i + (step * 2) / 3;
    const x3 = step * (i + 1);
    const dy = i % 2 === 0 ? -amp : amp;
    top_d += ` C ${x1} ${top + dy} ${x2} ${top - dy} ${x3} ${top}`;
  }

  let bottom_d = ` L ${w} ${bottom}`;
  for (let i = 6; i > 0; i--) {
    const x1 = step * i - step / 3;
    const x2 = step * i - (step * 2) / 3;
    const x3 = step * (i - 1);
    const dy = i % 2 === 0 ? amp : -amp;
    bottom_d += ` C ${x1} ${bottom + dy} ${x2} ${bottom - dy} ${x3} ${bottom}`;
  }

  return `${top_d}${bottom_d} Z`;
}

interface ProjectCompassSVGProps {
  stages: LifecycleStage[];
  currentStageId: number | null;
  progressByStage: Record<number, StageProgress>;
  visitedStageIds: number[];
  stagePayments: Record<number, PaymentPool>;
  profitSignal: ProfitSignal;
  isDemo?: boolean;
  onDemoCtaClick?: () => void;
  projectId?: string;
  onCloseOutClick?: (projectId: string) => void;
}

export default function ProjectCompassSVG({
  stages,
  currentStageId,
  progressByStage,
  visitedStageIds,
  stagePayments,
  profitSignal,
  isDemo = false,
  onDemoCtaClick,
  projectId,
  onCloseOutClick,
}: ProjectCompassSVGProps) {
  const sorted = [...stages].sort((a, b) => a.id - b.id);
  const visited = new Set(visitedStageIds);
  const currentStage =
    currentStageId != null ? sorted.find((s) => s.id === currentStageId) : undefined;
  const profitColor = PROFIT_COLORS[profitSignal];

  const reflectStage = sorted.find((s) => s.id === 7);
  const isProjectComplete =
    reflectStage &&
    progressByStage[7] &&
    progressByStage[7].total > 0 &&
    progressByStage[7].done === progressByStage[7].total;

  const wrapperStyle: CSSProperties = {
    width: '100%',
    padding: '12px 0 16px',
    background: '#FAFAF8',
    borderBottom: '1px solid #eee',
    position: 'relative',
    overflowX: 'auto',
    overflowY: 'hidden',
    WebkitOverflowScrolling: 'touch',
  };

  const innerStyle: CSSProperties = {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '0 16px',
    minWidth: '100%',
  };

  return (
    <div style={wrapperStyle} aria-label="Project compass — journey and budget">
      <div style={innerStyle}>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          role="img"
          aria-label={
            currentStage
              ? `Project compass, currently at stage ${currentStage.id} ${currentStage.name}`
              : 'Project compass'
          }
          style={{ width: '100%', height: 'auto', display: 'block' }}
        >
          <defs>
            <linearGradient id="riverGradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor={STATUS_COLORS.riverFill} stopOpacity="0.4" />
              <stop offset="60%" stopColor={STATUS_COLORS.riverFill} stopOpacity="0.9" />
              <stop offset="100%" stopColor={STATUS_COLORS.riverStroke} stopOpacity="1" />
            </linearGradient>
            <linearGradient id="waterfallGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={STATUS_COLORS.riverStroke} />
              <stop offset="100%" stopColor={profitColor} />
            </linearGradient>
            <filter id="poolShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
              <feOffset dy="1" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d={riverPathD(VB_W, RIVER_Y, RIVER_H)}
            fill="url(#riverGradient)"
            stroke={STATUS_COLORS.riverStroke}
            strokeOpacity="0.4"
            strokeWidth="1"
          />

          {sorted.map((stage) => {
            const pool = stagePayments[stage.id];
            if (!pool) return null;
            const r = poolRadius(pool);
            if (r === 0) return null;
            const cx = stageX(stage.id);
            const cy = RIVER_Y + RIVER_H / 2;
            const received = pool.status === 'received';
            return (
              <g key={`pool-${stage.id}`} filter="url(#poolShadow)">
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill={received ? STATUS_COLORS.poolIn : '#FFF'}
                  stroke={STATUS_COLORS.poolIn}
                  strokeWidth={received ? 1 : 2}
                />
                {pool.amountOut > 0 && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r + 3}
                    fill="none"
                    stroke={STATUS_COLORS.poolOut}
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                  />
                )}
                <title>
                  {`Stage ${stage.id} · ${stage.name}\n` +
                    `In: ${formatMoney(pool.amountIn)}\n` +
                    `Out: ${formatMoney(pool.amountOut)}\n` +
                    `Status: ${pool.status}`}
                </title>
              </g>
            );
          })}

          <g aria-label={`Project close-out: ${profitSignal}`}>
            <rect
              x={VB_W - STAGE_PAD_X + STAGE_SPACING / 4}
              y={RIVER_Y + RIVER_H / 2 - 4}
              width={18}
              height={60}
              fill="url(#waterfallGradient)"
              opacity="0.85"
            >
              <animate
                attributeName="opacity"
                values="0.85;0.55;0.85"
                dur="2.8s"
                repeatCount="indefinite"
              />
            </rect>
            <ellipse
              cx={VB_W - STAGE_PAD_X + STAGE_SPACING / 4 + 9}
              cy={RIVER_Y + RIVER_H / 2 + 62}
              rx={16}
              ry={4}
              fill={profitColor}
              opacity="0.6"
            />
            <title>Close-out signal: {profitSignal}</title>
          </g>

          <line
            x1={STAGE_PAD_X - 30}
            y1={TIMELINE_Y}
            x2={VB_W - STAGE_PAD_X + 30}
            y2={TIMELINE_Y}
            stroke="#D1D5DB"
            strokeWidth="2"
            strokeDasharray="1 4"
          />

          <g transform={`translate(${STAGE_PAD_X - 60}, ${TIMELINE_Y - 22})`}>
            <ellipse cx={8} cy={14} rx={14} ry={8} fill="#F3F4F6" stroke="#D1D5DB" />
            <ellipse cx={22} cy={12} rx={18} ry={10} fill="#F3F4F6" stroke="#D1D5DB" />
            <ellipse cx={38} cy={15} rx={14} ry={8} fill="#F3F4F6" stroke="#D1D5DB" />
            <text x={23} y={17} textAnchor="middle" fontSize={14} fill="#6B7280">
              ☁︎
            </text>
            <title>Dream. Where every project starts.</title>
          </g>

          {sorted.map((stage) => {
            const cx = stageX(stage.id);
            const cy = TIMELINE_Y;
            const progress = progressByStage[stage.id];
            const status = statusOf(stage.id, currentStageId, progress, visited);
            const fill = STATUS_COLORS[status];
            const isCurrent = stage.id === currentStageId;
            const isUnseen = status === 'unseen';
            return (
              <g key={`stage-${stage.id}`}>
                {isCurrent && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={22}
                    fill="none"
                    stroke={STATUS_COLORS.current}
                    strokeWidth="2"
                  >
                    <animate
                      attributeName="r"
                      values="22;25;22"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="1;0.5;1"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={17}
                  fill={fill}
                  stroke={isUnseen ? '#D1D5DB' : '#FFFFFF'}
                  strokeWidth="2"
                  strokeDasharray={isUnseen ? '3 3' : undefined}
                />
                <text
                  x={cx}
                  y={cy + 5}
                  textAnchor="middle"
                  fontSize={14}
                  fill={isUnseen ? '#9CA3AF' : '#FFFFFF'}
                >
                  {stage.emoji}
                </text>
                <text
                  x={cx}
                  y={cy + 38}
                  textAnchor="middle"
                  fontSize={10}
                  fill={isCurrent ? STATUS_COLORS.current : '#6B7280'}
                  fontWeight={isCurrent ? 700 : 500}
                  letterSpacing="0.3"
                >
                  {stage.name.toUpperCase()}
                </text>
                {progress && progress.total > 0 && progress.worked > 0 && (
                  <text
                    x={cx}
                    y={cy - 24}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#6B7280"
                    fontWeight={600}
                  >
                    {progress.done}/{progress.total}
                  </text>
                )}
                <title>
                  {`${stage.name} (Stage ${stage.id})\n` +
                    (progress
                      ? `${progress.done}/${progress.total} workflows done · ${progress.needsAttention} need attention`
                      : 'No activity yet')}
                </title>
              </g>
            );
          })}

          <g transform={`translate(${VB_W - STAGE_PAD_X + 20}, ${TIMELINE_Y - 28})`}>
            <polygon
              points="0,14 20,0 40,14"
              fill="#D97706"
              stroke="#92400E"
              strokeWidth="1"
            />
            <rect x={5} y={14} width={30} height={22} fill="#FCD34D" stroke="#92400E" />
            <rect x={11} y={20} width={6} height={6} fill="#FEF3C7" stroke="#92400E" />
            <rect x={23} y={20} width={6} height={6} fill="#FEF3C7" stroke="#92400E" />
            <rect x={17} y={28} width={6} height={8} fill="#92400E" />
            <title>Finished. Project delivered.</title>
          </g>
        </svg>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 6,
            fontSize: 11,
            color: '#6B7280',
            letterSpacing: '0.2px',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span>
            {currentStage ? (
              <>
                At{' '}
                <strong style={{ color: STATUS_COLORS.current }}>
                  Stage {currentStage.id} · {currentStage.name}
                </strong>
              </>
            ) : (
              'Pick a workflow to enter a stage.'
            )}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isProjectComplete && projectId && onCloseOutClick && (
              <button
                type="button"
                onClick={() => onCloseOutClick(projectId)}
                style={{
                  background: '#D9642E',
                  border: 'none',
                  borderRadius: 12,
                  color: '#FFFFFF',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 12px',
                  cursor: 'pointer',
                  transition: 'background 200ms ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    '#c55620';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background =
                    '#D9642E';
                }}
                aria-label="Close out project and celebrate"
              >
                close out project
              </button>
            )}
            {isDemo && (
              <button
                type="button"
                onClick={onDemoCtaClick}
                style={{
                  background: 'transparent',
                  border: `1px solid ${STATUS_COLORS.current}`,
                  borderRadius: 12,
                  color: STATUS_COLORS.current,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '3px 10px',
                  cursor: 'pointer',
                }}
                aria-label="Set up a real project"
              >
                Demo data. Start a real project →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
