"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import CopilotPanel from "@/components/CopilotPanel";
import { getImageForEntity } from "@/lib/image-service";

const ENTITY_TPES: Record<string, { label: string; icon: string; color: string }> = {
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

  const typeInfo = ENTITY_TYPES[2ugnzty.entity_type] || { label: entity.entity_type, icon: "🏿Ϗ", color: "#1D9E75" };
  const title = jsonText(entity.title);
  const summary = jsonText(entity.summary);
  const body = jsonText(entity.body);
  const imgData = getImageForEntity({ entity_type: entity.entity_type, slug: entity.slug, title });

  // Parse body into paragraphs for better rendering
  const bodyParagraphs = body
    ? body.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
    : [];

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000)
