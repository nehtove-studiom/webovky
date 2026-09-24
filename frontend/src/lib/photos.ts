// Kurátorovaná sada fotografií — VÝHRADNĚ nehty / modeláž / manikúra.
// Jen jemné nude a pudrové tóny, aby fotky ladily s paletou předlohy.
// Žádné lahvičky, žádná pedikúra, žádná jiná témata.

// Dodané firemní podklady klientky
export const STUDIO_LOGO =
  "https://static.prod-images.emergentagent.com/jobs/38975200-033e-48d7-a89a-dd9139c8a9a8/images/4e0943c91343e82ca769b969ad1b97fbb8dac1e5fa14ce5f0f5ff744718d4385.jpeg";

// Fotky nehtů od klientky (public/nehty) — hlavní vizuály webu
export const STUDIO_FOTO = {
  floralArt: "/nehty/client/client-3.webp",
  nudeMatteAlmond: "/nehty/client/client-4.webp",
  velvetNude: "/nehty/client/client-1.webp",
  goldFlowerSilk: "/nehty/client/client-5.webp",
  sageGoldSilk: "/nehty/client/client-6.webp",
  longNude: "/nehty/client/client-7.webp",
  pearlBlossom: "/nehty/client/client-8.webp",
  nudeDetail2: "/nehty/client/client-9.webp",
  nudeDetail4: "/nehty/client/client-10.webp",
} as const;

export const NAIL_PHOTOS = {
  // šalvějová francie se zlatými detaily — fotka od klientky
  sageFrench:
    "https://customer-assets-v7afamib.emergentagent.net/job_czech-chat-buddy/artifacts/eup86puw_Gemini_Generated_Image_wfxms1wfxms1wfxmnxnxnxn.webp",
  // hero koláž
  heroLeft: "/nehty/velvet-nude-hands.jpg",
  heroRight: "/nehty/floral-art-hands.jpg",
  // karty služeb a galerie — vše jemné nude / pudrové
  manikura: "/nehty/nude-detail-4.jpg",
  modelaz: "/nehty/pearl-blossom-hands.jpg",
  gelLak: "/nehty/nude-matte-almond.jpg",
  nailArt: "/nehty/gold-flower-silk.jpg",
  zpevneni:
    "https://static.prod-images.emergentagent.com/jobs/38975200-033e-48d7-a89a-dd9139c8a9a8/images/9131b9744d94e8e08d53924f3aa6bd3e3093f7ce07e68c44853cb1fe0a531e0e.jpeg",
  peceONehty: "/nehty/sage-gold-silk.jpg",
  nudeDetail: "/nehty/pearl-blossom-hands.jpg",
  nudeKlid: "/nehty/long-nude-nails.jpg",
} as const;

// Fotka ke každé službě z ceníku (id ze backendu)
export const SERVICE_PHOTOS: Record<string, string> = {
  manikura: NAIL_PHOTOS.manikura,
  "gel-lak": NAIL_PHOTOS.gelLak,
  "modelaz-nova": NAIL_PHOTOS.modelaz,
  "modelaz-doplneni": NAIL_PHOTOS.nailArt,
  pedikura: NAIL_PHOTOS.peceONehty,
};

export const SERVICE_PHOTO_FALLBACK = NAIL_PHOTOS.zpevneni;

// Galerie ukázek prací — jen nehty, jemné tóny
export const GALLERY_PHOTOS = [
  { src: "/nehty/client/client-1.webp", alt: "Jemná nude modeláž s tmavým akcentem" },
  { src: "/nehty/client/client-3.webp", alt: "Burgundy modeláž s drobným zdobením" },
  { src: "/nehty/client/client-4.webp", alt: "Nude manikúra s jemnými kvítky" },
  { src: "/nehty/client/client-5.webp", alt: "Pudrová manikúra s perleťovým detailem" },
  { src: "/nehty/client/client-6.webp", alt: "Růžová manikúra s jemným zdobením" },
  { src: "/nehty/client/client-7.webp", alt: "Pudrové nehty s výrazným detailem" },
  { src: "/nehty/client/client-8.webp", alt: "Elegantní světlá manikúra" },
  { src: "/nehty/client/client-10.webp", alt: "Přírodní růžová modeláž" },
] as const;

export const PROMO_VIDEO = "/studio-m-promo-muted.mp4";

// Vystřižené PNG segmenty od klientky (public/fotky) — jednotlivé nehty
// s 3D květinovým zdobením, ideální pro plovoucí dekorace a kolekci.
export const SEGMENT_NAILS = [
  ...Array.from({ length: 13 }, (_, i) => `/fotky/3d-floral-nail-art-${i + 1}.png`),
  ...Array.from({ length: 10 }, (_, i) => `/fotky/almond-shaped-nails-${i + 1}.png`),
  ...Array.from({ length: 6 }, (_, i) => `/fotky/nude-pink-nail-polish-${i + 1}.png`),
  ...Array.from({ length: 4 }, (_, i) => `/fotky/sage-green-nail-polish-${i + 1}.png`),
] as const;

// Ručně vybraná kolekce pro sekci „3D floral kolekce“
export const COLLECTION_NAILS = [
  { src: "/fotky/3d-floral-nail-art-3.png", name: "Sakura pearl", note: "3D květ s perletí" },
  { src: "/fotky/almond-shaped-nails-5.png", name: "Blush almond", note: "mandle v nude tónu" },
  { src: "/fotky/sage-green-nail-polish-2.png", name: "Sage blossom", note: "šalvěj se zdobením" },
  { src: "/fotky/nude-pink-nail-polish-1.png", name: "Nude pink", note: "klasika se zlatou linkou" },
  { src: "/fotky/3d-floral-nail-art-7.png", name: "Gold twig", note: "zlatá větvička" },
  { src: "/fotky/almond-shaped-nails-9.png", name: "Pearl glaze", note: "glazed donut finiš" },
  { src: "/fotky/3d-floral-nail-art-4.png", name: "Petite fleur", note: "drobné 3D kvítky" },
  { src: "/fotky/sage-green-nail-polish-4.png", name: "Eucalyptus", note: "matná šalvěj" },
] as const;

export const HAND_CUTOUT = "/fotky/manicured-hands-1.png";
