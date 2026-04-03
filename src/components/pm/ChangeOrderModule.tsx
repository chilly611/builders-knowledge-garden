"use client";

import { useState } from "react";

interface ChangeOrder {
  id: string;
  number: number;
  description: string;
  reason: "owner_request" | "field_condition" | "code_requirement" | "design_error";
  cost_impact: number;
  schedule_impact_days: number;
  status: "proposed" | "under_review" | "approved" | "executed" | "rejected";
  created_at: string;
}

interface ChangeOrderModuleProps {
  projectId: string;
}

const statusColors: Record<ChangeOrder["status"], { bg: string; text: string; label: string }> = {
  proposed: { bg: "#e9ecef", text: "#555555", label: "Proposed" },
  under_review: { bg: "#fff3cd", text: "#856404", label: "Under Review" },
  approved: { bg: "#cfe2ff", text: "#0c63e4", label: "Approved" },
  executed: { bg: "#d1e7dd", text: "#0f5132", label: "Executed" },
  rejected: { bg: "#f8d7da", text: "#721c24", label: "Rejected" },
};

const reasonLabels: Record<ChangeOrder["reason"], string> = {
  owner_request: "Owner Request",
  field_condition: "Field Condition",
  code_requirement: "Code Requirement",
  design_error: "Design Error",
};

