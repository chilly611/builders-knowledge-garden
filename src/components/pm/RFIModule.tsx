"use client";

import { useState, useEffect } from "react";
import { Plus, Filter, SortAsc, Trash2, Link as LinkIcon, Download, Search, MessageSquare, BookOpen, AlertCircle, Loader2 } from "lucide-react";

interface RFI {
  id: string;
  number: number;
  subject: string;
  description: string;
  status: "draft" | "open" | "under_review" | "answered" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  assigned_to?: string;
  due_date?: string;
  answer?: string;
  linked_entities?: string[];
  created_at: string;
  project_id: string;
}

interface KnowledgeEntity {
  id: string;
  title: string;
  type: string;
  icon?: string;
}

interface RFIModuleProps {
  projectId: string;
}

const statusColors: Record<RFI["status"], { bg: string; text: string; label: string }> = {
  draft: { bg: "#e9ecef", text: "#555555", label: "Draft" },
  open: { bg: "#cfe2ff", text: "#0c63e4", label: "Open" },
  under_review: { bg: "#fff3cd", text: "#856404", label: "Under Review" },
  answered: { bg: "#d1e7dd", text: "#0f5132", label: "Answered" },
  closed: { bg: "#ccc", text: "#333", label: "Closed" },
};

const priorityColors: Record<RFI["priority"], { bg: string; text: string }> = {
  low: { bg: "#e9ecef", text: "#555555" },
  medium: { bg: "#fff3cd", text: "#856404" },
  high: { bg: "#f8d7da", text: "#721c24" },
  urgent: { bg: "#dc3545", text: "#ffffff" },
};

