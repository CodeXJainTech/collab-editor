interface ConnectionBannerProps {
  status: 'connected' | 'disconnected' | 'reconnecting';
}

export default function ConnectionBanner({ status }: ConnectionBannerProps) {
  if (status === 'connected') return null;

  return (
    <div className={`w-full text-center text-xs py-2 px-4 shadow-md font-medium tracking-wide flex items-center justify-center gap-2 animate-fade-in ${
      status === 'reconnecting'
        ? 'bg-yellow-500/20 text-yellow-300 border-b border-yellow-500/30 backdrop-blur-sm'
        : 'bg-red-500/20 text-red-300 border-b border-red-500/30 backdrop-blur-sm'
    }`}>
      {status === 'reconnecting' ? (
        <><svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Reconnecting...</>
      ) : (
        <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Disconnected — Trying to reconnect</>
      )}
    </div>
  );
}