// src/gifts3d/gifts.ts

export type GiftMediaType = "MODEL_3D" | "ANIM_2D";

export type Gift = {
  id: string;
  name: string;
  coins: number;

  // imaginea din grid (mandatory)
  icon: string;

  // ce rulează când dai click
  type: GiftMediaType;

  // pentru 3D
  modelUrl?: string;

  // pentru 2D animat (gif/webp/mp4)
  animUrl?: string;

  // cât timp stă overlay-ul
  durationMs?: number;
};

// helper: convertește text în id safe
const gid = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// IMPORTANT:
// - icon: trebuie să existe în public/gifts3d/icons/...
// - modelUrl: trebuie să existe în public/gifts3d/models/...
// - animUrl: trebuie să existe în public/gifts3d/anim/...

export const GIFTS: Gift[] = [
  // ===== 15K =====
  {
    id: gid("Leopard"),
    name: "Leopard",
    coins: 15000,
    icon: "/gifts3d/icons/leopard.webp",
    type: "MODEL_3D",
    modelUrl: "/gifts3d/models/leopard.glb",
    durationMs: 3800,
  },
  {
    id: gid("Maggie"),
    name: "Maggie",
    coins: 15000,
    icon: "/gifts3d/icons/maggie.webp",
    type: "ANIM_2D",
    animUrl: "/gifts3d/anim/maggie.webp",
    durationMs: 3200,
  },
  {
    id: gid("Calatorie viitoare"),
    name: "Călătorie viitoare",
    coins: 15000,
    icon: "/gifts3d/icons/calatorie-viitoare.webp",
    type: "ANIM_2D",
    animUrl: "/gifts3d/anim/calatorie-viitoare.webp",
    durationMs: 3500,
  },
  {
    id: gid("Go Big Stallion"),
    name: "Go Big Stallion",
    coins: 15000,
    icon: "/gifts3d/icons/go-big-stallion.webp",
    type: "MODEL_3D",
    modelUrl: "/gifts3d/models/go-big-stallion.glb",
    durationMs: 4200,
  },
  {
    id: gid("Leopard de zapada"),
    name: "Leopard de zăpadă",
    coins: 15000,
    icon: "/gifts3d/icons/leopard-de-zapada.webp",
    type: "MODEL_3D",
    modelUrl: "/gifts3d/models/leopard-de-zapada.glb",
    durationMs: 4200,
  },

  // ===== 12K =====
  {
    id: gid("Urs negru"),
    name: "Urs negru",
    coins: 12000,
    icon: "/gifts3d/icons/urs-negru.webp",
    type: "MODEL_3D",
    modelUrl: "/gifts3d/models/urs-negru.glb",
    durationMs: 3800,
  },
  {
    id: gid("Lup"),
    name: "Lup",
    coins: 12000,
    icon: "/gifts3d/icons/lup.webp",
    type: "MODEL_3D",
    modelUrl: "/gifts3d/models/lup.glb",
    durationMs: 3800,
  },
  {
    id: gid("Soim"),
    name: "Șoim",
    coins: 10999,
    icon: "/gifts3d/icons/soim.webp",
    type: "MODEL_3D",
    modelUrl: "/gifts3d/models/soim.glb",
    durationMs: 3600,
  },

  // ===== 30K+ (din poze) =====
  {
    id: gid("Zeus"),
    name: "Zeus",
    coins: 34000,
    icon: "/gifts3d/icons/zeus.webp",
    type: "MODEL_3D",
    modelUrl: "/gifts3d/models/zeus.glb",
    durationMs: 4800,
  },
  {
    id: gid("Foca si balena"),
    name: "Foca și balena",
    coins: 34500,
    icon: "/gifts3d/icons/foca-si-balena.webp",
    type: "ANIM_2D",
    animUrl: "/gifts3d/anim/foca-si-balena.webp",
    durationMs: 4200,
  },
  {
    id: gid("Balena Sam"),
    name: "Balena Sam",
    coins: 30000,
    icon: "/gifts3d/icons/balena-sam.webp",
    type: "ANIM_2D",
    animUrl: "/gifts3d/anim/balena-sam.webp",
    durationMs: 4200,
  },
  {
    id: gid("Gorila"),
    name: "Gorilă",
    coins: 30000,
    icon: "/gifts3d/icons/gorila.webp",
    type: "MODEL_3D",
    modelUrl: "/gifts3d/models/gorila.glb",
    durationMs: 4500,
  },
  {
    id: gid("Leu"),
    name: "Leu",
    coins: 29999,
    icon: "/gifts3d/icons/leu.webp",
    type: "MODEL_3D",
    modelUrl: "/gifts3d/models/leu.glb",
    durationMs: 4500,
  },
  {
    id: gid("Flacara dragonului"),
    name: "Flacăra dragonului",
    coins: 26999,
    icon: "/gifts3d/icons/flacara-dragonului.webp",
    type: "MODEL_3D",
    modelUrl: "/gifts3d/models/flacara-dragonului.glb",
    durationMs: 5000,
  },

  // ===== 20K+ =====
  {
    id: gid("Delfin"),
    name: "Delfin",
    coins: 20000,
    icon: "/gifts3d/icons/delfin.webp",
    type: "MODEL_3D",
    modelUrl: "/gifts3d/models/delfin.glb",
    durationMs: 4200,
  },
  {
    id: gid("Pasarea Phoenix"),
    name: "Pasărea Phoenix",
    coins: 25999,
    icon: "/gifts3d/icons/pasarea-phoenix.webp",
    type: "MODEL_3D",
    modelUrl: "/gifts3d/models/pasarea-phoenix.glb",
    durationMs: 5200,
  },

  // ===== 17K+ =====
  {
    id: gid("Parc de distractii"),
    name: "Parc de distracții",
    coins: 17000,
    icon: "/gifts3d/icons/parc-de-distractii.webp",
    type: "ANIM_2D",
    animUrl: "/gifts3d/anim/parc-de-distractii.webp",
    durationMs: 4200,
  },
];
// compat alias (ca să nu crape importurile vechi)
export const GIFTS_3D = GIFTS;
export default GIFTS;