export default function RFIModule({ projectId }: RFIModuleProps) {
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<RFI["status"] | "all">("all");
  const [sortBy, setSortBy] = useState<"date" | "priority" | "status">("date");
  const [entitySearchQuery, setEntitySearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<KnowledgeEntity[]>([]);
  const [showEntitySearch, setShowEntitySearch] = useState(false);
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editingAnswerText, setEditingAnswerText] = useState("");
  const [savingAnswer, setSavingAnswer] = useState(false);

  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    assigned_to: "",
    priority: "medium" as RFI["priority"],
    due_date: "",
    linked_entities: [] as string[],
  });

  // Fetch RFIs on mount
  useEffect(() => {
    fetchRFIs();
  }, [projectId]);

  const fetchRFIs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/projects/rfis?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch RFIs");
      }
      const data = await response.json();
      setRfis(data.rfis || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load RFIs");
      setRfis([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchEntities = async (query: string) => {
    setEntitySearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/v1/copilot?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.entities || []);
      }
    } catch (err) {
      console.error("Entity search failed:", err);
    }
  };

  const addLinkedEntity = (entity: KnowledgeEntity) => {
    if (!formData.linked_entities.includes(entity.id)) {
      setFormData({
        ...formData,
        linked_entities: [...formData.linked_entities, entity.id],
      });
    }
    setEntitySearchQuery("");
    setSearchResults([]);
  };

  const removeLinkedEntity = (entityId: string) => {
    setFormData({
      ...formData,
      linked_entities: formData.linked_entities.filter((id) => id !== entityId),
    });
  };

  const handleCreateRFI = async () => {
    if (!formData.subject.trim()) return;

    try {
      const response = await fetch(`/api/v1/projects/rfis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          subject: formData.subject,
          description: formData.description,
          priority: formData.priority,
          assigned_to: formData.assigned_to || null,
          due_date: formData.due_date || null,
          status: "draft",
          linked_entities: formData.linked_entities,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create RFI");
      }

      const data = await response.json();
      setRfis([...rfis, data.rfi]);
      setFormData({
        subject: "",
        description: "",
        assigned_to: "",
        priority: "medium",
        due_date: "",
        linked_entities: [],
      });
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create RFI");
    }
  };

  const updateRFIStatus = async (id: string, newStatus: RFI["status"]) => {
    try {
      const response = await fetch(`/api/v1/projects/rfis`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update RFI status");
      }

      setRfis(rfis.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update RFI");
    }
  };

  const saveAnswer = async (id: string) => {
    if (!editingAnswerText.trim()) return;

    setSavingAnswer(true);
    try {
      const response = await fetch(`/api/v1/projects/rfis`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          answer: editingAnswerText,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save answer");
      }

      setRfis(rfis.map((r) => (r.id === id ? { ...r, answer: editingAnswerText } : r)));
      setEditingAnswerId(null);
      setEditingAnswerText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save answer");
    } finally {
      setSavingAnswer(false);
    }
  };

  const deleteRFI = async (id: string) => {
    if (!confirm("Are you sure you want to delete this RFI?")) return;

    try {
      const response = await fetch(`/api/v1/projects/rfis?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete RFI");
      }

      setRfis(rfis.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete RFI");
    }
  };

  const exportToCSV = () => {
    const headers = ["RFI #", "Subject", "Description", "Status", "Priority", "Assigned To", "Due Date", "Answer"];
    const rows = rfis.map((r) => [
      r.number,
      r.subject,
      r.description,
      statusColors[r.status].label,
      r.priority,
      r.assigned_to || "",
      r.due_date ? new Date(r.due_date).toLocaleDateString() : "",
      r.answer || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rfis-${projectId}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const openRFIs = rfis.filter((r) => r.status === "open").length;

  const filteredRFIs = rfis.filter((r) =>
    filterStatus === "all" ? true : r.status === filterStatus
  );

  const sortedRFIs = [...filteredRFIs].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === "priority") {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return 0;
  });

  const cardStyle = {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e4e8",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "12px",
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 16px",
          color: "var(--fg-secondary)",
        }}
      >
        <Loader2 size={20} style={{ marginRight: "8px", animation: "spin 1s linear infinite" }} />
        Loading RFIs...
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Error banner */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "16px",
            padding: "12px 16px",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c2c7",
            borderRadius: "8px",
            color: "#842029",
          }}
        >
          <AlertCircle size={18} />
          <span style={{ fontSize: "13px" }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              color: "#842029",
              cursor: "pointer",
              fontSize: "18px",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Header with count badge */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--fg)",
                marginBottom: "4px",
              }}
            >
              RFIs
            </h3>
            <p style={{ fontSize: "13px", color: "var(--fg-secondary)" }}>
              {openRFIs} open RFI{openRFIs !== 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={exportToCSV}
              style={{
                padding: "10px 14px",
                background: "#f8f9fa",
                color: "var(--fg)",
                border: "1px solid #e2e4e8",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#e9ecef")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#f8f9fa")}
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: "10px 16px",
                background: "var(--accent)",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            >
              <Plus size={16} />
              Create RFI
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as RFI["status"] | "all")}
            style={{
              padding: "8px 12px",
              fontSize: "12px",
              border: "1px solid #e2e4e8",
              borderRadius: "6px",
              background: "#ffffff",
              cursor: "pointer",
            }}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="under_review">Under Review</option>
            <option value="answered">Answered</option>
            <option value="closed">Closed</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "date" | "priority" | "status")}
            style={{
              padding: "8px 12px",
              fontSize: "12px",
              border: "1px solid #e2e4e8",
              borderRadius: "6px",
              background: "#ffffff",
              cursor: "pointer",
            }}
          >
            <option value="date">Sort by Date</option>
            <option value="priority">Sort by Priority</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>
      </div>

      {/* RFI List */}
      {sortedRFIs.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "32px 16px",
            background: "var(--bg-secondary)",
            borderRadius: "8px",
            border: "1px dashed #e2e4e8",
          }}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>📋</div>
          <p
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--fg)",
              marginBottom: "4px",
            }}
          >
            No RFIs yet
          </p>
          <p style={{ fontSize: "12px", color: "var(--fg-secondary)" }}>
            Create your first RFI to track questions
          </p>
        </div>
      ) : (
        sortedRFIs.map((rfi) => {
          const statusColor = statusColors[rfi.status];
          const priorityColor = priorityColors[rfi.priority];

          return (
            <div key={rfi.id} style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "12px",
                }}
              >
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                      marginBottom: "4px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--fg-secondary)",
                      }}
                    >
                      RFI #{rfi.number}
                    </span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        fontSize: "10px",
                        fontWeight: 500,
                        background: statusColor.bg,
                        color: statusColor.text,
                        borderRadius: "4px",
                      }}
                    >
                      {statusColor.label}
                    </span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        fontSize: "10px",
                        fontWeight: 500,
                        background: priorityColor.bg,
                        color: priorityColor.text,
                        borderRadius: "4px",
                        textTransform: "capitalize",
                      }}
                    >
                      {rfi.priority}
                    </span>
                  </div>
                  <h4
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "var(--fg)",
                      marginBottom: "4px",
                    }}
                  >
                    {rfi.subject}
                  </h4>
                  {rfi.description && (
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--fg-secondary)",
                        marginBottom: "8px",
                        lineHeight: "1.5",
                      }}
                    >
                      {rfi.description}
                    </p>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      fontSize: "12px",
                      color: "var(--fg-secondary)",
                      marginBottom: "8px",
                    }}
                  >
                    {rfi.assigned_to && <div>👤 {rfi.assigned_to}</div>}
                    {rfi.due_date && (
                      <div>📅 {new Date(rfi.due_date).toLocaleDateString()}</div>
                    )}
                  </div>

                  {rfi.linked_entities && rfi.linked_entities.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        alignItems: "center",
                        marginBottom: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <LinkIcon size={14} style={{ color: "var(--fg-secondary)" }} />
                      {rfi.linked_entities.map((entityId) => (
                        <span
                          key={entityId}
                          style={{
                            fontSize: "11px",
                            padding: "2px 6px",
                            background: "var(--bg-secondary)",
                            border: "1px solid #e2e4e8",
                            borderRadius: "3px",
                            color: "var(--fg-secondary)",
                          }}
                        >
                          {entityId}
                        </span>
                      ))}
                    </div>
                  )}

                  {rfi.status === "answered" && (
                    <div>
                      {editingAnswerId === rfi.id ? (
                        <div style={{ marginTop: "12px" }}>
                          <textarea
                            value={editingAnswerText}
                            onChange={(e) => setEditingAnswerText(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              fontSize: "12px",
                              border: "1px solid #e2e4e8",
                              borderRadius: "4px",
                              fontFamily: "inherit",
                              marginBottom: "8px",
                              boxSizing: "border-box",
                            }}
                            rows={3}
                          />
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => saveAnswer(rfi.id)}
                              disabled={savingAnswer}
                              style={{
                                padding: "6px 10px",
                                fontSize: "11px",
                                background: "var(--accent)",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: savingAnswer ? "not-allowed" : "pointer",
                                opacity: savingAnswer ? 0.6 : 1,
                              }}
                            >
                              Save Answer
                            </button>
                            <button
                              onClick={() => {
                                setEditingAnswerId(null);
                                setEditingAnswerText("");
                              }}
                              style={{
                                padding: "6px 10px",
                                fontSize: "11px",
                                background: "#f8f9fa",
                                color: "var(--fg)",
                                border: "1px solid #e2e4e8",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            marginTop: "12px",
                            padding: "10px 12px",
                            background: "#d1e7dd",
                            borderLeft: "3px solid #0f5132",
                            borderRadius: "4px",
                            fontSize: "12px",
                            color: "#0f5132",
                          }}
                        >
                          <strong>Answer:</strong> {rfi.answer}
                          <button
                            onClick={() => {
                              setEditingAnswerId(rfi.id);
                              setEditingAnswerText(rfi.answer || "");
                            }}
                            style={{
                              marginLeft: "8px",
                              fontSize: "10px",
                              background: "none",
                              border: "none",
                              color: "#0f5132",
                              textDecoration: "underline",
                              cursor: "pointer",
                            }}
                          >
                            edit
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {rfi.status !== "answered" && rfi.status !== "closed" && (
                    <div style={{ marginTop: "8px" }}>
                      <button
                        onClick={() => {
                          setEditingAnswerId(rfi.id);
                          setEditingAnswerText("");
                        }}
                        style={{
                          fontSize: "11px",
                          background: "none",
                          border: "none",
                          color: "var(--accent)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: 0,
                        }}
                      >
                        <MessageSquare size={14} />
                        Add Answer
                      </button>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "flex-start",
                    marginLeft: "12px",
                  }}
                >
                  <select
                    value={rfi.status}
                    onChange={(e) =>
                      updateRFIStatus(rfi.id, e.target.value as RFI["status"])
                    }
                    style={{
                      padding: "6px 8px",
                      fontSize: "11px",
                      border: "1px solid #e2e4e8",
                      borderRadius: "4px",
                      background: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    <option value="draft">Draft</option>
                    <option value="open">Open</option>
                    <option value="under_review">Under Review</option>
                    <option value="answered">Answered</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button
                    onClick={() => deleteRFI(rfi.id)}
                    style={{
                      padding: "6px 8px",
                      background: "#fff5f5",
                      border: "1px solid #f8d7da",
                      borderRadius: "4px",
                      cursor: "pointer",
                      color: "#842029",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Delete RFI"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--fg)",
                marginBottom: "16px",
              }}
            >
              Create New RFI
            </h3>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--fg)",
                  marginBottom: "6px",
                }}
              >
                Subject
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="RFI subject"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "13px",
                  border: "1px solid #e2e4e8",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--fg)",
                  marginBottom: "6px",
                }}
              >
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide details about this RFI"
                rows={4}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "13px",
                  border: "1px solid #e2e4e8",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--fg)",
                    marginBottom: "6px",
                  }}
                >
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value as RFI["priority"] })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    border: "1px solid #e2e4e8",
                    borderRadius: "6px",
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--fg)",
                    marginBottom: "6px",
                  }}
                >
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    border: "1px solid #e2e4e8",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--fg)",
                  marginBottom: "6px",
                }}
              >
                Assigned To
              </label>
              <input
                type="text"
                value={formData.assigned_to}
                onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                placeholder="Team member name"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "13px",
                  border: "1px solid #e2e4e8",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--fg)",
                  marginBottom: "6px",
                }}
              >
                Link Knowledge Entities
              </label>
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                    padding: "8px 10px",
                    border: "1px solid #e2e4e8",
                    borderRadius: "6px",
                    background: "#ffffff",
                    marginBottom: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  {formData.linked_entities.map((entityId) => (
                    <span
                      key={entityId}
                      style={{
                        fontSize: "12px",
                        padding: "4px 8px",
                        background: "var(--bg-secondary)",
                        border: "1px solid #e2e4e8",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      {entityId}
                      <button
                        onClick={() => removeLinkedEntity(entityId)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--fg-secondary)",
                          cursor: "pointer",
                          fontSize: "14px",
                          padding: 0,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={entitySearchQuery}
                    onChange={(e) => handleSearchEntities(e.target.value)}
                    onFocus={() => setShowEntitySearch(true)}
                    placeholder="Search entities..."
                    style={{
                      flex: 1,
                      minWidth: "150px",
                      border: "none",
                      outline: "none",
                      fontSize: "13px",
                    }}
                  />
                </div>

                {showEntitySearch && searchResults.length > 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "#ffffff",
                      border: "1px solid #e2e4e8",
                      borderRadius: "6px",
                      maxHeight: "200px",
                      overflowY: "auto",
                      zIndex: 10,
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                    }}
                  >
                    {searchResults.map((entity) => (
                      <button
                        key={entity.id}
                        onClick={() => addLinkedEntity(entity)}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "none",
                          background: "none",
                          textAlign: "left",
                          cursor: "pointer",
                          fontSize: "12px",
                          color: "var(--fg)",
                          borderBottom: "1px solid #e2e4e8",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-secondary)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <div style={{ fontWeight: 500 }}>{entity.title}</div>
                        <div style={{ fontSize: "11px", color: "var(--fg-secondary)" }}>{entity.type}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: "8px 16px",
                  background: "#f8f9fa",
                  border: "1px solid #e2e4e8",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  color: "var(--fg)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRFI}
                disabled={!formData.subject.trim()}
                style={{
                  padding: "8px 16px",
                  background: formData.subject.trim() ? "var(--accent)" : "#ccc",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: formData.subject.trim() ? "pointer" : "not-allowed",
                }}
              >
                Create RFI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
