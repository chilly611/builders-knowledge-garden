import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getAuthUser, unauthorizedResponse } from '@/lib/auth-server';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * /api/v1/invoices — AR/AP invoice CRUD over the union-schema invoices table.
 *
 * 2026-05-22 BOOKKEEPER-UI hardening:
 *   - Bearer-token auth on all verbs (was previously wide open with the
 *     service-role key — fixed inline today). Same SEC2 pattern as
 *     /api/v1/rfis.
 *   - createInvoice / updateInvoice now forward the union-schema columns
 *     (direction, invoice_number, vendor_id, total_amount, invoice_date,
 *     due_date, subtotal, tax_amount, amount_paid, notes) so the AR/AP
 *     ledger can read them back without column-not-found errors.
 *   - PDF generation still uses the legacy AIA G702/G703 fields for the
 *     draw-request flow — those continue to work because the union schema
 *     keeps both column sets present (SCHEMA-ALPHA).
 */

// Type definitions
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

// Calculate totals from line items
function calculateTotalsFromLineItems(lineItems: InvoiceLineItem[], retainagePercent: number) {
  const totalCompleted = lineItems.reduce((sum, item) => sum + item.total_completed, 0);
  const totalRetainage = totalCompleted * retainagePercent;
  const totalEarnedLessRetainage = totalCompleted - totalRetainage;

  return {
    total_completed_and_stored: totalCompleted,
    retainage_amount: totalRetainage,
    total_earned_less_retainage: totalEarnedLessRetainage,
  };
}

