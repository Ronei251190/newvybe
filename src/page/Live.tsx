import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type CameraFacing = "user" | "environment";

type LiveSession = {
  id: string;
  host_handle: string;
  title: string;
  is_live: boolean;
};

export default function Live({
  hostHandle = "bogdan",
  followers = 0,
  minFollowersToGoLive = 1000,
}: {
  hostHandle?: string;
  followers?: number;
  minFollowersToGoLive?: number;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facing, setFacing] = useState<CameraFacing>("user");
  const [micOn, setMicOn] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [isPreviewOn, setIsPreviewOn] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const [session, setSession] = useState<LiveSession | null>(null);

  // REAL viewer counter via Realtime Presence
  const [viewerCount, setViewerCount] = useState(0);
  const channelRef = useRef<any>(null);

  const canGoLive = followers >= minFollowersToGoLive;

  const stopStream = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch {}
  };

  const startPreview = async (nextFacing: CameraFacing = facing, nextMicOn: boolean = micOn) => {
    setError(null);
    stopStream();

    try {
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: nextFacing } },
        audio: nextMicOn,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setIsPreviewOn(true);
    } catch (e: any) {
      setIsPreviewOn(false);
      setIsLive(false);
      setError(
        e?.name === "NotAllowedError"
          ? "Permisiunea la cameră/microfon a fost refuzată."
          : "Nu pot porni camera. Folosește localhost/https și verifică dacă nu e ocupată camera."
      );
    }
  };

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    if (streamRef.current) streamRef.current.getAudioTracks().forEach((t) => (t.enabled = next));
  };

  const switchCamera = async () => {
    const next: CameraFacing = facing === "user" ? "environment" : "user";
    setFacing(next);
    await startPreview(next, micOn);
  };

  const subscribePresence = async (sessionId: string) => {
    // cleanup
    if (channelRef.current) {
      try {
        await supabase.removeChannel(channelRef.current);
      } catch {}
      channelRef.current = null;
    }

    const channel = supabase.channel(`live:${sessionId}`, {
      config: { presence: { key: hostHandle } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      // state = { key: [metas...] }
      const unique = Object.keys(state || {}).length;
      setViewerCount(unique);
    });

    await channel.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ role: "host", at: new Date().toISOString() });
      }
    });

    channelRef.current = channel;
  };

  const startLive = async () => {
    if (!canGoLive) {
      alert(`Ai nevoie de minim ${minFollowersToGoLive} followers ca să intri LIVE.`);
      return;
    }

    if (!isPreviewOn) {
      await startPreview(facing, micOn);
      if (!streamRef.current) return;
    }

    setError(null);

    // 1) create session in DB
    const { data, error: insErr } = await supabase
      .from("live_sessions")
      .insert({
        host_handle: hostHandle,
        title: "My Live Stream",
        is_live: true,
        started_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (insErr || !data) {
      setError("Nu pot crea sesiunea LIVE în Supabase.");
      return;
    }

    setSession(data);
    setIsLive(true);

    // 2) subscribe presence for REAL viewer count
    await subscribePresence(data.id);
  };

  const endLive = async () => {
    setIsLive(false);

    // update DB
    if (session?.id) {
      await supabase
        .from("live_sessions")
        .update({ is_live: false, ended_at: new Date().toISOString() })
        .eq("id", session.id);
    }

    // presence cleanup
    if (channelRef.current) {
      try {
        await supabase.removeChannel(channelRef.current);
      } catch {}
      channelRef.current = null;
    }

    setSession(null);
    setViewerCount(0);

    setIsPreviewOn(false);
    stopStream();
  };

  useEffect(() => {
    return () => {
      endLive().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ background: "#0b0b0f", color: "white", borderRadius: 16, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16 }}>LIVE Studio</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            Followers: <b>{followers}</b> • Required: <b>{minFollowersToGoLive}</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ opacity: 0.8, fontSize: 12 }}>
            👥 Viewers: <b>{viewerCount}</b>
          </div>

          {!isLive ? (
            <button style={btnPrimary} onClick={startLive} disabled={!canGoLive}>
              🔴 Start LIVE
            </button>
          ) : (
            <button style={btnDanger} onClick={endLive}>
              ⏹ End LIVE
            </button>
          )}
        </div>
      </div>

      {!canGoLive && (
        <div style={warnBox}>
          🔒 LIVE blocat: ai nevoie de minim {minFollowersToGoLive} followers.
        </div>
      )}

      <div style={{ marginTop: 12, position: "relative", borderRadius: 16, overflow: "hidden", background: "#000" }}>
        <video ref={videoRef} playsInline muted style={{ width: "100%", height: 420, objectFit: "cover", display: "block" }} />

        {isLive && (
          <div style={liveBadge}>
            LIVE {session?.id ? `• ${session.id.slice(0, 6)}` : ""}
          </div>
        )}

        {error && <div style={errorBox}>{error}</div>}

        <div style={overlayControls}>
          <button style={btnGhost} onClick={() => startPreview(facing, micOn)}>
            🎥 Preview
          </button>
          <button style={btnGhost} onClick={toggleMic}>
            {micOn ? "🎙 Mic ON" : "🔇 Mic OFF"}
          </button>
          <button style={btnGhost} onClick={switchCamera}>
            🔁 Switch
          </button>
          <button style={btnGhost} onClick={() => { setIsPreviewOn(false); stopStream(); }}>
            🧹 Stop Preview
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
        Viewer counter este REAL și vine din Supabase Realtime Presence. Când cineva intră pe live, numărul crește.
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: 0,
  background: "white",
  color: "black",
  fontWeight: 900,
  cursor: "pointer",
};
const btnDanger: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: 0,
  background: "#ff3b30",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};
const btnGhost: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.35)",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};
const liveBadge: React.CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  background: "#ff3b30",
  color: "white",
  padding: "6px 10px",
  borderRadius: 999,
  fontWeight: 900,
  fontSize: 12,
};
const overlayControls: React.CSSProperties = {
  position: "absolute",
  bottom: 12,
  left: 12,
  right: 12,
  display: "flex",
  gap: 10,
  justifyContent: "space-between",
};
const errorBox: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  left: 12,
  background: "rgba(255,0,0,0.18)",
  border: "1px solid rgba(255,0,0,0.35)",
  padding: "10px 12px",
  borderRadius: 14,
  fontWeight: 700,
  fontSize: 13,
};
const warnBox: React.CSSProperties = {
  marginTop: 10,
  background: "rgba(255,165,0,0.12)",
  border: "1px solid rgba(255,165,0,0.25)",
  padding: "10px 12px",
  borderRadius: 14,
  fontWeight: 700,
  fontSize: 13,
};
