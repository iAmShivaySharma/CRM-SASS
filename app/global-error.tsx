'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'system-ui, sans-serif',
            background: '#fafafa',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 420, padding: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
              Something went wrong
            </h1>
            <p style={{ color: '#666', marginBottom: 24 }}>
              An unexpected error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: '#7c3aed',
                color: '#fff',
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
