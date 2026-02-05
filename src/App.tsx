import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import GiftOverlay from "./gifts3d/GiftOverlay.tsx";
import { GIFTS_3D } from "./gifts3d/gifts.ts";
import { Canvas } from "@react-three/fiber";
import { useGLTF, Float, OrbitControls } from "@react-three/drei";
import Live from "./page/Live.tsx";
import { createClient } from "@supabase/supabase-js";





/** ===================== TYPES ===================== */
type Page =
  | "For You"
  | "Explore"
  | "Following"
  | "Friends"
  | "LIVE"
  | "Coins"
  | "Messages"
  | "Activity"
  | "Upload"
  | "Profile";

type FeedVideo = {
  id: string;
  user: string;
  caption: string;
  likes: number;
  comments: number;
  shares: number;
  src: string;
};

type LiveRoom = {
  id: string;
  title: string;
  host: string;
  viewers: number;
  tags: string[];
  poster: string;
};


type LiveSessionRow = {
  id: string;               // supabase uuid
  host_handle: string;
  title: string;
  is_live: boolean;
  started_at: string | null;
  created_at?: string | null;
};

type CoinPack = {
  id: string;
  coins: number;
  priceEur: number;
  bonus?: number;
  tag?: string;
};

type Gift = {
  id: string;
  name: "Rose" | "Like" | "Coffee" | "Fire" | "Star" | "Crown" | "Rocket" | "Diamond";
  cost: number;
  emoji: string;
  rarity: "common" | "rare" | "epic" | "legendary";
};

type Gift3DToast = {
  key: string;
  label: Gift["name"];
  model?: string; // ex: "/gifts3d/rocket.glb"
};

type FollowingUser = {
  id: string;
  handle: string;
  name: string;
  online: boolean;
  bio: string;
};

type FriendUser = {
  id: string;
  handle: string;
  name: string;
  status: "online" | "offline" | "busy";
};

type Conversation = {
  id: string;
  withHandle: string;
  withName: string;
  lastMessage: string;
  unread: number;
  ts: string;
};

type NotificationItem = {
  id: string;
  kind: "like" | "comment" | "follow" | "gift";
  text: string;
  ts: string;
  read: boolean;
};

type ChatAttachment = {
  id: string;
  kind: "image" | "video";
  name: string;
  url: string; // object URL
};

type ChatMessage = {
  id: string;
  from: "me" | "other";
  text?: string;
  ts: string;
  attachments?: ChatAttachment[];
};

/** ===================== DEMO DATA ===================== */
const DEMO_VIDEOS: FeedVideo[] = [
  {
    id: "v1",
    user: "trasnitii22",
    caption: "#trasnitii #fyp #viral",
    likes: 606,
    comments: 10,
    shares: 5,
    src: "/Videos/demo1.mp4",
  },
  {
    id: "v2",
    user: "romania_vibes",
    caption: "NewVybe test clip 🔥",
    likes: 1320,
    comments: 43,
    shares: 18,
    src: "/Videos/demo2.mp4",
  },
];

const DEMO_LIVES: LiveRoom[] = [
  {
    id: "l1",
    title: "Chill music & vibes",
    host: "andrei",
    viewers: 1204,
    tags: ["music", "chat"],
    poster:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=60",
  },
  {
    id: "l2",
    title: "Q&A - offshore life",
    host: "bogdan",
    viewers: 420,
    tags: ["qa", "chat"],
    poster:
      "https://images.unsplash.com/photo-1520975958225-39f8f06a1d47?auto=format&fit=crop&w=1200&q=60",
  },
  {
    id: "l3",
    title: "Workout live",
    host: "mara",
    viewers: 980,
    tags: ["sport", "chat"],
    poster:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=60",
  },
];

const COIN_PACKS: CoinPack[] = [
  { id: "p1", coins: 100, bonus: 0, priceEur: 0.99, tag: "Starter" },
  { id: "p2", coins: 550, bonus: 50, priceEur: 4.99, tag: "Popular" },
  { id: "p3", coins: 1200, bonus: 200, priceEur: 9.99, tag: "Best value" },
  { id: "p4", coins: 3000, bonus: 700, priceEur: 19.99, tag: "Pro" },
];

const GIFTS: Gift[] = [
  { id: "g1", name: "Rose", cost: 1, emoji: "🌹", rarity: "common" },
  { id: "g2", name: "Like", cost: 5, emoji: "❤️", rarity: "common" },
  { id: "g3", name: "Coffee", cost: 10, emoji: "☕", rarity: "common" },
  { id: "g4", name: "Fire", cost: 25, emoji: "🔥", rarity: "rare" },
  { id: "g5", name: "Star", cost: 50, emoji: "⭐", rarity: "rare" },
  { id: "g6", name: "Crown", cost: 150, emoji: "👑", rarity: "epic" },
  { id: "g7", name: "Rocket", cost: 300, emoji: "🚀", rarity: "epic" },
  { id: "g8", name: "Diamond", cost: 999, emoji: "💎", rarity: "legendary" },
];

const FOLLOWING_USERS: FollowingUser[] = [
  { id: "u1", handle: "andrei", name: "Andrei", online: true, bio: "Music • vibes • creator" },
  { id: "u2", handle: "mara", name: "Mara", online: false, bio: "Fitness • lifestyle" },
  { id: "u3", handle: "alex", name: "Alex", online: true, bio: "Cars • edits • speed" },
  { id: "u4", handle: "ioana", name: "Ioana", online: false, bio: "Travel • Romania roads" },
];

const FRIENDS: FriendUser[] = [
  { id: "f1", handle: "andrei", name: "Andrei", status: "online" },
  { id: "f2", handle: "mara", name: "Mara", status: "busy" },
  { id: "f3", handle: "alex", name: "Alex", status: "offline" },
];

const CONVERSATIONS: Conversation[] = [
  { id: "c1", withName: "Andrei", withHandle: "andrei", lastMessage: "Salut 👋", unread: 2, ts: "now" },
  { id: "c2", withName: "Mara", withHandle: "mara", lastMessage: "Trimite un gift 😄", unread: 0, ts: "1h" },
];

/** ===================== HELPERS ===================== */
function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function uid() {
  return crypto.randomUUID();
}

function useActiveVideo(videos: FeedVideo[], threshold = 0.75) {
  const [activeId, setActiveId] = useState<string | null>(videos[0]?.id ?? null);
  const mapRef = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];
        if (!visible) return;
        const id = (visible.target as HTMLElement).dataset["id"];
        if (id) setActiveId(id);
      },
      { threshold }
    );

    mapRef.current.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [threshold, videos.length]);

  const register = (id: string) => (el: HTMLDivElement | null) => {
    const map = mapRef.current;
    if (!el) {
      map.delete(id);
      return;
    }
    el.dataset["id"] = id;
    map.set(id, el);
  };

  return { activeId, register };
}

function readCoins() {
  try {
    const raw = localStorage.getItem("newvybe_coins");
    const n = raw ? Number(raw) : 114103;
    return Number.isFinite(n) ? n : 114103;
  } catch {
    return 114103;
  }
}
function writeCoins(n: number) {
  try {
    localStorage.setItem("newvybe_coins", String(n));
  } catch {}
}

