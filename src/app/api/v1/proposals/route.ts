// Builder's Knowledge Garden — AI Proposal Generator API
// POST /api/v1/proposals/generate - Generate proposal via Claude
// GET /api/v1/proposals - List user's proposals
// GET /api/v1/proposals?id=xxx - Get specific proposal
// PATCH /api/v1/proposals?id=xxx - Update proposal section

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getServiceClient } from '@/lib/supabase';

const MODEL = 'claude-sonnet-4-20250514';

interface ProposalSection {
  title: string;
  content: string;
  editable: boolean;
}

interface GenerateProposalRequest {
  project_id: string;
  template_style: 'Professional' | 'Casual' | 'Government';
  included_sections: string[];
  client_info: {
    name: string;
    company: string;
    address: string;
    email?: string;
  };
  markup_pct: number;
  custom_notes?: string;
}

interface RegenerateSectionRequest {
  project_id: string;
  section_title: string;
  template_style: 'Professional' | 'Casual' | 'Government';
  client_info: {
    name: string;
    company: string;
    address: string;
    email?: string;
  };
  markup_pct: number;
}

interface ExportPDFRequest {
  proposal: {
    sections: ProposalSection[];
    template_style: string;
    markup_pct: number;
  };
  client_info: {
    name: string;
    company: string;
    address: string;
    email?: string;
  };
  project: {
    name: string;
    building_type?: string;
    sqft?: number;
    address?: string;
  };
}

// Build system prompt for proposal generation
function buildProposalSystemPrompt(
  templateStyle: string,
  clientInfo: { name: string; company: string; address: string },
  markupPct: number,
  customNotes?: string
): string {
  const styleGuide = {
    Professional: `Use formal, polished language with industry-standard terms and professional structure.
      Include technical accuracy and comprehensive scope definitions.
      Format as a formal business document with clear hierarchies.`,
    Casual: `Use conversational, approachable language while remaining professional.
      Include friendly but authoritative explanations.
      Make the proposal feel personal and trustworthy.`,
    Government: `Use formal, compliance-focused language with regulatory references.
      Include references to codes, standards, and legal requirements.
      Structure sections clearly with all required certifications and licenses.`,
  };

  return `You are an expert construction proposal writer for Builder's Knowledge Garden.
Your role is to generate professional construction proposals that are accurate, detailed, and compelling.

PROPOSAL CONTEXT:
- Client: ${clientInfo.name} (${clientInfo.company})
- Address: ${clientInfo.address}
- Markup Percentage: ${markupPct}%
${customNotes ? `- Special Terms/Notes: ${customNotes}` : ''}

TEMPLATE STYLE: ${templateStyle}
${styleGuide[templateStyle as keyof typeof styleGuide] || styleGuide.Professional}

CONSTRUCTION INDUSTRY EXPERTISE:
You understand construction practices, timelines, budgets, insurance requirements, and industry standards.
Include realistic costs, schedules, and standard construction terms.
Reference relevant building codes and best practices.
Include specific line items in budgets rather than generic categories.
Provide realistic timelines with sequential phases.

PROPOSAL STRUCTURE:
- Each section should be substantive and detailed
- Use clear headings and logical flow
- Include specific metrics, timelines, and costs where relevant
- Ensure consistency across sections
- Format for maximum professionalism and readability

When generating sections, structure your response with clear section titles and detailed content.
Be thorough but concise — these are working documents, not marketing materials.`;
}

