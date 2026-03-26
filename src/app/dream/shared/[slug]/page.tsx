import { Metadata } from "next";
import SharedDreamClient from "./client";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface Props { params: Promise<{ slug: string }> }

async function getDream(slug: string) {
  if (!isSupabaseConfigured()) return null;
  const { data } = await supabase.from("dreams")
    .select("*").eq("share_slug", slug).eq("shared", true).single();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const dream = await getDream(slug);
  const title = dream ? `Dream: ${dream.prompt?.slice(0, 60) || "A Building Dream"}` : "Shared Dream";
  const desc = dream
    ? `${dream.input_mode} dream — ${dream.building_type || "building"} in ${dream.jurisdiction || "any location"}. Est. $${dream.estimate_low?.toLocaleString() || "?"} – $${dream.estimate_high?.toLocaleString() || "?"}. Powered by Builder's Knowledge Garden.`
    : "Explore this building dream on Builder's Knowledge Garden — the operating system for the global construction economy.";
  return {
    title, description: desc,
    openGraph: { title, description: desc, type: "article", siteName: "Builder's Knowledge Garden" },
    twitter: { card: "summary_large_image", title, description: desc },
  };
}

export default async function SharedDreamPage({ params }: Props) {
  const { slug } = await params;
  const dream = await getDream(slug);
  return <SharedDreamClient dream={dream} slug={slug} />;
}
