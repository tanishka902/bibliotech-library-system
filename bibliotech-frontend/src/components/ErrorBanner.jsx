import { Link } from 'react-router-dom';
import Icon from './Icon';

export default function ErrorBanner({ error, onRetry, title }) {
  if (!error) return null;
  const status = error.status;
  let hint = null;
  if (status === 0) hint = 'Start the API Gateway (port 8080) and the services behind it.';
  else if (status === 404 || status === 502 || status === 503) {
    hint = (
      <>
        This can mean the gateway route is missing or the service is down. <Link to="/diagnostics">Run the API check</Link>.
      </>
    );
  }
  return (
    <div className="banner banner-error" role="alert">
      <Icon name="alert" />
      <div className="banner-text">
        <strong>{title || 'Something went wrong'}</strong>
        <span>{error.message || String(error)}</span>
        {hint && <span className="banner-hint">{hint}</span>}
      </div>
      {onRetry && (
        <button className="btn btn-ghost btn-sm" onClick={onRetry}>
          <Icon name="refresh" size={15} /> Try again
        </button>
      )}
    </div>
  );
}

export function InfoBanner({ children, tone = 'info' }) {
  return (
    <div className={`banner banner-${tone}`} role="status">
      <Icon name={tone === 'good' ? 'check' : 'alert'} />
      <div className="banner-text">{children}</div>
    </div>
  );
}
