import { titleCase } from '../lib/format';

export function Badge({ tone = 'info', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

const DEMAND_TONE = { LOW: 'good', MEDIUM: 'warn', HIGH: 'bad' };

export function DemandBadge({ level }) {
  if (!level) return <span className="badge badge-muted">No rating</span>;
  return <Badge tone={DEMAND_TONE[level] || 'info'}>{titleCase(level)} demand</Badge>;
}
