import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type Props = {
  sessionId: string;
  hostHandle: string;
  onClose: () => void;
};

export default function LiveViewer({ sessionId, hostHandle, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<any>(null);
  const presenceRef = useRef<any>(null);

  const [status, setStatus] = useState<"connecting" | "live" | "error">("connecting");
  const [err, setErr] = useState<string | null>(null);

  const viewerId = useMemo(() => `viewer-${Math.random().toString(16).slice(2)}`, []);

  const cleanup = async () => {
    try {
      if (pcRef.current) pcRef.current.close();
    } catch {}
    pcRef.current = null;

    try {
      if (channelRef.current) await supabase.removeChannel(channelRef.current);
    } catch {}
    channelRef.current = null;

    try {
      if (presenceRef.current) await supabase.removeChannel(presenceRef.current);
    } catch {}
    presenceRef.current = null;
  };

  useEffect(() => {
    const run = async () => {
      setStatus("connecting");
      setErr(null);

      // Presence (viewer counter real)
      const pch = supabase.channel(`presence:live:${sessionId}`, {
        config: { presence: { key: viewerId } },
      });
      await pch.subscribe(async (s) => {
        if (s === "SUBSCRIBED") await pch.track({ role: "viewer", at: new Date().toISOString() });
      });
      presenceRef.current = pch;

      // WebRTC peer
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
      });
      pcRef.current = pc;

      pc.ontrack = (ev) => {
        const stream = ev.streams?.[0];
        if (!stream) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setStatus("live");
      };

      // signaling channel
      const ch = supabase.channel(`webrtc:live:${sessionId}`);

      ch.on("broadcast", { event: "offer" }, async ({ payload }: any) => {
        const to = payload?.to;
        if (to !== viewerId) return;

        const sdp = payload?.sdp as RTCSessionDescriptionInit;
        if (!sdp) return;

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        ch.send({
          type: "broadcast",
          event: "answer",
          payload: { to: hostHandle, from: viewerId, sdp: answer },
        });
      });

      ch.on("broadcast", { event: "ice-candidate" }, async ({ payload }: any) => {
        const to = payload?.to;
        if (to !== viewerId) return;

        const candidate = payload?.candidate as RTCIceCandidateInit;
        if (!candidate) return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch {}
      });

      pc.onicecandidate = (ev) => {
        if (!ev.candidate) return;
        ch.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { to: hostHandle, from: viewerId, candidate: ev.candidate },
        });
      };

      await ch.subscribe();
      channelRef.current = ch;

      // notify host to create offer
      ch.send({
        type: "broadcast",
        event: "viewer-join",
        payload: { viewerId },
      });
    };

    run().catch((e) => {
      setErr("Nu pot conecta WebRTC.");
      setStatus("error");
    });

    return () => {
      cleanup().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="viewerModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="viewerTop">
          <div>
            <div className="viewerTitle">LIVE</div>
            <div className="muted">
              Session: <b>{sessionId.slice(0, 6)}</b> • Host: <b>@{hostHandle}</b> • You: <b>{viewerId}</b>
            </div>
          </div>
          <button className="ghostBtn" onClick={onClose}>
            Close
          </button>
        </div>

        {status !== "live" && (
          <div className="muted" style={{ marginBottom: 10 }}>
            {status === "connecting" ? "Connecting…" : "Error"}
          </div>
        )}
        {err && <div className="alert">{err}</div>}

        <div className="viewerStage">
          <video ref={videoRef} playsInline controls={false} className="viewerVideo" />
          <div className="liveBadge">LIVE</div>
        </div>
      </div>
    </div>
  );
}
