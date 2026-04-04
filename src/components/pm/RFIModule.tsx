"use client";

import { useState } from "react";
// Sprint 3 - Enhanced RFI module with CRUD, filtering, and linked entities

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
  created_at: string;
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

const mockRFIs: RFI[] = [
  {
    id: "rfi-1",
    number: 1,
    subject: "Window Detail Clarification",
    description: "Need clarification on the window header detail for the storefront",
    status: "open",
    priority: "high",
    assigned_to: "John Smith",
    due_date: "2025-04-15",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "rfi-2",
    number: 2,
    subject: "Electrical Layout Revision",
    description: "Design team needs to confirm outlet locations in conference room",
    status: "under_review",
    priority: "medium",
    assigned_to: "Sarah Johnson",
    due_date: "2025-04-18",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "rfi-3",
    number: 3,
    subject: "Ceiling Height Question",
    description: "Client wants to discuss minimum ceiling height in office areas",
    status: "answered",
    priority: "medium",
    assigned_to: "Mike Davis",
    due_date: "2025-04-10",
    answer: "Confirmed 9 ft minimum clearance in all office areas per client request",
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "rfi-4",
    number: 4,
    subject: "HVAC Equipment Location",
    description: "Need to confirm mechanical room size for planned HVAC equipment",
    status: "draft",
    priority: "low",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function RFIModule({ projectId }: RFIModuleProps) {
  const [rfis, setRfis] = useState<RFI[]>(mockRFIs);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<RFI["status"] | "all">("all");
  const [sortBy, setSortBy] = useState<"date" | "priority" | "status">("date");

  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    assigned_to: "",
    priority: "medium" as RFI["priority"],
    due_date: "",
  });

  const openRFIs = rfis.filter((r) => r.status === "open").length;

  const filteredRFIs = rfis.filter((r) => (filterStatus === "all" ? true : r.status === filterStatus));

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

  const handleCreateRFI = () => {
    if (!formData.subject.trim()) return;

    const newRFI: RFI = {
      id: `rfi-${Date.now()}`,
      number: Math.max(...rfis.map((r) => r.number), 0) + 1,
      subject: formData.subject,
      description: formData.description,
      status: "draft",
      priority: formData.priority,
      assigned_to: formData.assigned_to || undefined,
      due_date: formData.due_date || undefined,
      created_at: new Date().toISOString(),
    };

    setRfis([...rfis, newRFI]);
    setFormData({
      subject: "",
      description: "",
      assigned_to: "",
      priority: "medium",
      due_date: "",
    });
    setShowCreateModal(false);
  };

  const updateRFIStatus = (id: string, newStatus: RFI["status"]) => {
    setRfis(rfis.map((r) => (r.id === id ? { ...r, status: newStatus } : r)));
  };

  const cardStyle = {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e4e8",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "12px",
  };

  const card = "grid gap-4";

  return (
    <div>
      {/* Header with count badge */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--fg)", marginBottom: "4px" }}>RFIs</h3>
            <p style={{ fontSize: "13px", color: "var(--fg-secondary)" }}>
              {openRFIs} open RFI{openRFIs !== 1 ? "s" : ""}
            </p>
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
            + Create RFI
          </button>
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
          <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--fg)", marginBottom: "4px" }}>No RFIs yet</p>
          <p style={{ fontSize: "12px", color: "var(--fg-secondary)" }}>Create your first RFI to track questions</p>
        </div>
      ) : (
        sortedRFIs.map((rfi) => {
          const statusColor = statusColors[rfi.status];
          const priorityColor = priorityColors[rfi.priority];

          return (
            <div key={rfi.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--fg-secondary)" }}>RFI #{rfi.number}</span>
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
                  <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--fg)", marginBottom: "4px" }}>{rfi.subject}</h4>
                  {rfi.description && (
                    <p style={{ fontSize: "12px", color: "var(--fg-secondary)", marginBottom: "8px", lineHeight: "1.5" }}>
                      {rfi.description}
                    </p>
                  )}

                  <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--fg-secondary)" }}>
                    {rfi.assigned_to && <div>👤 {rfi.assigned_to}</div>}
                    {rfi.due_date && <div>📅 {new Date(rfi.due_date).toLocaleDateString()}</div>}
                  </div>

                  {rfi.answer && (
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
                    </div>
                  )}
                </div>

                {/* Quick status update buttons */}
                <select
                  value={rfi.status}
                  onChange={(e) => updateRFIStatus(rfi.id, e.target.value as RFI["status"])}
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
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                  <option value="under_review">Under Review</option>
                  <option value="answered">Answered</option>
                  <option value="closed">Closed</option>
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
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--fg)", marginBottom: "16px" }}>Create New RFI</h3>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--fg)", marginBottom: "6px" }}>
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
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--fg)", marginBottom: "6px" }}>
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
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--fg)", marginBottom: "6px" }}>
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as RFI["priority"] })}
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

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--fg)", marginBottom: "6px" }}>
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
