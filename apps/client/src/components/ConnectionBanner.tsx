interface ConnectionBannerProps {
  status: 'connected' | 'disconnected' | 'reconnecting';
}

export default function ConnectionBanner({ status }: ConnectionBannerProps) {
  if (status === 'connected') return null;

  return (
    <div className={`w-full text-center text-xs py-1.5 ${
      status === 'reconnecting'
        ? 'bg-yellow-700 text-yellow-100'
        : 'bg-red-800 text-red-100'
    }`}>
      {status === 'reconnecting' ? 'reconnecting...' : 'disconnected — trying to reconnect'}
    </div>
  );
}