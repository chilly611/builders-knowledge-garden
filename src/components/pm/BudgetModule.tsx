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
        </diw>
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
              alignItems: "centergap: "8px",
            }}
          >
            <Plus size={16} />
            Add Line Item
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "16px",
          }}
        >
          {budgetLines.map((budgetLine) => (
            <div
              key={budgetLine.id}
              style={{
                padding: "12px",
                background: "var(--bg-secondary)",
                borderRadius: "6px",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      color: "var(--fg)",
                      marginBottom: "4px",
                    }}
                  >
                    {budgetLine.name} ({budgetLine.division})
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--fg-secondary)", margin: 0 }}>
                   Budgeted: ${(budgetLine.budgeted / 1000).toFixed(0)}K
                  </p>
                </div>
                <div>
                  <button
                    onClick={() => setExpandedDivision(expandedDivision === budgetLine.division ? null : budgetLine.division)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--fg-secondary)",
                      cursor: "pointer",
                      padding: 0,
                      transform: expandedDivision === budgetLine.division ? "rotateZ(90deg)" : "rotateZ(0deg)",
                      transition: "transform 0.2s",
                    }}
                  >
                    <Check size={16} />
                  </button>
                </div>
              </div>

              {expandedDivision === budgetLine.division && (
                <div style={{ marginBottom: "8px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                      <tr" style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "8px", fontWeight: 500 }}>Actual Spent</td>
                        <td style={{ padding: "8px", textAlign: "right" }}>
                          {editingCell?.id === budgetLine.id && editingCell.field === "actual_spent" ? (
                            <div style={{ display: "flex", gap: "8px" }}>
                              <input
                                type="number"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                style={{ width: "60px", padding: "4px", border: "1px solid var(--border)", borderRadius: "4px" }}
                                />
                                <button
                                  onClick={() => saveEditedCell(budgetLine.id, "actual_spent")}
                                  style={{ padding: "4px 8px", background: "var(--accent)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  style={{ padding: "4px 8px", background: "#eee", border: "none", borderRadius: "4px", cursor: "pointer" }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span style={{ color: getVarianceColor(budgetLine.budgeted, budgetLine.actual_spent, budgetLine.committed) }}>
                                  ${(budgetLine.actual_spent / 1000).toFixed(0)}K
                                </span>
                                <button
                                  onClick={() => handleEditCell(budgetLine.id, "actual_spent", budgetLine.actual_spent)}
                                  style={{ background: "none", border: "none", color: "var(--fg-secondary)", cursor: "pointer", padding: 0 }}
                                >
                                  <Edit3 size={14} />
                                </button>
                                </div>
                              )}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "8px", fontWeight: 500 }}>Committed COs</td>
                          <td style={{ padding: "8px", textAlign: "right" }}>
                            ${(committed / 1000).toFixed(0)}K
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: "8px", fontWeight: 500 }}>Variance</td>
                          <td style={{ padding: "8px", textAlign: "right" }}>
                            <span style={{ color: getVarianceColor(budgetLine.budgeted, budgetLine.actual_spent, budgetLine.committed), fontWeight: 600 }}>
                              {getVariancePercent(budgetLine.budgeted, budgetLine.actual_spent, budgetLine.committed)}%
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ADD LINE MODAL ＇ ＇＇ */}
      {showAddLineModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "24px",
              maxWidth: "500px",
              width: "90%",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, color: "var(--fg)" }}>Add Budget Line</h3>
              <button
                onClick={() => setShowAddLineModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--fg-secondary)",
                  cursor: "pointer",
                  fontSize: "18px",
                }}
              >
                <X />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label style={{ display: "block", fontWeight: 500,
marginBottom: "8px" }}>Division</label>
                <select
                  value={newLineData.division}
                  onChange={(e) => setNewLineData({ ...newLineData, division: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                  }}
                >
                  <option value="">Select a Division</option>
                  <option value="03">Concrete (C03)</option>
                  <option value="04">Structural (C04)</option>
                  <option value="05">Mechanical (C05)</option>
                  <option value="08">Electrical (C08)</option>
                  <option value="14">Other (C14)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontWeight: 500,
  marginBottom: "8px" }}>Line Item Name</label>
                <input
                  type="text"
                  placeholder="Enter name"
                  value={newLineData.name}
                  onChange={(e) => setNewLineData({ ...newLineData, name: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                  }}
                />
              </div>
  
              fontSize: "13px",
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
