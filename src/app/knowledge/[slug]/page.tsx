import type { Metadata } from "next";
import EntityDetailClient from "./entity-detail-client";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function jsonText(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && val !== null && "en" in val)
    return String((val as Record<string, string>).en);
  return JSON.stringify(val);
}

async function fetchEntity(slug: string) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/knowledge_entities?slug=eq.${slug}&status=eq.published&limit=1`,
      {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        next: { revalidate: 300 },
      }
    );
    const data = await res.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

async function fetchRelated(entity: Record<string, unknown>) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !entity) return [];
  try {
    const entityType = entity.entity_type as string;
    const domain = entity.domain as string;
    const id = entity.id as string;
    // Fetch same-type or same-domain entities
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/knowledge_entities?select=id,slug,title,summary,entity_type,domain&status=eq.published&id=neq.${id}&or=(entity_type.eq.${entityType},domain.eq.${domain})&limit=6`,
      {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
        next: { revalidate: 300 },
      }
    );
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entity = await fetchEntity(slug);
  if (!entity) {
    return { title: "Entity Not Found | Builder's Knowledge Garden" };
  }
  const title = jsonText(entity.title);
  const summary = jsonText(entity.summary);
  const description = summary.length > 160 ? summary.substring(0, 157) + "..." : summary;

  return {
    title: `${title} | Builder's Knowledge Garden`,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Builder's Knowledge Garden",
      url: `https://builders.theknowledgegardens.com/knowledge/${slug}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    other: {
      "entity:type": entity.entity_type || "",
      "entity:domain": entity.domain || "",
    },
  };
}

export default async function EntityDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const entity = await fetchEntity(slug);

  if (!entity) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: 12,
      }}>
        <div style={{ fontSize: 48 }}>🌿</div>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Entity Not Found</h1>
        <p style={{ fontSize: 13, color: "#888" }}>
          The knowledge entity &ldquo;{slug}&rdquo; could not be found.
        </p>
        <a href="/knowledge" style={{ color: "#1D9E75", fontSize: 13 }}>
          ← Back to Knowledge Garden
        </a>
      </div>
    );
  }

  const relatedEntities = await fetchRelated(entity);

  return <EntityDetailClient entity={entity} relatedEntities={relatedEntities} />;
}
