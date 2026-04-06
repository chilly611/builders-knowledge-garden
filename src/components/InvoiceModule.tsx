'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  item_number: number;
  description: string;
  scheduled_value: number;
  completed_previous: number;
  completed_this_period: number;
  materials_stored: number;
  total_completed: number;
  percent_complete: number;
  balance_to_finish: number;
  retainage_amount: number;
}

interface Invoice {
  id: string;
  project_id: string;
  project_name: string;
  contractor_info: {
    name: string;
    address: string;
    contact: string;
  };
  application_number: string;
  period_from: string;
  period_to: string;
  original_contract_sum: number;
  net_change_by_orders: number;
  total_completed_and_stored: number;
  retainage_percent: number;
  retainage_amount: number;
  total_earned_less_retainage: number;
  previous_certificates: number;
  current_payment_due: number;
  balance_to_finish: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Paid' | 'Disputed';
  line_items: InvoiceLineItem[];
  created_at: string;
  updated_at: string;
  version: number;
}

interface PaymentRecord {
  id: string;
  invoice_id: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
}

interface InvoiceSummary {
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
  retentionHeld: number;
}

interface FilterOptions {
  status: string;
  dateFrom: string;
  dateTo: string;
  project: string;
}

// Brand colors
const COLORS = {
  green: '#1D9E75',
  gold: '#D85A30',
  red: '#E8443A',
  purple: '#7F77DD',
  blue: '#378ADD',
  orange: '#BA7517',
  light_bg: '#FAFAF8',
  border: '#E8E8E6',
  text_dark: '#1A1A1A',
  text_light: '#666666',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  Draft: { bg: '#F5F5F5', text: '#666666' },
  Submitted: { bg: '#E3F2FD', text: COLORS.blue },
  Approved: { bg: '#E8F5E9', text: COLORS.green },
  Paid: { bg: '#F3E5F5', text: COLORS.purple },
  Disputed: { bg: '#FFEBEE', text: COLORS.red },
};

// Format currency
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Format percentage
const formatPercent = (value: number) => {
  return `${(value * 100).toFixed(1)}%`;
};

// Summary Card Component
const SummaryCard: React.FC<{
  label: string;
  value: string;
  color: string;
}> = ({ label, value, color }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-6 rounded-lg border"
    style={{
      backgroundColor: COLORS.light_bg,
      borderColor: COLORS.border,
    }}
  >
    <div style={{ color: COLORS.text_light, fontSize: '13px', fontWeight: 500, marginBottom: '8px' }}>
      {label}
    </div>
    <div style={{ color, fontSize: '28px', fontWeight: 700 }}>
      {value}
    </div>
  </motion.div>
);

// Invoice List Item Component
const InvoiceListItem: React.FC<{
  invoice: Invoice;
  onSelect: (invoice: Invoice) => void;
}> = ({ invoice, onSelect }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="p-4 border rounded-lg cursor-pointer hover:shadow-md transition-shadow"
    style={{
      backgroundColor: COLORS.light_bg,
      borderColor: COLORS.border,
    }}
    onClick={() => onSelect(invoice)}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: COLORS.text_dark }}>
          Application #{invoice.application_number}
        </div>
        <div style={{ fontSize: '13px', color: COLORS.text_light, marginTop: '4px' }}>
          {invoice.project_name}
        </div>
      </div>
      <div
        className="px-3 py-1 rounded-full text-sm font-medium"
        style={{
          backgroundColor: STATUS_COLORS[invoice.status]?.bg,
          color: STATUS_COLORS[invoice.status]?.text,
        }}
      >
        {invoice.status}
      </div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '12px' }}>
      <div>
        <div style={{ fontSize: '11px', color: COLORS.text_light, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Current Due
        </div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: COLORS.text_dark, marginTop: '4px' }}>
          {formatCurrency(invoice.current_payment_due)}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '11px', color: COLORS.text_light, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Completed
        </div>
        <div style={{ fontSize: '16px', fontWeight: 600, color: COLORS.text_dark, marginTop: '4px' }}>
          {formatPercent(invoice.total_completed_and_stored / (invoice.original_contract_sum + invoice.net_change_by_orders))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '11px', color: COLORS.text_light, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Period
        </div>
        <div style={{ fontSize: '13px', color: COLORS.text_dark, marginTop: '4px' }}>
          {invoice.period_from} to {invoice.period_to}
        </div>
      </div>
    </div>
  </motion.div>
);

