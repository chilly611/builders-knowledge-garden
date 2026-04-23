export { default as SizeUpIcon } from './SizeUpIcon';
export { default as LockIcon } from './LockIcon';
export { default as PlanIcon } from './PlanIcon';
export { default as BuildIcon } from './BuildIcon';
export { default as AdaptIcon } from './AdaptIcon';
export { default as CollectIcon } from './CollectIcon';
export { default as ReflectIcon } from './ReflectIcon';

import SizeUpIcon from './SizeUpIcon';
import LockIcon from './LockIcon';
import PlanIcon from './PlanIcon';
import BuildIcon from './BuildIcon';
import AdaptIcon from './AdaptIcon';
import CollectIcon from './CollectIcon';
import ReflectIcon from './ReflectIcon';

import type { StageId } from '../types';
import type React from 'react';
import type { SVGProps } from 'react';

/** Map from StageId (1-7) to icon component. */
export const STAGE_ICONS: Record<StageId, (props: SVGProps<SVGSVGElement>) => React.JSX.Element> = {
  1: SizeUpIcon,
  2: LockIcon,
  3: PlanIcon,
  4: BuildIcon,
  5: AdaptIcon,
  6: CollectIcon,
  7: ReflectIcon,
};
