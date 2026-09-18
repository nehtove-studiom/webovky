// Ručně psaná zrcadla Pydantic modelů z backend/models/booking.py — nic
// nehodnotí přes HTTP hranici, synchronizace je ruční disciplína.

export interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  maps_query: string;
}

export interface WeekPlanItem {
  iso_week: string;
  monday: string;
  sunday: string;
  location_id: string | null;
  location_name: string | null;
  is_current: boolean;
}

export interface CurrentLocation {
  iso_week: string;
  monday: string;
  sunday: string;
  location: Location | null;
}

export interface Service {
  id: string;
  name: string;
  price: string;
  prices: Record<string, string>;
  duration_min: number;
  tag: string;
  description: string;
}

export interface Slot {
  time: string;
  available: boolean;
}

export interface Availability {
  date: string;
  closed: boolean;
  message: string | null;
  slots: Slot[];
  location_id: string | null;
  location_name: string | null;
}

export type BookingStatus = "nova" | "potvrzena" | "dokoncena" | "zrusena";
export type PipelineStatus = "none" | "prompt" | "image" | "calendar" | "done" | "failed";

export interface Booking {
  id: string;
  service_id: string;
  service_name: string;
  service_price: string;
  service_duration_min: number;
  location_id: string | null;
  location_name: string | null;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string | null;
  design_description: string | null;
  design_prompt: string | null;
  has_design_image: boolean;
  design_generation_count: number;
  status: BookingStatus;
  pipeline_status: PipelineStatus;
  pipeline_error: string | null;
  event_id: string | null;
  calendar_synced: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarStatus {
  configured: boolean;
  connected: boolean;
  email: string | null;
}

// ==== Chatovací asistentka (zrcadlí backend/models/chat.py) ====

export type ChatRole = "user" | "assistant";

export interface ChatTurn {
  role: ChatRole;
  content: string;
  created_at: string;
}

export interface ChatReply {
  session_id: string;
  reply: string;
  booking_id: string | null;
  source: "agent" | "claude";
  actions: string[];
  image_url: string | null;
}

export interface ChatHistory {
  session_id: string;
  turns: ChatTurn[];
}

export interface AgentStatus {
  external_agent: boolean;
  calendar_connected: boolean;
}

export const STATUS_LABELS: Record<BookingStatus, string> = {
  nova: "Nová",
  potvrzena: "Potvrzená",
  dokoncena: "Dokončená",
  zrusena: "Zrušená",
};

export const PIPELINE_LABELS: Record<PipelineStatus, string> = {
  none: "Čeká na popis designu",
  prompt: "Claude připravuje prompt",
  image: "Generuje se návrh",
  calendar: "Ukládá se do kalendáře",
  done: "Návrh hotový",
  failed: "Zpracování selhalo",
};

export const STATUS_ORDER: BookingStatus[] = ["nova", "potvrzena", "dokoncena", "zrusena"];

export function formatCzechDate(iso: string): string {
  // iso je YYYY-MM-DD; formátování jen pro zobrazení
  const [y, m, d] = iso.split("-").map(Number);
  return `${d}. ${m}. ${y}`;
}
