"use client";

import { useState } from "react";
import { CompletionRing } from "@/components/Gamification";

interface PunchItem {
  id: string;
  location: string;
  description: string;
  assigned_trade: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in_progress" | "complete" | "verified";
  created_at: string;
}

interface PunchListModuleProps {
  projectId: string;
}

const statusColors: Record<PunchItem["status"], { bg: string; text: string; label: string; emoji: string }> = {
  open: { bg: "#f8d7da", text: "#721c24", label: "Open", emoji: "🔴" },
  in_progress: { bg: "#fff3cd", text: "#856404", label: "In Progress", emoji: "🟠" },
  complete: { bg: "#cfe2ff", text: "#0c63e4", label: "Complete", emoji: "🔵" },
  verified: { bg: "#d1e7dd", text: "#0f5132", label: "Verified", emoji: "✅" },
};

const priorityColors: Record<PunchItem["priority"], { bg: string; text: string }> = {
  low: { bg: "#e9ecef", text: "#555555" },
  medium: { bg: "#fff3cd", text: "#856404" },
  high: { bg: "#f8d7da", text: "#721c24" },
  critical: { bg: "#dc3545", text: "#ffffff" },
};

const tradeCategories = [
  "Carpentry",
  "Electrical",
  "Plumbing",
  "HVAC",
  "Painting",
  "Drywall",
  "Flooring",
  "Masonry",
  "Landscaping",
  "General Labor",
];

