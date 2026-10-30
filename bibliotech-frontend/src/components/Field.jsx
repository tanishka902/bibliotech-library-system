export default function Field({ id, label, error, hint, children }) {
  return (
    <div className={error ? 'field has-error' : 'field'}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <span className="field-error" id={`${id}-err`}>{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}
