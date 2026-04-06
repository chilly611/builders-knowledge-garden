'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

// TypeScript Interfaces
interface LineItem {
  id: string;
  division: string;
  item: string;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total: number;
  actual_cost: number;
  variance: number;
  notes?: string;
}

interface LaborRate {
  id: string;
  trade: string;
  hourly_rate: number;
  overtime_rate: number;
  hours_estimated: number;
  hours_actual: number;
}

interface ChangeOrder {
  id: string;
  co_number: string;
  description: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  impact_on_total: number;
  created_at: string;
}

interface BudgetSummary {
  total_budget: number;
  spent_to_date: number;
  remaining: number;
  variance_percent: number;
}

const CSI_DIVISIONS = [
  { code: '01', name: 'General Requirements' },
  { code: '02', name: 'Existing Conditions' },
  { code: '03', name: 'Concrete' },
  { code: '04', name: 'Masonry' },
  { code: '05', name: 'Metals' },
  { code: '06', name: 'Wood, Plastics & Composites' },
  { code: '07', name: 'Thermal & Moisture Protection' },
  { code: '08', name: 'Openings' },
  { code: '09', name: 'Finishes' },
  { code: '10', name: 'Specialties' },
];

const BRAND_COLORS = {
  green: '#1D9E75',
  gold: '#D85A30',
  red: '#E8443A',
  purple: '#7F77DD',
  blue: '#378ADD',
};