// Generate PDF for AIA G702/G703
async function generateInvoicePDF(invoice: Invoice): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;

  let yPosition = margin;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('AIA G702 - Application and Certificate for Payment', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Header Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const headerInfo = [
    [`Project: ${invoice.project_name}`, `Application #: ${invoice.application_number}`],
    [`Contractor: ${invoice.contractor_info.name}`, `Period: ${invoice.period_from} to ${invoice.period_to}`],
    [`Address: ${invoice.contractor_info.address}`, `Status: ${invoice.status}`],
  ];

  headerInfo.forEach((row) => {
    doc.text(row[0], margin, yPosition);
    doc.text(row[1], pageWidth / 2, yPosition);
    yPosition += 6;
  });
  yPosition += 4;

  // Contract Values Section
  doc.setFont('helvetica', 'bold');
  doc.text('Contract Values', margin, yPosition);
  yPosition += 6;

  doc.setFont('helvetica', 'normal');
  const contractSum = invoice.original_contract_sum + invoice.net_change_by_orders;
  const contractData = [
    ['Original Contract Sum', `$${invoice.original_contract_sum.toFixed(2)}`],
    ['Net Change by Orders', `$${invoice.net_change_by_orders.toFixed(2)}`],
    ['Contract Sum to Date', `$${contractSum.toFixed(2)}`],
  ];

  contractData.forEach((row) => {
    doc.text(row[0], margin, yPosition);
    doc.text(row[1], pageWidth - margin - 40, yPosition, { align: 'right' });
    yPosition += 5;
  });
  yPosition += 4;

  // G703 Line Items Table
  if (invoice.line_items.length > 0) {
    const tableData = invoice.line_items.map((item) => [
      item.item_number.toString(),
      item.description.substring(0, 30),
      `$${item.scheduled_value.toFixed(2)}`,
      `$${item.total_completed.toFixed(2)}`,
      `${(item.percent_complete * 100).toFixed(1)}%`,
      `$${item.balance_to_finish.toFixed(2)}`,
      `$${item.retainage_amount.toFixed(2)}`,
    ]);

    const totalRow = [
      '',
      'TOTALS',
      `$${invoice.line_items.reduce((sum, item) => sum + item.scheduled_value, 0).toFixed(2)}`,
      `$${invoice.total_completed_and_stored.toFixed(2)}`,
      '',
      `$${invoice.line_items.reduce((sum, item) => sum + item.balance_to_finish, 0).toFixed(2)}`,
      `$${invoice.retainage_amount.toFixed(2)}`,
    ];

    (doc as any).autoTable({
      startY: yPosition,
      head: [['Item', 'Description', 'Scheduled', 'Completed', '% Done', 'Balance', 'Retainage']],
      body: tableData,
      foot: [totalRow],
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [29, 158, 117], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [245, 245, 245], textColor: 0, fontStyle: 'bold' },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'center' },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Payment Calculation
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Calculation', margin, yPosition);
  yPosition += 6;

  doc.setFont('helvetica', 'normal');
  const paymentData = [
    ['Total Completed & Stored to Date', `$${invoice.total_completed_and_stored.toFixed(2)}`],
    [`Less Retainage (${(invoice.retainage_percent * 100).toFixed(1)}%)`, `($${invoice.retainage_amount.toFixed(2)})`],
    ['Total Earned Less Retainage', `$${invoice.total_earned_less_retainage.toFixed(2)}`],
    ['Less Previous Certificates for Payment', `($${invoice.previous_certificates.toFixed(2)})`],
    ['CURRENT PAYMENT DUE', `$${invoice.current_payment_due.toFixed(2)}`],
    ['Balance to Finish (including retainage)', `$${invoice.balance_to_finish.toFixed(2)}`],
  ];

  paymentData.forEach((row, index) => {
    if (index === 4) {
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(29, 158, 117);
      doc.setTextColor(255, 255, 255);
      doc.rect(margin - 2, yPosition - 3, contentWidth + 4, 6, 'F');
    }
    doc.text(row[0], margin, yPosition);
    doc.text(row[1], pageWidth - margin - 30, yPosition, { align: 'right' });
    if (index === 4) {
      doc.setTextColor(0, 0, 0);
    }
    yPosition += 5;
  });

  return Buffer.from(doc.output('arraybuffer'));
}

// List invoices with filtering
async function listInvoices(
  req: NextRequest,
  searchParams: { status?: string; project?: string; dateFrom?: string; dateTo?: string }
): Promise<{ invoices: Invoice[]; payments: PaymentRecord[] }> {
  const supabase = getServiceClient();

  let query = supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false });

  if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }

  if (searchParams.project) {
    query = query.ilike('project_name', `%${searchParams.project}%`);
  }

  if (searchParams.dateFrom) {
    query = query.gte('created_at', searchParams.dateFrom);
  }

  if (searchParams.dateTo) {
    query = query.lte('created_at', searchParams.dateTo);
  }

  const { data: invoices, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch invoices: ${error.message}`);
  }

  // Fetch payments
  const { data: payments, error: paymentError } = await supabase.from('invoice_payments').select('*');

  if (paymentError) {
    throw new Error(`Failed to fetch payments: ${paymentError.message}`);
  }

  // Fetch line items for each invoice
  const invoicesWithItems = await Promise.all(
    (invoices || []).map(async (invoice) => {
      const { data: lineItems, error: itemError } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      if (itemError) {
        console.error(`Failed to fetch line items for ${invoice.id}:`, itemError);
        return { ...invoice, line_items: [] };
      }

      return { ...invoice, line_items: lineItems || [] };
    })
  );

  return {
    invoices: invoicesWithItems,
    payments: payments || [],
  };
}

// Create new invoice
async function createInvoice(body: Partial<Invoice> & {
  direction?: string;
  invoice_number?: string;
  vendor_id?: string | null;
  invoice_date?: string;
  due_date?: string | null;
  total_amount?: number;
  subtotal?: number;
  tax_amount?: number;
  amount_paid?: number;
  user_id?: string;
  notes?: string;
}): Promise<Invoice> {
  const supabase = getServiceClient();

  const invoiceData = {
    project_id: body.project_id || '',
    project_name: body.project_name || 'New Project',
    contractor_info: body.contractor_info || { name: '', address: '', contact: '' },
    application_number: body.application_number || '',
    period_from: body.period_from || new Date().toISOString().split('T')[0],
    period_to: body.period_to || new Date().toISOString().split('T')[0],
    original_contract_sum: body.original_contract_sum || 0,
    net_change_by_orders: body.net_change_by_orders || 0,
    total_completed_and_stored: body.total_completed_and_stored || 0,
    retainage_percent: body.retainage_percent || 0.1,
    retainage_amount: body.retainage_amount || 0,
    total_earned_less_retainage: body.total_earned_less_retainage || 0,
    previous_certificates: body.previous_certificates || 0,
    // 2026-05-22 BOOKKEEPER-UI — union-schema columns:
    direction: body.direction || 'AR',
    invoice_number: body.invoice_number || null,
    vendor_id: body.vendor_id || null,
    invoice_date: body.invoice_date || new Date().toISOString().split('T')[0],
    due_date: body.due_date || null,
    total_amount: body.total_amount ?? body.total_completed_and_stored ?? 0,
    subtotal: body.subtotal ?? body.total_completed_and_stored ?? 0,
    tax_amount: body.tax_amount || 0,
    amount_paid: body.amount_paid || 0,
    user_id: body.user_id || null,
    notes: body.notes || null,
    current_payment_due: body.current_payment_due || 0,
    balance_to_finish: body.balance_to_finish || 0,
    status: body.status || 'Draft',
    version: body.version || 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: invoice, error } = await supabase.from('invoices').insert([invoiceData]).select().single();

  if (error) {
    throw new Error(`Failed to create invoice: ${error.message}`);
  }

  // Insert line items if provided
  if (body.line_items && body.line_items.length > 0) {
    const lineItemsData = body.line_items.map((item) => ({
      ...item,
      invoice_id: invoice.id,
    }));

    const { error: itemError } = await supabase.from('invoice_line_items').insert(lineItemsData);

    if (itemError) {
      console.error('Failed to insert line items:', itemError);
    }
  }

  return { ...invoice, line_items: body.line_items || [] };
}

// Update invoice
async function updateInvoice(invoiceId: string, body: Partial<Invoice>): Promise<Invoice> {
  const supabase = getServiceClient();

  const updateData = {
    ...body,
    updated_at: new Date().toISOString(),
    version: (body.version || 1) + 1,
  };

  const { data: invoice, error } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update invoice: ${error.message}`);
  }

  // Update or insert line items
  if (body.line_items) {
    // Delete existing items
    await supabase.from('invoice_line_items').delete().eq('invoice_id', invoiceId);

    // Insert new items
    const lineItemsData = body.line_items.map((item) => ({
      ...item,
      invoice_id: invoiceId,
    }));

    const { error: itemError } = await supabase.from('invoice_line_items').insert(lineItemsData);

    if (itemError) {
      console.error('Failed to update line items:', itemError);
    }
  }

  return { ...invoice, line_items: body.line_items || [] };
}

