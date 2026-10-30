export function Spinner({ small }) {
  return <span className={small ? 'spinner small' : 'spinner'} role="status" aria-label="Loading" />;
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="page-loader">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}
