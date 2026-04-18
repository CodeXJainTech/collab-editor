import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-neutral-900 text-white gap-4">
      <p className="text-neutral-400 text-sm">room not found or has expired</p>
      <button
        onClick={() => navigate('/')}
        className="text-sm px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded"
      >
        go home
      </button>
    </div>
  );
}