// Record payment
async function recordPayment(body: {
  invoiceId: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  notes?: string;
}): Promise<PaymentRecord> {
  const supabase = getServiceClient();

  // 2026-05-22 BOOKKEEPER-UI — invoice_payments has both amount/amount_paid
  // and method/payment_method (union schema). Fill both pairs so legacy and
  // new readers stay consistent.
  const paymentData = {
    invoice_id: body.invoiceId,
    amount_paid: body.amount_paid,
    amount: body.amount_paid,
    payment_date: body.payment_date,
    payment_method: body.payment_method,
    method: body.payment_method,
    notes: body.notes || '',
    created_at: new Date().toISOString(),
  };

  const { data: payment, error } = await supabase
    .from('invoice_payments')
    .insert([paymentData])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record payment: ${error.message}`);
  }

  // Update invoice status if fully paid. Check both total_amount (new
  // union-schema column for plain AR/AP) and current_payment_due (legacy
  // AIA G702 column for draws). Whichever is larger gates the "Paid" flip.
  const { data: invoice } = await supabase
    .from('invoices')
    .select('current_payment_due, total_amount, amount_paid')
    .eq('id', body.invoiceId)
    .single();

  if (invoice) {
    const target = Math.max(Number(invoice.total_amount) || 0, Number(invoice.current_payment_due) || 0);
    const newPaid = (Number(invoice.amount_paid) || 0) + Number(body.amount_paid || 0);
    const updates: Record<string, unknown> = { amount_paid: newPaid };
    if (target > 0 && newPaid >= target) updates.status = 'Paid';
    await supabase.from('invoices').update(updates).eq('id', body.invoiceId);
  }

  return payment;
}

// GET handler
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const invoiceId = searchParams.get('id');

    // PDF generation
    if (action === 'pdf' && invoiceId) {
      const supabase = getServiceClient();

      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error || !invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      // Fetch line items
      const { data: lineItems } = await supabase.from('invoice_line_items').select('*').eq('invoice_id', invoiceId);

      const fullInvoice = { ...invoice, line_items: lineItems || [] };
      const pdfBuffer = await generateInvoicePDF(fullInvoice);

      return new NextResponse(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoiceId}.pdf"`,
        },
      });
    }

    // List invoices
    const filterParams = {
      status: searchParams.get('status') || undefined,
      project: searchParams.get('project') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
    };

    const result = await listInvoices(req, filterParams);
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/v1/invoices error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST handler
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    const body = await req.json();

    if (action === 'payment') {
      const payment = await recordPayment(body);
      return NextResponse.json({ payment }, { status: 201 });
    }

    // Create new invoice — tag caller's user_id so we can scope later.
    const invoice = await createInvoice({ ...body, user_id: body.user_id || user.id });
    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error('POST /api/v1/invoices error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH handler
export async function PATCH(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  try {
    const body = await req.json();
    const invoiceId = body.id;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const invoice = await updateInvoice(invoiceId, body);
    return NextResponse.json({ invoice }, { status: 200 });
  } catch (error) {
    console.error('PATCH /api/v1/invoices error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE handler (optional - for deleting invoices)
export async function DELETE(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return unauthorizedResponse();
  try {
    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get('id');

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Delete line items first
    await supabase.from('invoice_line_items').delete().eq('invoice_id', invoiceId);

    // Delete invoice
    const { error } = await supabase.from('invoices').delete().eq('id', invoiceId);

    if (error) {
      throw new Error(`Failed to delete invoice: ${error.message}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('DELETE /api/v1/invoices error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