// G703 Line Items Table Component
const G703LineItemsTable: React.FC<{
  lineItems: InvoiceLineItem[];
  retainagePercent: number;
  onLineItemChange: (itemId: string, field: string, value: number) => void;
  onAddLineItem: () => void;
  onRemoveLineItem: (itemId: string) => void;
}> = ({ lineItems, retainagePercent, onLineItemChange, onAddLineItem, onRemoveLineItem }) => {
  const totalScheduledValue = lineItems.reduce((sum, item) => sum + item.scheduled_value, 0);
  const totalCompleted = lineItems.reduce((sum, item) => sum + item.total_completed, 0);
  const totalRetainage = lineItems.reduce((sum, item) => sum + item.retainage_amount, 0);
  const totalBalanceToFinish = lineItems.reduce((sum, item) => sum + item.balance_to_finish, 0);

  return (
    <div className="overflow-x-auto">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Archivo' }}>
        <thead>
          <tr style={{ backgroundColor: COLORS.light_bg, borderBottom: `2px solid ${COLORS.border}` }}>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: COLORS.text_light }}>
              Item #
            </th>
            <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: COLORS.text_light }}>
              Description
            </th>
            <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: COLORS.text_light }}>
              Scheduled
            </th>
            <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: COLORS.text_light }}>
              Previous
            </th>
            <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: COLORS.text_light }}>
              This Period
            </th>
            <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: COLORS.text_light }}>
              Materials
            </th>
            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: COLORS.text_light }}>
              % Complete
            </th>
            <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: COLORS.text_light }}>
              Balance
            </th>
            <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: COLORS.text_light }}>
              Retainage
            </th>
            <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: COLORS.text_light }}>
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, index) => (
            <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
              <td style={{ padding: '12px', fontSize: '13px', color: COLORS.text_dark }}>
                {item.item_number}
              </td>
              <td style={{ padding: '12px', fontSize: '13px', color: COLORS.text_dark }}>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => onLineItemChange(item.id, 'description', 0)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                />
              </td>
              <td style={{ padding: '12px', fontSize: '13px', color: COLORS.text_dark, textAlign: 'right' }}>
                <input
                  type="number"
                  value={item.scheduled_value}
                  onChange={(e) => onLineItemChange(item.id, 'scheduled_value', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    fontSize: '13px',
                    textAlign: 'right',
                  }}
                />
              </td>
              <td style={{ padding: '12px', fontSize: '13px', color: COLORS.text_dark, textAlign: 'right' }}>
                {formatCurrency(item.completed_previous)}
              </td>
              <td style={{ padding: '12px', fontSize: '13px', color: COLORS.text_dark, textAlign: 'right' }}>
                <input
                  type="number"
                  value={item.completed_this_period}
                  onChange={(e) => onLineItemChange(item.id, 'completed_this_period', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    fontSize: '13px',
                    textAlign: 'right',
                  }}
                />
              </td>
              <td style={{ padding: '12px', fontSize: '13px', color: COLORS.text_dark, textAlign: 'right' }}>
                <input
                  type="number"
                  value={item.materials_stored}
                  onChange={(e) => onLineItemChange(item.id, 'materials_stored', parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '6px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    fontSize: '13px',
                    textAlign: 'right',
                  }}
                />
              </td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '6px',
                  backgroundColor: COLORS.border,
                  borderRadius: '3px',
                  overflow: 'hidden',
                  margin: '0 auto',
                }}>
                  <div
                    style={{
                      width: `${item.percent_complete * 100}%`,
                      height: '100%',
                      backgroundColor: COLORS.green,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
                <div style={{ fontSize: '11px', color: COLORS.text_light, marginTop: '4px' }}>
                  {formatPercent(item.percent_complete)}
                </div>
              </td>
              <td style={{ padding: '12px', fontSize: '13px', color: COLORS.text_dark, textAlign: 'right' }}>
                {formatCurrency(item.balance_to_finish)}
              </td>
              <td style={{ padding: '12px', fontSize: '13px', color: COLORS.text_dark, textAlign: 'right' }}>
                {formatCurrency(item.retainage_amount)}
              </td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                <button
                  onClick={() => onRemoveLineItem(item.id)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: COLORS.red,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          <tr style={{ backgroundColor: COLORS.light_bg, borderTop: `2px solid ${COLORS.border}`, fontWeight: 600 }}>
            <td colSpan={2} style={{ padding: '12px', fontSize: '13px', color: COLORS.text_dark }}>
              TOTALS
            </td>
            <td style={{ padding: '12px', fontSize: '13px', color: COLORS.text_dark, textAlign: 'right' }}>
              {formatCurrency(totalScheduledValue)}
            </td>
            <td colSpan={2} />
            <td />
            <td style={{ padding: '12px', fontSize: '13px', color: COLORS.text_dark, textAlign: 'center' }}>
              {totalScheduledValue > 0
                ? formatPercent(totalCompleted / (totalScheduledValue + lineItems.reduce((sum, item) => sum + item.materials_stored, 0)))
                : '0%'}
            </td>
            <td style={{ padding: '12px', fontSize: '13px', color: COLORS.text_dark, textAlign: 'right' }}>
              {formatCurrency(totalBalanceToFinish)}
            </td>
            <td style={{ padding: '12px', fontSize: '13px', color: COLORS.text_dark, textAlign: 'right' }}>
              {formatCurrency(totalRetainage)}
            </td>
            <td />
          </tr>
        </tbody>
      </table>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onAddLineItem}
        style={{
          width: '100%',
          padding: '12px',
          marginTop: '16px',
          backgroundColor: COLORS.green,
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 600,
        }}
      >
        + Add Line Item
      </motion.button>
    </div>
  );
};

