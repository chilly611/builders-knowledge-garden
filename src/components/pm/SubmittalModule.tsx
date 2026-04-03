"use client";

import { useState } from "react";

interface Submittal {
  id: string;
  number: number;
  spec_section: string;
  description: string;
  status: "required" | "submitted" | "under_review" | "approved" | "revise_resubmit" | "rejected";
  subcontractor?: string;
  due_date?: string;
  review_notes?: string;
  created_at: string;
}

interface SubmittalModuleProps {
  projectId: string;
}

const statusColors: Record<Submittal["status"], { bg: string; text: string; label: string }> = {
  required: { bg: "#e9ecef", text: "#555555", label: "Required" },
  submitted: { bg: "#cfe2ff", text: "#0c63e4", label: "Submitted" },
  under_review: { bg: "#fff3cd", text: "#856404", label: "Under Review" },
  approved: { bg: "#d1e7dd", text: "#0f5132", label: "Approved" },
  revise_resubmit: { bg: "#ffe5b4", text: "#d97706", label: "Revise & Resubmit" },
  rejected: { bg: "#f8d7da", text: "#721c24", label: "Rejected" },
};

const mockSubmittals: Submittal[] = [
  {
    id: "sub-1",
    number: 1,
    spec_section: "06 10 00",
    description: "Structural Steel Shapes and Plates - Shop Drawings",
    status: "approved",
    subcontractor: "Steel Fabricators Inc",
    due_date: "2025-04-10",
    review_notes: "Approved as submitted. Fabrication can begin.",
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sub-2",
    number: 2,
    spec_section: "07 21 13",
    description: "Board Insulation - Product Data and Installation Details",
    status: "under_review",
    subcontractor: "Building Envelope Systems",
    due_date: "2025-04-12",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sub-3",
    number: 3,
    spec_section: "08 11 13",
    description: "Aluminum Storefront Frames - Shop Drawings",
    status: "revise_resubmit",
    subcontractor: "Window & Door Specialists",
    due_date: "2025-04-08",
    review_notes: "Revision needed: Confirm mullion sizing calculations and horizontal bracing layout.",
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "sub-4",
    number: 4,
    spec_section: "22 13 16",
    description: "Sanitary Waste and Vent Piping - Shop Drawings",
    status: "submitted",
    subcontractor: "Mechanical Systems",
    due_date: "2025-04-20",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function SubmittalModule({ projectId }: SubmittalModuleProps) {
  const [submittals, setSubmittals] = useState<Submittal[]>(mockSubmittals);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<Submittal["status"] | "all">("all");

  const [formData, setFormData] = useState({
    spec_section: "",
    description: "",
    subcontractor: "",
    due_date: "",
  });

  const approvedCount = submittals.filter((s) => s.status === "approved").length;
  const pendingCount = submittals.filter((s) => ["required", "submitted", "under_review", "revise_resubmit"].includes(s.status)).length;

  const filteredSubmittals = submittals.filter((s) => (filterStatus === "all" ? true : s.status === filterStatus));

  const sortedSubmittals = [...filteredSubmittals].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleCreateSubmittal = () => {
    if (!formData.description.trim() || !formData.spec_section.trim()) return;

    const newSubmittal: Submittal = {
      id: `sub-${Date.now()}`,
      number: Math.max(...submittals.map((s) => s.number), 0) + 1,
      spec_section: formData.spec_section,
      description: formData.description,
      status: "required",
      subcontractor: formData.subcontractor || undefined,
      due_date: formData.due_date || undefined,
      created_at: new Date().toISOString(),
    };

    setSubmittals([...submittals, newSubmittal]);
    setFormData({
      spec_section: "",
      description: "",
      subcontractor: "",
      due_date: "",
    });
    setShowCreateModal(false);
  };

  const updateSubmittalStatus = (id: string, newStatus: Submittal["status"]) => {
    setSubmittals(submittals.map((s) => (s.id === id ? { ...s, status: newStatus } : s)));
  };

  const cardStyle = {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e4e8",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "12px",
  };

  return (
    <div>
      {/* Header with count badges */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--fg)", marginBottom: "4px" }}>Submittals</h3>
            <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--fg-secondary)" }}>
              <span>{approvedCount} approved</span>
              <span>{pendingCount} pending</span>
            </div>
          </div>
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
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            + Add Submittal
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as Submittal["status"] | "all")}
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
            <option value="required">Required</option>
            <option value="submitted">Submitted</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="revise_resubmit">Revise & Resubmit</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Submittal List */}
      {sortedSubmittals.length === 0 ? (
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
          <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--fg)", marginBottom: "4px" }}>No submittals yet</p>
          <p style={{ fontSize: "12px", color: "var(--fg-secondary)" }}>Add a submittal to track shop drawings and product data</p>
        </div>
      ) : (
        sortedSubmittals.map((submittal) => {
          const statusColor = statusColors[submittal.status];
          const daysOverdue =
            submittal.due_date && new Date(submittal.due_date) < new Date()
              ? Math.floor(
                  (new Date().getTime() - new Date(submittal.due_date).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
              : 0;

          return (
            <div key={submittal.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, background: "#e9ecef", padding: "2px 6px", borderRadius: "3px" }}>
                      {submittal.spec_section}
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
                    {daysOverdue > 0 && (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          fontSize: "10px",
                          fontWeight: 500,
                          background: "#dc3545",
                          color: "#ffffff",
                          borderRadius: "4px",
                        }}
                      >
                        {daysOverdue}d overdue
                      </span>
                    )}
                  </div>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--fg)", marginBottom: "8px" }}>{submittal.description}</h4>

                  <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--fg-secondary)", marginBottom: "8px" }}>
                    {submittal.subcontractor && <div>🏢 {submittal.subcontractor}</div>}
                    {submittal.due_date && <div>📅 {new Date(submittal.due_date).toLocaleDateString()}</div>}
                  </div>

                  {submittal.review_notes && (
                    <div
                      style={{
                        padding: "10px 12px",
                        background:
                          submittal.status === "revise_resubmit" ? "#fff3cd" : submittal.status === "approved" ? "#d1e7dd" : "#f8f9fa",
                        borderLeft: `3px solid ${statusColor.text}`,
                        borderRadius: "4px",
                        fontSize: "12px",
                        color: "var(--fg-secondary)",
                      }}
                    >
                      <strong>Note:</strong> {submittal.review_notes}
                    </div>
                  )}
                </div>

                {/* Quick status update */}
                <select
                  value={submittal.status}
                  onChange={(e) => updateSubmittalStatus(submittal.id, e.target.value as Submittal["status"])}
                  style={{
                    padding: "6px 8px",
                    fontSize: "11px",
                    border: "1px solid #e2e4e8",
                    borderRadius: "4px",
                    background: "#ffffff",
                    cursor: "pointer",
                    marginLeft: "12px",
                  }}
                >
                  <option value="required">Required</option>
                  <option value="submitted">Submitted</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="revise_resubmit">Revise & Resubmit</option>
                  <option value="rejected">Rejected</option>
                </select>
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
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--fg)", marginBottom: "16px" }}>Add New Submittal</h3>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--fg)", marginBottom: "6px" }}>
                Spec Section (e.g., 06 10 00)
              </label>
              <input
                type="text"
                value={formData.spec_section}
                onChange={(e) => setFormData({ ...formData, spec_section: e.target.value })}
                placeholder="Specification section number"
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
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--fg)", marginBottom: "6px" }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Submittal description (e.g., Shop Drawings, Product Data)"
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
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--fg)", marginBottom: "6px" }}>
                  Subcontractor
                </label>
                <input
                  type="text"
                  value={formData.subcontractor}
                  onChange={(e) => setFormData({ ...formData, subcontractor: e.target.value })}
                  placeholder="Subcontractor name"
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
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--fg)", marginBottom: "6px" }}>
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
                onClick={handleCreateSubmittal}
                disabled={!formData.description.trim() || !formData.spec_section.trim()}
                style={{
                  padding: "8px 16px",
                  background: formData.description.trim() && formData.spec_section.trim() ? "var(--accent)" : "#ccc",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: formData.description.trim() && formData.spec_section.trim() ? "pointer" : "not-allowed",
                }}
              >
                Add Submittal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
