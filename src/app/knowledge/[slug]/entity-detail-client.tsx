"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import CopilotPanel from "@/components/CopilotPanel";
import { getImageForEntity } from "@/lib/image-service";

const ENTITY_TYPES: Record<string, { label: string; icon: string; color: string }> = {
  building_code: { label: "Code", icon: "📋", color: "#D85A30" },
  material: { label: "Material", icon: "🧱", color: "#378ADD" },
  architectural_style: { label: "Style", icon: "🏛️", color: "#7F77DD" },
  safety_regulation: { label: "Safety", icon: "⛑️", color: "#EF4444" },
  trade: { label: "Trade", icon: "👷", color: "#BA7517" },
  method: { label: "Method", icon: "🔧", color: "#639922" },
  standard: { label: "Standard", icon: "📐", color: "#EC4899" },
  sequence_rule: { label: "Sequence", icon: "🔗", color: "#8B5CF6" },
  permit_requirement: { label: "Permit", icon: "📄", color: "#06B6D4" },
  building_type: { label: "Building Type", icon: "🏗️", color: "#F59E0B" },
  inspection_protocol: { label: "Inspection", icon: "🔍", color: "#10B981" },
  climate_zone: { label: "Climate Zone", icon: "🌡️", color: "#0EA5E9" },
};

function jsonText(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object" && "en" in (val as Record<string, unknown>))
    return String((val as Record<string, string>).en);
  return JSON.stringify(val);
}

interface Entity {
  id: string;
  slug: string;
  title: unknown;
  summary: unknown;
  body: unknown;
  entity_type: string;
  domain: string;
  tags: string[];
  category?: string;
  metadata?: Record<string, unknown>;
  source_urls?: string[];
  updated_at?: string;
}

interface RelatedEntity {
  id: string;
  slug: string;
  title: unknown;
  summary: unknown;
  entity_type: string;
  domain: string;
}

interface Props {
  entity: Entity;
  relatedEntities: RelatedEntity[];
}

