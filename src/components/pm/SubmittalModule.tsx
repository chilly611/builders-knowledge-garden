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

  useEffect(() => {
    fetchSubmittals();
  }, [projectId]);

  const fetchSubmittals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/projects/submittals?projectId=${projectId}`);
      if (!response.ok) throw new Error("Failed to fetch submittals");
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

  const resetForm = () => {
    setFormData({
      spec_section: "",
      description: "",
      subcontractor: "",
      priority: "medium",
      due_date: "",
      linked_entities: [],
    });
    setShowCreateModal(false);
    setEntitySearchQuery("");
    setSearchResults([]);
  };

  const createSubmittal = async () => {
    try {
      const response = await fetch("/api/v1/projects/submittals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, ...formData }),
      });
      if (!response.ok) throw new Error("Failed to create submittal");
      resetForm();
      fetchSubmittals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create submittal");
    }
  };

  const updateSubmittalStatus = async (id: string, status: Submittal["status"]) => {
    try {
      const response = await fetch("/api/v1/projects/submittals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!response.ok) throw new Error("Failed to update submittal status");
      setSubmittals((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update submittal");
    }
  };

  const deleteSubmittal = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/projects/submittals?id=${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete submittal");
      setSubmittals((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete submittal");
    }
  };

  const saveReviewNotes = async (id: string) => {
    setSavingReview(true);
    try {
      const response = await fetch("/api/v1/projects/submittals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, review_notes: editingReviewText }),
      });
      if (!response.ok) throw new Error("Failed to save review notes");
      setSubmittals((prev) => prev.map((s) => (s.id === id ? { ...s, review_notes: editingReviewText } : s)));
      setEditingReviewId(null);
      setEditingReviewText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review notes");
    } finally {
      setSavingReview(false);
    }
  };

  const sortedSubmittals = submittals
    .filter((s) => filterStatus === "all" || s.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === "status") return a.status.localeCompare(b.status);
      if (sortBy === "due_date") {
        const dateA = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        return dateA - dateB;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const cardStyle: React.CSSProperties = {
    backgroundColor: "#ffffff",
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "12px",
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: "#FAFAF8", padding: "24px", borderRadius: "8px", textAlign: "center" }}>
        <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ marginTop: "8px", color: "#666" }}>Loading submittals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ backgroundColor: "#FAFAF8", padding: "24px", borderRadius: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#dc3545" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
        <button onClick={fetchSubmittals} style={{ marginTop: "12px", padding: "6px 12px", cursor: "pointer", borderRadius: "4px", border: "1px solid #ccc", background: "#fff" }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#FAFAF8", padding: "24px", borderRadius: "8px" }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <FileCheck size={20} color="#1D9E75" />
          <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>Submittals</h3>
          <span style={{ fontSize: "12px", color: "#888", background: "#eee", padding: "2px 8px", borderRadius: "10px" }}>{submittals.length}</span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", backgroundColor: "#1D9E75", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}
        >
          <Plus size={14} /> New Submittal
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Filter size={14} color="#888" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as Submittal["status"] | "all")} style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "12px" }}>
            <option value="all">All Status</option>
            {Object.entries(statusColors).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <SortAsc size={14} color="#888" />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as "date" | "status" | "due_date")} style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "12px" }}>
            <option value="date">Newest First</option>
            <option value="due_date">Due Date</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      {/* Empty State */}
      {sortedSubmittals.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px", color: "#888" }}>
          <BookOpen size={32} style={{ marginBottom: "8px", opacity: 0.5 }} />
          <p style={{ margin: 0, fontSize: "14px" }}>
            {filterStatus === "all" ? "No submittals yet. Create your first one!" : `No submittals matching that filter.`}
          </p>
        </div>
      )}

      {/* Submittal Cards */}
      {sortedSubmittals.map((submittal) => {
        const sc = statusColors[submittal.status];
        return (
          <div key={submittal.id} style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  {submittal.spec_section && (
                    <span style={{ fontSize: "11px", color: "#666", fontFamily: "monospace", background: "#f0f0f0", padding: "1px 6px", borderRadius: "3px" }}>{submittal.spec_section}</span>
                  )}
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px", backgroundColor: sc.bg, color: sc.text }}>{sc.label}</span>
                </div>
                <p style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: 500 }}>{submittal.description}</p>
                <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "#888" }}>
                  {submittal.subcontractor && <span>Sub: {submittal.subcontractor}</span>}
                  {submittal.due_date && <span>Due: {new Date(submittal.due_date).toLocaleDateString()}</span>}
                  <span>Created: {new Date(submittal.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <button onClick={() => deleteSubmittal(submittal.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#999" }} title="Delete">
                <Trash2 size={14} />
              </button>
            </div>

            {/* Status Quick Actions */}
            <div style={{ display: "flex", gap: "4px", marginTop: "10px", flexWrap: "wrap" }}>
              {(["pending", "submitted", "under_review", "approved", "approved_as_noted", "rejected", "resubmit"] as Submittal["status"][])
                .filter((s) => s !== submittal.status)
                .map((s) => (
                  <button
                    key={s}
                    onClick={() => updateSubmittalStatus(submittal.id, s)}
                    style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", border: `1px solid ${statusColors[s].bg}`, background: "#fff", color: statusColors[s].text, cursor: "pointer" }}
                  >
                    → {statusColors[s].label}
                  </button>
                ))}
            </div>

            {/* Review Notes */}
            <div style={{ marginTop: "10px", borderTop: "1px solid #eee", paddingTop: "8px" }}>
              {editingReviewId === submittal.id ? (
                <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                  <textarea
                    value={editingReviewText}
                    onChange={(e) => setEditingReviewText(e.target.value)}
                    placeholder="Add review notes..."
                    style={{ flex: 1, padding: "6px", fontSize: "12px", borderRadius: "4px", border: "1px solid #ccc", minHeight: "60px", resize: "vertical" }}
                  />
                  <button onClick={() => saveReviewNotes(submittal.id)} disabled={savingReview} style={{ padding: "4px 8px", background: "#1D9E75", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                    {savingReview ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={12} />}
                  </button>
                  <button onClick={() => { setEditingReviewId(null); setEditingReviewText(""); }} style={{ padding: "4px 8px", background: "#eee", border: "none", borderRadius: "4px", cursor: "pointer" }}>
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingReviewId(submittal.id); setEditingReviewText(submittal.review_notes || ""); }}
                  style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "#888" }}
                >
                  <MessageSquare size={12} />
                  {submittal.review_notes ? submittal.review_notes.substring(0, 60) + (submittal.review_notes.length > 60 ? "..." : "") : "Add review notes"}
                </button>
              )}
            </div>

            {/* Linked Entities */}
            {submittal.linked_entities && submittal.linked_entities.length > 0 && (
              <div style={{ marginTop: "8px", display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
                <LinkIcon size={12} color="#888" />
                {submittal.linked_entities.map((entityId) => (
                  <span key={entityId} style={{ fontSize: "11px", background: "#e8f5e9", color: "#1D9E75", padding: "1px 6px", borderRadius: "4px" }}>{entityId}</span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: "12px", padding: "24px", width: "90%", maxWidth: "500px", maxHeight: "80vh", overflow: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px" }}>New Submittal</h3>
              <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={18} /></button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "#555", display: "block", marginBottom: "4px" }}>Spec Section</label>
                <input type="text" value={formData.spec_section} onChange={(e) => setFormData({ ...formData, spec_section: e.target.value })} placeholder="e.g. 03 30 00" style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "13px", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "#555", display: "block", marginBottom: "4px" }}>Description *</label>
                <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Describe the submittal..." style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "13px", minHeight: "60px", resize: "vertical", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "#555", display: "block", marginBottom: "4px" }}>Subcontractor</label>
                <input type="text" value={formData.subcontractor} onChange={(e) => setFormData({ ...formData, subcontractor: e.target.value })} placeholder="Subcontractor name" style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "13px", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "#555", display: "block", marginBottom: "4px" }}>Due Date</label>
                <input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "13px", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "#555", display: "block", marginBottom: "4px" }}>Priority</label>
                <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "13px" }}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Entity Linking */}
              <div>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "#555", display: "block", marginBottom: "4px" }}>
                  <LinkIcon size={12} style={{ display: "inline", marginRight: "4px" }} /> Link Knowledge Entities
                </label>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input type="text" value={entitySearchQuery} onChange={(e) => handleSearchEntities(e.target.value)} onFocus={() => setShowEntitySearch(true)} placeholder="Search entities..." style={{ flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #ccc", fontSize: "13px" }} />
                  <button onClick={() => handleSearchEntities(entitySearchQuery)} style={{ padding: "8px", background: "#f0f0f0", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer" }}><Search size={14} /></button>
                </div>
                {searchResults.length > 0 && (
                  <div style={{ border: "1px solid #e0e0e0", borderRadius: "4px", marginTop: "4px", maxHeight: "120px", overflow: "auto" }}>
                    {searchResults.map((entity) => (
                      <button key={entity.id} onClick={() => addLinkedEntity(entity)} style={{ display: "block", width: "100%", textAlign: "left", padding: "6px 8px", border: "none", borderBottom: "1px solid #f0f0f0", background: "#fff", cursor: "pointer", fontSize: "12px" }}>
                        {entity.icon || "📄"} {entity.title} <span style={{ color: "#aaa" }}>({entity.type})</span>
                      </button>
                    ))}
                  </div>
                )}
                {formData.linked_entities.length > 0 && (
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "6px" }}>
                    {formData.linked_entities.map((id) => (
                      <span key={id} style={{ fontSize: "11px", background: "#e8f5e9", color: "#1D9E75", padding: "2px 6px", borderRadius: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                        {id}
                        <button onClick={() => removeLinkedEntity(id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}><X size={10} color="#1D9E75" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "20px" }}>
              <button onClick={resetForm} style={{ padding: "8px 16px", background: "#eee", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>Cancel</button>
              <button
                onClick={createSubmittal}
                disabled={!formData.description.trim()}
                style={{ padding: "8px 16px", background: formData.description.trim() ? "#1D9E75" : "#ccc", color: "#fff", border: "none", borderRadius: "6px", cursor: formData.description.trim() ? "pointer" : "not-allowed", fontSize: "13px", fontWeight: 500 }}
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
