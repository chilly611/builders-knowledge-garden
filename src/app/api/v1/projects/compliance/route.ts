import { Anthropic } from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getAnthropic() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface ComplianceRequest {
  projectId?: string;
  buildingType: string;
  jurisdiction: string;
  squareFootage?: number;
  budget?: number;
}

interface ComplianceFlag {
  code: string;
  title: string;
  severity: "critical" | "warning" | "info";
  description: string;
  actionRequired: string;
}

interface ComplianceResponse {
  compliance: {
    flags: ComplianceFlag[];
    applicableCodes: string[];
    inspectionRequirements: string[];
    estimatedPermitTimeline: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ComplianceRequest = await request.json();
    const { projectId, buildingType, jurisdiction, squareFootage = 10000, budget } = body;

    if (!buildingType || !jurisdiction) {
      return NextResponse.json(
        { error: "Missing required fields: buildingType, jurisdiction" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a construction compliance expert with deep knowledge of building codes across jurisdictions.
Generate a compliance analysis as valid JSON with the following structure:
{
  "flags": [
    {
      "code": "code reference (e.g. IBC 903.2)",
      "title": "short title",
      "severity": "critical|warning|info",
      "description": "what the code requires",
      "actionRequired": "what the builder must do"
    }
  ],
  "applicableCodes": ["code name 1", "code name 2"],
  "inspectionRequirements": ["inspection 1", "inspection 2"],
  "estimatedPermitTimeline": "X-Y weeks"
}

Always return at least 3-5 flags. Include critical items first. Be specific to the jurisdiction.`;

    const userPrompt = `Analyze compliance requirements for:
- Building Type: ${buildingType}
- Jurisdiction: ${jurisdiction}
- Square Footage: ${squareFootage} sq ft
${budget ? `- Budget: $${budget}` : ""}

Return ONLY valid JSON. Include jurisdiction-specific code requirements, fire safety, accessibility, energy codes, and structural requirements.`;

    const message = await getAnthropic().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    let complianceData: any;
    try {
      complianceData = JSON.parse(content.text);
    } catch {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from Claude response");
      }
      complianceData = JSON.parse(jsonMatch[0]);
    }

    const response: ComplianceResponse = {
      compliance: {
        flags: Array.isArray(complianceData.flags) ? complianceData.flags : [],
        applicableCodes: Array.isArray(complianceData.applicableCodes) ? complianceData.applicableCodes : [],
        inspectionRequirements: Array.isArray(complianceData.inspectionRequirements) ? complianceData.inspectionRequirements : [],
        estimatedPermitTimeline: complianceData.estimatedPermitTimeline || "4-8 weeks",
      },
    };

    // Persist to Supabase if projectId provided
    if (projectId) {
      try {
        const supabase = getSupabase();
        await supabase.from("project_compliance").delete().eq("project_id", projectId);
        await supabase.from("project_compliance").insert({
          project_id: projectId,
          flags: response.compliance.flags,
          applicable_codes: response.compliance.applicableCodes,
          inspection_requirements: response.compliance.inspectionRequirements,
          estimated_permit_timeline: response.compliance.estimatedPermitTimeline,
        });
      } catch (dbError) {
        console.error("Compliance DB persist error (non-fatal):", dbError);
      }
    }

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Compliance route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze compliance" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
