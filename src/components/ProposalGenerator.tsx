'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface Project {
  id: string;
  name: string;
  building_type?: string;
  address?: string;
  sqft?: number;
  estimated_budget?: number;
  phase?: string;
}

interface ClientInfo {
  name: string;
  company: string;
  address: string;
  email: string;
}

interface ProposalSection {
  title: string;
  content: string;
  editable: boolean;
}

interface GeneratedProposal {
  id: string;
  project_id: string;
  sections: ProposalSection[];
  template_style: string;
  created_at: string;
  markup_pct: number;
}

const BRAND_COLORS = {
  green: '#1D9E75',
  gold: '#D85A30',
  red: '#E8443A',
  purple: '#7F77DD',
};

const TEMPLATE_STYLES = ['Professional', 'Casual', 'Government'] as const;
const PROPOSAL_SECTIONS = [
  'Scope of Work',
  'Timeline',
  'Budget',
  'Terms',
  'Insurance',
  'References',
];

const PROPOSAL_TEMPLATES = [
  {
    id: 'residential-reno',
    name: 'Residential Renovation',
    description: 'Kitchen, bath, and interior updates for existing homes',
    building_type: 'Residential',
    icon: '🏠',
  },
  {
    id: 'commercial-buildout',
    name: 'Commercial Build-Out',
    description: 'Tenant improvements and commercial space development',
    building_type: 'Commercial',
    icon: '🏢',
  },
  {
    id: 'new-construction',
    name: 'New Construction',
    description: 'Ground-up construction with full site development',
    building_type: 'New Construction',
    icon: '🏗️',
  },
];

