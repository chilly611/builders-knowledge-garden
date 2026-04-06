import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Types
interface PaymentIntent {
  id: string;
  order_id: string;
  payment_method: 'card' | 'ach' | 'net30';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  stripe_payment_intent_id?: string;
  fee: number;
  net_amount: number;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  id: string;
  order_id: string;
  payment_intent_id?: string;
  payment_method: 'card' | 'ach' | 'net30';
  amount: number;
  currency: string;
  fee: number;
  net_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  stripe_charge_id?: string;
  idempotency_key?: string;
  due_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface TransactionSummary {
  total_revenue: number;
  total_pending: number;
  total_refunded: number;
  transaction_count: number;
  avg_order_value: number;
  period: {
    from?: string;
    to?: string;
  };
}

interface CreatePaymentIntentRequest {
  order_id: string;
  payment_method: 'card' | 'ach' | 'net30';
  amount: number;
  idempotency_key?: string;
}

interface UpdateTransactionRequest {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  notes?: string;
}

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

// Mock data storage
const mockPaymentIntents = new Map<string, PaymentIntent>();
const mockTransactions = new Map<string, Transaction>();
const mockIdempotencyKeys = new Map<string, string>();

// Environment variables
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Fee calculations
function calculateFee(amount: number, paymentMethod: 'card' | 'ach' | 'net30'): number {
  switch (paymentMethod) {
    case 'card':
      // 2.9% + $0.30
      return Math.round((amount * 0.029 + 0.30) * 100) / 100;
    case 'ach':
      // 0.8%
      return Math.round(amount * 0.008 * 100) / 100;
    case 'net30':
      // 0% for net-30 terms
      return 0;
    default:
      return 0;
  }
}

// Generate unique ID
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Validate status transition
function isValidTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  const validTransitions: Record<string, string[]> = {
    'pending': ['processing', 'failed'],
    'processing': ['completed', 'failed'],
    'completed': ['refunded'],
    'failed': ['pending'],
    'refunded': []
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

// Calculate due date for net-30
function calculateNetDueDate(): string {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  return dueDate.toISOString();
}

// Stripe API call helper (mock or real)
async function createStripePaymentIntent(
  amount: number,
  paymentMethod: string,
  orderId: string,
  idempotencyKey?: string
): Promise<{ id: string; status: string; client_secret?: string } | null> {
  if (!STRIPE_SECRET_KEY) {
    return null;
  }

  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const params = new URLSearchParams({
      amount: Math.round(amount * 100).toString(),
      currency: 'usd',
      payment_method_types: paymentMethod === 'ach' ? 'us_bank_account' : 'card',
      metadata: JSON.stringify({ order_id: orderId })
    });

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers,
      body: params
    });

    if (!response.ok) {
      console.error('Stripe API error:', await response.text());
      return null;
    }

    return await response.json() as { id: string; status: string; client_secret?: string };
  } catch (error) {
    console.error('Error creating Stripe payment intent:', error);
    return null;
  }
}