// G702 Form Component
const G702Form: React.FC<{
  invoice: Invoice;
  onUpdate: (field: string, value: any) => void;
}> = ({ invoice, onUpdate }) => {
  const contractSum = invoice.original_contract_sum + invoice.net_change_by_orders;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        backgroundColor: 'white',
        border: `1px solid ${COLORS.border}`,
        borderRadius: '8px',
        padding: '24px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: `2px solid ${COLORS.border}` }}>
        <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.text_dark, marginBottom: '16px' }}>
          AIA G702 - Application and Certificate for Payment
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', color: COLORS.text_light, fontWeight: 600, marginBottom: '4px' }}>
              CONTRACTOR
            </div>
            <div style={{ fontSize: '13px', color: COLORS.text_dark }}>
              {invoice.contractor_info.name}
            </div>
            <div style={{ fontSize: '12px', color: COLORS.text_light, marginTop: '4px' }}>
              {invoice.contractor_info.address}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: COLORS.text_light, fontWeight: 600, marginBottom: '4px' }}>
              PROJECT
            </div>
            <div style={{ fontSize: '13px', color: COLORS.text_dark }}>
              {invoice.project_name}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: COLORS.text_light, fontWeight: 600, marginBottom: '4px' }}>
              APPLICATION NUMBER
            </div>
            <input
              type="text"
              value={invoice.application_number}
              onChange={(e) => onUpdate('application_number', e.target.value)}
              style={{
                padding: '6px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                fontSize: '13px',
              }}
            />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', color: COLORS.text_light, fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              PERIOD FROM
            </label>
            <input
              type="date"
              value={invoice.period_from}
              onChange={(e) => onUpdate('period_from', e.target.value)}
              style={{
                width: '100%',
                padding: '6px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                fontSize: '13px',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: COLORS.text_light, fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              PERIOD TO
            </label>
            <input
              type="date"
              value={invoice.period_to}
              onChange={(e) => onUpdate('period_to', e.target.value)}
              style={{
                width: '100%',
                padding: '6px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                fontSize: '13px',
              }}
            />
          </div>
        </div>
      </div>

      {/* Contract Values */}
      <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: `2px solid ${COLORS.border}` }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.text_dark, marginBottom: '12px' }}>
          Contract Values
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '11px', color: COLORS.text_light, fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Original Contract Sum
            </label>
            <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.text_dark }}>
              {formatCurrency(invoice.original_contract_sum)}
            </div>
          </div>
          <div>
            <label style={{ fontSize: '11px', color: COLORS.text_light, fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Net Change by Change Orders
            </label>
            <input
              type="number"
              value={invoice.net_change_by_orders}
              onChange={(e) => onUpdate('net_change_by_orders', parseFloat(e.target.value))}
              style={{
                width: '100%',
                padding: '6px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                fontSize: '13px',
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: COLORS.text_light, fontWeight: 600, display: 'block', marginBottom: '4px' }}>
              Contract Sum to Date
            </label>
            <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.green }}>
              {formatCurrency(contractSum)}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Calculation */}
      <div style={{ marginBottom: '24px', paddingBottom: '24px', borderBottom: `2px solid ${COLORS.border}` }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.text_dark, marginBottom: '12px' }}>
          Payment Calculation
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: COLORS.light_bg, borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', color: COLORS.text_light, fontWeight: 600, marginBottom: '4px' }}>
              Total Completed & Stored to Date
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.text_dark }}>
              {formatCurrency(invoice.total_completed_and_stored)}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: COLORS.light_bg, borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', color: COLORS.text_light, fontWeight: 600, marginBottom: '4px' }}>
              Retainage (%)
            </div>
            <input
              type="number"
              value={invoice.retainage_percent * 100}
              onChange={(e) => onUpdate('retainage_percent', parseFloat(e.target.value) / 100)}
              style={{
                width: '100%',
                padding: '6px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '4px',
                fontSize: '13px',
              }}
              min="0"
              max="100"
              step="0.1"
            />
          </div>
          <div style={{ padding: '12px', backgroundColor: COLORS.light_bg, borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', color: COLORS.text_light, fontWeight: 600, marginBottom: '4px' }}>
              Total Earned Less Retainage
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.green }}>
              {formatCurrency(invoice.total_earned_less_retainage)}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: COLORS.light_bg, borderRadius: '6px' }}>
            <div style={{ fontSize: '11px', color: COLORS.text_light, fontWeight: 600, marginBottom: '4px' }}>
              Less Previous Certificates
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.text_dark }}>
              {formatCurrency(invoice.previous_certificates)}
            </div>
          </div>
        </div>
      </div>

      {/* Final Amount Due */}
      <div style={{
        padding: '16px',
        backgroundColor: COLORS.green,
        color: 'white',
        borderRadius: '6px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.9 }}>CURRENT PAYMENT DUE</div>
          <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px' }}>
            {formatCurrency(invoice.current_payment_due)}
          </div>
        </div>
        <div style={{ fontSize: '12px', fontWeight: 500, opacity: 0.9 }}>
          Balance to Finish: {formatCurrency(invoice.balance_to_finish)}
        </div>
      </div>
    </motion.div>
  );
};

