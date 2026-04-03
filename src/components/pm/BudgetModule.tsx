"use client";

import { useState } from "react";

interface BudgetModuleProps {
  projectId: string;
}

// Mock budget data for CSI divisions
const MOCK_DIVISIONS = [
  {
    division: "03",
    name: "Concrete",
    budgeted: 125000,
    committed: 105000,
    spent: 98500,
  },
  {
    division: "05",
    name: "Metals",
    budgeted: 85000,
    committed: 78000,
    spent: 72400,
  },
  {
    division: "07",
    name: "Thermal & Moisture",
    budgeted: 95000,
    committed: 92000,
    spent: 94200,
  },
  {
    division: "09",
    name: "Finishes",
    budgeted: 210000,
    committed: 198000,
    spent: 185600,
  },
  {
    division: "22",
    name: "Plumbing",
    budgeted: 145000,
    committed: 142000,
    spent: 138900,
  },
  {
    division: "23",
    name: "HVAC",
    budgeted: 175000,
    committed: 168000,
    spent: 171200,
  },
  {
    division: "26",
    name: "Electrical",
    budgeted: 200000,
    committed: 215000,
    spent: 225300,
  },
  {
    division: "31",
    name: "Earthwork",
    budgeted: 65000,
    committed: 65000,
    spent: 58900,
  },
];

const getVarianceColor = (budgeted: number, spent: number, committed: number) => {
  const totalComitted = spent + (committed - spent);
  const variance = ((totalComitted - budgeted) / budgeted) * 100;

  if (variance < -5) return "#1D9E75"; // green - under budget
  if (variance < 10) return "#f0a500"; // yellow - within 10%
  return "#dc3545"; // red - over budget
};

const getVariancePercent = (budgeted: number, spent: number, committed: number) => {
  const totalCommitted = spent + (committed - spent);
  return Math.round(((totalCommitted - budgeted) / budgeted) * 100);
};