export default function ProposalGenerator() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'generator' | 'preview'>('templates');

  // Project selection
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showNewProject, setShowNewProject] = useState(false);

  // Generator state
  const [templateStyle, setTemplateStyle] = useState<typeof TEMPLATE_STYLES[number]>('Professional');
  const [includedSections, setIncludedSections] = useState<Set<string>>(
    new Set(PROPOSAL_SECTIONS)
  );
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: '',
    company: '',
    address: '',
    email: '',
  });
  const [customNotes, setCustomNotes] = useState('');
  const [markupPct, setMarkupPct] = useState(15);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProposal, setGeneratedProposal] = useState<GeneratedProposal | null>(null);
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(null);
  const [editingSectionContent, setEditingSectionContent] = useState('');
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // Version history
  const [proposalVersions, setProposalVersions] = useState<GeneratedProposal[]>([]);

  useEffect(() => {
    setMounted(true);
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, building_type, address, sqft, estimated_budget, phase')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const handleToggleSection = (section: string) => {
    const newSet = new Set(includedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setIncludedSections(newSet);
  };

  const handleGenerateProposal = async () => {
    if (!selectedProject || !clientInfo.name || !clientInfo.company) {
      alert('Please select a project and fill in client information');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/v1/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject.id,
          template_style: templateStyle,
          included_sections: Array.from(includedSections),
          client_info: clientInfo,
          markup_pct: markupPct,
          custom_notes: customNotes,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';
      const sections: ProposalSection[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.section_title && data.section_content) {
                sections.push({
                  title: data.section_title,
                  content: data.section_content,
                  editable: true,
                });
                fullContent += `\n\n## ${data.section_title}\n${data.section_content}`;
              }
            } catch (e) {
              // Parse error, continue
            }
          }
        }
      }

      const newProposal: GeneratedProposal = {
        id: `proposal-${Date.now()}`,
        project_id: selectedProject.id,
        sections,
        template_style: templateStyle,
        created_at: new Date().toISOString(),
        markup_pct: markupPct,
      };

      setGeneratedProposal(newProposal);
      setProposalVersions([newProposal, ...proposalVersions]);
      setActiveTab('preview');
    } catch (error) {
      console.error('Error generating proposal:', error);
      alert('Failed to generate proposal');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditSection = (index: number) => {
    setEditingSectionIndex(index);
    setEditingSectionContent(generatedProposal?.sections[index].content || '');
  };

  const handleSaveSection = (index: number) => {
    if (!generatedProposal) return;

    const updatedSections = [...generatedProposal.sections];
    updatedSections[index].content = editingSectionContent;

    setGeneratedProposal({
      ...generatedProposal,
      sections: updatedSections,
    });
    setEditingSectionIndex(null);
  };

  const handleRegenerateSection = async (index: number) => {
    if (!selectedProject || !generatedProposal) return;

    setRegeneratingIndex(index);
    try {
      const response = await fetch('/api/v1/proposals/regenerate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject.id,
          section_title: generatedProposal.sections[index].title,
          template_style: templateStyle,
          client_info: clientInfo,
          markup_pct: markupPct,
        }),
      });

      if (!response.ok) throw new Error('Regeneration failed');

      const data = await response.json();
      const updatedSections = [...generatedProposal.sections];
      updatedSections[index].content = data.section_content;

      setGeneratedProposal({
        ...generatedProposal,
        sections: updatedSections,
      });
    } catch (error) {
      console.error('Error regenerating section:', error);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleExportPDF = async () => {
    if (!generatedProposal) return;

    try {
      const response = await fetch('/api/v1/proposals/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal: generatedProposal,
          client_info: clientInfo,
          project: selectedProject,
        }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposal-${selectedProject?.name}-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    }
  };

  const handleCopyToClipboard = () => {
    if (!generatedProposal) return;

    const fullText = generatedProposal.sections
      .map(s => `${s.title}\n\n${s.content}`)
      .join('\n\n---\n\n');

    navigator.clipboard.writeText(fullText);
    alert('Proposal copied to clipboard');
  };

  const handleEmailProposal = () => {
    if (!generatedProposal || !clientInfo.email) {
      alert('Please enter client email address');
      return;
    }

    const subject = `Construction Proposal - ${selectedProject?.name}`;
    const body = generatedProposal.sections
      .map(s => `${s.title}\n\n${s.content}`)
      .join('\n\n---\n\n');

    const mailtoLink = `mailto:${clientInfo.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  const handleUseTemplate = (templateId: string) => {
    const template = PROPOSAL_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setShowNewProject(true);
      setSelectedProject({
        id: `new-${Date.now()}`,
        name: `${template.name} Project`,
        building_type: template.building_type,
        address: '',
        sqft: undefined,
        estimated_budget: undefined,
      });
    }
  };

  if (!mounted) return null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAFA',
      color: '#111111',
      fontFamily: 'var(--font-archivo), sans-serif',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 32 }}>📋</span>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: 0 }}>Proposal Generator</h1>
        </div>
        <p style={{ fontSize: 14, color: '#666', margin: '8px 0 0', maxWidth: 600, lineHeight: 1.6 }}>
          Generate professional construction proposals powered by AI. Customize templates, sections, and terms in seconds.
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        gap: 12,
        marginBottom: 24,
        borderBottom: '1px solid #E5E5E5',
        paddingBottom: 12,
      }}>
        {(['templates', 'generator', 'preview'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              color: activeTab === tab ? BRAND_COLORS.green : '#999',
              borderBottom: activeTab === tab ? `2px solid ${BRAND_COLORS.green}` : 'none',
              transition: 'all 0.2s',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'templates' && '🎨 Templates'}
            {tab === 'generator' && '⚙️ Customize'}
            {tab === 'preview' && '👁️ Preview'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'templates' && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                {PROPOSAL_TEMPLATES.map(template => (
                  <div
                    key={template.id}
                    style={{
                      border: '1px solid #E5E5E5',
                      borderRadius: 12,
                      padding: 24,
                      background: '#FFFFFF',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ fontSize: 48, marginBottom: 12 }}>{template.icon}</div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>
                      {template.name}
                    </h3>
                    <p style={{ fontSize: 13, color: '#666', margin: '0 0 16px', lineHeight: 1.5 }}>
                      {template.description}
                    </p>
                    <button
                      onClick={() => handleUseTemplate(template.id)}
                      style={{
                        width: '100%',
                        padding: '10px 16px',
                        background: BRAND_COLORS.green,
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'generator' && (
            <motion.div
              key="generator"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}
            >
              {/* Left Panel: Settings */}
              <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 24, border: '1px solid #E5E5E5' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>Project & Client</h2>

                {/* Project Selector */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8 }}>
                    Select Project
                  </label>
                  <select
                    value={selectedProject?.id || ''}
                    onChange={(e) => {
                      const project = projects.find(p => p.id === e.target.value);
                      setSelectedProject(project || null);
                      setShowNewProject(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #DDD',
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: 'inherit',
                    }}
                  >
                    <option value="">Choose a project...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.sqft ? `(${p.sqft.toLocaleString()} sf)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedProject && (
                  <div style={{
                    background: `${BRAND_COLORS.green}11`,
                    border: `1px solid ${BRAND_COLORS.green}33`,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 20,
                    fontSize: 13,
                  }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{selectedProject.name}</p>
                    {selectedProject.building_type && (
                      <p style={{ margin: '0 0 2px', color: '#666' }}>Type: {selectedProject.building_type}</p>
                    )}
                    {selectedProject.sqft && (
                      <p style={{ margin: '0', color: '#666' }}>Size: {selectedProject.sqft.toLocaleString()} sf</p>
                    )}
                  </div>
                )}

                {/* Client Info */}
                <h3 style={{ fontSize: 13, fontWeight: 700, marginTop: 20, marginBottom: 12 }}>Client Information</h3>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>
                    Client Name *
                  </label>
                  <input
                    type="text"
                    value={clientInfo.name}
                    onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                    placeholder="John Smith"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #DDD',
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>
                    Company *
                  </label>
                  <input
                    type="text"
                    value={clientInfo.company}
                    onChange={(e) => setClientInfo({ ...clientInfo, company: e.target.value })}
                    placeholder="ABC Corporation"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #DDD',
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>
                    Address
                  </label>
                  <input
                    type="text"
                    value={clientInfo.address}
                    onChange={(e) => setClientInfo({ ...clientInfo, address: e.target.value })}
                    placeholder="123 Main St, City, State 12345"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #DDD',
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={clientInfo.email}
                    onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                    placeholder="client@example.com"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #DDD',
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Right Panel: Options */}
              <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 24, border: '1px solid #E5E5E5' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 16 }}>Proposal Options</h2>

                {/* Template Style */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8 }}>
                    Template Style
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {TEMPLATE_STYLES.map(style => (
                      <button
                        key={style}
                        onClick={() => setTemplateStyle(style)}
                        style={{
                          flex: 1,
                          padding: '10px 12px',
                          border: `2px solid ${templateStyle === style ? BRAND_COLORS.green : '#DDD'}`,
                          background: templateStyle === style ? `${BRAND_COLORS.green}11` : '#FFFFFF',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          color: templateStyle === style ? BRAND_COLORS.green : '#666',
                          transition: 'all 0.2s',
                        }}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Markup Percentage */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8 }}>
                    Markup: {markupPct}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={markupPct}
                    onChange={(e) => setMarkupPct(parseInt(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>

                {/* Sections */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8 }}>
                    Include Sections
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {PROPOSAL_SECTIONS.map(section => (
                      <label key={section} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={includedSections.has(section)}
                          onChange={() => handleToggleSection(section)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 13 }}>{section}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Custom Notes */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 4 }}>
                    Custom Terms & Notes
                  </label>
                  <textarea
                    value={customNotes}
                    onChange={(e) => setCustomNotes(e.target.value)}
                    placeholder="Add any special terms, conditions, or notes..."
                    style={{
                      width: '100%',
                      minHeight: 80,
                      padding: '10px 12px',
                      border: '1px solid #DDD',
                      borderRadius: 6,
                      fontSize: 13,
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      resize: 'vertical',
                    }}
                  />
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerateProposal}
                  disabled={isGenerating || !selectedProject}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: isGenerating ? '#CCC' : BRAND_COLORS.green,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                    opacity: isGenerating ? 0.7 : 1,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isGenerating) (e.currentTarget as HTMLElement).style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    if (!isGenerating) (e.currentTarget as HTMLElement).style.opacity = '1';
                  }}
                >
                  {isGenerating ? '⏳ Generating...' : '✨ Generate Proposal'}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'preview' && generatedProposal && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
                {/* Main Preview */}
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #E5E5E5',
                  padding: 40,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}>
                  {/* BKG Letterhead */}
                  <div style={{ marginBottom: 32, paddingBottom: 20, borderBottom: `2px solid ${BRAND_COLORS.green}` }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: BRAND_COLORS.green, marginBottom: 4 }}>
                      BUILDER'S KNOWLEDGE GARDEN
                    </div>
                    <p style={{ margin: '4px 0', fontSize: 11, color: '#999' }}>
                      Construction Proposal
                    </p>
                  </div>

                  {/* Client Info */}
                  <div style={{ marginBottom: 32, fontSize: 13 }}>
                    <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{clientInfo.name}</p>
                    <p style={{ margin: '0 0 4px' }}>{clientInfo.company}</p>
                    <p style={{ margin: '0 0 4px' }}>{clientInfo.address}</p>
                    <p style={{ margin: 0, color: '#666' }}>Date: {new Date().toLocaleDateString()}</p>
                  </div>

                  {/* Sections */}
                  {generatedProposal.sections.map((section, index) => (
                    <div key={index} style={{ marginBottom: 28 }}>
                      {editingSectionIndex === index ? (
                        <div>
                          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: BRAND_COLORS.green }}>
                            {section.title}
                          </h2>
                          <textarea
                            value={editingSectionContent}
                            onChange={(e) => setEditingSectionContent(e.target.value)}
                            style={{
                              width: '100%',
                              minHeight: 200,
                              padding: '12px',
                              border: `1px solid ${BRAND_COLORS.green}`,
                              borderRadius: 6,
                              fontSize: 13,
                              fontFamily: 'inherit',
                              boxSizing: 'border-box',
                              marginBottom: 8,
                            }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleSaveSection(index)}
                              style={{
                                padding: '8px 16px',
                                background: BRAND_COLORS.green,
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSectionIndex(null)}
                              style={{
                                padding: '8px 16px',
                                background: '#EEE',
                                color: '#666',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: BRAND_COLORS.green }}>
                            {section.title}
                          </h2>
                          <div style={{
                            fontSize: 13,
                            lineHeight: 1.7,
                            color: '#333',
                            marginBottom: 12,
                            whiteSpace: 'pre-wrap',
                          }}>
                            {section.content}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => handleEditSection(index)}
                              style={{
                                padding: '6px 12px',
                                background: '#F0F0F0',
                                color: '#666',
                                border: '1px solid #DDD',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleRegenerateSection(index)}
                              disabled={regeneratingIndex === index}
                              style={{
                                padding: '6px 12px',
                                background: '#F0F0F0',
                                color: '#666',
                                border: '1px solid #DDD',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: regeneratingIndex === index ? 'not-allowed' : 'pointer',
                                opacity: regeneratingIndex === index ? 0.6 : 1,
                              }}
                            >
                              {regeneratingIndex === index ? '⏳...' : '🔄 Regen'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Sidebar */}
                <div>
                  <div style={{
                    background: '#FFFFFF',
                    borderRadius: 12,
                    border: '1px solid #E5E5E5',
                    padding: 16,
                  }}>
                    <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#999', marginTop: 0, marginBottom: 12 }}>
                      Actions
                    </h3>

                    <button
                      onClick={handleExportPDF}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: BRAND_COLORS.gold,
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginBottom: 8,
                      }}
                    >
                      📥 Download PDF
                    </button>

                    <button
                      onClick={handleCopyToClipboard}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: '#EEE',
                        color: '#333',
                        border: '1px solid #DDD',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginBottom: 8,
                      }}
                    >
                      📋 Copy to Clipboard
                    </button>

                    <button
                      onClick={handleEmailProposal}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: '#EEE',
                        color: '#333',
                        border: '1px solid #DDD',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        marginBottom: 16,
                      }}
                    >
                      ✉️ Email to Client
                    </button>

                    {/* Version History */}
                    {proposalVersions.length > 1 && (
                      <div style={{ borderTop: '1px solid #E5E5E5', paddingTop: 12 }}>
                        <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#999', marginTop: 0, marginBottom: 8 }}>
                          History
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {proposalVersions.slice(0, 5).map((version, idx) => (
                            <button
                              key={version.id}
                              onClick={() => setGeneratedProposal(version)}
                              style={{
                                padding: '6px 8px',
                                background: generatedProposal.id === version.id ? BRAND_COLORS.green : '#F5F5F5',
                                color: generatedProposal.id === version.id ? '#FFFFFF' : '#666',
                                border: 'none',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s',
                              }}
                            >
                              v{proposalVersions.length - idx}
                              <br />
                              <span style={{ fontSize: 10, opacity: 0.7 }}>
                                {new Date(version.created_at).toLocaleDateString()}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'preview' && !generatedProposal && (
            <motion.div
              key="no-preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div style={{
                background: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #E5E5E5',
                padding: 60,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px' }}>No Proposal Generated Yet</p>
                <p style={{ fontSize: 13, color: '#666', margin: 0 }}>
                  Go to the Customize tab to generate your first proposal
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
