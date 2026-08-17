import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          fontSize: '4rem',
          fontWeight: 800,
          color: 'var(--accent-primary)',
          lineHeight: 1,
        }}
      >
        404
      </div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Page Not Found</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '400px' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
        Return Home
      </Link>
    </div>
  );
}