export default function BudgetModule() {
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      division: '01',
      item: 'Project Manager',
      description: 'Full-time project management',
      quantity: 1,
      unit: 'months',
      unit_cost: 8000,
      total: 8000,
      actual_cost: 8500,
      variance: 500,
    },
    {
      id: '2',
      division: '03',
      item: 'Foundation Concrete',
      description: 'Excavation and concrete pour',
      quantity: 150,
      unit: 'cubic yards',
      unit_cost: 120,
      total: 18000,
      actual_cost: 17200,
      variance: -800,
    },
  ]);

  const [laborRates, setLaborRates] = useState<LaborRate[]>([
    {
      id: '1',
      trade: 'Carpenter',
      hourly_rate: 65,
      overtime_rate: 97.5,
      hours_estimated: 400,
      hours_actual: 380,
    },
    {
      id: '2',
      trade: 'Electrician',
      hourly_rate: 75,
      overtime_rate: 112.5,
      hours_estimated: 200,
      hours_actual: 210,
    },
    {
      id: '3',
      trade: 'Plumber',
      hourly_rate: 70,
      overtime_rate: 105,
      hours_estimated: 150,
      hours_actual: 160,
    },
  ]);

  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([
    {
      id: '1',
      co_number: 'CO-001',
      description: 'Additional insulation upgrade',
      amount: 5000,
      status: 'approved',
      impact_on_total: 5000,
      created_at: '2026-03-15',
    },
  ]);

  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [newItemForm, setNewItemForm] = useState(false);
  const [newCOForm, setNewCOForm] = useState(false);

  // Calculate budget summary
  const budgetSummary = useMemo<BudgetSummary>(() => {
    const totalBudget = lineItems.reduce((sum, item) => sum + item.total, 0);
    const approvedCOs = changeOrders
      .filter((co) => co.status === 'approved')
      .reduce((sum, co) => sum + co.impact_on_total, 0);
    const spentToDate = lineItems.reduce(
      (sum, item) => sum + item.actual_cost,
      0
    );
    const totalBudgetWithCO = totalBudget + approvedCOs;
    const remaining = totalBudgetWithCO - spentToDate;
    const variance_percent =
      totalBudgetWithCO > 0
        ? ((spentToDate - totalBudgetWithCO) / totalBudgetWithCO) * 100
        : 0;

    return {
      total_budget: totalBudgetWithCO,
      spent_to_date: spentToDate,
      remaining,
      variance_percent,
    };
  }, [lineItems, changeOrders]);

  const handleCellEdit = useCallback(
    (id: string, field: string, currentValue: string | number) => {
      setEditingCell({ id, field });
      setEditValue(String(currentValue));
    },
    []
  );

  const saveEdit = useCallback(
    (id: string, field: string) => {
      setLineItems((items) =>
        items.map((item) => {
          if (item.id === id) {
            const updatedItem = { ...item };
            if (field === 'quantity' || field === 'unit_cost') {
              const quantity =
                field === 'quantity' ? parseFloat(editValue) : item.quantity;
              const unit_cost =
                field === 'unit_cost' ? parseFloat(editValue) : item.unit_cost;
              updatedItem.quantity = quantity;
              updatedItem.unit_cost = unit_cost;
              updatedItem.total = quantity * unit_cost;
            } else if (field === 'actual_cost') {
              updatedItem.actual_cost = parseFloat(editValue);
              updatedItem.variance = updatedItem.total - updatedItem.actual_cost;
            } else {
              (updatedItem as any)[field] = editValue;
            }
            return updatedItem;
          }
          return item;
        })
      );
      setEditingCell(null);
      setEditValue('');
    },
    [editValue]
  );

  const handleAddLineItem = useCallback(() => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      division: '01',
      item: '',
      description: '',
      quantity: 0,
      unit: '',
      unit_cost: 0,
      total: 0,
      actual_cost: 0,
      variance: 0,
    };
    setLineItems((items) => [...items, newItem]);
    setNewItemForm(false);
  }, []);

  const handleAddChangeOrder = useCallback(() => {
    const newCO: ChangeOrder = {
      id: Date.now().toString(),
      co_number: `CO-${String(changeOrders.length + 1).padStart(3, '0')}`,
      description: '',
      amount: 0,
      status: 'pending',
      impact_on_total: 0,
      created_at: new Date().toISOString().split('T')[0],
    };
    setChangeOrders((orders) => [...orders, newCO]);
    setNewCOForm(false);
  }, [changeOrders.length]);

  const handleDeleteLineItem = useCallback((id: string) => {
    setLineItems((items) => items.filter((item) => item.id !== id));
  }, []);

  const handleChangeOrderStatusChange = useCallback(
    (id: string, newStatus: 'pending' | 'approved' | 'rejected') => {
      setChangeOrders((orders) =>
        orders.map((co) => {
          if (co.id === id) {
            return { ...co, status: newStatus };
          }
          return co;
        })
      );
    },
    []
  );

  const handleExportCSV = useCallback(() => {
    const rows: string[] = [];
    rows.push('Line Items');
    rows.push(
      'Division,Item,Description,Quantity,Unit,Unit Cost,Total,Actual Cost,Variance'
    );

    lineItems.forEach((item) => {
      rows.push(
        `"${item.division}","${item.item}","${item.description}",${item.quantity},"${item.unit}",${item.unit_cost.toFixed(2)},${item.total.toFixed(2)},${item.actual_cost.toFixed(2)},${item.variance.toFixed(2)}`
      );
    });

    rows.push('');
    rows.push('Budget Summary');
    rows.push(`Total Budget,${budgetSummary.total_budget.toFixed(2)}`);
    rows.push(`Spent to Date,${budgetSummary.spent_to_date.toFixed(2)}`);
    rows.push(`Remaining,${budgetSummary.remaining.toFixed(2)}`);
    rows.push(`Variance %,${budgetSummary.variance_percent.toFixed(2)}`);

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }, [lineItems, budgetSummary]);

  const groupedLineItems = useMemo(() => {
    const grouped: Record<string, LineItem[]> = {};
    lineItems.forEach((item) => {
      if (!grouped[item.division]) {
        grouped[item.division] = [];
      }
      grouped[item.division].push(item);
    });
    return grouped;
  }, [lineItems]);

  // SVG Pie Chart
  const pieChartData = useMemo(() => {
    const divisions = CSI_DIVISIONS.filter(
      (d) => groupedLineItems[d.code]?.length > 0
    );
    let currentAngle = -90;
    const segments: Array<{
      division: string;
      amount: number;
      startAngle: number;
      endAngle: number;
      color: string;
    }> = [];
    const colors = [
      BRAND_COLORS.green,
      BRAND_COLORS.gold,
      BRAND_COLORS.blue,
      BRAND_COLORS.purple,
      BRAND_COLORS.red,
    ];

    const divisionTotals = divisions.map((d) => ({
      code: d.code,
      name: d.name,
      total: groupedLineItems[d.code]?.reduce(
        (sum, item) => sum + item.total,
        0
      ),
    }));

    const totalAmount = divisionTotals.reduce((sum, d) => sum + (d.total || 0), 0);

    divisionTotals.forEach((d, idx) => {
      const percentage = (d.total || 0) / totalAmount;
      const angle = percentage * 360;
      segments.push({
        division: d.name,
        amount: d.total || 0,
        startAngle: currentAngle,
        endAngle: currentAngle + angle,
        color: colors[idx % colors.length],
      });
      currentAngle += angle;
    });

    return { segments, totalAmount };
  }, [groupedLineItems]);

  const drawArc = (
    startAngle: number,
    endAngle: number,
    radius: number = 100
  ): string => {
    const start = {
      x: radius * Math.cos((startAngle * Math.PI) / 180),
      y: radius * Math.sin((startAngle * Math.PI) / 180),
    };
    const end = {
      x: radius * Math.cos((endAngle * Math.PI) / 180),
      y: radius * Math.sin((endAngle * Math.PI) / 180),
    };
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M 0 0 L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
  };

  return (
    <div
      style={{
        padding: '32px',
        backgroundColor: '#f9f9f7',
        minHeight: '100vh',
        fontFamily: "'Archivo', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>
          Construction Budget
        </h1>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Manage project estimates, costs, and change orders
        </p>
      </div>

      {/* Summary Cards */}
      <motion.div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <SummaryCard
          label="Total Budget"
          value={`$${budgetSummary.total_budget.toLocaleString('en-US', {
            minimumFractionDigits: 2,
          })}`}
          color={BRAND_COLORS.blue}
        />
        <SummaryCard
          label="Spent to Date"
          value={`$${budgetSummary.spent_to_date.toLocaleString('en-US', {
            minimumFractionDigits: 2,
          })}`}
          color={BRAND_COLORS.gold}
        />
        <SummaryCard
          label="Remaining"
          value={`$${budgetSummary.remaining.toLocaleString('en-US', {
            minimumFractionDigits: 2,
          })}`}
          color={
            budgetSummary.remaining >= 0 ? BRAND_COLORS.green : BRAND_COLORS.red
          }
        />
        <SummaryCard
          label="Variance"
          value={`${budgetSummary.variance_percent.toFixed(2)}%`}
          color={
            budgetSummary.variance_percent <= 0
              ? BRAND_COLORS.green
              : BRAND_COLORS.red
          }
        />
      </motion.div>

      {/* Charts Section */}
      <motion.div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '32px',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Pie Chart */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            Budget Breakdown by Division
          </h3>
          <svg
            viewBox="-120 -120 240 240"
            style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}
          >
            {pieChartData.segments.map((segment, idx) => (
              <path
                key={idx}
                d={drawArc(segment.startAngle, segment.endAngle, 100)}
                fill={segment.color}
                stroke="white"
                strokeWidth="2"
              />
            ))}
          </svg>
          <div style={{ marginTop: '16px', fontSize: '12px' }}>
            {pieChartData.segments.map((segment, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: segment.color,
                    borderRadius: '2px',
                    marginRight: '8px',
                  }}
                />
                <span style={{ flex: 1 }}>{segment.division}</span>
                <span style={{ fontWeight: 600 }}>
                  ${segment.amount.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Labor Cost Summary */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
            Labor Rates & Hours
          </h3>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
            }}
          >
            <thead>
              <tr style={{ borderBottom: `2px solid ${BRAND_COLORS.green}` }}>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '8px 0',
                    fontWeight: 600,
                  }}
                >
                  Trade
                </th>
                <th style={{ textAlign: 'right', padding: '8px 0' }}>
                  Est Hours
                </th>
                <th style={{ textAlign: 'right', padding: '8px 0' }}>
                  Act Hours
                </th>
                <th style={{ textAlign: 'right', padding: '8px 0' }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {laborRates.map((labor) => (
                <tr key={labor.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '8px 0' }}>{labor.trade}</td>
                  <td style={{ textAlign: 'right', padding: '8px 0' }}>
                    {labor.hours_estimated}
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 0' }}>
                    {labor.hours_actual}
                  </td>
                  <td style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600 }}>
                    ${(
                      labor.hours_actual * labor.hourly_rate
                    ).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Line Items Section */}
      <motion.div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Line Items</h2>
          <button
            onClick={handleAddLineItem}
            style={{
              padding: '8px 16px',
              backgroundColor: BRAND_COLORS.green,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) =>
              ((e.target as HTMLElement).style.backgroundColor = '#158f63')
            }
            onMouseOut={(e) =>
              ((e.target as HTMLElement).style.backgroundColor =
                BRAND_COLORS.green)
            }
          >
            + Add Line Item
          </button>
        </div>

        {CSI_DIVISIONS.map((division) => {
          const items = groupedLineItems[division.code] || [];
          if (items.length === 0) return null;

          return (
            <div key={division.code} style={{ marginBottom: '24px' }}>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: BRAND_COLORS.green,
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: `2px solid ${BRAND_COLORS.green}`,
                }}
              >
                {division.code} — {division.name}
              </h3>

              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px',
                  }}
                >
                  <thead>
                    <tr style={{ backgroundColor: '#f5f5f5' }}>
                      <th style={tableHeaderStyle}>Item</th>
                      <th style={tableHeaderStyle}>Description</th>
                      <th style={tableHeaderStyle}>Qty</th>
                      <th style={tableHeaderStyle}>Unit</th>
                      <th style={tableHeaderStyle}>Unit Cost</th>
                      <th style={tableHeaderStyle}>Total</th>
                      <th style={tableHeaderStyle}>Actual</th>
                      <th style={tableHeaderStyle}>Variance</th>
                      <th style={tableHeaderStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                        <EditableCell
                          value={item.item}
                          isEditing={
                            editingCell?.id === item.id &&
                            editingCell?.field === 'item'
                          }
                          onEdit={() => handleCellEdit(item.id, 'item', item.item)}
                          onSave={() => saveEdit(item.id, 'item')}
                          onChange={setEditValue}
                          editValue={editValue}
                        />
                        <EditableCell
                          value={item.description}
                          isEditing={
                            editingCell?.id === item.id &&
                            editingCell?.field === 'description'
                          }
                          onEdit={() =>
                            handleCellEdit(item.id, 'description', item.description)
                          }
                          onSave={() => saveEdit(item.id, 'description')}
                          onChange={setEditValue}
                          editValue={editValue}
                        />
                        <EditableCell
                          value={item.quantity}
                          isEditing={
                            editingCell?.id === item.id &&
                            editingCell?.field === 'quantity'
                          }
                          onEdit={() =>
                            handleCellEdit(item.id, 'quantity', item.quantity)
                          }
                          onSave={() => saveEdit(item.id, 'quantity')}
                          onChange={setEditValue}
                          editValue={editValue}
                          type="number"
                        />
                        <EditableCell
                          value={item.unit}
                          isEditing={
                            editingCell?.id === item.id &&
                            editingCell?.field === 'unit'
                          }
                          onEdit={() => handleCellEdit(item.id, 'unit', item.unit)}
                          onSave={() => saveEdit(item.id, 'unit')}
                          onChange={setEditValue}
                          editValue={editValue}
                        />
                        <EditableCell
                          value={`$${item.unit_cost.toFixed(2)}`}
                          isEditing={
                            editingCell?.id === item.id &&
                            editingCell?.field === 'unit_cost'
                          }
                          onEdit={() =>
                            handleCellEdit(item.id, 'unit_cost', item.unit_cost)
                          }
                          onSave={() => saveEdit(item.id, 'unit_cost')}
                          onChange={setEditValue}
                          editValue={editValue}
                          type="number"
                        />
                        <td
                          style={{
                            padding: '12px 8px',
                            textAlign: 'right',
                            fontWeight: 600,
                          }}
                        >
                          ${item.total.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <EditableCell
                          value={`$${item.actual_cost.toFixed(2)}`}
                          isEditing={
                            editingCell?.id === item.id &&
                            editingCell?.field === 'actual_cost'
                          }
                          onEdit={() =>
                            handleCellEdit(item.id, 'actual_cost', item.actual_cost)
                          }
                          onSave={() => saveEdit(item.id, 'actual_cost')}
                          onChange={setEditValue}
                          editValue={editValue}
                          type="number"
                        />
                        <td
                          style={{
                            padding: '12px 8px',
                            textAlign: 'right',
                            color: item.variance < 0 ? BRAND_COLORS.green : BRAND_COLORS.red,
                            fontWeight: 600,
                          }}
                        >
                          ${item.variance.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteLineItem(item.id)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: BRAND_COLORS.red,
                              color: 'white',
                              border: 'none',
                              borderRadius: '3px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s',
                            }}
                            onMouseOver={(e) =>
                              ((e.target as HTMLElement).style.backgroundColor =
                                '#c72825')
                            }
                            onMouseOut={(e) =>
                              ((e.target as HTMLElement).style.backgroundColor =
                                BRAND_COLORS.red)
                            }
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Change Orders Section */}
      <motion.div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Change Orders</h2>
          <button
            onClick={handleAddChangeOrder}
            style={{
              padding: '8px 16px',
              backgroundColor: BRAND_COLORS.purple,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseOver={(e) =>
              ((e.target as HTMLElement).style.backgroundColor = '#6d66c7')
            }
            onMouseOut={(e) =>
              ((e.target as HTMLElement).style.backgroundColor =
                BRAND_COLORS.purple)
            }
          >
            + New Change Order
          </button>
        </div>

        {changeOrders.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#999', textAlign: 'center' }}>
            No change orders yet
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '13px',
              }}
            >
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={tableHeaderStyle}>CO #</th>
                  <th style={tableHeaderStyle}>Description</th>
                  <th style={tableHeaderStyle}>Amount</th>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={tableHeaderStyle}>Impact</th>
                  <th style={tableHeaderStyle}>Date</th>
                </tr>
              </thead>
              <tbody>
                {changeOrders.map((co) => (
                  <tr key={co.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 600 }}>
                      {co.co_number}
                    </td>
                    <td style={{ padding: '12px 8px' }}>{co.description}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      ${co.amount.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <select
                        value={co.status}
                        onChange={(e) =>
                          handleChangeOrderStatusChange(
                            co.id,
                            e.target.value as 'pending' | 'approved' | 'rejected'
                          )
                        }
                        style={{
                          padding: '6px 8px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          backgroundColor:
                            co.status === 'approved'
                              ? '#e8f5e9'
                              : co.status === 'pending'
                                ? '#fff3e0'
                                : '#ffebee',
                          color:
                            co.status === 'approved'
                              ? BRAND_COLORS.green
                              : co.status === 'pending'
                                ? BRAND_COLORS.gold
                                : BRAND_COLORS.red,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '12px',
                        }}
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td
                      style={{
                        padding: '12px 8px',
                        textAlign: 'right',
                        color:
                          co.impact_on_total > 0 ? BRAND_COLORS.red : BRAND_COLORS.green,
                        fontWeight: 600,
                      }}
                    >
                      {co.impact_on_total > 0 ? '+' : ''}$
                      {co.impact_on_total.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: '12px' }}>
                      {co.created_at}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Export Button */}
      <motion.button
        onClick={handleExportCSV}
        style={{
          padding: '12px 24px',
          backgroundColor: BRAND_COLORS.blue,
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onMouseOver={(e) =>
          ((e.target as HTMLElement).style.backgroundColor = '#2870c8')
        }
        onMouseOut={(e) =>
          ((e.target as HTMLElement).style.backgroundColor = BRAND_COLORS.blue)
        }
      >
        Export to CSV
      </motion.button>
    </div>
  );
}

// Helper Components
interface SummaryCardProps {
  label: string;
  value: string;
  color: string;
}

function SummaryCard({ label, value, color }: SummaryCardProps) {
  return (
    <motion.div
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderLeft: `4px solid ${color}`,
      }}
      whileHover={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
    >
      <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
        {label}
      </p>
      <p style={{ fontSize: '24px', fontWeight: 700, color: color }}>
        {value}
      </p>
    </motion.div>
  );
}

interface EditableCellProps {
  value: string | number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onChange: (value: string) => void;
  editValue: string;
  type?: string;
}

function EditableCell({
  value,
  isEditing,
  onEdit,
  onSave,
  onChange,
  editValue,
  type = 'text',
}: EditableCellProps) {
  return (
    <td
      style={{
        padding: '12px 8px',
        cursor: 'pointer',
        backgroundColor: isEditing ? '#fffde7' : 'transparent',
      }}
      onClick={onEdit}
    >
      {isEditing ? (
        <input
          type={type}
          value={editValue}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onEdit();
          }}
          autoFocus
          style={{
            width: '100%',
            padding: '6px',
            border: `2px solid ${BRAND_COLORS.green}`,
            borderRadius: '3px',
            fontSize: '13px',
            fontFamily: "'Archivo', sans-serif",
          }}
        />
      ) : (
        <span>{value}</span>
      )}
    </td>
  );
}

const tableHeaderStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '12px 8px',
  fontWeight: 600,
  fontSize: '12px',
  textTransform: 'uppercase',
  color: '#666',
};
