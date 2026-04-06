import { Anthropic } from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getServiceClient, unauthorizedResponse } from "@/lib/auth-server";

function getAnthropic() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

const CSI_DIVISIONS = [
  { code: "01", name: "General" },
  { code: "02", name: "Existing Conditions" },
  { code: "03", name: "Concrete" },
  { code: "04", name: "Masonry" },
  { code: "05", name: "Metals" },
  { code: "06", name: "Wood/Plastics" },
  { code: "07", name: "Thermal/Moisture" },
  { code: "08", name: "Openings" },
  { code: "09", name: "Finishes" },
  { code: "10", name: "Specialties" },
  { code: "11", name: "Equipment" },
  { code: "12", name: "Furnishings" },
  { code: "13", name: "Special Construction" },
  { code: "14", name: "Conveying" },
  { code: "21", name: "Fire Suppression" },
  { code: "22", name: "Plumbing" },
  { code: "23", name: "HVAC" },
  { code: "26", name: "Electrical" },
  { code: "31", name: "Earthwork" },
  { code: "32", name: "Exterior Improvements" },
];

interface EstimateRequest {
  projectId: string;
  buildingType: string;
  jurisdiction: string;
  squareFootage?: number;
  budget?: number;
  projectName?: string;
}

interface CSIDivision {
  division: string;
  code: string;
  description: string;
  amount: number;
  percentOfTotal: number;
}

interface EstimateResponse {
  estimate: {
    totalCost: number;
    costPerSqFt: number;
    contingencyPercent: number;
    csiDivisions: CSIDivision[];
    marketComparison: {
      low: number;
      median: number;
      high: number;
    };
    notes: string[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return unauthorizedResponse();

    const body: EstimateRequest = await request.json();
    const {
      projectId,
      buildingType,
      jurisdiction,
      squareFootage = 10000,
      budget,
      projectName = "Unnamed Project",
    } = body;

    if (!projectId || !buildingType || !jurisdiction) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, buildingType, jurisdiction" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a construction cost estimator with expertise in building costs across jurisdictions.
Generate a detailed cost estimate as valid JSON with the following structure:
{
  "totalCost": number (total project cost in USD),
  "costPerSqFt": number,
  "contingencyPercent": number (10-20),
  "csiDivisions": [
    {
      "division": "name",
      "code": "XX",
      "description": "brief description",
      "amount": number,
      "percentOfTotal": number
    }
  ],
  "marketComparison": {
    "low": number,
    "median": number,
    "high": number
  },
  "notes": ["note1", "note2"]
}

Consider the building type, jurisdiction, square footage, and any budget constraints. Be realistic about costs for the ${jurisdiction} jurisdiction.`;

    const userPrompt = `Generate a construction cost estimate for:
- Project: ${projectName}
- Building Type: ${buildingType}
- Jurisdiction: ${jurisdiction}
- Square Footage: ${squareFootage} sq ft
${budget ? `- Budget Target: $${budget}` : ""}

Return ONLY valid JSON. Include all CSI divisions relevant to this building type.`;

    const message = await getAnthropic().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    let estimateData: any;
    try {
      estimateData = JSON.parse(content.text);
    } catch {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from Claude response");
      }
      estimateData = JSON.parse(jsonMatch[0]);
    }

    // Save budget lines to Supabase (schema: csi_division, budgeted, committed, actual_spent)
    if (estimateData.csiDivisions && Array.isArray(estimateData.csiDivisions)) {
      const supabase = getServiceClient();
      // Clear old budget lines for this project
      await supabase.from("project_budget_lines").delete().eq("project_id", projectId);

      const budgetLines = estimateData.csiDivisions.map((division: CSIDivision) => ({
        project_id: projectId,
        csi_division: `${division.code} - ${division.division}`,
        description: division.description,
        budgeted: division.amount,
        committed: 0,
        actual_spent: 0,
      }));

      const { error: insertError } = await supabase
        .from("project_budget_lines")
        .insert(budgetLines);

      if (insertError) {
        console.error("Supabase insert error:", insertError);
      }
    }

    const response: EstimateResponse = {
      estimate: {
        totalCost: estimateData.totalCost || 0,
        costPerSqFt: estimateData.costPerSqFt || 0,
        contingencyPercent: estimateData.contingencyPercent || 15,
        csiDivisions: estimateData.csiDivisions || [],
        marketComparison: estimateData.marketComparison || {
          low: 0,
          median: 0,
          high: 0,
        },
        notes: estimateData.notes || [],
      },
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Estimate route error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate estimate",
      },
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
