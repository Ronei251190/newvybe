import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type LiveSession = {
  id: string;
  host_handle: string;
  title: string;
  is_live: boolean;
};

type Props = {
  hostHandle: string;
  followers: number;
  minFollowersToGoLive: number;
  onBack: () => void;
};

export default function LiveHost({ hostHandle, followers, minFollowersToGoLive, onBack }: Props) {
  const canGoLive = followers >= minFollowersToGoLive;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [previewOn, setPreviewOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const [session, setSession] = useState<LiveSession | null>(null);
  const [isLive, setIsLive] = useState(false);

  // viewer counter real (presence)
  const [viewerCount, setViewerCount] = useState(0);
  const presenceChannelRef = useRef<any>(null);

  // WebRTC peers: one per viewer
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const signalChannelRef = useRef<any>(null);

  const sessionId = session?.id ?? null;

  const stopLocal = () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
    } catch {}
  };

  const startPreview = async () => {
    setError(null);
    stopLocal();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: micOn,
      });
      localStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPreviewOn(true);
    } catch (e: any) {
      setError(
        e?.name === "NotAllowedError"
          ? "Permisiunea la cameră/microfon a fost refuzată."
          : "Nu pot porni camera. Rulează pe localhost/https și verifică camera."
      );
      setPreviewOn(false);
    }
  };

  const toggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    const s = localStreamRef.current;
    if (s) s.getAudioTracks().forEach((t) => (t.enabled = next));
  };

  const toggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    const s = localStreamRef.current;
    if (s) s.getVideoTracks().forEach((t) => (t.enabled = next));
  };

  const cleanupChannels = async () => {
    try {
      if (presenceChannelRef.current) await supabase.removeChannel(presenceChannelRef.current);
    } catch {}
    try {
      if (signalChannelRef.current) await supabase.removeChannel(signalChannelRef.current);
    } catch {}
    presenceChannelRef.current = null;
    signalChannelRef.current = null;
  };

  const closeAllPeers = () => {
    peersRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    peersRef.current.clear();
  };

  // ===== Presence (viewer counter real) =====
  const subscribePresence = async (sid: string) => {
    if (presenceChannelRef.current) {
      try {
        await supabase.removeChannel(presenceChannelRef.current);
      } catch {}
      presenceChannelRef.current = null;
    }

    const ch = supabase.channel(`presence:live:${sid}`, {
      config: { presence: { key: `host:${hostHandle}` } },
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const unique = Object.keys(state || {}).length;
      setViewerCount(unique);
    });

    await ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ role: "host", at: new Date().toISOString() });
      }
    });

    presenceChannelRef.current = ch;
  };

  // ===== WebRTC Signaling (broadcast via Supabase channel) =====
  const ensureSignalChannel = async (sid: string) => {
    if (signalChannelRef.current) {
      try {
        await supabase.removeChannel(signalChannelRef.current);
      } catch {}
      signalChannelRef.current = null;
    }

    const ch = supabase.channel(`webrtc:live:${sid}`);

    ch.on("broadcast", { event: "viewer-join" }, async ({ payload }: any) => {
      const viewerId = payload?.viewerId as string;
      if (!viewerId) return;

      // create peer for this viewer
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
      });
      peersRef.current.set(viewerId, pc);

      // add local tracks
      const stream = localStreamRef.current;
      if (stream) stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        ch.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { to: viewerId, from: hostHandle, candidate: ev.candidate },
        });
      };

      // create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      ch.send({
        type: "broadcast",
        event: "offer",
        payload: { to: viewerId, from: hostHandle, sdp: offer },
      });
    });

    ch.on("broadcast", { event: "answer" }, async ({ payload }: any) => {
      const to = payload?.to as string;
      if (to !== hostHandle) return;

      const viewerId = payload?.from as string;
      const sdp = payload?.sdp as RTCSessionDescriptionInit;
      const pc = peersRef.current.get(viewerId);
      if (!pc || !sdp) return;

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    });

    ch.on("broadcast", { event: "ice-candidate" }, async ({ payload }: any) => {
      const to = payload?.to as string;
      if (to !== hostHandle) return;

      const fromViewerId = payload?.from as string;
      const candidate = payload?.candidate as RTCIceCandidateInit;
      const pc = peersRef.current.get(fromViewerId);
      if (!pc || !candidate) return;

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    });

    await ch.subscribe();
    signalChannelRef.current = ch;
  };

  const startLive = async () => {
    setError(null);

    if (!canGoLive) {
      setError(`🔒 Ai nevoie de minim ${minFollowersToGoLive} followers ca să intri LIVE.`);
      return;
    }

    if (!previewOn) {
      await startPreview();
      if (!localStreamRef.current) return;
    }

    // create session in DB
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

    await subscribePresence(data.id);
    await ensureSignalChannel(data.id);
  };

  const endLive = async () => {
    setIsLive(false);

    if (session?.id) {
      await supabase
        .from("live_sessions")
        .update({ is_live: false, ended_at: new Date().toISOString() })
        .eq("id", session.id);
    }

    closeAllPeers();
    await cleanupChannels();

    setSession(null);
    setViewerCount(0);
    setPreviewOn(false);
    stopLocal();
  };

  useEffect(() => {
    return () => {
      endLive().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shortId = useMemo(() => (sessionId ? sessionId.slice(0, 6) : ""), [sessionId]);

  return (
    <div className="liveStudio">
      <div className="liveStudioTop">
        <div>
          <div className="liveTitle">LIVE Studio</div>
          <div className="muted">
            Host: <b>@{hostHandle}</b> • Followers: <b>{followers}</b> • Required: <b>{minFollowersToGoLive}</b>
          </div>
        </div>

        <div className="liveTopRight">
          <div className="muted">
            👥 Viewers: <b>{viewerCount}</b>
          </div>

          {!isLive ? (
            <button className="primaryBtn" onClick={startLive} disabled={!canGoLive}>
              🔴 Start LIVE
            </button>
          ) : (
            <button className="dangerBtn" onClick={endLive}>
              ⏹ End LIVE
            </button>
          )}

          <button className="ghostBtn" onClick={onBack}>
            ← Back
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="liveStage">
        <video ref={videoRef} playsInline muted className="liveVideo" />

        {isLive && (
          <div className="liveBadge">
            LIVE • {shortId}
          </div>
        )}

        <div className="liveControls">
          <button className="ghostBtn" onClick={startPreview}>
            🎥 Preview
          </button>
          <button className="ghostBtn" onClick={toggleMic}>
            {micOn ? "🎙 Mic ON" : "🔇 Mic OFF"}
          </button>
          <button className="ghostBtn" onClick={toggleCam}>
            {camOn ? "📷 Cam ON" : "🚫 Cam OFF"}
          </button>
          <button
            className="ghostBtn"
            onClick={() => {
              setPreviewOn(false);
              stopLocal();
            }}
          >
            🧹 Stop Preview
          </button>
        </div>
      </div>

      <div className="muted" style={{ marginTop: 10 }}>
        WebRTC este P2P (host ↔ viewer). Pentru mii de viewers ai nevoie de SFU (Wowza/Janus/LiveKit etc.).
      </div>
    </div>
  );
}
