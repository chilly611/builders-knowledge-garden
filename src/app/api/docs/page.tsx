'use client';

import { useEffect, useState } from 'react';

interface Parameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'body';
  required?: boolean;
  schema?: any;
  description?: string;
}

interface RequestBody {
  content?: {
    'application/json'?: {
      schema?: any;
    };
  };
}

interface Operation {
  summary?: string;
  description?: string;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  tags?: string[];
  responses?: Record<string, any>;
}

interface PathItem {
  get?: Operation;
  post?: Operation;
  patch?: Operation;
  delete?: Operation;
  put?: Operation;
}

interface OpenAPISpec {
  paths?: Record<string, PathItem>;
  tags?: Array<{ name: string; description?: string }>;
}

interface EndpointCard {
  path: string;
  method: string;
  operation: Operation;
}

const getMethodColor = (method: string) => {
  const colors: Record<string, string> = {
    GET: '#10b981',
    POST: '#3b82f6',
    PATCH: '#f59e0b',
    DELETE: '#ef4444',
    PUT: '#8b5cf6',
  };
  return colors[method] || '#6b7280';
};

const getMethodBgColor = (method: string) => {
  const colors: Record<string, string> = {
    GET: '#f0fdf4',
    POST: '#eff6ff',
    PATCH: '#fffbeb',
    DELETE: '#fef2f2',
    PUT: '#faf5ff',
  };
  return colors[method] || '#f9fafb';
};

