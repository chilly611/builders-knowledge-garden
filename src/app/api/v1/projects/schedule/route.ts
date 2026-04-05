import { Anthropic } from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

function getAnthropic() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

interface ScheduleRequest {
  projectId: string;
  buildingType: string;
  jurisdiction: string;
  squareFootage?: number;
  startDate?: string;
  budget?: number;
}

interface Task {
  name: string;
  startWeek: number;
  endWeek: number;
  dependencies?: string[];
}

interface Milestone {
  name: string;
  week: number;
  type: "permit" | "inspection" | "delivery" | "completion";
}

interface Phase {
  name: string;
  startWeek: number;
  endWeek: number;
  durationWeeks: number;
  tasks: Task[];
  milestones: Milestone[];
}

interface JurisdictionHoldPoint {
  name: string;
  week: number;
  description: string;
  durationDays: number;
}

interface ScheduleResponse {
  schedule: {
    totalDurationWeeks: number;
    phases: Phase[];
    criticalPath: string[];
    jurisdictionHoldPoints: JurisdictionHoldPoint[];
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ScheduleRequest = await request.json();
    const {
      projectId,
      buildingType,
      jurisdiction,
      squareFootage = 10000,
      startDate = new Date().toISOString().split("T")[0],
      budget,
    } = body;

    if (!projectId || !buildingType || !jurisdiction) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, buildingType, jurisdiction" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a construction project scheduler with expertise in building timelines and project dependencies.
Generate a detailed construction schedule as valid JSON with the following structure:
{
  "totalDurationWeeks": number,
  "phases": [
    {
      "name": "phase name",
      "startWeek": number,
      "endWeek": number,
      "durationWeeks": number,
      "tasks": [
        {
          "name": "task name",
          "startWeek": number,
          "endWeek": number,
          "dependencies": ["other task name"]
        }
      ],
      "milestones": [
        {
          "name": "milestone name",
          "week": number,
          "type": "permit|inspection|delivery|completion"
        }
      ]
    }
  ],
  "criticalPath": ["task1", "task2", ...],
  "jurisdictionHoldPoints": [
    {
      "name": "hold point name",
      "week": number,
      "description": "description",
      "durationDays": number
    }
  ]
}

Consider standard construction phases: Site Preparation, Permitting, Foundation, Structural, MEP, Interiors, Finishes, Testing & Commissioning, Closeout.
Include jurisdiction-specific inspection and approval hold points for ${jurisdiction}.
Be realistic about dependencies and critical path items.`;

    const userPrompt = `Generate a construction schedule for:
- Building Type: ${buildingType}
- Jurisdiction: ${jurisdiction}
- Square Footage: ${squareFootage} sq ft
- Start Date: ${startDate}
${budget ? `- Budget: $${budget}` : ""}

Return ONLY valid JSON. Include realistic phases with tasks, dependencies, milestones, and jurisdiction-specific hold points.
Calculate total duration based on building type and complexity. Include all critical path dependencies.`;

    const message = await getAnthropic().messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
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

    let scheduleData: any;
    try {
      scheduleData = JSON.parse(content.text);
    } catch {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from Claude response");
      }
      scheduleData = JSON.parse(jsonMatch[0]);
    }

    // Validate and normalize schedule data
    if (!scheduleData.totalDurationWeeks) {
      scheduleData.totalDurationWeeks = 52;
    }

    if (!Array.isArray(scheduleData.phases)) {
      scheduleData.phases = [];
    }

    if (!Array.isArray(scheduleData.criticalPath)) {
      scheduleData.criticalPath = [];
    }

    if (!Array.isArray(scheduleData.jurisdictionHoldPoints)) {
      scheduleData.jurisdictionHoldPoints = [];
    }

    // Ensure each phase has required fields
    scheduleData.phases = scheduleData.phases.map((phase: any) => ({
      name: phase.name || "Unnamed Phase",
      startWeek: phase.startWeek || 0,
      endWeek: phase.endWeek || 1,
      durationWeeks: phase.durationWeeks || (phase.endWeek - phase.startWeek) || 1,
      tasks: Array.isArray(phase.tasks) ? phase.tasks : [],
      milestones: Array.isArray(phase.milestones) ? phase.milestones : [],
    }));

    const response: ScheduleResponse = {
      schedule: {
        totalDurationWeeks: scheduleData.totalDurationWeeks,
        phases: scheduleData.phases,
        criticalPath: scheduleData.criticalPath,
        jurisdictionHoldPoints: scheduleData.jurisdictionHoldPoints,
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
    console.error("Schedule route error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate schedule",
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