// Build user message for proposal generation
function buildProposalUserMessage(
  projectData: any,
  includedSections: string[],
  customNotes?: string
): string {
  const sections = includedSections.join(', ');
  const projectInfo = [
    `Building Type: ${projectData.building_type || 'Not specified'}`,
    projectData.sqft ? `Square Footage: ${projectData.sqft.toLocaleString()} sf` : null,
    projectData.estimated_budget ? `Estimated Budget: $${projectData.estimated_budget.toLocaleString()}` : null,
    projectData.address ? `Location: ${projectData.address}` : null,
    projectData.phase ? `Phase: ${projectData.phase}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  return `Generate a construction proposal for the following project:

${projectInfo}

Include the following sections (in this order):
${includedSections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${customNotes ? `\nAdditional Instructions: ${customNotes}` : ''}

For each section, provide:
- Clear, professional content appropriate for the chosen template style
- Specific details and metrics where applicable
- Realistic timelines and costs
- Industry-standard language and practices

Format each section clearly with its title followed by the detailed content.`;
}

// Handle GET requests
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const proposalId = searchParams.get('id');

  if (proposalId) {
    // Get specific proposal
    try {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();

      if (error) throw error;

      return NextResponse.json(data);
    } catch (error) {
      console.error('Error fetching proposal:', error);
      return NextResponse.json(
        { error: 'Failed to fetch proposal' },
        { status: 500 }
      );
    }
  }

  // List user's proposals
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ proposals: data });
  } catch (error) {
    console.error('Error listing proposals:', error);
    return NextResponse.json(
      { error: 'Failed to list proposals' },
      { status: 500 }
    );
  }
}

// Handle POST requests (generate proposal)
export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.includes('/regenerate-section')) {
    return handleRegenerateSection(request);
  }

  if (pathname.includes('/export-pdf')) {
    return handleExportPDF(request);
  }

  if (pathname.includes('/generate')) {
    return handleGenerateProposal(request);
  }

  return NextResponse.json(
    { error: 'Unknown endpoint' },
    { status: 400 }
  );
}

// Handle PATCH requests (update section)
export async function PATCH(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const proposalId = searchParams.get('id');

  if (!proposalId) {
    return NextResponse.json(
      { error: 'Proposal ID required' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { section_index, section_content } = body;

    if (typeof section_index !== 'number' || !section_content) {
      return NextResponse.json(
        { error: 'section_index and section_content required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Fetch current proposal
    const { data: proposal, error: fetchError } = await supabase
      .from('proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (fetchError) throw fetchError;

    // Update section
    const updatedSections = proposal.sections || [];
    if (section_index >= 0 && section_index < updatedSections.length) {
      updatedSections[section_index].content = section_content;
    }

    const { error: updateError } = await supabase
      .from('proposals')
      .update({ sections: updatedSections, updated_at: new Date().toISOString() })
      .eq('id', proposalId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, sections: updatedSections });
  } catch (error) {
    console.error('Error updating proposal:', error);
    return NextResponse.json(
      { error: 'Failed to update proposal' },
      { status: 500 }
    );
  }
}

// Generate proposal via Claude streaming
async function handleGenerateProposal(request: NextRequest) {
  try {
    const body: GenerateProposalRequest = await request.json();

    const {
      project_id,
      template_style,
      included_sections,
      client_info,
      markup_pct,
      custom_notes,
    } = body;

    // Validate required fields
    if (!project_id || !client_info?.name || !client_info?.company) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch project data
    const supabase = getServiceClient();
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single();

    if (projectError) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return generateMockProposal(included_sections, template_style);
    }

    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = buildProposalSystemPrompt(
      template_style,
      client_info,
      markup_pct,
      custom_notes
    );

    const userMessage = buildProposalUserMessage(projectData, included_sections, custom_notes);

    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    // Create a custom response with streaming
    const encoder = new TextEncoder();
    const customStream = new ReadableStream({
      async start(controller) {
        try {
          let fullResponse = '';

          stream.on('text', (text) => {
            fullResponse += text;

            // Try to parse sections from the response
            const sectionRegex = /^#{1,2}\s+([^\n]+)\n([\s\S]*?)(?=^#{1,2}\s+|\Z)/gm;
            let match;

            while ((match = sectionRegex.exec(fullResponse)) !== null) {
              const sectionTitle = match[1].trim();
              const sectionContent = match[2].trim();

              if (sectionTitle && sectionContent) {
                const data = JSON.stringify({
                  section_title: sectionTitle,
                  section_content: sectionContent,
                });

                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }
          });

          await stream.finalMessage();
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(customStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error generating proposal:', error);
    return NextResponse.json(
      { error: 'Failed to generate proposal' },
      { status: 500 }
    );
  }
}

// Regenerate single section
async function handleRegenerateSection(request: NextRequest) {
  try {
    const body: RegenerateSectionRequest = await request.json();

    const {
      project_id,
      section_title,
      template_style,
      client_info,
      markup_pct,
    } = body;

    // Fetch project data
    const supabase = getServiceClient();
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single();

    if (projectError) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        section_content: `Generated content for ${section_title} (mock)`,
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const systemPrompt = buildProposalSystemPrompt(
      template_style,
      client_info,
      markup_pct
    );

    const userMessage = `Generate just the "${section_title}" section for this construction proposal.
Project: ${projectData.name}
Type: ${projectData.building_type}
${projectData.sqft ? `Size: ${projectData.sqft.toLocaleString()} sf` : ''}

Provide only the content for this section, formatted clearly and comprehensively.`;

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    return NextResponse.json({
      section_content: content.text,
    });
  } catch (error) {
    console.error('Error regenerating section:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate section' },
      { status: 500 }
    );
  }
}

// Export proposal to PDF (mock implementation)
async function handleExportPDF(request: NextRequest) {
  try {
    const body: ExportPDFRequest = await request.json();

    const { proposal, client_info, project } = body;

    // Build PDF content as text (in production, use a PDF library)
    let pdfContent = 'BUILDER\'S KNOWLEDGE GARDEN\n';
    pdfContent += 'Construction Proposal\n\n';
    pdfContent += `Date: ${new Date().toLocaleDateString()}\n\n`;
    pdfContent += 'TO:\n';
    pdfContent += `${client_info.name}\n`;
    pdfContent += `${client_info.company}\n`;
    pdfContent += `${client_info.address}\n\n`;
    pdfContent += `PROJECT: ${project.name}\n`;
    if (project.building_type) {
      pdfContent += `TYPE: ${project.building_type}\n`;
    }
    if (project.sqft) {
      pdfContent += `SIZE: ${project.sqft.toLocaleString()} sf\n`;
    }
    pdfContent += '\n---\n\n';

    // Add sections
    proposal.sections.forEach((section) => {
      pdfContent += `${section.title}\n\n`;
      pdfContent += `${section.content}\n\n`;
      pdfContent += '---\n\n';
    });

    pdfContent += `Markup: ${proposal.markup_pct}%\n`;
    pdfContent += `Template: ${proposal.template_style}\n`;
    pdfContent += `Generated: ${new Date().toISOString()}\n`;

    // Return as text file for now (in production, generate actual PDF)
    return new NextResponse(pdfContent, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename="proposal.txt"',
      },
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return NextResponse.json(
      { error: 'Failed to export PDF' },
      { status: 500 }
    );
  }
}

// Mock proposal generation for development
function generateMockProposal(includedSections: string[], templateStyle: string) {
  const encoder = new TextEncoder();
  const mockSections: Record<string, string> = {
    'Scope of Work': 'The project scope includes all work necessary to complete the construction project as outlined. This includes materials, labor, permits, and site management. All work will be performed in accordance with applicable building codes and industry standards.',
    'Timeline': 'Project Timeline:\n- Pre-construction & Permitting: 2-3 weeks\n- Mobilization & Site Prep: 1 week\n- Construction Phase: 8-12 weeks\n- Final Inspections & Closeout: 1 week\nTotal estimated duration: 12-17 weeks',
    'Budget': 'Budget Breakdown:\n- Labor: 40%\n- Materials: 45%\n- Equipment & Overhead: 15%\n\nPayment Schedule:\n- 25% upon contract execution\n- 50% upon substantial completion\n- 25% upon final completion',
    'Terms': 'Standard construction terms and conditions apply. Contract governed by state law. Changes to scope require written change order approval.',
    'Insurance': 'Builder shall maintain comprehensive general liability insurance of $2,000,000 aggregate throughout the project. All subcontractors required to carry appropriate coverage.',
    'References': 'References available upon request from completed projects in the past 3 years.',
  };

  const customStream = new ReadableStream({
    start(controller) {
      includedSections.forEach((section) => {
        const content = mockSections[section] || `Content for ${section}`;
        const data = JSON.stringify({
          section_title: section,
          section_content: content,
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      });
      controller.close();
    },
  });

  return new NextResponse(customStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