/** ===================== SUPABASE (LIVE realtime) ===================== */
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string | undefined;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/** ===================== 3D ===================== */
function Gift3DModel({ url }: { url: string }) {
  const gltf = useGLTF(url);
  return <primitive object={gltf.scene} scale={1.3} position={[0, -0.2, 0]} />;
}
useGLTF.preload("/gifts3d/rocket.glb");

/** ===================== APP ===================== */
export default function App() {
  const [page, setPage] = useState<Page>("For You");

  // profile (used for LIVE permissions)
  const [followersCount] = useState<number>(1200); // change later from backend


  // LIVE sessions list from Supabase
  const [liveSessions, setLiveSessions] = useState<LiveSessionRow[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveErr, setLiveErr] = useState<string | null>(null);
  
  const [hostLive, setHostLive] = useState(false);

  // feed
  const { activeId, register } = useActiveVideo(DEMO_VIDEOS);

  // coins
  const [coins, setCoins] = useState<number>(() => readCoins());
  useEffect(() => writeCoins(coins), [coins]);


// fetch LIVE sessions (is_live=true) from Supabase while on LIVE page (viewer mode)
useEffect(() => {
  if (page !== "LIVE" || hostLive) return;
  if (!supabase) {
    setLiveErr("Missing Supabase env (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). LIVE realtime disabled.");
    return;
  }

  let cancelled = false;
  const load = async () => {
    setLiveLoading(true);
    setLiveErr(null);
    const { data, error } = await supabase
      .from("live_sessions")
      .select("id, host_handle, title, is_live, started_at, created_at")
      .eq("is_live", true)
      .order("started_at", { ascending: false });

    if (cancelled) return;
    if (error) setLiveErr(error.message);
    setLiveSessions((data as any) ?? []);
    setLiveLoading(false);
  };

  load();
  const t = window.setInterval(load, 2500);
  return () => {
    cancelled = true;
    window.clearInterval(t);
  };
}, [page, hostLive]);

  // gifts modal
  const [giftsOpen, setGiftsOpen] = useState(false);

  // 3D overlay toast
  const [gift3D, setGift3D] = useState<Gift3DToast | null>(null);
  const trigger3D = (gift: Gift) => {
    if (gift.name === "Rocket") {
      setGift3D({ key: uid(), label: gift.name, model: "/gifts3d/rocket.glb" });
      setTimeout(() => setGift3D(null), 3000);
    } else {
      setGift3D({ key: uid(), label: gift.name });
      setTimeout(() => setGift3D(null), 1200);
    }
  };

  // Upload mock
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string | null>(null);
  const [uploadCaption, setUploadCaption] = useState("");
  useEffect(() => {
    if (!uploadFile) return;
    const url = URL.createObjectURL(uploadFile);
    setUploadPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [uploadFile]);

  /** ===================== MESSAGES (attachments + emoji) ===================== */
  const [conversations, setConversations] = useState<Conversation[]>(CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string | null>(CONVERSATIONS[0]?.id ?? null);
  const activeConv = conversations.find((c) => c.id === activeConvId) ?? null;

  const [chatText, setChatText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [chatFilePreviews, setChatFilePreviews] = useState<ChatAttachment[]>([]);

  const [messagesByConv, setMessagesByConv] = useState<Record<string, ChatMessage[]>>({
    c1: [
      { id: "m1", from: "other", text: "Salut 👋", ts: "now" },
      { id: "m2", from: "me", text: "Salut! Ce faci?", ts: "now" },
    ],
    c2: [{ id: "m3", from: "other", text: "Trimite un gift 😄", ts: "1h" }],
  });

  const pickConversation = (c: Conversation) => {
    setActiveConvId(c.id);
    setConversations((prev) => prev.map((x) => (x.id === c.id ? { ...x, unread: 0 } : x)));
  };

  const openAttachPicker = () => fileInputRef.current?.click();

  const onAttachFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    const picked = list.filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    const previews: ChatAttachment[] = picked.map((f) => ({
      id: uid(),
      kind: f.type.startsWith("video/") ? "video" : "image",
      name: f.name,
      url: URL.createObjectURL(f),
    }));
    setChatFilePreviews((prev) => [...prev, ...previews]);
  };

  const removePreview = (id: string) => {
    setChatFilePreviews((prev) => {
      const hit = prev.find((x) => x.id === id);
      if (hit) URL.revokeObjectURL(hit.url);
      return prev.filter((x) => x.id !== id);
    });
  };

  const insertEmoji = (e: string) => setChatText((t) => (t ? t + " " + e : e));

  const sendMessage = () => {
    if (!activeConv) return;

    const hasText = !!chatText.trim();
    const hasFiles = chatFilePreviews.length > 0;
    if (!hasText && !hasFiles) return;

    const msg: ChatMessage = {
      id: uid(),
      from: "me",
      text: hasText ? chatText.trim() : undefined,
      ts: "now",
      attachments: hasFiles ? chatFilePreviews : undefined,
    };

    setMessagesByConv((prev) => ({
      ...prev,
      [activeConv.id]: [...(prev[activeConv.id] ?? []), msg],
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConv.id
          ? {
              ...c,
              lastMessage: hasText ? chatText.trim() : "📎 Attachment",
              ts: "now",
            }
          : c
      )
    );

    setChatText("");
    setChatFilePreviews((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.url));
      return [];
    });
  };

  /** ===================== ACTIVITY ===================== */
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: "n1", kind: "like", text: "Andrei liked your video", ts: "now", read: false },
    { id: "n2", kind: "follow", text: "Mara started following you", ts: "1h", read: false },
    { id: "n3", kind: "gift", text: "You received a Crown gift 👑", ts: "2h", read: true },
  ]);
  const unreadActivity = notifications.filter((n) => !n.read).length;
  const markAllActivityRead = () => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const iconFor = (k: NotificationItem["kind"]) => {
    if (k === "like") return "❤";
    if (k === "comment") return "💬";
    if (k === "follow") return "➕";
    return "🎁";
  };

  /** ===================== PROFILE ===================== */
  const [profileName, setProfileName] = useState("Bogdan");
  const [profileHandle, setProfileHandle] = useState("bogdan");
  const [profileBio, setProfileBio] = useState("NewVybe • Feel the next vibe");

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const onPickAvatar = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };
  const onPickCover = (file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCoverUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  /** ===================== LIVE VIEWER ===================== */
  const [liveOpen, setLiveOpen] = useState(false);
  const [activeLive, setActiveLive] = useState<LiveRoom | null>(null);

  const openLive = (r: LiveRoom) => {
    setActiveLive(r);
    setLiveOpen(true);
  };

  // open a Supabase LIVE session (WebRTC viewer)
  const [activeSession, setActiveSession] = useState<LiveSessionRow | null>(null);
  const openLiveSession = (s: LiveSessionRow) => {
    setActiveSession(s);
    setLiveOpen(true);
  };
  const closeLive = () => {
    setLiveOpen(false);
    setActiveLive(null);
    setActiveSession(null);
  };

  /** ===================== GIFT SEND ===================== */
  const sendGift = (g: Gift) => {
    if (coins < g.cost) {
      alert("Not enough coins");
      return;
    }
    setCoins((c) => c - g.cost);
    trigger3D(g);
  };

  /** ===================== RENDER ===================== */
  return (
    <div className="appShell">
      {/* LEFT SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brandDot" />
          <div>
            <div className="brandName">NewVybe</div>
            <div className="muted">Feel the next vibe</div>
          </div>
        </div>

        <div className="navList">
          <NavItem label="For You" active={page === "For You"} onClick={() => setPage("For You")} />
          <NavItem label="Explore" active={page === "Explore"} onClick={() => setPage("Explore")} />
          <NavItem label="Following" active={page === "Following"} onClick={() => setPage("Following")} />
          <NavItem label="Friends" active={page === "Friends"} onClick={() => setPage("Friends")} />
          <NavItem label="LIVE" active={page === "LIVE"} onClick={() => setPage("LIVE")} />
          <NavItem label="Coins" active={page === "Coins"} onClick={() => setPage("Coins")} />
          <NavItem label="Messages" active={page === "Messages"} onClick={() => setPage("Messages")} />
          <NavItem
            label="Activity"
            active={page === "Activity"}
            onClick={() => setPage("Activity")}
            badge={unreadActivity}
          />
          <NavItem label="Upload" active={page === "Upload"} onClick={() => setPage("Upload")} />
          <NavItem label="Profile" active={page === "Profile"} onClick={() => setPage("Profile")} />
        </div>

        <div className="leftFooter">
          <div className="muted">Coins balance</div>
          <div className="coinPill">🪙 {coins}</div>
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <button className="ghostBtn" onClick={() => setGiftsOpen(true)}>
              Gifts
            </button>
            <button className="primaryBtn" onClick={() => setPage("Coins")}>
              Top up
            </button>
          </div>
        </div>
      </aside>

      {/* RIGHT CONTENT */}
      <main className="content">
        {page === "For You" && (
          <ForYouFeed
            videos={DEMO_VIDEOS}
            activeId={activeId}
            register={register}
            onOpenGifts={() => setGiftsOpen(true)}
          />
        )}

        {page === "Explore" && <ExplorePage videos={DEMO_VIDEOS} onOpenVideo={() => setPage("For You")} />}

        {page === "Following" && <FollowingPage users={FOLLOWING_USERS} onOpenProfile={() => setPage("Profile")} />}

        {page === "Friends" && <FriendsPage friends={FRIENDS} onMessage={() => setPage("Messages")} />}

{/* LIVE */}
{page === "LIVE" && hostLive && (
  <LiveHostStudio
    hostHandle={profileHandle}
    followers={followersCount}
    minFollowers={1000}
    supabase={supabase}
    onBack={() => {
      setHostLive(false);
      setPage("LIVE");
    }}
  />
)}

{page === "LIVE" && !hostLive && (
  <LivePage
    lives={DEMO_LIVES}
    sessions={liveSessions}
    loading={liveLoading}
    error={liveErr}
    canGoLive={followersCount >= 1000}
    onGoLive={() => {
      if (followersCount < 1000) {
        alert("🔒 You need at least 1,000 followers to go LIVE");
        return;
      }
      setHostLive(true);
      setPage("LIVE");
    }}
    onOpenLive={openLive}
    onOpenSession={openLiveSession}
  />
)}

{page === "Coins" && (
          <CoinsPage
            balance={coins}
            packs={COIN_PACKS}
            onBuy={(p) => {
              const add = p.coins + (p.bonus ?? 0);
              setCoins((c) => c + add);
              alert(`Added ${add} coins`);
            }}
            onReset={() => setCoins(0)}
          />
        )}

        {page === "Messages" && (
          <MessagesPage
            conversations={conversations}
            active={activeConv}
            messages={activeConv ? messagesByConv[activeConv.id] ?? [] : []}
            chatText={chatText}
            onPick={pickConversation}
            onChatText={setChatText}
            onSend={sendMessage}
            onOpenAttach={openAttachPicker}
            fileInputRef={fileInputRef}
            onAttachFiles={onAttachFiles}
            previews={chatFilePreviews}
            onRemovePreview={removePreview}
            onEmoji={insertEmoji}
          />
        )}

        {page === "Activity" && (
          <ActivityPage items={notifications} iconFor={iconFor} onMarkAllRead={markAllActivityRead} />
        )}

        {page === "Upload" && (
          <UploadPage
            file={uploadFile}
            previewUrl={uploadPreviewUrl}
            caption={uploadCaption}
            onCaption={setUploadCaption}
            onPickFile={(f) => setUploadFile(f)}
            onPublish={() => alert("Publish (mock)")}
          />
        )}

        {page === "Profile" && (
          <ProfilePage
            coins={coins}
            name={profileName}
            handle={profileHandle}
            bio={profileBio}
            avatarUrl={avatarUrl}
            coverUrl={coverUrl}
            onTopUp={() => setPage("Coins")}
            onEdit={() => setShowEditProfile(true)}
          />
        )}
      </main>

      {/* LIVE VIEWER MODAL */}
      {liveOpen && (activeLive || activeSession) && (
        <LiveViewerModal
          room={activeLive}
          session={activeSession}
          supabase={supabase}
          coins={coins}
          onClose={closeLive}
          onOpenGifts={() => setGiftsOpen(true)}
          onSendGift={sendGift}
        />
      )}

      {/* GIFTS MODAL */}
      {giftsOpen && (
        <Modal title="Gifts" onClose={() => setGiftsOpen(false)}>
          <div className="muted" style={{ marginBottom: 10 }}>
            Balance: {coins} 🪙
          </div>

          <div className="giftGrid">
            {GIFTS.map((g) => (
              <button
                key={g.id}
                className="giftCard"
                onClick={() => {
                  if (coins < g.cost) {
                    alert("Not enough coins");
                    return;
                  }
                  sendGift(g);
                  setGiftsOpen(false);
                }}
              >
                <div className="giftEmoji">{g.emoji}</div>
                <div className="giftName">{g.name}</div>
                <div className="giftCost">{g.cost} 🪙</div>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {/* FULLSCREEN 3D OVERLAY */}
      {gift3D && (
        <div className="gift3DOverlay" key={gift3D.key}>
          <Canvas camera={{ position: [0, 0.4, 2.8], fov: 45 }} style={{ width: "100%", height: "100%" }} dpr={[1, 2]}>
            <ambientLight intensity={2.2} />
            <directionalLight position={[5, 6, 5]} intensity={2.4} />
            <directionalLight position={[-5, -2, 3]} intensity={1.2} />
            <Float speed={2} rotationIntensity={0.8} floatIntensity={1.3}>
              {gift3D.model ? <Gift3DModel url={gift3D.model} /> : <mesh />}
            </Float>
            <OrbitControls enableZoom={false} enablePan={false} />
          </Canvas>

          <div className="gift3DLabel">🎁 {gift3D.label}</div>
        </div>
      )}

      {/* PROFILE EDIT MODAL */}
      <EditProfileModal
        open={showEditProfile}
        onClose={() => setShowEditProfile(false)}
        name={profileName}
        handle={profileHandle}
        bio={profileBio}
        setName={setProfileName}
        setHandle={setProfileHandle}
        setBio={setProfileBio}
        avatarUrl={avatarUrl}
        coverUrl={coverUrl}
        onAvatar={onPickAvatar}
        onCover={onPickCover}
      />
    </div>
  );
}

/** ===================== PAGES ===================== */
function ForYouFeed({
  videos,
  activeId,
  register,
  onOpenGifts,
}: {
  videos: FeedVideo[];
  activeId: string | null;
  register: (id: string) => (el: HTMLDivElement | null) => void;
  onOpenGifts: () => void;
}) {
  return (
    <div className="fyWrap">
      <div className="fyHeader">
        <div>
          <div className="pageTitle">For You</div>
          <div className="muted">Personalized feed • auto-play • premium UI</div>
        </div>

        <div className="fyHeaderRight">
          <div className="pill">Auto play</div>
          <button className="ghostBtn" onClick={onOpenGifts}>
            Gifts
          </button>
        </div>
      </div>

      <div className="fyLayout">
        <div className="fyScroller">
          {videos.map((v) => (
            <section key={v.id} className="fyItem" ref={register(v.id)}>
              <div className="fyStage">
                <VideoPlayer src={v.src} active={activeId === v.id} />

                <div className="fyCaption">
                  <div className="fyCapTitle">@{v.user}</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {v.caption}
                  </div>
                </div>

                <div className="fyActions">
                  <ActionIcon icon="❤" label={formatCount(v.likes)} />
                  <ActionIcon icon="💬" label={formatCount(v.comments)} />
                  <ActionIcon icon="↗" label={formatCount(v.shares)} />
                </div>
              </div>
            </section>
          ))}
        </div>

        <aside className="fyRail">
          <div className="railCard">
            <div className="railTitle">Trending</div>
            <button className="railRow" onClick={() => alert("Next: trending")}>
              🔥 #fyp
            </button>
            <button className="railRow" onClick={() => alert("Next: trending")}>
              🎧 #music
            </button>
            <button className="railRow" onClick={() => alert("Next: trending")}>
              ⚡ #live
            </button>
          </div>

          <div className="railCard">
            <div className="railTitle">Quick</div>
            <div className="railBtns">
              <button className="primaryBtn" onClick={onClickSafe(onOpenGifts)}>
                Send Gift
              </button>
              <button className="ghostBtn" onClick={() => alert("Next: filters")}>
                Filters
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ExplorePage({ videos, onOpenVideo }: { videos: FeedVideo[]; onOpenVideo: () => void }) {
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return videos;
    return videos.filter((v) => v.user.toLowerCase().includes(s) || v.caption.toLowerCase().includes(s));
  }, [q, videos]);

  return (
    <div className="pageWrap">
      <div className="pageHeader premiumHeader">
        <div>
          <div className="pageTitle">Explore</div>
          <div className="muted">Discover • search • premium grid</div>
        </div>
      </div>

      <div className="exploreModernTop">
        <div className="exploreSearch">
          <input className="searchInput" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search..." />
          <button className="ghostBtn" onClick={() => setQ("")}>
            Clear
          </button>
        </div>
      </div>

      <div className="exploreModernGrid">
        {items.map((v) => (
          <button key={v.id} className="exploreModernCard" onClick={onOpenVideo}>
            <div className="exploreModernThumb">
              <video className="exploreModernVideo" src={v.src} muted playsInline preload="metadata" />
              <div className="exploreModernOverlay">
                <div className="exploreModernUser">@{v.user}</div>
                <div className="exploreModernCap">{v.caption}</div>
              </div>
              <div className="exploreModernStats">
                <span>❤ {formatCount(v.likes)}</span>
                <span>💬 {formatCount(v.comments)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FollowingPage({ users, onOpenProfile }: { users: FollowingUser[]; onOpenProfile: () => void }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => u.name.toLowerCase().includes(s) || u.handle.toLowerCase().includes(s));
  }, [q, users]);

  return (
    <div className="pageWrap">
      <div className="pageHeader premiumHeader">
        <div>
          <div className="pageTitle">Following</div>
          <div className="muted">Your list • premium cards</div>
        </div>
      </div>

      <div className="followingTop">
        <input className="searchInput" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search people..." />
        <button className="ghostBtn" onClick={() => setQ("")}>
          Clear
        </button>
      </div>

      <div className="followingLayout">
        <div className="followCol">
          <div className="followColTitle">People</div>
          <div className="cardsGrid">
            {filtered.map((u) => (
              <div key={u.id} className="userCard">
                <div className="userCardTop">
                  <div className={"statusDot " + (u.online ? "on" : "off")} />
                  <div>
                    <div className="userName">{u.name}</div>
                    <div className="muted">@{u.handle}</div>
                  </div>
                </div>
                <div className="userBio">{u.bio}</div>
                <div className="userCardActions">
                  <button className="ghostBtn" onClick={onOpenProfile}>
                    View
                  </button>
                  <button className="primaryBtn" onClick={() => alert("Follow (mock)")}>
                    Follow
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="followCol">
          <div className="followColTitle">Tips</div>
          <div className="emptyCard">
            <div style={{ fontWeight: 900 }}>Next</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Suggestions, mutuals, online-only filter.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FriendsPage({ friends, onMessage }: { friends: FriendUser[]; onMessage: () => void }) {
  return (
    <div className="pageWrap">
      <div className="pageHeader premiumHeader">
        <div>
          <div className="pageTitle">Friends</div>
          <div className="muted">Quick DM • status</div>
        </div>
      </div>

      <div className="friendsGrid">
        {friends.map((f) => (
          <div className="friendCard" key={f.id}>
            <div className="friendTop">
              <div className={"friendAvatar " + f.status}>{f.name.slice(0, 1).toUpperCase()}</div>
              <div className="friendMain">
                <div className="friendName">{f.name}</div>
                <div className="muted">@{f.handle}</div>
              </div>
            </div>
            <div className="friendActions">
              <button className="ghostBtn" onClick={() => alert("View (mock)")}>
                View
              </button>
              <button className="primaryBtn" onClick={onMessage}>
                Message
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** LIVE: sessions from Supabase + demo grid -> click -> open viewer modal */
function LivePage({
  lives,
  sessions,
  loading,
  error,
  canGoLive,
  onGoLive,
  onOpenLive,
  onOpenSession,
}: {
  lives: LiveRoom[];
  sessions: LiveSessionRow[];
  loading: boolean;
  error: string | null;
  canGoLive: boolean;
  onGoLive: () => void;
  onOpenLive: (r: LiveRoom) => void;
  onOpenSession: (s: LiveSessionRow) => void;
}) {
  return (
    <div className="pageWrap">
      <div className="pageHeader premiumHeader" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="pageTitle">LIVE</div>
          <div className="muted">Go LIVE • join • chat • gifts • WebRTC + realtime viewers</div>
        </div>

        <button className="primaryBtn" onClick={onGoLive} title={canGoLive ? "Start your LIVE" : "Need 1000+ followers"}>
          🔴 Go LIVE
        </button>
      </div>

      {!canGoLive && (
        <div className="muted" style={{ marginBottom: 12 }}>
          🔒 LIVE locked: you need <b>1,000+</b> followers to start.
        </div>
      )}

      <div style={{ marginBottom: 10, fontWeight: 900 }}>LIVE now</div>

      {loading && <div className="muted">Loading live sessions…</div>}
      {error && <div className="muted">Supabase error: {error}</div>}

      {(!loading && (!sessions || sessions.length === 0)) ? (
        <div className="emptyCard" style={{ marginBottom: 14 }}>
          <div style={{ fontWeight: 900 }}>No one is live right now</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Press <b>Go LIVE</b> to start your stream.
          </div>
        </div>
      ) : (
        <div className="liveGridPremium" style={{ marginBottom: 14 }}>
          {sessions.map((s) => (
            <button key={s.id} className="liveCardPremium" onClick={() => onOpenSession(s)}>
              <div className="liveThumbPremium">
                <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, rgba(255,59,48,0.35), rgba(255,255,255,0.06))" }} />
                <div className="liveTagPremium">LIVE</div>
                <div className="liveViewPremium">Join</div>
              </div>

              <div className="liveBodyPremium">
                <div className="liveTitlePremium">{s.title || "LIVE"}</div>
                <div className="muted">@{s.host_handle}</div>
                <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                  Session: {s.id.slice(0, 6)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 10, fontWeight: 900 }}>Discover (demo rooms)</div>

      <div className="liveGridPremium">
        {lives.map((r) => (
          <button key={r.id} className="liveCardPremium" onClick={() => onOpenLive(r)}>
            <div className="liveThumbPremium">
              <img src={r.poster} alt="" />
              <div className="liveTagPremium">LIVE</div>
              <div className="liveViewPremium">{formatCount(r.viewers)} watching</div>
            </div>

            <div className="liveBodyPremium">
              <div className="liveTitlePremium">{r.title}</div>
              <div className="muted">@{r.host}</div>
              <div className="tagRow" style={{ marginTop: 10 }}>
                {r.tags.map((t) => (
                  <span className="tag" key={t}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CoinsPage
({
  balance,
  packs,
  onBuy,
  onReset,
}: {
  balance: number;
  packs: CoinPack[];
  onBuy: (p: CoinPack) => void;
  onReset: () => void;
}) {
  const safePacks = Array.isArray(packs) ? packs : [];
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    if (!selected && safePacks.length > 0) setSelected(safePacks[0].id);
  }, [safePacks.length, selected]);

  const sel = safePacks.find((p) => p.id === selected) ?? safePacks[0];
  const total = (sel?.coins ?? 0) + (sel?.bonus ?? 0);

  return (
    <div className="pageWrap">
      <div className="pageHeader premiumHeader">
        <div>
          <div className="pageTitle">Coins</div>
          <div className="muted">Premium top-up checkout</div>
        </div>

        <div className="coinsHeaderRight">
          <div className="coinsBalance">
            <div className="coinsIcon">🪙</div>
            <div>
              <div className="coinsValue">{balance}</div>
              <div className="muted">Balance</div>
            </div>
          </div>
          <button className="ghostBtn" onClick={onReset}>
            Reset
          </button>
        </div>
      </div>

      <div className="coinsLayout">
        <div className="coinsPacks">
          {safePacks.map((p) => {
            const active = p.id === selected;
            const t = p.coins + (p.bonus ?? 0);
            return (
              <button key={p.id} className={"packCard " + (active ? "active" : "")} onClick={() => setSelected(p.id)}>
                {p.tag && <div className="packTag">{p.tag}</div>}
                <div className="packCoins">{p.coins} coins</div>
                {p.bonus ? <div className="packBonus">+{p.bonus} bonus</div> : <div className="packBonus muted"> </div>}
                <div className="packTotal">
                  Total: <b>{t}</b>
                </div>
                <div className="packPrice">€{p.priceEur.toFixed(2)}</div>
              </button>
            );
          })}
        </div>

        <div className="coinsCheckout">
          <div className="checkoutCard">
            <div className="checkoutTitle">Checkout</div>
            <div className="checkoutRow">
              <span className="muted">Selected</span>
              <b>{sel?.coins ?? 0} coins</b>
            </div>
            <div className="checkoutRow">
              <span className="muted">Bonus</span>
              <b>{sel?.bonus ?? 0}</b>
            </div>
            <div className="checkoutRow">
              <span className="muted">Total coins</span>
              <b>{total}</b>
            </div>
            <div className="checkoutDivider" />
            <div className="checkoutRow">
              <span className="muted">Price</span>
              <b>€{(sel?.priceEur ?? 0).toFixed(2)}</b>
            </div>
            <button className="primaryBtn checkoutBtn" onClick={() => sel && onBuy(sel)} disabled={!sel}>
              Buy now
            </button>
            <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
              Next: Stripe / Apple Pay / Google Pay
            </div>
          </div>

          <div className="checkoutCard subtleCard">
            <div className="checkoutTitle">Perks</div>
            <div className="muted" style={{ lineHeight: 1.6 }}>
              Higher-tier gifts can trigger 3D overlays & effects.
            </div>
            <div className="checkoutMini">
              <span className="chip">3D</span>
              <span className="chip">Effects</span>
              <span className="chip">Leaderboard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ===================== MESSAGES PAGE ===================== */
function MessagesPage({
  conversations,
  active,
  messages,
  chatText,
  onPick,
  onChatText,
  onSend,
  onOpenAttach,
  fileInputRef,
  onAttachFiles,
  previews,
  onRemovePreview,
  onEmoji,
}: {
  conversations: Conversation[];
  active: Conversation | null;
  messages: ChatMessage[];
  chatText: string;
  onPick: (c: Conversation) => void;
  onChatText: (v: string) => void;
  onSend: () => void;
  onOpenAttach: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onAttachFiles: (files: FileList | null) => void;
  previews: ChatAttachment[];
  onRemovePreview: (id: string) => void;
  onEmoji: (e: string) => void;
}) {
  const [q, setQ] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return conversations;
    return conversations.filter(
      (c) =>
        c.withName.toLowerCase().includes(s) ||
        c.withHandle.toLowerCase().includes(s) ||
        c.lastMessage.toLowerCase().includes(s)
    );
  }, [conversations, q]);

  const emojiList = ["😀", "😂", "😍", "🔥", "👍", "🙏", "💯", "🎉", "❤️", "😎", "😅", "🤝", "🚀", "👑", "💎"];

  return (
    <div className="msgPremiumLayout">
      {/* LEFT */}
      <aside className="msgSidebar">
        <div className="msgSidebarTop">
          <div>
            <div className="pageTitle">Messages</div>
            <div className="muted">Chats</div>
          </div>
          <button className="ghostBtn" onClick={() => alert("Next: new message")}>
            + New
          </button>
        </div>

        <div className="msgSearchRow">
          <input className="searchInput" placeholder="Search chats..." value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="ghostBtn" onClick={() => setQ("")}>
            Clear
          </button>
        </div>

        <div className="msgList">
          {filtered.map((c) => (
            <button key={c.id} className={"msgRow " + (active?.id === c.id ? "active" : "")} onClick={() => onPick(c)}>
              <div className="msgAvatar">{c.withName.slice(0, 1).toUpperCase()}</div>
              <div className="msgRowMain">
                <div className="msgRowTop">
                  <div className="msgName">{c.withName}</div>
                  <div className="muted">{c.ts}</div>
                </div>
                <div className="muted">@{c.withHandle}</div>
                <div className="msgLast">{c.lastMessage}</div>
              </div>
              {c.unread > 0 && <div className="badge">{c.unread}</div>}
            </button>
          ))}
        </div>
      </aside>

      {/* RIGHT */}
      <section className="msgChat">
        {!active ? (
          <div className="msgEmpty">
            <div>
              <div style={{ fontSize: 18, fontWeight: 900 }}>Pick a conversation</div>
              <div className="muted" style={{ marginTop: 8 }}>
                Your chat will appear here.
              </div>
            </div>
          </div>
        ) : (
          <div className="msgChatCard">
            <div className="msgChatTop">
              <div>
                <div className="msgName">{active.withName}</div>
                <div className="muted">@{active.withHandle}</div>
              </div>
              <div className="msgTopBtns">
                <button className="ghostBtn" onClick={() => setShowEmoji((v) => !v)} title="Emoji">
                  😊
                </button>
                <button className="ghostBtn" onClick={() => alert("Next: info")} title="Info">
                  ℹ️
                </button>
              </div>
            </div>

            {showEmoji && (
              <div className="emojiBar">
                {emojiList.map((e) => (
                  <button key={e} className="emojiBtn" onClick={() => onEmoji(e)}>
                    {e}
                  </button>
                ))}
              </div>
            )}

            <div className="msgBody">
              {messages.map((m) => (
                <div key={m.id} className={"bubble " + (m.from === "me" ? "me" : "other")}>
                  {m.text && <div>{m.text}</div>}

                  {m.attachments?.length ? (
                    <div className="attGrid">
                      {m.attachments.map((a) => (
                        <div key={a.id} className="attItem">
                          {a.kind === "image" ? <img src={a.url} alt={a.name} /> : <video src={a.url} controls playsInline />}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="muted" style={{ marginTop: 6, fontSize: 11 }}>
                    {m.ts}
                  </div>
                </div>
              ))}
            </div>

            {/* PREVIEW ATTACHMENTS */}
            {previews.length > 0 && (
              <div className="attPreviewRow">
                {previews.map((p) => (
                  <div key={p.id} className="attPreview">
                    {p.kind === "image" ? <img src={p.url} alt={p.name} /> : <video src={p.url} />}
                    <button className="attRemove" onClick={() => onRemovePreview(p.id)}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="msgComposer">
              <input
                ref={fileInputRef as any}
                className="hiddenFile"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => onAttachFiles(e.target.files)}
              />

              <button className="ghostBtn" onClick={onOpenAttach} title="Attach">
                ➕
              </button>

              <input className="msgInput" value={chatText} onChange={(e) => onChatText(e.target.value)} placeholder="Message..." />

              <button className="primaryBtn" onClick={onSend} disabled={!chatText.trim() && previews.length === 0}>
                Send
              </button>
            </div>

            <div className="msgFooterHint muted">Attachments + emoji ✅</div>
          </div>
        )}
      </section>
    </div>
  );
}

/** ===================== ACTIVITY PAGE ===================== */
function ActivityPage({
  items,
  iconFor,
  onMarkAllRead,
}: {
  items: NotificationItem[];
  iconFor: (k: NotificationItem["kind"]) => string;
  onMarkAllRead: () => void;
}) {
  const [tab, setTab] = useState<"all" | "like" | "comment" | "follow" | "gift">("all");

  const filtered = useMemo(() => {
    if (tab === "all") return items;
    return items.filter((i) => i.kind === tab);
  }, [items, tab]);

  return (
    <div className="pageWrap">
      <div className="pageHeader premiumHeader">
        <div>
          <div className="pageTitle">Activity</div>
          <div className="muted">Notifications & updates</div>
        </div>

        <button className="ghostBtn" onClick={onMarkAllRead}>
          Mark all read
        </button>
      </div>

      <div className="activityTop">
        <div className="seg">
          {(["all", "like", "comment", "follow", "gift"] as const).map((k) => (
            <button key={k} className={"segBtn " + (tab === k ? "active" : "")} onClick={() => setTab(k)}>
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="activityList">
        {filtered.map((n) => (
          <div key={n.id} className={"activityRowPremium " + (!n.read ? "unread" : "")}>
            <div className="activityIcon">{iconFor(n.kind)}</div>
            <div className="activityMain">
              <div className="activityText">{n.text}</div>
              <div className="muted">{n.ts}</div>
            </div>
            {!n.read && <span className="miniDot" title="Unread" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** ===================== UPLOAD PAGE ===================== */
function UploadPage({
  file,
  previewUrl,
  caption,
  onCaption,
  onPickFile,
  onPublish,
}: {
  file: File | null;
  previewUrl: string | null;
  caption: string;
  onCaption: (v: string) => void;
  onPickFile: (f: File | null) => void;
  onPublish: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f) onPickFile(f);
  };

  return (
    <div className="pageWrap">
      <div className="pageHeader premiumHeader">
        <div>
          <div className="pageTitle">Upload</div>
          <div className="muted">Drag & drop • preview • publish (mock)</div>
        </div>
      </div>

      <div className="uploadPremium">
        <div
          className="uploadDrop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="video/*,image/*"
            style={{ display: "none" }}
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />

          {!file ? (
            <div className="uploadHint">
              <div style={{ fontWeight: 900, fontSize: 16 }}>Drop file here</div>
              <div className="muted" style={{ marginTop: 6 }}>
                or click to select
              </div>
            </div>
          ) : (
            <div className="uploadPreview">
              {previewUrl && file.type.startsWith("video/") ? (
                <video src={previewUrl} controls playsInline />
              ) : previewUrl ? (
                <img src={previewUrl} alt="preview" />
              ) : (
                <div className="muted">Preview not available</div>
              )}
            </div>
          )}
        </div>

        <div className="uploadSettings">
          <div className="fieldBox">
            <div className="muted">Caption</div>
            <input className="searchInput" value={caption} onChange={(e) => onCaption(e.target.value)} placeholder="Write something..." />
          </div>

          <button className="primaryBtn" onClick={onPublish} disabled={!file}>
            Publish
          </button>

          <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Publish is enabled only when a file is selected.
          </div>
        </div>
      </div>
    </div>
  );
}

/** ===================== PROFILE PAGE ===================== */
function ProfilePage({
  coins,
  name,
  handle,
  bio,
  avatarUrl,
  coverUrl,
  onTopUp,
  onEdit,
}: {
  coins: number;
  name: string;
  handle: string;
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  onTopUp: () => void;
  onEdit: () => void;
}) {
  const [tab, setTab] = useState<"Posts" | "Liked" | "Saved">("Posts");

  return (
    <div className="pageWrap">
      <div
        className="profileCover"
        style={
          coverUrl
            ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        <div className="profileCoverGlow" />
        <div className="profileCoverInner">
          <div className="profileAvatarBig">{avatarUrl ? <img src={avatarUrl} alt="avatar" /> : name.slice(0, 1).toUpperCase()}</div>

          <div className="profileHead">
            <div className="profileNameBig">{name}</div>
            <div className="muted">@{handle}</div>
            <div className="muted" style={{ marginTop: 6 }}>
              {bio}
            </div>

            <div className="profileActions">
              <button className="ghostBtn" onClick={onEdit}>
                Edit Profile
              </button>
              <button className="primaryBtn" onClick={onTopUp}>
                Top up coins
              </button>
            </div>
          </div>

          <div className="profileStatsBar">
            <div className="statP">
              <div className="statNum">12</div>
              <div className="muted">Posts</div>
            </div>
            <div className="statP">
              <div className="statNum">1.2K</div>
              <div className="muted">Followers</div>
            </div>
            <div className="statP">
              <div className="statNum">320</div>
              <div className="muted">Following</div>
            </div>
            <div className="statP">
              <div className="statNum">🪙 {coins}</div>
              <div className="muted">Coins</div>
            </div>
          </div>
        </div>
      </div>

      <div className="profileTabs">
        {(["Posts", "Liked", "Saved"] as const).map((t) => (
          <button key={t} className={"tabBtn " + (tab === t ? "active" : "")} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      <div className="profileGridPremium">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx} className="profileTile">
            <div className="profileTileInner">
              {tab} #{idx + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


/** ===================== LIVE HOST STUDIO (WebRTC + Presence) ===================== */
function LiveHostStudio({
  hostHandle,
  followers,
  minFollowers,
  supabase,
  onBack,
}: {
  hostHandle: string;
  followers: number;
  minFollowers: number;
  supabase: any; // Supabase client or null
  onBack: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [previewOn, setPreviewOn] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [viewerCount, setViewerCount] = useState(0);

  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const presenceChannelRef = useRef<any>(null);
  const signalChannelRef = useRef<any>(null);

  const canGoLive = followers >= minFollowers;

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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPreviewOn(true);
    } catch (e: any) {
      setError(
        e?.name === "NotAllowedError"
          ? "Camera/mic permission denied."
          : "Cannot start camera. Use localhost/https and close other apps using camera."
      );
      setPreviewOn(false);
    }
  };

  const cleanupChannels = async () => {
    try {
      if (presenceChannelRef.current && supabase) await supabase.removeChannel(presenceChannelRef.current);
    } catch {}
    try {
      if (signalChannelRef.current && supabase) await supabase.removeChannel(signalChannelRef.current);
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

  const subscribePresence = async (sid: string) => {
    if (!supabase) return;
    if (presenceChannelRef.current) {
      try {
        await supabase.removeChannel(presenceChannelRef.current);
      } catch {}
    }
    const ch = supabase.channel(`presence:live:${sid}`, { config: { presence: { key: `host:${hostHandle}` } } });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const unique = Object.keys(state || {}).length;
      setViewerCount(unique);
    });
    await ch.subscribe(async (status: string) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ role: "host", at: new Date().toISOString() });
      }
    });
    presenceChannelRef.current = ch;
  };

  const ensureSignalChannel = async (sid: string) => {
    if (!supabase) return;
    if (signalChannelRef.current) {
      try {
        await supabase.removeChannel(signalChannelRef.current);
      } catch {}
    }
    const ch = supabase.channel(`webrtc:live:${sid}`);

    ch.on("broadcast", { event: "viewer-join" }, async ({ payload }: any) => {
      const viewerId = payload?.viewerId as string;
      if (!viewerId) return;

      const pc = new RTCPeerConnection({ iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }] });
      peersRef.current.set(viewerId, pc);

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
      const viewerId = payload?.from as string;
      const candidate = payload?.candidate as RTCIceCandidateInit;
      const pc = peersRef.current.get(viewerId);
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
      setError(`🔒 Need ${minFollowers}+ followers to go LIVE.`);
      return;
    }
    if (!supabase) {
      setError("Supabase is not configured. Add VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.");
      return;
    }
    if (!previewOn) {
      await startPreview();
      if (!localStreamRef.current) return;
    }

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

    if (insErr || !data?.id) {
      setError(insErr?.message || "Cannot create live session");
      return;
    }

    setSessionId(data.id);
    setIsLive(true);

    await subscribePresence(data.id);
    await ensureSignalChannel(data.id);
  };

  const endLive = async () => {
    setIsLive(false);
    if (supabase && sessionId) {
      await supabase
        .from("live_sessions")
        .update({ is_live: false, ended_at: new Date().toISOString() })
        .eq("id", sessionId);
    }
    closeAllPeers();
    await cleanupChannels();
    setSessionId(null);
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

  return (
    <div className="pageWrap">
      <div className="pageHeader premiumHeader" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="pageTitle">LIVE Studio</div>
          <div className="muted">
            @{hostHandle} • followers {followers} • viewers <b>{viewerCount}</b> {sessionId ? `• ${sessionId.slice(0, 6)}` : ""}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {!isLive ? (
            <button className="primaryBtn" onClick={startLive} disabled={!canGoLive}>
              🔴 Start LIVE
            </button>
          ) : (
            <button className="ghostBtn" onClick={endLive}>
              ⏹ End LIVE
            </button>
          )}
          <button className="ghostBtn" onClick={onBack}>
            ← Back
          </button>
        </div>
      </div>

      {error && (
        <div className="emptyCard" style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 900 }}>LIVE error</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {error}
          </div>
        </div>
      )}

      <div className="liveStage" style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "#000" }}>
        <video ref={videoRef} className="viewerVideo" playsInline muted />
        {isLive && <div className="liveStageBadge">LIVE</div>}
        <div className="liveControls" style={{ position: "absolute", bottom: 12, left: 12, right: 12, display: "flex", gap: 10, justifyContent: "space-between" }}>
          <button className="ghostBtn" onClick={startPreview}>🎥 Preview</button>
          <button className="ghostBtn" onClick={() => { setPreviewOn(false); stopLocal(); }}>🧹 Stop preview</button>
        </div>
      </div>

      <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
        WebRTC is P2P (host ↔ viewer). For thousands of viewers you need an SFU (LiveKit/Janus/Wowza).
      </div>
    </div>
  );
}


/** ===================== LIVE VIEWER MODAL ===================== */
function LiveViewerModal({
  room,
  session,
  supabase,
  coins,
  onClose,
  onOpenGifts,
  onSendGift,
}: {
  room: LiveRoom | null;
  session: LiveSessionRow | null;
  supabase: any;
  coins: number;
  onClose: () => void;
  onOpenGifts: () => void;
  onSendGift: (g: Gift) => void;
}) {
  const [chatText, setChatText] = useState("");
  const [chat, setChat] = useState<{ id: string; from: "me" | "other"; text: string; ts: string }[]>([
    { id: "lc1", from: "other", text: "Welcome! 👋", ts: "now" },
    { id: "lc2", from: "other", text: "Say hi in chat 🔥", ts: "now" },
  ]);

  // WebRTC viewer (only when `session` exists)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const signalChannelRef = useRef<any>(null);
  const presenceRef = useRef<any>(null);
  const viewerIdRef = useRef<string>("viewer-" + Math.random().toString(16).slice(2));
  const [webrtcStatus, setWebrtcStatus] = useState<"idle" | "connecting" | "live" | "error">("idle");

  useEffect(() => {
    const sid = session?.id;
    const host = session?.host_handle;

    // if demo room, do nothing
    if (!sid || !host || !supabase) {
      setWebrtcStatus("idle");
      return;
    }

    let mounted = true;
    setWebrtcStatus("connecting");

    const cleanup = async () => {
      try {
        if (pcRef.current) pcRef.current.close();
      } catch {}
      pcRef.current = null;

      try {
        if (signalChannelRef.current) await supabase.removeChannel(signalChannelRef.current);
      } catch {}
      signalChannelRef.current = null;

      try {
        if (presenceRef.current) await supabase.removeChannel(presenceRef.current);
      } catch {}
      presenceRef.current = null;

      if (videoRef.current) videoRef.current.srcObject = null;
    };

    const run = async () => {
      // presence track => host gets real viewer count
      const pch = supabase.channel(`presence:live:${sid}`, { config: { presence: { key: viewerIdRef.current } } });
      await pch.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await pch.track({ role: "viewer", at: new Date().toISOString() });
        }
      });
      presenceRef.current = pch;

      // create RTCPeerConnection
      const pc = new RTCPeerConnection({ iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }] });
      pcRef.current = pc;

      pc.ontrack = (ev) => {
        const stream = ev.streams?.[0];
        if (!stream) return;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        if (mounted) setWebrtcStatus("live");
      };

      // signaling channel
      const ch = supabase.channel(`webrtc:live:${sid}`);

      ch.on("broadcast", { event: "offer" }, async ({ payload }: any) => {
        const to = payload?.to as string;
        if (to !== viewerIdRef.current) return;
        const sdp = payload?.sdp as RTCSessionDescriptionInit;
        if (!sdp) return;

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        ch.send({
          type: "broadcast",
          event: "answer",
          payload: { to: host, from: viewerIdRef.current, sdp: answer },
        });
      });

      ch.on("broadcast", { event: "ice-candidate" }, async ({ payload }: any) => {
        const to = payload?.to as string;
        if (to !== viewerIdRef.current) return;
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
          payload: { to: host, from: viewerIdRef.current, candidate: ev.candidate },
        });
      };

      await ch.subscribe();
      signalChannelRef.current = ch;

      // notify host
      ch.send({ type: "broadcast", event: "viewer-join", payload: { viewerId: viewerIdRef.current } });
    };

    run().catch(() => {
      if (mounted) setWebrtcStatus("error");
    });

    return () => {
      mounted = false;
      cleanup().catch(() => {});
    };
  }, [session?.id]);

  const send = () => {
    const t = chatText.trim();
    if (!t) return;
    setChat((prev) => [...prev, { id: uid(), from: "me", text: t, ts: "now" }]);
    setChatText("");
    setTimeout(() => {
      setChat((prev) => [...prev, { id: uid(), from: "other", text: "Nice! 😄", ts: "now" }]);
    }, 650);
  };

  const title = session ? (session.title || "LIVE") : (room?.title || "LIVE");
  const host = session ? session.host_handle : (room?.host || "host");

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="liveViewer" onMouseDown={(e) => e.stopPropagation()}>
        <div className="liveViewerTop">
          <div>
            <div className="liveViewerTitle">{title}</div>
            <div className="muted">
              @{host} • balance {coins} 🪙 {session ? `• session ${session.id.slice(0, 6)}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="ghostBtn" onClick={onOpenGifts}>
              Gifts
            </button>
            <button className="ghostBtn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="liveViewerGrid">
          {/* VIDEO / STAGE */}
          <div className="liveStage">
            {session ? (
              <>
                <video ref={videoRef} className="viewerVideo" playsInline />
                <div className="liveStageBadge">LIVE</div>
                <div className="liveStageBottom">
                  <div className="muted">
                    WebRTC:{" "}
                    <b>
                      {webrtcStatus === "live"
                        ? "Connected"
                        : webrtcStatus === "connecting"
                        ? "Connecting…"
                        : webrtcStatus === "error"
                        ? "Error"
                        : "Idle"}
                    </b>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="liveStagePoster" style={{ backgroundImage: `url(${room?.poster})` }} aria-label="live" />
                <div className="liveStageBadge">LIVE</div>
                <div className="liveStageBottom">
                  <div className="muted">Demo room (poster). Join a LIVE NOW session for real WebRTC.</div>
                </div>
              </>
            )}
          </div>

          {/* CHAT */}
          <div className="liveChat">
            <div className="liveChatHeader">
              <div style={{ fontWeight: 900 }}>Chat</div>
              <div className="muted">Live messages</div>
            </div>

            <div className="liveChatBody">
              {chat.map((m) => (
                <div key={m.id} className={"liveMsg " + (m.from === "me" ? "me" : "other")}>
                  <div className="liveMsgText">{m.text}</div>
                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                    {m.ts}
                  </div>
                </div>
              ))}
            </div>

            <div className="liveChatComposer">
              <input className="msgInput" value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Say something..." />
              <button className="primaryBtn" onClick={send} disabled={!chatText.trim()}>
                Send
              </button>
            </div>

            <div className="liveGiftRow">
              {GIFTS.slice(0, 6).map((g) => (
                <button key={g.id} className="liveGiftBtn" onClick={() => onSendGift(g)} title={`${g.name} • ${g.cost} coins`}>
                  <span style={{ fontSize: 16 }}>{g.emoji}</span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {g.cost}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ===================== UI PARTS ===================== */

function NavItem({
  label,
  active,
  onClick,
  badge,
}: {
  label: Page;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button className={"navItem " + (active ? "active" : "")} onClick={onClick}>
      <span className="navDot" />
      <span className="navLabel">{label}</span>
      {badge && badge > 0 ? <span className="navBadge">{badge}</span> : null}
    </button>
  );
}

function ActionIcon({ icon, label }: { icon: string; label: string }) {
  return (
    <button className="actionBtn" onClick={() => alert("Next: action")} title="Action">
      <div className="actionBubble">{icon}</div>
      {label && <div className="actionLabel">{label}</div>}
    </button>
  );
}

function VideoPlayer({ src, active }: { src: string; active: boolean }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) v.play().catch(() => {});
    else v.pause();
  }, [active]);

  return (
    <div className="videoWrap">
      <video ref={ref} className="video" src={src} muted loop playsInline preload="metadata" />
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalTop">
          <div style={{ fontWeight: 900 }}>{title}</div>
          <button className="ghostBtn" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}

function EditProfileModal({
  open,
  onClose,
  name,
  handle,
  bio,
  setName,
  setHandle,
  setBio,
  avatarUrl,
  coverUrl,
  onAvatar,
  onCover,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  handle: string;
  bio: string;
  setName: (v: string) => void;
  setHandle: (v: string) => void;
  setBio: (v: string) => void;
  avatarUrl: string | null;
  coverUrl: string | null;
  onAvatar: (f: File | null) => void;
  onCover: (f: File | null) => void;
}) {
  if (!open) return null;

  return (
    <div className="modalBackdrop" onMouseDown={onClose}>
      <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modalTop">
          <div style={{ fontWeight: 900, fontSize: 16 }}>Edit profile</div>
          <button className="ghostBtn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="modalGrid">
          <div className="uploadBox">
            <div className="muted" style={{ marginBottom: 8 }}>
              Cover
            </div>
            <div
              className="coverPreview"
              style={
                coverUrl ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined
              }
            >
              {!coverUrl && <div className="muted">No cover</div>}
            </div>
            <input type="file" accept="image/*" onChange={(e) => onCover(e.target.files?.[0] ?? null)} />
          </div>

          <div className="uploadBox">
            <div className="muted" style={{ marginBottom: 8 }}>
              Avatar
            </div>
            <div className="avatarPreview">{avatarUrl ? <img src={avatarUrl} alt="avatar" /> : <div className="muted">No avatar</div>}</div>
            <input type="file" accept="image/*" onChange={(e) => onAvatar(e.target.files?.[0] ?? null)} />
          </div>

          <div className="fieldBox">
            <label className="muted">Name</label>
            <input className="searchInput" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="fieldBox">
            <label className="muted">Handle</label>
            <input className="searchInput" value={handle} onChange={(e) => setHandle(e.target.value.replace(/\s+/g, ""))} />
          </div>

          <div className="fieldBox" style={{ gridColumn: "1 / -1" }}>
            <label className="muted">Bio</label>
            <textarea className="textArea" value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
        </div>

        <div className="modalActions">
          <button className="ghostBtn" onClick={onClose}>
            Cancel
          </button>
          <button className="primaryBtn" onClick={onClose}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/** small helper to avoid TS inline warning */
function onClickSafe(fn: () => void) {
  return () => fn();
}
