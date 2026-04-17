import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Language } from "@collab-editor/shared";

export default function Home() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate(language: Language) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001"}/rooms`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language }),
        },
      );
      const data = await res.json();
      navigate(`/room/${data.room.id}`);
    } catch {
      setError("could not create room");
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Collab Editor</h1>
      <p>Create a room and share the link</p>
      <button onClick={() => handleCreate("javascript")} disabled={loading}>
        New JavaScript room
      </button>
      <button onClick={() => handleCreate("python")} disabled={loading}>
        New Python room
      </button>
      <button onClick={() => handleCreate("go")} disabled={loading}>
        New Go room
      </button>
      {error && <p>{error}</p>}
    </div>
  );
}
