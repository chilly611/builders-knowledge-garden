"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Plus, RefreshCw, Edit3, Check, X, Loader2, BarChart3 } from "lucide-react";

interface BudgetLine {
  id: string;
  project_id: string;
  division: string;
  name: string;
  budgeted: number;
  committed: number;
  actual_spent: number;
  notes?: string;
}

interface BudgetModuleProps {
  projectId: string;
}

const getVarianceColor = (budgeted: number, spent: number, committed: number) => {
  const totalCommitted = spent + (committed - spent);
  const variance = ((totalCommitted - budgeted) / budgeted) * 100;

  if (variance < -5) return "#1D9E75";
  if (variance < 10) return "#f0a500";
  return "#dc3545";
};

const getVariancePercent = (budgeted: number, spent: number, committed: number) => {
  const totalCommitted = spent + (committed - spent);
  return Math.round(((totalCommitted - budgeted) / budgeted) * 100);
};

export default function BudgetModule({ projectId }: BudgetModuleProps) {
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDivision, setExpandedDivision] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAddLineModal, setShowAddLineModal] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const [newLineData, setNewLineData] = useState({
    division: "",
    name: "",
    budgeted: 0,
    committed: 0,
    actual_spent: 0,
  });

  // Fetch budget lines on mount
  useEffect(() => {
    fetchBudgetLines();
  }, [projectId]);

  const fetchBudgetLines = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/projects/budget-lines?projectId=${projectId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch budget lines");
      }
      const data = await response.json();
      setBudgetLines(data.lines || []);

      if (!data.lines || data.lines.length === 0) {
        // Generate AI estimate if no lines exist
        generateAIEstimate();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load budget");
      setBudgetLines([]);
    } finally {
      setLoading(false);
    }
  };

  const generateAIEstimate = async () => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/v1/projects/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (response.ok) {
        const data = await response.json();
        setBudgetLines(data.estimatedLines || []);
        setAiInsight(data.insight);
      }
    } catch (err) {
      console.error("AI estimate generation failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddLineItem = async () => {
    if (!newLineData.division || !newLineData.name) {
      setError("Division and name are required");
      return;
    }

    try {
      const response = await fetch(`/api/v1/projects/budget-lines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          division: newLineData.division,
          name: newLineData.name,
          budgeted: parseFloat(String(newLineData.budgeted)) || 0,
          committed: parseFloat(String(newLineData.committed)) || 0,
          actual_spent: parseFloat(String(newLineData.actual_spent)) || 0,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add budget line");
      }

      const data = await response.json();
      setBudgetLines([...budgetLines, data.line]);
      setShowAddLineModal(false);
      setNewLineData({
        division: "",
        name: "",
        budgeted: 0,
        committed: 0,
        actual_spent: 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add budget line");
    }
  };

  const handleEditCell = (id: string, field: string, value: number) => {
    setEditingCell({ id, field });
    setEditValue(String(value));
  };

  const saveEditedCell = async (id: string, field: string) => {
    if (!editValue.trim()) return;

    try {
      const newValue = parseFloat(editValue);
      if (isNaN(newValue)) {
        setError("Please enter a valid number");
        return;
      }

      const response = await fetch(`/api/v1/projects/budget-lines`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          [field]: newValue,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update budget line");
      }

      setBudgetLines(
        budgetLines.map((line) =>
          line.id === id ? { ...line, [field]: newValue } : line
        )
      );
      setEditingCell(null);
      setEditValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update budget line");
    }
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue("");
  };

  // Calculate totals
  const totals = budgetLines.reduce(
    (acc, line) => ({
      budgeted: acc.budgeted + line.budgeted,
      committed: acc.committed + line.committed,
      spent: acc.spent + line.actual_spent,
    }),
    { budgeted: 0, committed: 0, spent: 0 }
  );

  const revisedBudget = totals.budgeted + (totals.committed - totals.budgeted);
  const remaining = revisedBudget - totals.spent;
  const percentComplete = Math.round((totals.spent / revisedBudget) * 100);

  const overallVariancePercent = Math.round(
    ((totals.committed - totals.budgeted) / totals.budgeted) * 100 || 0
  );

  // Check for variance alerts
  const hasVarianceAlerts = budgetLines.some((line) => {
    const variance = getVariancePercent(line.budgeted, line.actual_spent, line.committed);
    return variance > 10;
  });

  const overBudgetLines = budgetLines.filter((line) => {
    const variance = getVariancePercent(line.budgeted, line.actual_spent, line.committed);
    return variance > 10;
  });

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
        Loading budget data...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
            padding: "12px 16px",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c2c7",
            borderRadius: "8px",
            color: "#842029",
          }}
        >
          <AlertTriangle size={18} />
          <span style={{ fontSize: "13px", flex: 1 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
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

      {/* Variance alerts */}
      {hasVarianceAlerts && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            padding: "12px 16px",
            backgroundColor: "#fff3cd",
            border: "1px solid #ffe69c",
            borderRadius: "8px",
            color: "#856404",
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: "2px" }} />
          <div style={{ fontSize: "13px", flex: 1 }}>
            <strong>Budget Alerts:</strong> {overBudgetLines.map((l) => l.name).join(", ")} {overBudgetLines.length === 1 ? "is" : "are"} over 10% budget variance.
          </div>
        </div>
      )}

      {/* BUDGET OVERVIEW CARD */}
      <div
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--fg)",
              margin: 0,
            }}
          >
            Budget Overview
          </h3>
          <button
            onClick={generateAIEstimate}
            disabled={refreshing}
            style={{
              padding: "8px 12px",
              fontSize: "12px",
              fontWeight: 500,
              background: "#f8f9fa",
              border: "1px solid #e2e4e8",
              borderRadius: "6px",
              cursor: refreshing ? "not-allowed" : "pointer",
              color: "var(--fg)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              opacity: refreshing ? 0.6 : 1,
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            Refresh AI Analysis
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "16px",
            marginBottom: "16px",
          }}
        >
          {/* Original Budget */}
          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "12px",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--fg-tertiary)",
                marginBottom: "4px",
              }}
            >
              Original Budget
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--fg)",
              }}
            >
              ${(totals.budgeted / 1000).toFixed(0)}K
            </div>
          </div>

          {/* Approved COs */}
          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "12px",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--fg-tertiary)",
                marginBottom: "4px",
              }}
            >
              Approved COs
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: overallVariancePercent > 0 ? "#d63031" : "var(--accent)",
              }}
            >
              ${((totals.committed - totals.budgeted) / 1000).toFixed(0)}K
            </div>
            <div
              style={{
                fontSize: "9px",
                color: "var(--fg-tertiary)",
                marginTop: "2px",
              }}
            >
              {overallVariancePercent > 0 ? "+" : ""}{overallVariancePercent}%
            </div>
          </div>

          {/* Revised Budget */}
          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "12px",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--fg-tertiary)",
                marginBottom: "4px",
              }}
            >
              Revised Budget
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--fg)",
              }}
            >
              ${(revisedBudget / 1000).toFixed(0)}K
            </div>
          </div>

          {/* Spent to Date */}
          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "12px",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--fg-tertiary)",
                marginBottom: "4px",
              }}
            >
              Spent to Date
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--fg)",
              }}
            >
              ${(totals.spent / 1000).toFixed(0)}K
            </div>
          </div>

          {/* Remaining */}
          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "12px",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--fg-tertiary)",
                marginBottom: "4px",
              }}
            >
              Remaining
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: remaining > 0 ? "var(--accent)" : "#dc3545",
              }}
            >
              ${(remaining / 1000).toFixed(0)}K
            </div>
          </div>

          {/* % Complete */}
          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "12px",
              borderRadius: "6px",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--fg-tertiary)",
                marginBottom: "4px",
              }}
            >
              % Complete
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--fg)",
              }}
            >
              {percentComplete}%
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            height: "8px",
            background: "var(--border)",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min(percentComplete, 100)}%`,
              background: percentComplete <= 100 ? "var(--accent)" : "#dc3545",
              transition: "width 0.3s ease",
            }}
          />
        </div>
      </div>

      {/* BUDGET HEARTBEAT */}
      <div
        style={{
          background: "#e6f7f0",
          border: "1px solid var(--accent)",
          borderRadius: "8px",
          padding: "12px 16px",
        }}
      >
        <p
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--fg)",
            margin: 0,
          }}
        >
          📈 Tracking ${(remaining / 1000).toFixed(0)}K {remaining > 0 ? "under" : "over"} budget. {overBudgetLines.length > 0 ? `${overBudgetLines[0].name} trending ${getVariancePercent(overBudgetLines[0].budgeted, overBudgetLines[0].actual_spent, overBudgetLines[0].committed)}% over.` : "All divisions within budget."}
        </p>
      </div>

      {/* AI INSIGHT CARD */}
      {aiInsight && (
        <div
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <div
              style={{
                fontSize: "18px",
                flexShrink: 0,
              }}
            >
              ✨
            </div>
            <div>
              <h4
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--fg)",
                  marginBottom: "4px",
                  margin: 0,
                }}
              >
                AI Insight
              </h4>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--fg-secondary)",
                  lineHeight: "1.4",
                  margin: 0,
                }}
              >
                {aiInsight}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* COST BREAKDOWN BY CSI DIVISION */}
      <div
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "20px",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--fg)",
              margin: 0,
            }}
          >
            Cost Breakdown by CSI Division
          </h3>
          <button
            onClick={() => setShowAddLineModal(true)}
            style={{
              padding: "8px 12px",
              fontSize: "12px",
              fontWeight: 500,
              background: "var(--accent)",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Plus size={14} />
            Add Line Item
          </button>
        </div>

        {budgetLines.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 16px",
              background: "var(--bg-secondary)",
              borderRadius: "8px",
              border: "1px dashed var(--border)",
            }}
          >
            <BarChart3 size={32} style={{ margin: "0 auto 12px", color: "var(--fg-secondary)" }} />
            <p
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--fg)",
                marginBottom: "8px",
              }}
            >
              No budget lines yet
            </p>
            <p style={{ fontSize: "12px", color: "var(--fg-secondary)", marginBottom: "16px" }}>
              Add line items or generate an AI estimate to get started
            </p>
            <button
              onClick={generateAIEstimate}
              disabled={refreshing}
              style={{
                padding: "8px 16px",
                fontSize: "12px",
                fontWeight: 500,
                background: "var(--accent)",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: refreshing ? "not-allowed" : "pointer",
                opacity: refreshing ? 0.6 : 1,
              }}
            >
              {refreshing ? "Generating..." : "Generate AI Estimate"}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {budgetLines.map((line) => {
              const isExpanded = expandedDivision === line.division;
              const varColor = getVarianceColor(line.budgeted, line.actual_spent, line.committed);
              const varPercent = getVariancePercent(line.budgeted, line.actual_spent, line.committed);

              return (
                <div key={line.id}>
                  <button
                    onClick={() => setExpandedDivision(isExpanded ? null : line.division)}
                    style={{
                      width: "100%",
                      background: "var(--bg-secondary)",
                      border: `1px solid ${varColor}`,
                      borderLeft: `4px solid ${varColor}`,
                      borderRadius: "6px",
                      padding: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--bg)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "var(--bg-secondary)";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        flex: 1,
                        textAlign: "left",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            color: "var(--fg)",
                          }}
                        >
                          Div {line.division} — {line.name}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--fg-tertiary)",
                            marginTop: "2px",
                          }}
                        >
                          ${(line.budgeted / 1000).toFixed(0)}K budgeted
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: varColor,
                        }}
                      >
                        {varPercent > 0 ? "+" : ""}{varPercent}%
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--fg-tertiary)",
                        }}
                      >
                        {isExpanded ? "▼" : "▶"}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div
                      style={{
                        background: "var(--bg-secondary)",
                        borderLeft: `4px solid ${varColor}`,
                        borderBottom: `1px solid var(--border)`,
                        borderRight: `1px solid var(--border)`,
                        borderBottomLeftRadius: "6px",
                        borderBottomRightRadius: "6px",
                        padding: "12px",
                        marginTop: "-1px",
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "12px",
                        fontSize: "12px",
                      }}
                    >
                      {/* Budgeted */}
                      <div>
                        <div
                          style={{
                            color: "var(--fg-tertiary)",
                            fontSize: "10px",
                            marginBottom: "4px",
                          }}
                        >
                          Budgeted
                        </div>
                        {editingCell?.id === line.id && editingCell?.field === "budgeted" ? (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              style={{
                                flex: 1,
                                padding: "4px 6px",
                                fontSize: "12px",
                                border: "1px solid var(--accent)",
                                borderRadius: "4px",
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => saveEditedCell(line.id, "budgeted")}
                              style={{
                                padding: "4px 6px",
                                background: "var(--accent)",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "3px",
                                cursor: "pointer",
                              }}
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              style={{
                                padding: "4px 6px",
                                background: "#ccc",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "3px",
                                cursor: "pointer",
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditCell(line.id, "budgeted", line.budgeted)}
                            style={{
                              fontWeight: 600,
                              color: "var(--fg)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: 0,
                            }}
                          >
                            ${(line.budgeted / 1000).toFixed(0)}K
                            <Edit3 size={12} style={{ opacity: 0 }} />
                          </button>
                        )}
                      </div>

                      {/* Committed */}
                      <div>
                        <div
                          style={{
                            color: "var(--fg-tertiary)",
                            fontSize: "10px",
                            marginBottom: "4px",
                          }}
                        >
                          Committed
                        </div>
                        {editingCell?.id === line.id && editingCell?.field === "committed" ? (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              style={{
                                flex: 1,
                                padding: "4px 6px",
                                fontSize: "12px",
                                border: "1px solid var(--accent)",
                                borderRadius: "4px",
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => saveEditedCell(line.id, "committed")}
                              style={{
                                padding: "4px 6px",
                                background: "var(--accent)",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "3px",
                                cursor: "pointer",
                              }}
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              style={{
                                padding: "4px 6px",
                                background: "#ccc",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "3px",
                                cursor: "pointer",
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditCell(line.id, "committed", line.committed)}
                            style={{
                              fontWeight: 600,
                              color: "var(--fg)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: 0,
                            }}
                          >
                            ${(line.committed / 1000).toFixed(0)}K
                            <Edit3 size={12} style={{ opacity: 0 }} />
                          </button>
                        )}
                      </div>

                      {/* Spent */}
                      <div>
                        <div
                          style={{
                            color: "var(--fg-tertiary)",
                            fontSize: "10px",
                            marginBottom: "4px",
                          }}
                        >
                          Actual Spent
                        </div>
                        {editingCell?.id === line.id && editingCell?.field === "actual_spent" ? (
                          <div style={{ display: "flex", gap: "4px" }}>
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              style={{
                                flex: 1,
                                padding: "4px 6px",
                                fontSize: "12px",
                                border: "1px solid var(--accent)",
                                borderRadius: "4px",
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => saveEditedCell(line.id, "actual_spent")}
                              style={{
                                padding: "4px 6px",
                                background: "var(--accent)",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "3px",
                                cursor: "pointer",
                              }}
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              style={{
                                padding: "4px 6px",
                                background: "#ccc",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "3px",
                                cursor: "pointer",
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditCell(line.id, "actual_spent", line.actual_spent)}
                            style={{
                              fontWeight: 600,
                              color: "var(--fg)",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: 0,
                            }}
                          >
                            ${(line.actual_spent / 1000).toFixed(0)}K
                            <Edit3 size={12} style={{ opacity: 0 }} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Line Item Modal */}
      {showAddLineModal && (
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
          onClick={() => setShowAddLineModal(false)}
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
            <h3
              style={{
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--fg)",
                marginBottom: "16px",
              }}
            >
              Add Budget Line Item
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
                CSI Division
              </label>
              <input
                type="text"
                value={newLineData.division}
                onChange={(e) => setNewLineData({ ...newLineData, division: e.target.value })}
                placeholder="e.g., 05, 07, 09"
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
                Name
              </label>
              <input
                type="text"
                value={newLineData.name}
                onChange={(e) => setNewLineData({ ...newLineData, name: e.target.value })}
                placeholder="e.g., Electrical"
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
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
                  Budgeted
                </label>
                <input
                  type="number"
                  value={newLineData.budgeted}
                  onChange={(e) =>
                    setNewLineData({ ...newLineData, budgeted: parseFloat(e.target.value) || 0 })
                  }
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
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--fg)",
                    marginBottom: "6px",
                  }}
                >
                  Committed
                </label>
                <input
                  type="number"
                  value={newLineData.committed}
                  onChange={(e) =>
                    setNewLineData({ ...newLineData, committed: parseFloat(e.target.value) || 0 })
                  }
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
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--fg)",
                    marginBottom: "6px",
                  }}
                >
                  Actual Spent
                </label>
                <input
                  type="number"
                  value={newLineData.actual_spent}
                  onChange={(e) =>
                    setNewLineData({ ...newLineData, actual_spent: parseFloat(e.target.value) || 0 })
                  }
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
                onClick={() => setShowAddLineModal(false)}
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
                onClick={handleAddLineItem}
                disabled={!newLineData.division || !newLineData.name}
                style={{
                  padding: "8px 16px",
                  background: newLineData.division && newLineData.name ? "var(--accent)" : "#ccc",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: newLineData.division && newLineData.name ? "pointer" : "not-allowed",
                }}
              >
                Add Line Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