// Payment Tracking Component
const PaymentTracking: React.FC<{
  invoices: Invoice[];
  payments: PaymentRecord[];
  onRecordPayment: (invoiceId: string, amount: number, date: string, method: string) => void;
}> = ({ invoices, payments, onRecordPayment }) => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('check');

  const handleSubmitPayment = () => {
    if (selectedInvoiceId && paymentAmount) {
      onRecordPayment(selectedInvoiceId, parseFloat(paymentAmount), paymentDate, paymentMethod);
      setPaymentAmount('');
      setShowPaymentForm(false);
    }
  };

  // Calculate aging
  const today = new Date();
  const daysAgo30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const daysAgo60 = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
  const daysAgo90 = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);

  const agingBreakdown = {
    current: invoices.reduce((sum, inv) => {
      const invDate = new Date(inv.updated_at);
      return invDate > daysAgo30 && (inv.status === 'Submitted' || inv.status === 'Approved')
        ? sum + inv.current_payment_due
        : sum;
    }, 0),
    days30_60: invoices.reduce((sum, inv) => {
      const invDate = new Date(inv.updated_at);
      return invDate <= daysAgo30 && invDate > daysAgo60 && (inv.status === 'Submitted' || inv.status === 'Approved')
        ? sum + inv.current_payment_due
        : sum;
    }, 0),
    days60_90: invoices.reduce((sum, inv) => {
      const invDate = new Date(inv.updated_at);
      return invDate <= daysAgo60 && invDate > daysAgo90 && (inv.status === 'Submitted' || inv.status === 'Approved')
        ? sum + inv.current_payment_due
        : sum;
    }, 0),
    over90: invoices.reduce((sum, inv) => {
      const invDate = new Date(inv.updated_at);
      return invDate <= daysAgo90 && (inv.status === 'Submitted' || inv.status === 'Approved')
        ? sum + inv.current_payment_due
        : sum;
    }, 0),
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      {/* Aging Report */}
      <div style={{
        backgroundColor: 'white',
        border: `1px solid ${COLORS.border}`,
        borderRadius: '8px',
        padding: '24px',
      }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.text_dark, marginBottom: '16px' }}>
          A/R Aging Report
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
          <div style={{ padding: '12px', backgroundColor: COLORS.light_bg, borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', color: COLORS.text_light, fontWeight: 600, marginBottom: '4px' }}>
              Current (0-30 days)
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.green }}>
              {formatCurrency(agingBreakdown.current)}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: COLORS.light_bg, borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', color: COLORS.text_light, fontWeight: 600, marginBottom: '4px' }}>
              30-60 days overdue
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.orange }}>
              {formatCurrency(agingBreakdown.days30_60)}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: COLORS.light_bg, borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', color: COLORS.text_light, fontWeight: 600, marginBottom: '4px' }}>
              60-90 days overdue
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.gold }}>
              {formatCurrency(agingBreakdown.days60_90)}
            </div>
          </div>
          <div style={{ padding: '12px', backgroundColor: COLORS.light_bg, borderRadius: '6px' }}>
            <div style={{ fontSize: '12px', color: COLORS.text_light, fontWeight: 600, marginBottom: '4px' }}>
              Over 90 days overdue
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.red }}>
              {formatCurrency(agingBreakdown.over90)}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div style={{
        backgroundColor: 'white',
        border: `1px solid ${COLORS.border}`,
        borderRadius: '8px',
        padding: '24px',
      }}>
        <div style={{ fontSize: '16px', fontWeight: 700, color: COLORS.text_dark, marginBottom: '16px' }}>
          Record Payment
        </div>
        <AnimatePresence>
          {!showPaymentForm ? (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentForm(true)}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: COLORS.green,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              + Record Payment
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}
            >
              <div>
                <label style={{ fontSize: '12px', color: COLORS.text_light, fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Invoice
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                >
                  <option value="">Select invoice...</option>
                  {invoices
                    .filter((inv) => inv.status === 'Submitted' || inv.status === 'Approved')
                    .map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        App #{inv.application_number} - {inv.project_name} ({formatCurrency(inv.current_payment_due)})
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: COLORS.text_light, fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Amount
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: COLORS.text_light, fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: COLORS.text_light, fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                >
                  <option value="check">Check</option>
                  <option value="ach">ACH Transfer</option>
                  <option value="wire">Wire Transfer</option>
                  <option value="credit_card">Credit Card</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  onClick={() => setShowPaymentForm(false)}
                  style={{
                    padding: '8px',
                    backgroundColor: COLORS.border,
                    color: COLORS.text_dark,
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitPayment}
                  style={{
                    padding: '8px',
                    backgroundColor: COLORS.green,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Record
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.text_dark, marginBottom: '12px' }}>
            Recent Payments
          </div>
          {payments.length === 0 ? (
            <div style={{ fontSize: '13px', color: COLORS.text_light }}>
              No payments recorded
            </div>
          ) : (
            payments.slice(0, 5).map((payment) => (
              <div key={payment.id} style={{
                padding: '8px',
                backgroundColor: COLORS.light_bg,
                borderRadius: '4px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: COLORS.text_dark, fontWeight: 500 }}>
                    {payment.payment_date}
                  </div>
                  <div style={{ fontSize: '11px', color: COLORS.text_light }}>
                    {payment.payment_method}
                  </div>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: COLORS.green }}>
                  {formatCurrency(payment.amount_paid)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Main Invoice Module Component
export default function InvoiceModule() {
  const [view, setView] = useState<'dashboard' | 'create' | 'view'>('dashboard');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    dateFrom: '',
    dateTo: '',
    project: '',
  });

  useEffect(() => {
    fetchInvoices();
  }, [filters]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.dateFrom) queryParams.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) queryParams.append('dateTo', filters.dateTo);
      if (filters.project) queryParams.append('project', filters.project);

      const response = await fetch(`/api/v1/invoices?${queryParams.toString()}`);
      const data = await response.json();
      setInvoices(data.invoices || []);
      setPayments(data.payments || []);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
    setLoading(false);
  };

  const createNewInvoice = async () => {
    try {
      const newInvoice: Invoice = {
        id: `inv_${Date.now()}`,
        project_id: '',
        project_name: 'New Project',
        contractor_info: {
          name: '',
          address: '',
          contact: '',
        },
        application_number: '',
        period_from: new Date().toISOString().split('T')[0],
        period_to: new Date().toISOString().split('T')[0],
        original_contract_sum: 0,
        net_change_by_orders: 0,
        total_completed_and_stored: 0,
        retainage_percent: 0.1,
        retainage_amount: 0,
        total_earned_less_retainage: 0,
        previous_certificates: 0,
        current_payment_due: 0,
        balance_to_finish: 0,
        status: 'Draft',
        line_items: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1,
      };

      const response = await fetch('/api/v1/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newInvoice),
      });

      if (response.ok) {
        const created = await response.json();
        setSelectedInvoice(created.invoice);
        setView('view');
      }
    } catch (error) {
      console.error('Failed to create invoice:', error);
    }
  };

  const saveInvoice = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/v1/invoices`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice),
      });

      if (response.ok) {
        const updated = await response.json();
        setSelectedInvoice(updated.invoice);
        await fetchInvoices();
      }
    } catch (error) {
      console.error('Failed to save invoice:', error);
    }
  };

  const generatePDF = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/v1/invoices?action=pdf&id=${invoiceId}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      a.click();
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  };

  const recordPayment = async (invoiceId: string, amount: number, date: string, method: string) => {
    try {
      const response = await fetch('/api/v1/invoices?action=payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, amount_paid: amount, payment_date: date, payment_method: method }),
      });

      if (response.ok) {
        await fetchInvoices();
      }
    } catch (error) {
      console.error('Failed to record payment:', error);
    }
  };

  return (
    <div style={{ padding: '32px', backgroundColor: COLORS.light_bg, minHeight: '100vh', fontFamily: 'Archivo' }}>
      <AnimatePresence mode="wait">
        {view === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 700, color: COLORS.text_dark }}>
                    Invoice Management
                  </div>
                  <div style={{ fontSize: '14px', color: COLORS.text_light, marginTop: '4px' }}>
                    AIA G702/G703 Pay Applications
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={createNewInvoice}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: COLORS.green,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  + Create New Invoice
                </motion.button>
              </div>

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <SummaryCard
                  label="Total Billed"
                  value={formatCurrency(invoices.reduce((sum, inv) => sum + (inv.original_contract_sum + inv.net_change_by_orders), 0))}
                  color={COLORS.green}
                />
                <SummaryCard
                  label="Total Paid"
                  value={formatCurrency(payments.reduce((sum, p) => sum + p.amount_paid, 0))}
                  color={COLORS.blue}
                />
                <SummaryCard
                  label="Outstanding Balance"
                  value={formatCurrency(invoices.reduce((sum, inv) => sum + inv.current_payment_due, 0))}
                  color={COLORS.orange}
                />
                <SummaryCard
                  label="Retention Held"
                  value={formatCurrency(invoices.reduce((sum, inv) => sum + inv.retainage_amount, 0))}
                  color={COLORS.purple}
                />
              </div>
            </div>

            {/* Filters */}
            <div style={{
              backgroundColor: 'white',
              border: `1px solid ${COLORS.border}`,
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '12px',
            }}>
              <div>
                <label style={{ fontSize: '12px', color: COLORS.text_light, fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                >
                  <option value="">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Approved">Approved</option>
                  <option value="Paid">Paid</option>
                  <option value="Disputed">Disputed</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', color: COLORS.text_light, fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: COLORS.text_light, fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: COLORS.text_light, fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Project
                </label>
                <input
                  type="text"
                  placeholder="Filter by project..."
                  value={filters.project}
                  onChange={(e) => setFilters({ ...filters, project: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '4px',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>

            {/* Invoice List */}
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: COLORS.text_dark, marginBottom: '12px' }}>
                All Invoices ({invoices.length})
              </div>
              {loading ? (
                <div style={{ fontSize: '14px', color: COLORS.text_light }}>Loading...</div>
              ) : invoices.length === 0 ? (
                <div style={{
                  padding: '32px',
                  textAlign: 'center',
                  backgroundColor: 'white',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: '14px', color: COLORS.text_light }}>
                    No invoices found. Create one to get started.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
                  <AnimatePresence>
                    {invoices.map((invoice) => (
                      <InvoiceListItem
                        key={invoice.id}
                        invoice={invoice}
                        onSelect={(inv) => {
                          setSelectedInvoice(inv);
                          setView('view');
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {view === 'view' && selectedInvoice && (
          <motion.div key="view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button
              onClick={() => {
                setView('dashboard');
                setSelectedInvoice(null);
              }}
              style={{
                marginBottom: '24px',
                padding: '8px 16px',
                backgroundColor: COLORS.border,
                color: COLORS.text_dark,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              ← Back to Dashboard
            </button>

            {/* Tabs */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginBottom: '24px',
              borderBottom: `2px solid ${COLORS.border}`,
            }}>
              <button
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: `3px solid ${COLORS.green}`,
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: COLORS.green,
                }}
              >
                G702 Application
              </button>
              <button
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: COLORS.text_light,
                }}
              >
                G703 Line Items
              </button>
              <button
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: COLORS.text_light,
                }}
              >
                Payment Tracking
              </button>
            </div>

            {/* G702 Form */}
            <G702Form
              invoice={selectedInvoice}
              onUpdate={(field, value) => {
                const updated = { ...selectedInvoice, [field]: value };
                setSelectedInvoice(updated);
                saveInvoice(updated);
              }}
            />

            {/* G703 Line Items */}
            <div style={{ marginTop: '32px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.text_dark, marginBottom: '16px' }}>
                AIA G703 - Continuation Sheet
              </div>
              <G703LineItemsTable
                lineItems={selectedInvoice.line_items}
                retainagePercent={selectedInvoice.retainage_percent}
                onLineItemChange={(itemId, field, value) => {
                  const updated = {
                    ...selectedInvoice,
                    line_items: selectedInvoice.line_items.map((item) =>
                      item.id === itemId ? { ...item, [field]: value } : item
                    ),
                  };
                  setSelectedInvoice(updated);
                }}
                onAddLineItem={() => {
                  const newItem: InvoiceLineItem = {
                    id: `item_${Date.now()}`,
                    invoice_id: selectedInvoice.id,
                    item_number: selectedInvoice.line_items.length + 1,
                    description: '',
                    scheduled_value: 0,
                    completed_previous: 0,
                    completed_this_period: 0,
                    materials_stored: 0,
                    total_completed: 0,
                    percent_complete: 0,
                    balance_to_finish: 0,
                    retainage_amount: 0,
                  };
                  setSelectedInvoice({
                    ...selectedInvoice,
                    line_items: [...selectedInvoice.line_items, newItem],
                  });
                }}
                onRemoveLineItem={(itemId) => {
                  const updated = {
                    ...selectedInvoice,
                    line_items: selectedInvoice.line_items.filter((item) => item.id !== itemId),
                  };
                  setSelectedInvoice(updated);
                }}
              />
            </div>

            {/* Payment Tracking */}
            <div style={{ marginTop: '32px' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: COLORS.text_dark, marginBottom: '16px' }}>
                Payment Tracking & AR Aging
              </div>
              <PaymentTracking
                invoices={invoices}
                payments={payments}
                onRecordPayment={recordPayment}
              />
            </div>

            {/* Action Buttons */}
            <div style={{
              marginTop: '32px',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => generatePDF(selectedInvoice.id)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: COLORS.blue,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                📄 Generate PDF
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => saveInvoice(selectedInvoice)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: COLORS.green,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                ✓ Save Invoice
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
