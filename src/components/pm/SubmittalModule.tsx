"use client";

import { useState, useEffect } from "react";
import { Plus, Filter, SortAsc, Trash2, Link as LinkIcon, Download, Search, FileCheck, BookOpen, AlertCircle, Loader2, Check, X, MessageSquare } from "lucide-react";

interface Submittal {
  id: string;
  project_id: string;
  spec_section?: string;
  description: string;
  subcontractor?: string;
  status: "pending" | "submitted" | "under_review" | "approved" | "approved_as_noted" | "rejected" | "resubmit";
  due_date?: string;
  review_notes?: string;
  linked_entities?: string[];
  created_at: string;
  updated_at?: string;
}

interface KnowledgeEntity {
  id: string;
  title: string;
  type: string;
  icon?: string;
}

interface SubmittalModuleProps {
  projectId: string;
}

const statusColors: Record<Submittal["status"], { bg: string; text: string; label: string }> = {
  pending: { bg: "#e9ecef", text: "#555555", label: "Pending" },
  submitted: { bg: "#cfe2ff", text: "#0c63e4", label: "Submitted" },
  under_review: { bg: "#fff3cd", text: "#856404", label: "Under Review" },
  approved: { bg: "#d1e7dd", text: "#0f5132", label: "Approved" },
  approved_as_noted: { bg: "#c3e6cb", text: "#0f5132", label: "Approved as Noted" },
  rejected: { bg: "#f8d7da", text: "#842029", label: "Rejected" },
  resubmit: { bg: "#ffeeba", text: "#856404", label: "Resubmit" },
};

const priorityColors: Record<string, { bg: string; text: string }> = {
  low: { bg: "#e9ecef", text: "#555555" },
  medium: { bg: "#fff3cd", text: "#856404" },
  high: { bg: "#f8d7da", text: "#721c24" },
  urgent: { bg: "#dc3545", text: "#ffffff" },
};

