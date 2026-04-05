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

// Helper to determine appropriate schema.org type based on entity_type
function getSchemaType(entityType: string): string {
  switch (entityType) {
    case "building_code":
      return "Legislation";
    case "material":
      return "Product";
    case "safety_regulation":
      return "Legislation";
    case "method":
      return "HowTo";
    case "trade":
      return "Occupation";
    default:
      return "Article";
  }
}

// Helper to generate JSON-LD structured data
function generateJsonLd(
  entity: Record<string, unknown>,
  slug: string
): Record<string, unknown>[] {
  const title = jsonText(entity.title);
  const summary = jsonText(entity.summary);
  const entityType = entity.entity_type as string;
  const updatedAt = entity.updated_at as string | null;
  const tags = (entity.tags as string[]) || [];
  const schemaType = getSchemaType(entityType);
  const entityUrl = `https://builders.theknowledgegardens.com/knowledge/${slug}`;

  // Main entity schema
  const mainSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: title,
    description: summary,
    url: entityUrl,
    publisher: {
      "@type": "Organization",
      name: "Builder's Knowledge Garden",
    },
  };

  if (updatedAt) {
    mainSchema.dateModified = updatedAt;
  }

  if (tags.length > 0) {
    mainSchema.keywords = tags.join(", ");
  }

  // Breadcrumb schema
  const breadcrumbSchema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://builders.theknowledgegardens.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Knowledge",
        item: "https://builders.theknowledgegardens.com/knowledge",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: entityType.replace(/_/g, " "),
        item: `https://builders.theknowledgegardens.com/knowledge?type=${entityType}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: title,
        item: entityUrl,
      },
    ],
  };

  return [mainSchema, breadcrumbSchema];
}

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
  };
}

export default async function EntityPage({ params }: PageProps) {
  const { slug } = await params;
  const entity = await fetchEntity(slug);
  if (!entity) {
    return (
      <main style={{ padding: "2rem", textAlign: "center", minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>Entity Not Found</h1>
          <p>The knowledge entity &quot;{slug}&quot; could not be found.</p>
        </div>
      </main>
    );
  }
  const relatedEntities = await fetchRelated(entity);
  const jsonLdScripts = generateJsonLd(entity, slug);

  return (
    <>
      {jsonLdScripts.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <EntityDetailClient entity={entity} relatedEntities={relatedEntities} />
    </>
  );
}
