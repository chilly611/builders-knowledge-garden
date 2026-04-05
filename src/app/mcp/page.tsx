import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MCP Server Documentation | Builder\'s Knowledge Garden',
  description: 'AI-powered integration for building knowledge. Connect your Claude Desktop or API client to the Builder\'s Knowledge Garden MCP server.',
  keywords: ['MCP', 'Claude Desktop', 'API', 'builders', 'knowledge garden'],
};

const tools = [
  {
    name: 'lookup_code',
    description: 'Search and retrieve building code references, standards, and compliance documentation',
    params: [
      { name: 'query', type: 'string', required: true, description: 'Code search query or section number' },
      { name: 'jurisdiction', type: 'string', required: false, description: 'Filter by jurisdiction (e.g., California, NYC)' },
    ],
  },
  {
    name: 'search_knowledge',
    description: 'Query the knowledge base for best practices, case studies, and technical guidance',
    params: [
      { name: 'query', type: 'string', required: true, description: 'Search query' },
      { name: 'category', type: 'string', required: false, description: 'Filter by category (e.g., materials, safety, design)' },
      { name: 'limit', type: 'number', required: false, description: 'Max results (default: 10)' },
    ],
  },
  {
    name: 'get_material',
    description: 'Retrieve specifications, certifications, and performance data for building materials',
    params: [
      { name: 'material_name', type: 'string', required: true, description: 'Material name or ID' },
      { name: 'properties', type: 'string[]', required: false, description: 'Specific properties to retrieve' },
    ],
  },
  {
    name: 'get_safety',
    description: 'Access safety guidelines, hazard data, and compliance requirements for construction processes',
    params: [
      { name: 'process', type: 'string', required: true, description: 'Construction process or activity' },
      { name: 'hazard_type', type: 'string', required: false, description: 'Filter by hazard type (e.g., electrical, fall, chemical)' },
    ],
  },
  {
    name: 'estimate_cost',
    description: 'Calculate project cost estimates based on scope, materials, and labor rates',
    params: [
      { name: 'project_type', type: 'string', required: true, description: 'Type of project (e.g., residential, commercial)' },
      { name: 'scope', type: 'string', required: true, description: 'Project scope description' },
      { name: 'location', type: 'string', required: false, description: 'Geographic location for cost adjustment' },
    ],
  },
  {
    name: 'get_permits',
    description: 'Find required permits, applications, and approval workflows for jurisdictions',
    params: [
      { name: 'jurisdiction', type: 'string', required: true, description: 'Jurisdiction name or code' },
      { name: 'project_type', type: 'string', required: true, description: 'Type of construction project' },
    ],
  },
  {
    name: 'generate_schedule',
    description: 'Create project timelines and construction schedules with dependencies and milestones',
    params: [
      { name: 'project_scope', type: 'string', required: true, description: 'Description of project scope' },
      { name: 'team_size', type: 'number', required: false, description: 'Number of workers available' },
      { name: 'start_date', type: 'string', required: false, description: 'Project start date (ISO 8601)' },
    ],
  },
  {
    name: 'get_team',
    description: 'Find and connect with contractors, specialists, and trade professionals',
    params: [
      { name: 'trade', type: 'string', required: true, description: 'Trade specialty (e.g., electrical, plumbing, carpentry)' },
      { name: 'location', type: 'string', required: false, description: 'Geographic area for matching' },
      { name: 'experience_level', type: 'string', required: false, description: 'Required experience (junior, experienced, expert)' },
    ],
  },
  {
    name: 'list_building_types',
    description: 'Retrieve all supported building types and their code classifications',
    params: [
      { name: 'category', type: 'string', required: false, description: 'Filter by category (residential, commercial, industrial, etc.)' },
    ],
  },
  {
    name: 'list_jurisdictions',
    description: 'Get list of supported jurisdictions with their unique code standards',
    params: [
      { name: 'region', type: 'string', required: false, description: 'Filter by region (state, country, etc.)' },
    ],
  },
  {
    name: 'crm_list_contacts',
    description: 'Query CRM database for contacts, contractors, and team members',
    params: [
      { name: 'contact_type', type: 'string', required: false, description: 'Filter by type (contractor, supplier, client, etc.)' },
      { name: 'status', type: 'string', required: false, description: 'Filter by status (active, archived, etc.)' },
    ],
  },
  {
    name: 'crm_pipeline_stats',
    description: 'Get project pipeline metrics and deal statistics from CRM',
    params: [
      { name: 'time_range', type: 'string', required: false, description: 'Time period (30d, 90d, 1y, all)' },
      { name: 'status_filter', type: 'string', required: false, description: 'Filter by deal status' },
    ],
  },
];

