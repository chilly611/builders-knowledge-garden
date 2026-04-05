import { MetadataRoute } from 'next';

const DOMAIN = 'https://builders.theknowledgegardens.com';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface KnowledgeEntity {
  slug: string;
  updated_at: string;
}

async function fetchKnowledgeEntities(): Promise<KnowledgeEntity[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn('Supabase credentials not configured, skipping knowledge entities');
    return [];
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/knowledge_entities?select=slug,updated_at&status=eq.published&limit=5000`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      }
    );

    if (!response.ok) {
      console.error(
        `Failed to fetch knowledge entities: ${response.status} ${response.statusText}`
      );
      return [];
    }

    const entities: KnowledgeEntity[] = await response.json();
    return entities;
  } catch (error) {
    console.error('Error fetching knowledge entities for sitemap:', error);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages with their priorities and change frequencies
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: DOMAIN,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${DOMAIN}/dream`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${DOMAIN}/knowledge`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${DOMAIN}/killerapp`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${DOMAIN}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${DOMAIN}/projects/new`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Dream interface pages
  const dreamPages: MetadataRoute.Sitemap = [
    {
      url: `${DOMAIN}/dream/oracle`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${DOMAIN}/dream/alchemist`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${DOMAIN}/dream/cosmos`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${DOMAIN}/dream/worldwalker`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // API documentation pages
  const apiPages: MetadataRoute.Sitemap = [
    {
      url: `${DOMAIN}/api/v1/mcp`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${DOMAIN}/api/v1/openapi`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  // Fetch knowledge entities
  const entities = await fetchKnowledgeEntities();

  // Generate sitemap entries for each knowledge entity
  const knowledgePages: MetadataRoute.Sitemap = entities.map((entity) => ({
    url: `${DOMAIN}/knowledge/${entity.slug}`,
    lastModified: entity.updated_at ? new Date(entity.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Combine all sitemap entries
  return [...staticPages, ...dreamPages, ...apiPages, ...knowledgePages];
}
