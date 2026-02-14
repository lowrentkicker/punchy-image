export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-16 rounded-full',
    md: 'h-6 w-24 rounded-full',
    lg: 'h-80 w-80 rounded-2xl',
  };

  return (
    <div
      className={`${sizeClasses[size]} overflow-hidden bg-surface-2`}
      role="status"
      aria-label="Loading"
    >
      <div
        className="h-full w-full bg-linear-to-r from-transparent via-white/5 to-transparent"
        style={{ animation: 'shimmer 2s infinite', backgroundSize: '200% 100%' }}
      />
    </div>
  );
}
