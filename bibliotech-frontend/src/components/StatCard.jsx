import { Spinner } from './Spinner';

export default function StatCard({ label, value, hint, tone = 'sea', loading, error }) {
  return (
    <div className={`stat stat-${tone}`}>
      <span className="stat-label">{label}</span>
      {loading ? (
        <span className="stat-value"><Spinner small /></span>
      ) : error ? (
        <span className="stat-value stat-na" title={error.message}>Unavailable</span>
      ) : (
        <span className="stat-value">{value}</span>
      )}
      <span className="stat-hint">{error ? (error.status ? `HTTP ${error.status}` : 'No connection') : hint}</span>
    </div>
  );
}