const mockPunchItems: PunchItem[] = [
  {
    id: "pi-1",
    location: "Main Lobby - East Wall",
    description: "Paint touch-ups needed on drywall seams",
    assigned_trade: "Painting",
    priority: "low",
    status: "open",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "pi-2",
    location: "Conference Room A",
    description: "Install missing outlet covers in southeast corner",
    assigned_trade: "Electrical",
    priority: "medium",
    status: "in_progress",
    created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "pi-3",
    location: "2nd Floor Corridor",
    description: "Fix alignment of ceiling tiles above door frame",
    assigned_trade: "General Labor",
    priority: "medium",
    status: "complete",
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "pi-4",
    location: "Mechanical Room",
    description: "Seal gaps around ductwork penetrations",
    assigned_trade: "HVAC",
    priority: "high",
    status: "open",
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "pi-5",
    location: "Exterior - North Side",
    description: "Caulk gaps between storefront and building facade",
    assigned_trade: "Carpentry",
    priority: "high",
    status: "in_progress",
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "pi-6",
    location: "Main Restrooms",
    description: "Repair leaking toilet in stall 2",
    assigned_trade: "Plumbing",
    priority: "critical",
    status: "open",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export default function PunchListModule({ projectId }: PunchListModuleProps) {
  const [punchItems, setPunchItems] = useState<PunchItem[]>(mockPunchItems);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<PunchItem["status"] | "all">("all");
  const [filterTrade, setFilterTrade] = useState<string>("all");

  const [formData, setFormData] = useState({
    location: "",
    description: "",
    assigned_trade: "General Labor",
    priority: "medium" as PunchItem["priority"],
  });

  const filteredItems = punchItems.filter((item) => {
    const statusMatch = filterStatus === "all" ? true : item.status === filterStatus;
    const tradeMatch = filterTrade === "all" ? true : item.assigned_trade === filterTrade;
    return statusMatch && tradeMatch;
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const statusOrder = { open: 0, in_progress: 1, complete: 2, verified: 3 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return statusOrder[a.status] - statusOrder[b.status];
  });

  // Calculate completion stats
  const totalItems = punchItems.length;
  const completedItems = punchItems.filter((item) => item.status === "verified").length;
  const completionPercent = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const openCount = punchItems.filter((item) => item.status === "open").length;
  const inProgressCount = punchItems.filter((item) => item.status === "in_progress").length;
  const completeCount = punchItems.filter((item) => item.status === "complete").length;

  const handleCreateItem = () => {
    if (!formData.location.trim() || !formData.description.trim()) return;

    const newItem: PunchItem = {
      id: `pi-${Date.now()}`,
      location: formData.location,
      description: formData.description,
      assigned_trade: formData.assigned_trade,
      priority: formData.priority,
      status: "open",
      created_at: new Date().toISOString(),
    };

    setPunchItems([...punchItems, newItem]);
    setFormData({
      location: "",
      description: "",
      assigned_trade: "General Labor",
      priority: "medium",
    });
    setShowCreateModal(false);
  };

  const updateItemStatus = (id: string, newStatus: PunchItem["status"]) => {
    setPunchItems(punchItems.map((item) => (item.id === id ? { ...item, status: newStatus } : item)));
  };

  const cardStyle = {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e4e8",
    borderRadius: "8px",
    padding: "14px",
    marginBottom: "10px",
  };

  return (
    <div>
      {/* Header with completion ring */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--fg)", marginBottom: "4px" }}>Punch List</h3>
            <p style={{ fontSize: "12px", color: "var(--fg-secondary)" }}>{completedItems} of {totalItems} items verified</p>
          </div>

          {/* Completion Ring */}
          <div style={{ marginRight: "16px" }}>
            <CompletionRing percent={completionPercent} size={56} strokeWidth={3}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent)" }}>
                {Math.round(completionPercent)}%
              </span>
            </CompletionRing>
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
            + Add Item
          </button>
        </div>

        {/* Status Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid #e2e4e8",
              borderRadius: "8px",
              padding: "12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--fg-secondary)", marginBottom: "4px" }}>Open</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#721c24" }}>{openCount}</div>
          </div>
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid #e2e4e8",
              borderRadius: "8px",
              padding: "12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--fg-secondary)", marginBottom: "4px" }}>In Progress</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#856404" }}>{inProgressCount}</div>
          </div>
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid #e2e4e8",
              borderRadius: "8px",
              padding: "12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--fg-secondary)", marginBottom: "4px" }}>Complete</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0c63e4" }}>{completeCount}</div>
          </div>
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid #e2e4e8",
              borderRadius: "8px",
              padding: "12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--fg-secondary)", marginBottom: "4px" }}>Verified</div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: "#0f5132" }}>{completedItems}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as PunchItem["status"] | "all")}
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
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="complete">Complete</option>
            <option value="verified">Verified</option>
          </select>

          <select
            value={filterTrade}
            onChange={(e) => setFilterTrade(e.target.value)}
            style={{
              padding: "8px 12px",
              fontSize: "12px",
              border: "1px solid #e2e4e8",
              borderRadius: "6px",
              background: "#ffffff",
              cursor: "pointer",
            }}
          >
            <option value="all">All Trades</option>
            {tradeCategories.map((trade) => (
              <option key={trade} value={trade}>
                {trade}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Punch Items List */}
      {sortedItems.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "32px 16px",
            background: "var(--bg-secondary)",
            borderRadius: "8px",
            border: "1px dashed #e2e4e8",
          }}
        >
          <div style={{ fontSize: "28px", marginBottom: "8px" }}>✓</div>
          <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--fg)", marginBottom: "4px" }}>All punches cleared!</p>
          <p style={{ fontSize: "12px", color: "var(--fg-secondary)" }}>Great job! No items to track.</p>
        </div>
      ) : (
        sortedItems.map((item) => {
          const statusColor = statusColors[item.status];
          const priorityColor = priorityColors[item.priority];

          return (
            <div key={item.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "16px" }}>{statusColor.emoji}</span>
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
                      {item.priority}
                    </span>
                  </div>

                  <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--fg)", marginBottom: "4px" }}>{item.description}</h4>

                  <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "var(--fg-secondary)" }}>
                    <div>📍 {item.location}</div>
                    <div>🔨 {item.assigned_trade}</div>
                  </div>
                </div>

                {/* Quick status update */}
                <select
                  value={item.status}
                  onChange={(e) => updateItemStatus(item.id, e.target.value as PunchItem["status"])}
                  style={{
                    padding: "4px 6px",
                    fontSize: "10px",
                    border: "1px solid #e2e4e8",
                    borderRadius: "4px",
                    background: "#ffffff",
                    cursor: "pointer",
                    marginLeft: "12px",
                    minWidth: "100px",
                  }}
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="complete">Complete</option>
                  <option value="verified">Verified</option>
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
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--fg)", marginBottom: "16px" }}>Add Punch Item</h3>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--fg)", marginBottom: "6px" }}>
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Main Lobby - East Wall"
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
                placeholder="Describe the punch item"
                rows={3}
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
                  Trade
                </label>
                <select
                  value={formData.assigned_trade}
                  onChange={(e) => setFormData({ ...formData, assigned_trade: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: "13px",
                    border: "1px solid #e2e4e8",
                    borderRadius: "6px",
                  }}
                >
                  {tradeCategories.map((trade) => (
                    <option key={trade} value={trade}>
                      {trade}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--fg)", marginBottom: "6px" }}>
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as PunchItem["priority"] })}
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
                  <option value="critical">Critical</option>
                </select>
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
                onClick={handleCreateItem}
                disabled={!formData.location.trim() || !formData.description.trim()}
                style={{
                  padding: "8px 16px",
                  background: formData.location.trim() && formData.description.trim() ? "var(--accent)" : "#ccc",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: formData.location.trim() && formData.description.trim() ? "pointer" : "not-allowed",
                }}
              >
                Add Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