// Verify Stripe webhook signature
function verifyStripeSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) {
    return true;
  }

  try {
    const [timestamp, hash] = signature.split(',').map(part => part.split('=')[1]);
    const signedContent = `${timestamp}.${body}`;
    const expectedHash = crypto
      .createHmac('sha256', secret)
      .update(signedContent)
      .digest('hex');

    return hash === expectedHash;
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

// Handle GET requests
async function handleGet(request: NextRequest): Promise<NextResponse<unknown>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'summary') {
      // Get financial summary
      const dateFrom = searchParams.get('date_from');
      const dateTo = searchParams.get('date_to');

      let transactions = Array.from(mockTransactions.values());

      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        transactions = transactions.filter(t => new Date(t.created_at) >= fromDate);
      }

      if (dateTo) {
        const toDate = new Date(dateTo);
        transactions = transactions.filter(t => new Date(t.created_at) <= toDate);
      }

      const completed = transactions.filter(t => t.status === 'completed');
      const pending = transactions.filter(t => t.status === 'pending');
      const refunded = transactions.filter(t => t.status === 'refunded');

      const totalRevenue = completed.reduce((sum, t) => sum + t.net_amount, 0);
      const totalPending = pending.reduce((sum, t) => sum + t.amount, 0);
      const totalRefunded = refunded.reduce((sum, t) => sum + t.amount, 0);
      const avgOrderValue = transactions.length > 0
        ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length
        : 0;

      const summary: TransactionSummary = {
        total_revenue: Math.round(totalRevenue * 100) / 100,
        total_pending: Math.round(totalPending * 100) / 100,
        total_refunded: Math.round(totalRefunded * 100) / 100,
        transaction_count: transactions.length,
        avg_order_value: Math.round(avgOrderValue * 100) / 100,
        period: {
          from: dateFrom || undefined,
          to: dateTo || undefined
        }
      };

      return NextResponse.json({
        success: true,
        data: summary
      });
    }

    // List transactions
    const orderId = searchParams.get('order_id');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    let filtered = Array.from(mockTransactions.values());

    if (orderId) {
      filtered = filtered.filter(t => t.order_id === orderId);
    }

    if (status) {
      filtered = filtered.filter(t => t.status === status);
    }

    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(t => new Date(t.created_at) >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      filtered = filtered.filter(t => new Date(t.created_at) <= toDate);
    }

    // Sort by created_at descending
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit);
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return NextResponse.json({
      success: true,
      data: paginated,
      pagination: {
        page,
        limit,
        total_count: totalCount,
        total_pages: totalPages
      }
    });
  } catch (error) {
    console.error('GET /api/v1/marketplace/transactions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle POST requests
async function handlePost(request: NextRequest): Promise<NextResponse<unknown>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'webhook') {
      // Stripe webhook handler
      const signature = request.headers.get('stripe-signature');
      if (!signature) {
        return NextResponse.json(
          { success: false, error: 'Missing stripe-signature header' },
          { status: 400 }
        );
      }

      const body = await request.text();

      // Verify signature if secret is available
      if (STRIPE_WEBHOOK_SECRET && !verifyStripeSignature(body, signature, STRIPE_WEBHOOK_SECRET)) {
        return NextResponse.json(
          { success: false, error: 'Invalid signature' },
          { status: 401 }
        );
      }

      const event = JSON.parse(body) as StripeWebhookEvent;

      // Handle different event types
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Record<string, unknown>;
        const orderId = (paymentIntent.metadata as Record<string, unknown>)?.order_id;

        if (orderId && typeof orderId === 'string') {
          const transactions = Array.from(mockTransactions.values()).filter(
            t => t.order_id === orderId
          );

          transactions.forEach(transaction => {
            transaction.status = 'completed';
            transaction.stripe_charge_id = paymentIntent.id as string;
            transaction.updated_at = new Date().toISOString();
            mockTransactions.set(transaction.id, transaction);
          });
        }
      } else if (event.type === 'payment_intent.payment_failed') {
        const paymentIntent = event.data.object as Record<string, unknown>;
        const orderId = (paymentIntent.metadata as Record<string, unknown>)?.order_id;

        if (orderId && typeof orderId === 'string') {
          const transactions = Array.from(mockTransactions.values()).filter(
            t => t.order_id === orderId
          );

          transactions.forEach(transaction => {
            transaction.status = 'failed';
            transaction.updated_at = new Date().toISOString();
            mockTransactions.set(transaction.id, transaction);
          });
        }
      } else if (event.type === 'charge.refunded') {
        const charge = event.data.object as Record<string, unknown>;
        const transactions = Array.from(mockTransactions.values()).filter(
          t => t.stripe_charge_id === charge.id
        );

        transactions.forEach(transaction => {
          transaction.status = 'refunded';
          transaction.updated_at = new Date().toISOString();
          mockTransactions.set(transaction.id, transaction);
        });
      }

      return NextResponse.json({ success: true, received: true });
    }

    // Create payment intent
    const body = await request.json() as Partial<CreatePaymentIntentRequest>;
    const { order_id, payment_method, amount, idempotency_key } = body;

    if (!order_id || !payment_method || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: order_id, payment_method, amount' },
        { status: 400 }
      );
    }

    if (!['card', 'ach', 'net30'].includes(payment_method)) {
      return NextResponse.json(
        { success: false, error: 'payment_method must be one of: card, ach, net30' },
        { status: 400 }
      );
    }

    // Check idempotency
    if (idempotency_key && mockIdempotencyKeys.has(idempotency_key)) {
      const existingId = mockIdempotencyKeys.get(idempotency_key);
      const existing = mockPaymentIntents.get(existingId!);
      if (existing) {
        return NextResponse.json({
          success: true,
          data: existing
        });
      }
    }

    const fee = calculateFee(amount, payment_method);
    const netAmount = amount - fee;

    // Try to create Stripe payment intent if key is available
    let stripeIntentId: string | undefined;
    let status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' = 'pending';

    if (STRIPE_SECRET_KEY && payment_method !== 'net30') {
      const stripeResult = await createStripePaymentIntent(
        amount,
        payment_method,
        order_id,
        idempotency_key
      );

      if (stripeResult) {
        stripeIntentId = stripeResult.id;
        status = stripeResult.status === 'requires_payment_method' ? 'pending' : 'processing';
      }
    }

    const paymentIntent: PaymentIntent = {
      id: generateId('pi'),
      order_id: order_id as string,
      payment_method: payment_method as 'card' | 'ach' | 'net30',
      amount,
      currency: 'USD',
      status: STRIPE_SECRET_KEY ? status : 'simulated',
      stripe_payment_intent_id: stripeIntentId,
      fee,
      net_amount: netAmount,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockPaymentIntents.set(paymentIntent.id, paymentIntent);

    if (idempotency_key) {
      mockIdempotencyKeys.set(idempotency_key, paymentIntent.id);
    }

    // Create corresponding transaction
    const dueDate = payment_method === 'net30' ? calculateNetDueDate() : undefined;

    const transaction: Transaction = {
      id: generateId('txn'),
      order_id: order_id as string,
      payment_intent_id: paymentIntent.id,
      payment_method: payment_method as 'card' | 'ach' | 'net30',
      amount,
      currency: 'USD',
      fee,
      net_amount: netAmount,
      status: STRIPE_SECRET_KEY ? status : 'simulated',
      stripe_charge_id: stripeIntentId,
      idempotency_key: idempotency_key as string | undefined,
      due_date: dueDate,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockTransactions.set(transaction.id, transaction);

    return NextResponse.json(
      {
        success: true,
        data: {
          payment_intent: paymentIntent,
          transaction
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/v1/marketplace/transactions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle PATCH requests
async function handlePatch(request: NextRequest): Promise<NextResponse<unknown>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const transactionId = searchParams.get('transaction_id');

    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: 'transaction_id query parameter is required' },
        { status: 400 }
      );
    }

    const transaction = mockTransactions.get(transactionId);
    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction not found' },
        { status: 404 }
      );
    }

    const body = await request.json() as Partial<UpdateTransactionRequest>;
    const { status: newStatus, notes } = body;

    if (!newStatus) {
      return NextResponse.json(
        { success: false, error: 'status is required' },
        { status: 400 }
      );
    }

    if (!isValidTransition(transaction.status, newStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot transition from ${transaction.status} to ${newStatus}`
        },
        { status: 400 }
      );
    }

    const updated: Transaction = {
      ...transaction,
      status: newStatus,
      notes: notes || transaction.notes,
      updated_at: new Date().toISOString()
    };

    mockTransactions.set(transactionId, updated);

    // Update corresponding payment intent if exists
    if (updated.payment_intent_id) {
      const paymentIntent = mockPaymentIntents.get(updated.payment_intent_id);
      if (paymentIntent) {
        paymentIntent.status = newStatus;
        paymentIntent.updated_at = new Date().toISOString();
        mockPaymentIntents.set(updated.payment_intent_id, paymentIntent);
      }
    }

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('PATCH /api/v1/marketplace/transactions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Main route handlers
export async function GET(request: NextRequest): Promise<NextResponse<unknown>> {
  return handleGet(request);
}

export async function POST(request: NextRequest): Promise<NextResponse<unknown>> {
  return handlePost(request);
}

export async function PATCH(request: NextRequest): Promise<NextResponse<unknown>> {
  return handlePatch(request);
}

// Config for Next.js
export const config = {
  runtime: 'nodejs',
  maxDuration: 30
};
