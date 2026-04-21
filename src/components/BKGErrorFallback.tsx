'use client';

interface ActionButton {
  label: string;
  onClick?: () => void;
  href?: string;
}

interface BKGErrorFallbackProps {
  title: string;
  message: string;
  actions: ActionButton[];
}

export default function BKGErrorFallback({
  title,
  message,
  actions,
}: BKGErrorFallbackProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 'var(--radius-lg)',
        backgroundColor: 'var(--trace)',
        color: 'var(--graphite)',
        fontFamily: 'var(--font-archivo)',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 600,
            marginBottom: '16px',
            color: 'var(--graphite)',
            letterSpacing: '-0.5px',
          }}
        >
          {title}
        </h1>

        <p
          style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: 'var(--fg-secondary)',
            marginBottom: '32px',
          }}
        >
          {message}
        </p>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {actions.map((action, idx) => {
            if (action.href) {
              return (
                <a
                  key={idx}
                  href={action.href}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'var(--accent)',
                    color: 'var(--bg)',
                    textDecoration: 'none',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'background-color 0.2s',
                    display: 'inline-block',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                      'var(--accent-hover)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.backgroundColor =
                      'var(--accent)';
                  }}
                >
                  {action.label}
                </a>
              );
            }

            return (
              <button
                key={idx}
                onClick={action.onClick}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--bg)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    'var(--accent-hover)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    'var(--accent)';
                }}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
