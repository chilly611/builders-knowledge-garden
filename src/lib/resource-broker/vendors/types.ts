export type VendorName = "home-depot-pro" | "84-lumber" | "white-cap";

export interface VendorQuery {
  sku?: string;              // vendor-agnostic where possible
  description: string;       // "2x4x8 SPF #2", "3/4" plywood CDX"
  quantity: number;
  unit: "ea" | "lf" | "sf" | "cy" | "ton" | "bundle";
  zip?: string;              // delivery zip
  deliveryDateNeeded?: string; // ISO
  qualityTier?: "premium" | "standard" | "builder-grade";
}

export interface VendorQuote {
  vendor: VendorName;
  sku: string;
  description: string;
  unitPrice: number;         // USD
  extendedPrice: number;     // unitPrice * quantity
  quantity: number;
  unit: string;
  availability: "in-stock" | "ships-in" | "backordered" | "unknown";
  leadTimeDays?: number;
  deliveryFee?: number;      // USD; null/undefined if pickup-only
  pickupLocations?: { name: string; address: string; distanceMiles?: number }[];
  qualityNotes?: string;     // "premium grade", "builder-grade", etc.
  url?: string;
  retrievedAt: string;       // ISO
  confidence: "observed" | "estimated" | "web-search";  // observed = real API hit; estimated = modeled; web-search = scraped via broker
  warnings?: string[];
}