export default function BudgetModule({ projectId }: BudgetModuleProps) {
  const [expandedDivision, setExpandedDivision] = useState<string | null>(null);

  // Calculate totals
  const totals = MOCK_DIVISIONS.reduce(
    (acc, div) => ({
      budgeted: acc.budgeted + div.budgeted,
      committed: acc.committed + div.committed,
      spent: acc.spent + div.spent,
    }),
    { budgeted: 0, committed: 0, spent: 0 }
  );

  const revisedBudget = totals.budgeted + (totals.committed - totals.budgeted);
  const remaining = revisedBudget - totals.spent;
  const percentComplete = Math.round((totals.spent / revisedBudget) * 100);

  const overallVariancePercent = Math.round(
    ((totals.committed - totals.budgeted) / totals.budgeted) * 100
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* BUDGET OVERVIEW CARD */}
      <div
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "20px",
          boxShadow: "var(--shadow-sm)",
        }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--fg)",
            marginBottom: "16px",
          }}>
          Budget Overview
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "16px",
            marginBottom: "16px",
          }}>
          {/* Original Budget */}
          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "12px",
              borderRadius: "var(--radius-md)",
            }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--fg-tertiary)",
                marginBottom: "4px",
              }}>
              Original Budget
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--fg)",
              }}>
              ${(totals.budgeted / 1000).toFixed(0)}K
            </div>
          </div>

          {/* Approved COs */}
          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "12px",
              borderRadius: "var(--radius-md)",
            }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--fg-tertiary)",
                marginBottom: "4px",
              }}>
              Approved COs
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: overallVariancePercent > 0 ? "var(--warning)" : "var(--accent)",
              }}>
              ${((totals.committed - totals.budgeted) / 1000).toFixed(0)}K
            </div>
            <div
              style={{
                fontSize: "9px",
                color: "var(--fg-tertiary)",
                marginTop: "2px",
              }}>
              {overallVariancePercent > 0 ? "+" : ""}{overallVariancePercent}%
            </div>
          </div>

          {/* Revised Budget */}
          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "12px",
              borderRadius: "var(--radius-md)",
            }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--fg-tertiary)",
                marginBottom: "4px",
              }}>
              Revised Budget
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--fg)",
              }}>
              ${(revisedBudget / 1000).toFixed(0)}K
            </div>
          </div>

          {/* Spent to Date */}
          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "12px",
              borderRadius: "var(--radius-md)",
            }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--fg-tertiary)",
                marginBottom: "4px",
              }}>
              Spent to Date
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--fg)",
              }}>
              ${(totals.spent / 1000).toFixed(0)}K
            </div>
          </div>

          {/* Remaining */}
          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "12px",
              borderRadius: "var(--radius-md)",
            }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--fg-tertiary)",
                marginBottom: "4px",
              }}>
              Remaining
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: remaining > 0 ? "var(--accent)" : "var(--danger)",
              }}>
              ${(remaining / 1000).toFixed(0)}K
            </div>
          </div>

          {/* % Complete */}
          <div
            style={{
              background: "var(--bg-secondary)",
              padding: "12px",
              borderRadius: "var(--radius-md)",
            }}>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--fg-tertiary)",
                marginBottom: "4px",
              }}>
              % Complete
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--fg)",
              }}>
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
          }}>
          <div
            style={{
              height: "100%",
              width: `${Math.min(percentComplete, 100)}%`,
              background: percentComplete <= 100 ? "var(--accent)" : "var(--danger)",
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
          borderRadius: "var(--radius-lg)",
          padding: "12px 16px",
        }}>
        <p
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--fg)",
            margin: 0,
          }}>
          📈 Tracking ${(remaining / 1000).toFixed(0)}K {remaining > 0 ? "under" : "over"} budget. Electrical trending 8% over.
        </p>
      </div>

      {/* AI INSIGHT CARD */}
      <div
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "16px",
        }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
          }}>
          <div
            style={{
              fontSize: "18px",
              flexShrink: 0,
            }}>
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
              }}>
              AI Insight
            </h4>
            <p
              style={{
                fontSize: "12px",
                color: "var(--fg-secondary)",
                lineHeight: "1.4",
                margin: 0,
              }}>
              Your electrical costs are trending 12% over budget. Similar projects in Los Angeles averaged $28/sf for electrical. Consider value engineering in fixture selections.
            </p>
          </div>
        </div>
      </div>

      {/* COST BREAKDOWN BY CSI DIVISION */}
      <div
        style={{
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "20px",
          boxShadow: "var(--shadow-sm)",
        }}>
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--fg)",
            marginBottom: "16px",
            margin: 0,
          }}>
          Cost Breakdown by CSI Division
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {MOCK_DIVISIONS.map((div) => {
            const isExpanded = expandedDivision === div.division;
            const varColor = getVarianceColor(div.budgeted, div.spent, div.committed);
            const varPercent = getVariancePercent(div.budgeted, div.spent, div.committed);

            return (
              <div key={div.division}>
                <button
                  onClick={() =>
                    setExpandedDivision(isExpanded ? null : div.division)
                  }
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: `1px solid ${varColor}`,
                    borderLeft: `4px solid ${varColor}`,
                    borderRadius: "var(--radius-md)",
                    padding: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--bg)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--bg-secondary)";
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, textAlign: "left" }}>
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "var(--fg)",
                        }}>
                        Div {div.division} — {div.name}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--fg-tertiary)",
                          marginTop: "2px",
                        }}>
                        ${(div.budgeted / 1000).toFixed(0)}K budgeted
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "right",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: varColor,
                      }}>
                      {varPercent > 0 ? "+" : ""}{varPercent}%
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--fg-tertiary)",
                      }}>
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
                      borderBottomLeftRadius: "var(--radius-md)",
                      borderBottomRightRadius: "var(--radius-md)",
                      padding: "12px",
                      marginTop: "-1px",
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "12px",
                      fontSize: "12px",
                    }}>
                    <div>
                      <div
                        style={{
                          color: "var(--fg-tertiary)",
                          fontSize: "10px",
                          marginBottom: "4px",
                        }}>
                        Budgeted
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "var(--fg)",
                        }}>
                        ${(div.budgeted / 1000).toFixed(0)}K
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          color: "var(--fg-tertiary)",
                          fontSize: "10px",
                          marginBottom: "4px",
                        }}>
                        Committed
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "var(--fg)",
                        }}>
                        ${(div.committed / 1000).toFixed(0)}K
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          color: "var(--fg-tertiary)",
                          fontSize: "10px",
                          marginBottom: "4px",
                        }}>
                        Spent
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          color: "var(--fg)",
                        }}>
                        ${(div.spent / 1000).toFixed(0)}K
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
