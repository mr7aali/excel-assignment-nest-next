type DashboardFlashMessagesProps = {
  errorMessage: string | null;
  successMessage: string | null;
};

export function DashboardFlashMessages({
  errorMessage,
  successMessage,
}: DashboardFlashMessagesProps) {
  if (!errorMessage && !successMessage) {
    return null;
  }

  return (
    <section className="ds-flash-stack">
      {errorMessage ? (
        <p className="ds-flash ds-flash--error">{errorMessage}</p>
      ) : null}
      {successMessage ? (
        <p className="ds-flash ds-flash--success">{successMessage}</p>
      ) : null}
    </section>
  );
}