export default function EntityDetailClient({ entity, relatedEntities }: Props) {
  const [copied, setCopied] = useState(false);
  const [showAllMeta, setShowAllMeta] = useState(false);

  const typeInfo = ENTITY_TYPES[entity.entity_type] || { label: entity.entity_type, icon: "🌿", color: "#1D9E75" };
  const title = jsonText(entity.title);
  const summary = jsonText(entity.summary);
  const body = jsonText(entity.body);
  const imgData = getImageForEntity({ entity_type: entity.entity_type, slug: entity.slug, title: jsonText(entity.title) });

  // Parse body into paragraphs for better rendering
  const bodyParagraphs = body
    ? body.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
    : [];

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filter metadata keys for display
  const metaEntries = entity.metadata
    ? Object.entries(entity.metadata).filter(([k]) =>
        !["id", "slug", "created_at", "updated_at", "status"].includes(k)
      )
    : [];
  const visibleMeta = showAllMeta ? metaEntries : metaEntries.slice(0, 6);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* Hero Banner */}
      <div style={{
        height: 200, position: "relative", overflow: "hidden",
        backgroundImage: `url(${imgData.url})`,
        backgroundSize: "cover", backgroundPosition: "center",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(180deg, transparent 10%, ${typeInfo.color}cc 100%)`,
        }} />
        {/* Breadcrumbs */}
        <div style={{
          position: "absolute", top: 16, left: 24, zIndex: 2,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <Link href="/" style={{
            fontSize: 11, color: "rgba(255,255,255,0.8)", textDecoration: "none",
          }}>Home</Link>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>›</span>
          <Link href="/knowledge" style={{
            fontSize: 11, color: "rgba(255,255,255,0.8)", textDecoration: "none",
          }}>Knowledge</Link>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>›</span>
          <span style={{ fontSize: 11, color: "#fff", fontWeight: 500 }}>{title}</span>
        </div>
        {/* Title overlay */}
        <div style={{
          position: "absolute", bottom: 20, left: 24, right: 24, zIndex: 2,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{
              fontSize: 10, padding: "3px 10px", borderRadius: 10,
              background: "rgba(255,255,255,0.9)", color: typeInfo.color, fontWeight: 700,
            }}>{typeInfo.icon} {typeInfo.label}</span>
            {entity.domain && (
              <span style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 8,
                background: "rgba(255,255,255,0.7)", color: "#444", fontWeight: 500,
              }}>{entity.domain}</span>
            )}
            {entity.category && (
              <span style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 8,
                background: "rgba(255,255,255,0.5)", color: "#555",
              }}>{jsonText(entity.category)}</span>
            )}
          </div>
          <h1 style={{
            fontSize: 24, fontWeight: 700, color: "#fff", margin: 0,
            textShadow: "0 2px 8px rgba(0,0,0,0.3)",
            lineHeight: 1.2,
          }}>{title}</h1>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 20px" }}>
        {/* Action bar */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 20, paddingBottom: 12,
          borderBottom: "1px solid var(--border, #e5e5e5)",
        }}>
          <div style={{ fontSize: 11, color: "var(--fg-tertiary)" }}>
            {entity.updated_at && `Updated ${new Date(entity.updated_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`}
          </div>
          <button onClick={handleShare} style={{
            padding: "6px 14px", borderRadius: 8, border: "1px solid var(--border, #ddd)",
            background: copied ? "#1D9E75" : "var(--bg, #fff)",
            color: copied ? "#fff" : "var(--fg-secondary)",
            fontSize: 11, fontWeight: 500, cursor: "pointer",
            transition: "all 0.2s",
          }}>
            {copied ? "✓ Copied!" : "📋 Share Link"}
          </button>
        </div>

        {/* Summary */}
        {summary && (
          <div style={{
            fontSize: 15, lineHeight: 1.7, color: "var(--fg)",
            marginBottom: 24, fontStyle: "italic",
            padding: "16px 20px", borderRadius: 12,
            background: `${typeInfo.color}08`,
            borderLeft: `3px solid ${typeInfo.color}`,
          }}>
            {summary}
          </div>
        )}

        {/* Body - rendered as paragraphs */}
        {bodyParagraphs.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            {bodyParagraphs.map((para, i) => (
              <p key={i} style={{
                fontSize: 14, lineHeight: 1.8, color: "var(--fg)",
                marginBottom: 16, margin: "0 0 16px 0",
              }}>
                {para}
              </p>
            ))}
          </div>
        )}

        {/* Tags */}
        {entity.tags && entity.tags.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "var(--fg-tertiary)",
              letterSpacing: 0.8, marginBottom: 8,
            }}>TAGS</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {entity.tags.map(tag => (
                <Link key={tag} href={`/knowledge?q=${encodeURIComponent(tag)}`}
                  style={{
                    fontSize: 11, padding: "4px 10px", borderRadius: 8,
                    background: "var(--bg-hover, #f0f0f0)", color: typeInfo.color,
                    textDecoration: "none", fontWeight: 500,
                    transition: "all 0.15s",
                  }}>
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Metadata Grid */}
        {metaEntries.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "var(--fg-tertiary)",
              letterSpacing: 0.8, marginBottom: 8,
            }}>DETAILS</div>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 8,
            }}>
              {visibleMeta.map(([key, val]) => (
                <div key={key} style={{
                  padding: "10px 14px", borderRadius: 10,
                  background: "var(--bg-hover, #f7f7f7)",
                  border: "1px solid var(--border, #eee)",
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 600, color: "var(--fg-tertiary)",
                    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
                  }}>
                    {key.replace(/_/g, " ")}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--fg)", lineHeight: 1.4 }}>
                    {jsonText(val)}
                  </div>
                </div>
              ))}
            </div>
            {metaEntries.length > 6 && (
              <button onClick={() => setShowAllMeta(!showAllMeta)} style={{
                marginTop: 8, fontSize: 11, color: typeInfo.color,
                background: "none", border: "none", cursor: "pointer", fontWeight: 500,
              }}>
                {showAllMeta ? "Show less ↑" : `Show all ${metaEntries.length} details ↓`}
              </button>
            )}
          </div>
        )}

        {/* Source URLs */}
        {entity.source_urls && entity.source_urls.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "var(--fg-tertiary)",
              letterSpacing: 0.8, marginBottom: 8,
            }}>SOURCES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {entity.source_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                  style={{
                    fontSize: 12, color: typeInfo.color, textDecoration: "none",
                    display: "flex", alignItems: "center", gap: 6,
                  }}>
                  <span style={{ fontSize: 10 }}>🔗</span>
                  {url.length > 60 ? url.substring(0, 60) + "..." : url}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Related Entities */}
        {relatedEntities.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: "var(--fg-tertiary)",
              letterSpacing: 0.8, marginBottom: 10,
            }}>RELATED KNOWLEDGE</div>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: 8,
            }}>
              {relatedEntities.slice(0, 6).map(rel => {
                const relType = ENTITY_TYPES[rel.entity_type] || { label: rel.entity_type, icon: "🌿", color: "#1D9E75" };
                return (
                  <Link key={rel.id} href={`/knowledge/${rel.slug}`}
                    style={{
                      padding: "12px 14px", borderRadius: 12, textDecoration: "none",
                      color: "inherit", border: "1px solid var(--border, #e5e5e5)",
                      background: "var(--bg, #fff)",
                      transition: "all 0.15s",
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <span style={{
                        fontSize: 8, padding: "2px 6px", borderRadius: 6,
                        background: `${relType.color}15`, color: relType.color, fontWeight: 600,
                      }}>{relType.icon} {relType.label}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>
                      {jsonText(rel.title)}
                    </div>
                    <div style={{
                      fontSize: 10, color: "var(--fg-tertiary)", lineHeight: 1.4,
                      display: "-webkit-box", WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {jsonText(rel.summary)}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Back link */}
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <Link href="/knowledge" style={{
            fontSize: 12, color: typeInfo.color, textDecoration: "none", fontWeight: 500,
          }}>
            ← Back to Knowledge Garden
          </Link>
        </div>
      </div>

      <CopilotPanel />
    </div>
  );
}