const pricingTiers = [
  {
    name: 'Explorer',
    price: 'Free',
    requests: '5/day',
    features: ['Basic code lookup', 'Material specs', 'Knowledge search', 'Community support'],
  },
  {
    name: 'Pro',
    price: '$49/mo',
    requests: '1,000/day',
    features: ['All Explorer features', 'Cost estimation', 'Permit workflows', 'Schedule generation', 'Email support'],
  },
  {
    name: 'Team',
    price: '$199/mo',
    requests: '10,000/day',
    features: ['All Pro features', 'CRM integration', 'Team management', 'Advanced analytics', 'Priority support', 'Up to 5 team members'],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    requests: 'Unlimited',
    features: ['All Team features', 'Dedicated support', 'Custom integrations', 'SLA guarantee', 'Unlimited team members', 'On-premise option'],
  },
];

export default function MCPDocumentation() {
  return (
    <div style={{ fontFamily: 'var(--font-archivo), sans-serif', color: '#1a1a1a', backgroundColor: '#ffffff' }}>
      {/* Hero Section */}
      <div style={{
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        padding: '80px 40px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 700,
          marginBottom: '16px',
          color: '#1D9E75',
          fontFamily: 'var(--font-archivo-black), sans-serif',
        }}>
          Builder's Knowledge Garden MCP Server
        </h1>
        <p style={{
          fontSize: '20px',
          color: '#666',
          marginBottom: '24px',
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: '1.6',
        }}>
          AI-powered integration for construction knowledge. Connect your Claude Desktop or API client to access building codes, materials, safety standards, and team coordination in real-time.
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#connection" style={{
            display: 'inline-block',
            padding: '12px 32px',
            backgroundColor: '#1D9E75',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '16px',
          }}>
            Get Started
          </a>
          <a href="/api/v1/openapi" style={{
            display: 'inline-block',
            padding: '12px 32px',
            backgroundColor: '#f3f4f6',
            color: '#1D9E75',
            textDecoration: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '16px',
            border: '1px solid #1D9E75',
          }}>
            OpenAPI Spec
          </a>
        </div>
      </div>

      {/* Connection Section */}
      <div id="connection" style={{ padding: '80px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{
          fontSize: '36px',
          fontWeight: 700,
          marginBottom: '48px',
          color: '#1D9E75',
          fontFamily: 'var(--font-archivo-black), sans-serif',
        }}>
          Connection Instructions
        </h2>

        <div style={{ marginBottom: '60px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#1a1a1a' }}>
            Server Endpoint
          </h3>
          <div style={{
            backgroundColor: '#f3f4f6',
            padding: '16px',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '14px',
            overflowX: 'auto',
          }}>
            https://builders.theknowledgegardens.com/api/v1/mcp
          </div>
          <p style={{ marginTop: '12px', color: '#666', lineHeight: '1.6' }}>
            <strong>Discovery:</strong> GET request returns available tools and their schemas<br />
            <strong>Execution:</strong> POST request with tool name and parameters to execute commands
          </p>
        </div>

        {/* Claude Desktop Setup */}
        <div style={{ marginBottom: '60px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#1a1a1a' }}>
            Claude Desktop Integration
          </h3>
          <p style={{ color: '#666', marginBottom: '16px', lineHeight: '1.6' }}>
            Add the MCP server to your Claude Desktop configuration file:
          </p>
          <div style={{
            backgroundColor: '#1a1a1a',
            color: '#10b981',
            padding: '20px',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '13px',
            overflowX: 'auto',
            lineHeight: '1.6',
          }}>
            {`// ~/.config/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "bkg": {
      "url": "https://builders.theknowledgegardens.com/api/v1/mcp",
      "auth": {
        "type": "bearer",
        "token": "your-api-key-here"
      }
    }
  }
}`}
          </div>
          <p style={{ marginTop: '12px', color: '#666', fontSize: '13px' }}>
            Restart Claude Desktop to enable the MCP server connection.
          </p>
        </div>

        {/* curl Example */}
        <div style={{ marginBottom: '60px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#1a1a1a' }}>
            API Call via cURL
          </h3>
          <p style={{ color: '#666', marginBottom: '16px', lineHeight: '1.6' }}>
            Discover available tools:
          </p>
          <div style={{
            backgroundColor: '#1a1a1a',
            color: '#10b981',
            padding: '20px',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '13px',
            overflowX: 'auto',
            lineHeight: '1.6',
            marginBottom: '20px',
          }}>
            {`curl -X GET https://builders.theknowledgegardens.com/api/v1/mcp \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
          </div>
          <p style={{ color: '#666', marginBottom: '16px', lineHeight: '1.6' }}>
            Execute a tool:
          </p>
          <div style={{
            backgroundColor: '#1a1a1a',
            color: '#10b981',
            padding: '20px',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '13px',
            overflowX: 'auto',
            lineHeight: '1.6',
          }}>
            {`curl -X POST https://builders.theknowledgegardens.com/api/v1/mcp \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tool": "search_knowledge",
    "input": {
      "query": "foundation waterproofing",
      "limit": 5
    }
  }'`}
          </div>
        </div>

        {/* Python Integration */}
        <div style={{ marginBottom: '60px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#1a1a1a' }}>
            Python Integration
          </h3>
          <div style={{
            backgroundColor: '#1a1a1a',
            color: '#10b981',
            padding: '20px',
            borderRadius: '6px',
            fontFamily: 'monospace',
            fontSize: '13px',
            overflowX: 'auto',
            lineHeight: '1.6',
          }}>
            {`import requests

BASE_URL = "https://builders.theknowledgegardens.com/api/v1/mcp"
API_KEY = "your-api-key-here"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# Get available tools
response = requests.get(BASE_URL, headers=headers)
tools = response.json()

# Execute a tool
payload = {
    "tool": "estimate_cost",
    "input": {
        "project_type": "residential",
        "scope": "Foundation repair and waterproofing",
        "location": "San Francisco, CA"
    }
}
response = requests.post(BASE_URL, json=payload, headers=headers)
estimate = response.json()`}
          </div>
        </div>
      </div>

      {/* Tools Reference */}
      <div style={{ padding: '80px 40px', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: '36px',
            fontWeight: 700,
            marginBottom: '48px',
            color: '#1D9E75',
            fontFamily: 'var(--font-archivo-black), sans-serif',
          }}>
            Tool Reference
          </h2>

          <div style={{ display: 'grid', gap: '32px' }}>
            {tools.map((tool, idx) => (
              <div key={idx} style={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '24px',
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  marginBottom: '8px',
                  color: '#1D9E75',
                  fontFamily: 'monospace',
                }}>
                  {tool.name}
                </h3>
                <p style={{ color: '#666', marginBottom: '16px', lineHeight: '1.6' }}>
                  {tool.description}
                </p>
                {tool.params.length > 0 && (
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
                      Parameters:
                    </p>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {tool.params.map((param, pidx) => (
                        <div key={pidx} style={{
                          backgroundColor: '#f9fafb',
                          padding: '12px',
                          borderRadius: '4px',
                          fontSize: '13px',
                        }}>
                          <div style={{ fontFamily: 'monospace', color: '#1D9E75', fontWeight: 600, marginBottom: '4px' }}>
                            {param.name}{' '}
                            <span style={{ color: '#666', fontWeight: 400 }}>
                              ({param.type})
                            </span>
                            {param.required && <span style={{ color: '#E8443A', marginLeft: '6px' }}>*</span>}
                          </div>
                          <div style={{ color: '#666' }}>
                            {param.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div style={{ padding: '80px 40px', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{
          fontSize: '36px',
          fontWeight: 700,
          marginBottom: '48px',
          color: '#1D9E75',
          fontFamily: 'var(--font-archivo-black), sans-serif',
          textAlign: 'center',
        }}>
          Pricing Plans
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
          {pricingTiers.map((tier, idx) => (
            <div key={idx} style={{
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '32px',
              backgroundColor: tier.name === 'Pro' ? '#f0fdf4' : 'white',
              position: 'relative',
            }}>
              {tier.name === 'Pro' && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: '#1D9E75',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}>
                  POPULAR
                </div>
              )}
              <h3 style={{
                fontSize: '20px',
                fontWeight: 700,
                marginBottom: '12px',
                color: '#1a1a1a',
              }}>
                {tier.name}
              </h3>
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  fontSize: '32px',
                  fontWeight: 700,
                  color: '#1D9E75',
                  marginBottom: '4px',
                }}>
                  {tier.price}
                </div>
                <div style={{ fontSize: '14px', color: '#666', fontWeight: 500 }}>
                  {tier.requests} API requests
                </div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '24px' }}>
                {tier.features.map((feature, fidx) => (
                  <li key={fidx} style={{
                    padding: '8px 0',
                    color: '#666',
                    fontSize: '14px',
                    borderBottom: fidx < tier.features.length - 1 ? '1px solid #e5e7eb' : 'none',
                  }}>
                    <span style={{ color: '#1D9E75', marginRight: '8px' }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <button style={{
                width: '100%',
                padding: '12px 24px',
                backgroundColor: tier.name === 'Pro' ? '#1D9E75' : '#f3f4f6',
                color: tier.name === 'Pro' ? 'white' : '#1D9E75',
                border: tier.name === 'Pro' ? 'none' : '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}>
                {tier.name === 'Enterprise' ? 'Contact Sales' : 'Get Started'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        backgroundColor: '#f9fafb',
        borderTop: '1px solid #e5e7eb',
        padding: '40px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ color: '#666', marginBottom: '16px', lineHeight: '1.6' }}>
            Builder's Knowledge Garden MCP Server v1.0
          </p>
          <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/api/v1/openapi" style={{
              color: '#1D9E75',
              textDecoration: 'none',
              fontWeight: 500,
            }}>
              OpenAPI Specification
            </a>
            <a href="/" style={{
              color: '#1D9E75',
              textDecoration: 'none',
              fontWeight: 500,
            }}>
              Knowledge Base
            </a>
            <a href="mailto:support@theknowledgegardens.com" style={{
              color: '#1D9E75',
              textDecoration: 'none',
              fontWeight: 500,
            }}>
              Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
