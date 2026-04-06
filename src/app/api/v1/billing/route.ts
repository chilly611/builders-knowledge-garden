import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getServiceClient, unauthorizedResponse } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const db = getServiceClient();

  // Fetch subscription by email (matching existing schema)
  const { data: subscription } = await db
    .from('subscriptions')
    .select('*')
    .eq('email', user.email)
    .single();

  // Fetch invoices if table exists (graceful fallback)
  let invoices: any[] = [];
  try {
    const { data } = await db
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) invoices = data;
  } catch {
    /* invoices table may not exist yet */
  }

  return NextResponse.json({
    subscription: subscription || null,
    invoices,
  });
}
