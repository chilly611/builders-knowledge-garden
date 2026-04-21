export type ResourceKind = 'tool' | 'equipment' | 'supply' | 'subcontractor' | 'laborer' | 'service';

export interface ResourceQuery {
  query: string;
  kinds: ResourceKind[];
  where?: {
    lat?: number;
    lng?: number;
    address?: string;
    radiusMiles?: number;
  };
  context?: {
    workflowId?: string;
    stepId?: string;
    projectId?: string;
    budgetCeiling?: number;
    neededBy?: string;
  };
  limit?: number;
}

export interface ResourceResult {
  id: string;
  kind: ResourceKind;
  title: string;
  vendor?: string;
  source: 'home_depot' | 'lowes' | 'craigslist' | 'angi' | 'thumbtack' | 'yelp' | 'google_maps' | 'brave_search' | 'other';
  url: string;
  priceUsd?: number;
  priceDisplay?: string;
  distance?: { miles: number; text: string };
  availability?: string;
  rating?: { stars: number; count: number };
  imageUrl?: string;
  snippet?: string;
  tags?: string[];
  _raw?: unknown;
}

export interface ResourceResponse {
  query: ResourceQuery;
  results: ResourceResult[];
  totalFound: number;
  latencyMs: number;
  sources: string[];
  warnings: string[];
  runId: string;
}