const mockChangeOrders: ChangeOrder[] = [
  {
    id: "co-1",
    number: 1,
    description: "Additional insulation in west-facing walls due to energy code update",
    reason: "code_requirement",
    cost_impact: 18500,
    schedule_impact_days: 3,
    status: "executed",
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "co-2",
    number: 2,
    description: "Structural reinforcement required due to soil bearing capacity findings",
    reason: "field_condition",
    cost_impact: 42000,
    schedule_impact_days: 7,
    status: "approved",
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "co-3",
    number: 3,
    description: "Upgrade HVAC system to variable refrigerant flow per client request",
    reason: "owner_request",
    cost_impact: 65000,
    schedule_impact_days: 5,
    status: "under_review",
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const originalBudget = 2500000;

export default function ChangeOrderModule({ projectId }: ChangeOrderModuleProps) {
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>(mockChangeOrders);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ChangeOrder["status"] | "all">("all");

  const [formData, setFormData] = useState({
    description: "",
    reason: "owner_request" as ChangeOrder["reason"],
    cost_impact: 0,
    schedule_impact_days: 0,
  });

  const filteredCOs = changeOrders.filter((co) => (filterStatus === "all" ? true : co.status === filterStatus));
  const sortedCOs = [...filteredCOs].sort((a, b) => b.number - a.number);

  // Calculate budget impact
  const approvedCostImpact = changeOrders.filter((co) => co.status === "executed").reduce((sum, co) => sum + co.cost_impact, 0);
  const pendingCostImpact = changeOrders
    .filter((co) => ["approved", "under_review"].includes(co.status))
    .reduce((sum, co) => sum + co.cost_impact, 0);
  const totalScheduleImpact = changeOrders
    .filter((co) => ["approved", "executed"].includes(co.status))
    .reduce((sum, co) => sum + co.schedule_impact_days, 0);

  const handleCreateCO = () => {
    if (!formData.description.trim()) return;

    const newCO: ChangeOrder = {
      id: `co-${Date.now()}`,
      number: Math.max(...changeOrders.map((co) => co.number), 0) + 1,
      description: formData.description,
      reason: formData.reason,
      cost_impact: formData.cost_impact,
      schedule_impact_days: formData.schedule_impact_days,
      status: "proposed",
      created_at: new Date().toISOString(),
    };

    setChangeOrders([...changeOrders, newCO]);
    setFormData({
      description: "",
      reason: "owner_request",
      cost_impact: 0,
      schedule_impact_days: 0,
    });
    setShowCreateModal(false);
  };

  const updateCOStatus = (id: string, newStatus: ChangeOrder["status"]) => {
    setChangeOrders(changeOrders.map((co) => (co.id === id ? { ...co, status: newStatus } : co)));
  };

  const cardStyle = {
    backgroundColor: "#ffffff",
    border: "1px solid #e2e4e8",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "12px",
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div>
      {/* Header with budget summary */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--fg)", marginBottom: "4px" }}>Change Orders</h3>
            <p style={{ fontSize: "12px", color: "var(--fg-secondary)" }}>Track cost and schedule impacts</p>
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
            + Create CO
          </button>
        </div>

        {/* Budget Impact Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid #e2e4e8",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--fg-secondary)", marginBottom: "4px" }}>Original Budget</div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--fg)" }}>{formatCurrency(originalBudget)}</div>
          </div>
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid #e2e4e8",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--fg-secondary)", marginBottom: "4px" }}>Executed COs</div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: approvedCostImpact > 0 ? "#dc3545" : "var(--accent)",
              }}
            >
              {approvedCostImpact > 0 ? "+" : ""}{formatCurrency(approvedCostImpact)}
            </div>
          </div>
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid #e2e4e8",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--fg-secondary)", marginBottom: "4px" }}>Pending COs</div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: pendingCostImpact > 0 ? "#f0a500" : "var(--fg-secondary)",
              }}
            >
              {pendingCostImpact > 0 ? "+" : ""}{formatCurrency(pendingCostImpact)}
            </div>
          </div>
          <div
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid #e2e4e8",
              borderRadius: "8px",
              padding: "12px",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--fg-secondary)", marginBottom: "4px" }}>Schedule Impact</div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: totalScheduleImpact > 0 ? "#dc3545" : "var(--accent)",
              }}
            >
              {totalScheduleImpact > 0 ? "+" : ""}{totalScheduleImpact} days
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ChangeOrder["status"] | "all")}
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
            <option value="proposed">Proposed</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="executed">Executed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Change Orders List */}
      {sortedCOs.length === 0 ? (
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
          <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--fg)", marginBottom: "4px" }}>No change orders yet</p>
          <p style={{ fontSize: "12px", color: "var(--fg-secondary)" }}>Create a change order to track cost and schedule impacts</p>
        </div>
      ) : (
        sortedCOs.map((co) => {
          const statusColor = statusColors[co.status];

          return (
            <div key={co.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--fg-secondary)" }}>CO #{co.number}</span>
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
                        background: "#f3f4f6",
                        color: "#555555",
                        borderRadius: "4px",
                      }}
                    >
                      {reasonLabels[co.reason]}
                    </span>
                  </div>
                  <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--fg)", marginBottom: "12px" }}>{co.description}</h4>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--fg-secondary)", marginBottom: "2px" }}>Cost Impact</div>
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: 700,
                          color: co.cost_impact > 0 ? "#dc3545" : "var(--accent)",
                        }}
                      >
                        {co.cost_impact > 0 ? "+" : ""}{formatCurrency(co.cost_impact)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--fg-secondary)", marginBottom: "2px" }}>Schedule</div>
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: 700,
                          color: co.schedule_impact_days > 0 ? "#dc3545" : "var(--accent)",
                        }}
                      >
                        {co.schedule_impact_days > 0 ? "+" : ""}{co.schedule_impact_days} days
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick status update */}
                <select
                  value={co.status}
                  onChange={(e) => updateCOStatus(co.id, e.target.value as ChangeOrder["status"])}
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
                  <option value="proposed">Proposed</option>
                  <option value="under_review">Under Review</option>
                  <option value="approved">Approved</option>
                  <option value="executed">Executed</option>
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
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--fg)", marginBottom: "16px" }}>Create Change Order</h3>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--fg)", marginBottom: "6px" }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the change"
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

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--fg)", marginBottom: "6px" }}>
                Reason
              </label>
              <select
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value as ChangeOrder["reason"] })}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "13px",
                  border: "1px solid #e2e4e8",
                  borderRadius: "6px",
                }}
              >
                <option value="owner_request">Owner Request</option>
                <option value="field_condition">Field Condition</option>
                <option value="code_requirement">Code Requirement</option>
                <option value="design_error">Design Error</option>
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 500, color: "var(--fg)", marginBottom: "6px" }}>
                  Cost Impact ($)
                </label>
                <input
                  type="number"
                  value={formData.cost_impact}
                  onChange={(e) => setFormData({ ...formData, cost_impact: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
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
                  Schedule Impact (days)
                </label>
                <input
                  type="number"
                  value={formData.schedule_impact_days}
                  onChange={(e) => setFormData({ ...formData, schedule_impact_days: parseInt(e.target.value) || 0 })}
                  placeholder="0"
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
                onClick={handleCreateCO}
                disabled={!formData.description.trim()}
                style={{
                  padding: "8px 16px",
                  background: formData.description.trim() ? "var(--accent)" : "#ccc",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: formData.description.trim() ? "pointer" : "not-allowed",
                }}
              >
                Create CO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