const SchemaRenderer = ({ schema, level = 0 }: { schema: any; level?: number }) => {
  if (!schema) return null;

  const marginLeft = level * 16;

  if (schema.type === 'object') {
    return (
      <div style={{ marginLeft }}>
        <div style={{ color: '#666', fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>
          object
        </div>
        {schema.properties && (
          <div style={{ marginLeft: '16px', borderLeft: '1px solid #e5e7eb', paddingLeft: '12px' }}>
            {Object.entries(schema.properties).map(([key, prop]: [string, any]) => (
              <div key={key} style={{ marginBottom: '12px' }}>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: '#1D9E75',
                  fontWeight: 500,
                }}>
                  {key}
                  {schema.required?.includes(key) && <span style={{ color: '#E8443A' }}> *</span>}
                </div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '2px', marginBottom: '6px' }}>
                  {prop.description || prop.type}
                </div>
                {(prop.type === 'object' || prop.type === 'array') && (
                  <SchemaRenderer schema={prop} level={level + 1} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (schema.type === 'array') {
    return (
      <div style={{ marginLeft }}>
        <div style={{ color: '#666', fontSize: '12px', fontWeight: 500 }}>
          array of {schema.items?.type || 'object'}
        </div>
        {schema.items?.properties && (
          <SchemaRenderer schema={schema.items} level={level + 1} />
        )}
      </div>
    );
  }

  return (
    <div style={{ marginLeft, color: '#666', fontSize: '12px' }}>
      {schema.type}{schema.format ? ` (${schema.format})` : ''}
    </div>
  );
};

export default function APIDocs() {
  const [spec, setSpec] = useState<OpenAPISpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string>('All');
  const [endpoints, setEndpoints] = useState<EndpointCard[]>([]);

  useEffect(() => {
    const fetchSpec = async () => {
      try {
        const response = await fetch('/api/v1/openapi');
        if (!response.ok) throw new Error('Failed to fetch OpenAPI spec');
        const data = await response.json();
        setSpec(data);

        // Extract endpoints
        const extractedEndpoints: EndpointCard[] = [];
        if (data.paths) {
          Object.entries(data.paths).forEach(([path, pathItem]: [string, any]) => {
            const methods = ['get', 'post', 'patch', 'delete', 'put'];
            methods.forEach((method) => {
              if (pathItem[method]) {
                extractedEndpoints.push({
                  path,
                  method: method.toUpperCase(),
                  operation: pathItem[method],
                });
              }
            });
          });
        }
        setEndpoints(extractedEndpoints);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchSpec();
  }, []);

  const tags = spec?.tags?.map((t) => t.name) || [];
  const displayTags = ['All', ...tags];

  const filteredEndpoints =
    activeTag === 'All'
      ? endpoints
      : endpoints.filter((ep) => ep.operation.tags?.includes(activeTag));

  if (loading) {
    return (
      <div style={{
        fontFamily: 'var(--font-archivo), sans-serif',
        padding: '40px',
        backgroundColor: '#ffffff',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#1D9E75', marginBottom: '12px' }}>
            Loading API documentation...
          </div>
          <div style={{ color: '#666' }}>Fetching OpenAPI specification</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        fontFamily: 'var(--font-archivo), sans-serif',
        padding: '40px',
        backgroundColor: '#ffffff',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', fontWeight: 600, color: '#E8443A', marginBottom: '12px' }}>
            Error loading API docs
          </div>
          <div style={{ color: '#666' }}>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: 'var(--font-archivo), sans-serif',
      backgroundColor: '#ffffff',
      color: '#1a1a1a',
      minHeight: '100vh',
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        padding: '40px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: '40px',
          fontWeight: 700,
          marginBottom: '12px',
          color: '#1D9E75',
          fontFamily: 'var(--font-archivo-black), sans-serif',
        }}>
          API Documentation
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#666',
          lineHeight: '1.6',
        }}>
          Builder's Knowledge Garden REST API endpoints
        </p>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 160px)' }}>
        {/* Sticky Sidebar */}
        <div style={{
          width: '240px',
          backgroundColor: '#f9fafb',
          borderRight: '1px solid #e5e7eb',
          padding: '24px',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#999', marginBottom: '16px', textTransform: 'uppercase' }}>
            API Sections
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                style={{
                  padding: '10px 12px',
                  backgroundColor: activeTag === tag ? '#1D9E75' : 'transparent',
                  color: activeTag === tag ? 'white' : '#666',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: activeTag === tag ? 600 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-archivo), sans-serif',
                  transition: 'all 0.2s',
                }}
              >
                {tag}
                {tag !== 'All' && (
                  <span style={{ marginLeft: '6px', fontSize: '12px', opacity: 0.7 }}>
                    ({endpoints.filter((ep) => ep.operation.tags?.includes(tag)).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          flex: 1,
          padding: '40px',
          maxWidth: '900px',
        }}>
          {filteredEndpoints.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', padding: '60px 20px' }}>
              <p style={{ fontSize: '16px' }}>No endpoints available for this section</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '24px' }}>
              {filteredEndpoints.map((endpoint, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: getMethodBgColor(endpoint.method),
                    border: `1px solid ${getMethodColor(endpoint.method)}`,
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Header */}
                  <div style={{
                    padding: '20px',
                    backgroundColor: getMethodColor(endpoint.method),
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                  }}>
                    <div style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      fontSize: '12px',
                      minWidth: '60px',
                      textAlign: 'center',
                    }}>
                      {endpoint.method}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 500, flex: 1 }}>
                      {endpoint.path}
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '20px' }}>
                    {endpoint.operation.summary && (
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#1a1a1a',
                        marginBottom: '8px',
                      }}>
                        {endpoint.operation.summary}
                      </h3>
                    )}

                    {endpoint.operation.description && (
                      <p style={{
                        fontSize: '14px',
                        color: '#666',
                        lineHeight: '1.6',
                        marginBottom: '20px',
                      }}>
                        {endpoint.operation.description}
                      </p>
                    )}

                    {/* Parameters Table */}
                    {endpoint.operation.parameters && endpoint.operation.parameters.length > 0 && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#1a1a1a',
                          marginBottom: '12px',
                          textTransform: 'uppercase',
                        }}>
                          Parameters
                        </h4>
                        <div style={{
                          borderCollapse: 'collapse',
                          width: '100%',
                          fontSize: '13px',
                        }}>
                          {endpoint.operation.parameters.map((param, pidx) => (
                            <div
                              key={pidx}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '120px 80px 1fr',
                                gap: '12px',
                                padding: '12px',
                                borderBottom: pidx < endpoint.operation.parameters!.length - 1 ? '1px solid #e5e7eb' : 'none',
                                alignItems: 'center',
                              }}
                            >
                              <div style={{
                                fontFamily: 'monospace',
                                fontWeight: 500,
                                color: '#1D9E75',
                              }}>
                                {param.name}
                              </div>
                              <div style={{
                                backgroundColor: '#f3f4f6',
                                padding: '4px 8px',
                                borderRadius: '3px',
                                fontSize: '12px',
                                color: '#666',
                              }}>
                                {param.in}
                              </div>
                              <div style={{ color: '#666' }}>
                                {param.description}
                                {param.required && (
                                  <span style={{ color: '#E8443A', fontWeight: 600, marginLeft: '6px' }}>
                                    *required
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Request Body */}
                    {endpoint.operation.requestBody && (
                      <div style={{ marginBottom: '20px' }}>
                        <h4 style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#1a1a1a',
                          marginBottom: '12px',
                          textTransform: 'uppercase',
                        }}>
                          Request Body
                        </h4>
                        <div style={{
                          backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb',
                          borderRadius: '4px',
                          padding: '12px',
                        }}>
                          <SchemaRenderer
                            schema={endpoint.operation.requestBody.content?.['application/json']?.schema}
                          />
                        </div>
                      </div>
                    )}

                    {/* Responses */}
                    {endpoint.operation.responses && (
                      <div>
                        <h4 style={{
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#1a1a1a',
                          marginBottom: '12px',
                          textTransform: 'uppercase',
                        }}>
                          Responses
                        </h4>
                        <div style={{ display: 'grid', gap: '12px' }}>
                          {Object.entries(endpoint.operation.responses).map(([status, response]: [string, any]) => (
                            <div
                              key={status}
                              style={{
                                backgroundColor: '#f9fafb',
                                border: '1px solid #e5e7eb',
                                borderRadius: '4px',
                                padding: '12px',
                              }}
                            >
                              <div style={{
                                fontSize: '13px',
                                fontWeight: 600,
                                color: '#1a1a1a',
                                marginBottom: '6px',
                              }}>
                                {status}
                                {response.description && ` — ${response.description}`}
                              </div>
                              {response.content?.['application/json']?.schema && (
                                <SchemaRenderer schema={response.content['application/json'].schema} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