export default function SubmittalModule({ projectId }: SubmittalModuleProps) {
  const [submittals, setSubmittals] = useState<Submittal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<Submittal["status"] | "all">("all");
  const [sortBy, setSortBy] = useState<"date" | "status" | "due_date">("date");
  const [entitySearchQuery, setEntitySearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<KnowledgeEntity[]>([]);
  const [showEntitySearch, setShowEntitySearch] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editingReviewText, setEditingReviewText] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const [formData, setFormData] = useState({
    spec_section: "",
    description: "",
    subcontractor: "",
    priority: "medium",
    due_date: "",
    linked_entities: [] as string[],
  });

  // Fetch submittals on mount
  useEffect(() => {
    fetchSubmittals();
  }, [projectId]);

  const fetchSubmittals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/projects/submittals?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch submittals");
      }
      const data = await response.json();
      setSubmittals(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load submittals");
      setSubmittals([]);
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

  const handleCreateSubmittal = async () => {
    if (!formData.description.trim()) return;

    try {
      const response = await fetch(`/api/v1/projects/submittals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          spec_section: formData.spec_section || null,
          description: formData.description,
          subcontractor: formData.subcontractor || null,
          due_date: formData.due_date || null,
          linked_entities: formData.linked_entities,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create submittal");
      }

      const data = await response.json();
      setSubmittals([...submittals, data]);
      setFormData({
        spec_section: "",
        description: "",
        subcontractor: "",
        priority: "medium",
        due_date: "",
        linked_entities: [],
      });
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create submittal");
    }
  };

  const updateSubmittalStatus = async (id: string, newStatus: Submittal["status"]) => {
    try {
      const response = await fetch(`/api/v1/projects/submittals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update submittal status");
      }

      setSubmittals(
        submittals.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update submittal");
    }
  };

  const saveReviewNotes = async (id: string) => {
    if (!editingReviewText.trim()) return;

    setSavingReview(true);
    try {
      const response = await fetch(`/api/v1/projects/submittals`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          review_notes: editingReviewText,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save review notes");
      }

      setSubmittals(
        submittals.map((s) =>
          s.id === id ? { ...s, review_notes: editingReviewText } : s
        )
      );
      setEditingReviewId(null);
      setEditingReviewText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review notes");
    } finally {
      setSavingReview(false);
    }
  };

  const deleteSubmittal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this submittal?")) return;

    try {
      const response = await fetch(`/api/v1/projects/submittals`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete submittal");
      }

      setSubmittals(submittals.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete submittal");
    }
  };

  const exportToCSV = () => {
    const headers = ["Spec Section", "Description", "Subcontractor", "Status", "Due Date", "Review Notes"];
    const rows = submittals.map((s) => [
      s.spec_section || "",
      s.description,
      s.subcontractor || "",
      statusColors[s.status].label,
      s.due_date ? new Date(s.due_date).toLocaleDateString() : "",
      s.review_notes || "",
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
    a.download = `submittals-${projectId}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const pendingSubmittals = submittals.filter((s) => s.status === "pending").length;
  const underReviewSubmittals = submittals.filter((s) => s.status === "under_review").length;

  const filteredSubmittals = submittals.filter((s) =>
    filterStatus === "all" ? true : s.status === filterStatus
  );

  const sortedSubmittals = [...filteredSubmittals].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === "due_date") {
      const dateA = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      return dateA - dateB;
    }
    if (sortBy === "status") {
      const statusOrder: Record<Submittal["status"], number> = {
        pending: 0,
        submitted: 1,
        under_review: 2,
        resubmit: 3,
        rejected: 4,
        approved_as_noted: 5,
        approved: 6,
      };
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return 0;
  });

  const cardStyle = {
    backgroundColor: "#ffffff",
    border: "1px solid #E5E5E0",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "12px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 16px",
          color: "#666",
        }}
      >
        <Loader2 size={20} style={{ marginRight: "8px", animation: "spin 1s linear infinite" }} />
        Loading submittals...
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

      {/* Header with count badges */}
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
                color: "#1D1D1D",
                marginBottom: "4px",
              }}
            >
              Submittals
            </h3>
            <p style={{ fontSize: "13px", color: "#666" }}>
              {pendingSubmittals} pending, {underReviewSubmittals} under review
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={exportToCSV}
              style={{
                padding: "10px 14px",
                background: "#FAFAF8",
                color: "#1D1D1D",
                border: "1px solid #E5E5E0",
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
              onMouseLeave={(e) => (e.currentTarget.style.background = "#FAFAF8")}
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                padding: "10px 16px",
                background: "#1D9E75",
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
              Create Submittal
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as Submittal["status"] | "all")}
            style={{
              padding: "8px 12px",
              fontSize: "12px",
              border: "1px solid #E5E5E0",
              borderRadius: "6px",
              background: "#ffffff",
              cursor: "pointer",
              fontFamily: "system-ui",
            }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="approved_as_noted">Approved as Noted</option>
            <option value="rejected">Rejected</option>
            <option value="resubmit">Resubmit</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "date" | "status" | "due_date")}
            style={{
              padding: "8px 12px",
              fontSize: "12px",
              border: "1px solid #E5E5E0",
              borderRadius: "6px",
              background: "#ffffff",
              cursor: "pointer",
              fontFamily: "system-ui",
            }}
          >
            <option value="date">Sort by Date</option>
            <option value="due_date">Sort by Due Date</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>
      </div>

      {/* Submittal List */}
      {sortedSubmittals.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "32px 16px",
            background: "#FAFAF8",
            borderRadius: "8px",
            border: "1px dashed #E5E5E0",
          }}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>📄</div>
          <p
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "#1D1D1D",
              marginBottom: "4px",
            }}
          >
            No submittals yet
          </p>
          <p style={{ fontSize: "12px", color: "#666" }}>
            Create your first submittal to track project submissions
          </p>
        </div>
      ) : (
        sortedSubmittals.map((submittal) => {
          const statusColor = statusColors[submittal.status];

          return (
            <div key={submittal.id} style={cardStyle}>
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
                    {submittal.spec_section && (
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#666",
                        }}
                      >
                        {submittal.spec_section}
                      </span>
                    )}
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        fontSize: "10px",
                        fontWeight: 500,
                        background: statusColor.bg,
                        color: statusColor.text,
                        borderRadius: "6px",
                      }}
                    >
                      {statusColor.label}
                    </span>
                  </div>
                  <h4
                    style={{
                      fontSize: "14px",
                      fontWeight: 600,
                      color: "#1D1D1D",
                      marginBottom: "4px",
                    }}
                  >
                    {submittal.description}
                  </h4>

                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      fontSize: "12px",
                      color: "#666",
                      marginBottom: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    {submittal.subcontractor && <div>🏢 {submittal.subcontractor}</div>}
                    {submittal.due_date && (
                      <div>📅 {new Date(submittal.due_date).toLocaleDateString()}</div>
                    )}
                  </div>

                  {submittal.linked_entities && submittal.linked_entities.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        alignItems: "center",
                        marginBottom: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <LinkIcon size={14} style={{ color: "#666" }} />
                      {submittal.linked_entities.map((entityId) => (
                        <span
                          key={entityId}
                          style={{
                            fontSize: "11px",
                            padding: "2px 6px",
                            background: "#FAFAF8",
                            border: "1px solid #E5E5E0",
                            borderRadius: "3px",
                            color: "#666",
                          }}
                        >
                          {entityId}
                        </span>
                      ))}
                    </div>
                  )}

                  {submittal.status === "under_review" || submittal.status === "approved_as_noted" || submittal.status === "rejected" ? (
                    <div>
                      {editingReviewId === submittal.id ? (
                        <div style={{ marginTop: "12px" }}>
                          <textarea
                            value={editingReviewText}
                            onChange={(e) => setEditingReviewText(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              fontSize: "12px",
                              border: "1px solid #E5E5E0",
                              borderRadius: "6px",
                              fontFamily: "inherit",
                              marginBottom: "8px",
                              boxSizing: "border-box",
                            }}
                            rows={3}
                            placeholder="Add review notes..."
                          />
                          <div style={{ display: "flex", gap: "6px" }}>
                            <button
                              onClick={() => saveReviewNotes(submittal.id)}
                              disabled={savingReview}
                              style={{
                                padding: "6px 10px",
                                fontSize: "11px",
                                background: "#1D9E75",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "6px",
                                cursor: savingReview ? "not-allowed" : "pointer",
                                opacity: savingReview ? 0.6 : 1,
                              }}
                            >
                              Save Notes
                            </button>
                            <button
                              onClick={() => {
                                setEditingReviewId(null);
                                setEditingReviewText("");
                              }}
                              style={{
                                padding: "6px 10px",
                                fontSize: "11px",
                                background: "#f8f9fa",
                                color: "#1D1D1D",
                                border: "1px solid #E5E5E0",
                                borderRadius: "6px",
                                cursor: "pointer",
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : submittal.review_notes ? (
                        <div
                          style={{
                            marginTop: "12px",
                            padding: "10px 12px",
                            background: "#f0f8f5",
                            borderLeft: "3px solid #1D9E75",
                            borderRadius: "6px",
                            fontSize: "12px",
                            color: "#1D1D1D",
                          }}
                        >
                          <strong>Review Notes:</strong> {submittal.review_notes}
                          <button
                            onClick={() => {
                              setEditingReviewId(submittal.id);
                              setEditingReviewText(submittal.review_notes || "");
                            }}
                            style={{
                              marginLeft: "8px",
                              fontSize: "10px",
                              background: "none",
                              border: "none",
                              color: "#1D9E75",
                              textDecoration: "underline",
                              cursor: "pointer",
                            }}
                          >
                            edit
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingReviewId(submittal.id);
                            setEditingReviewText("");
                          }}
                          style={{
                            marginTop: "8px",
                            fontSize: "11px",
                            background: "none",
                            border: "none",
                            color: "#1D9E75",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: 0,
                          }}
                        >
                          <MessageSquare size={14} />
                          Add Review Notes
                        </button>
                      )}
                    </div>
                  ) : null}
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
                    value={submittal.status}
                    onChange={(e) =>
                      updateSubmittalStatus(submittal.id, e.target.value as Submittal["status"])
                    }
                    style={{
                      padding: "6px 8px",
                      fontSize: "11px",
                      border: "1px solid #E5E5E0",
                      borderRadius: "6px",
                      background: "#ffffff",
                      cursor: "pointer",
                      fontFamily: "system-ui",
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="approved_as_noted">Approved as Noted</option>
                    <option value="rejected">Rejected</option>
                    <option value="resubmit">Resubmit</option>
                  </select>
                  <button
                    onClick={() => deleteSubmittal(submittal.id)}
                    style={{
                      padding: "6px 8px",
                      background: "#fff5f5",
                      border: "1px solid #f8d7da",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: "#842029",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Delete submittal"
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
              fontFamily: "system-ui",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "#1D1D1D",
                marginBottom: "16px",
              }}
            >
              Create New Submittal
            </h3>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#1D1D1D",
                  marginBottom: "6px",
                }}
              >
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="What is being submitted?"
                rows={4}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "13px",
                  border: "1px solid #E5E5E0",
                  borderRadius: "6px",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#1D1D1D",
                  marginBottom: "6px",
                }}
              >
                Spec Section
              </label>
              <input
                type="text"
                value={formData.spec_section}
                onChange={(e) => setFormData({ ...formData, spec_section: e.target.value })}
                placeholder="e.g., 03300 Cast-in-Place Concrete"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "13px",
                  border: "1px solid #E5E5E0",
                  borderRadius: "6px",
                  boxSizing: "border-box",
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
                    color: "#1D1D1D",
                    marginBottom: "6px",
                  }}
                >
                  Subcontractor
                </label>
                <input
                  type="text"
                  value={formData.subcontractor}
                  onChange={(e) => setFormData({ ...formData, subcontractor: e.target.value })}
                  placeholder="Company name"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    border: "1px solid #E5E5E0",
                    borderRadius: "6px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "#1D1D1D",
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
                    border: "1px solid #E5E5E0",
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
                  color: "#1D1D1D",
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
                    border: "1px solid #E5E5E0",
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
                        background: "#FAFAF8",
                        border: "1px solid #E5E5E0",
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
                          color: "#666",
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
                      border: "1px solid #E5E5E0",
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
                          color: "#1D1D1D",
                          borderBottom: "1px solid #E5E5E0",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#FAFAF8")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                      >
                        <div style={{ fontWeight: 500 }}>{entity.title}</div>
                        <div style={{ fontSize: "11px", color: "#666" }}>{entity.type}</div>
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
                  border: "1px solid #E5E5E0",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  color: "#1D1D1D",
                  fontFamily: "system-ui",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubmittal}
                disabled={!formData.description.trim()}
                style={{
                  padding: "8px 16px",
                  background: formData.description.trim() ? "#1D9E75" : "#ccc",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: formData.description.trim() ? "pointer" : "not-allowed",
                  fontFamily: "system-ui",
                }}
              >
                Create Submittal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
