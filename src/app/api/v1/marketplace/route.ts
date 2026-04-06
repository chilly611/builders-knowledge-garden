import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

// Types
interface Listing {
  id: string;
  name: string;
  category: string;
  description: string;
  unit_price: number;
  unit: string;
  lead_time_days: number;
  min_order_qty: number;
  specifications: Record<string, unknown>;
  supplier_id: string;
  supplier_name?: string;
  rating?: number;
  review_count?: number;
  created_at: string;
  updated_at: string;
}

interface QuoteRequest {
  id: string;
  listing_id: string;
  quantity: number;
  delivery_date: string;
  project_id?: string;
  buyer_id: string;
  status: string;
  created_at: string;
}

interface Order {
  id: string;
  quote_id?: string;
  listing_id: string;
  buyer_id: string;
  supplier_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  status: 'quoted' | 'ordered' | 'shipped' | 'delivered';
  shipping_address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface ListingsResponse {
  success: boolean;
  data: Listing[];
  pagination: {
    page: number;
    limit: number;
    total_count: number;
    total_pages: number;
  };
  error?: string;
}

interface CreateListingRequest {
  name: string;
  category: string;
  description: string;
  unit_price: number;
  unit: string;
  lead_time_days: number;
  min_order_qty: number;
  specifications?: Record<string, unknown>;
  supplier_id: string;
}

interface UpdateListingRequest {
  name?: string;
  category?: string;
  description?: string;
  unit_price?: number;
  unit?: string;
  lead_time_days?: number;
  min_order_qty?: number;
  specifications?: Record<string, unknown>;
}

const VALID_CATEGORIES = [
  'lumber',
  'concrete',
  'steel',
  'electrical',
  'plumbing',
  'hvac',
  'finishes',
  'tools',
  'safety',
  'equipment'
];

// Mock data for when Supabase tables don't exist
const mockListings: Listing[] = [
  {
    id: 'lst_001',
    name: 'Pressure Treated 2x4 Lumber',
    category: 'lumber',
    description: '8ft pressure treated lumber, grade A',
    unit_price: 8.50,
    unit: 'piece',
    lead_time_days: 3,
    min_order_qty: 10,
    specifications: { length: '8ft', treatment: 'pressure_treated', grade: 'A' },
    supplier_id: 'sup_001',
    supplier_name: 'BuildMaterials Co',
    rating: 4.8,
    review_count: 124,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'lst_002',
    name: 'Concrete Mix 60lb Bags',
    category: 'concrete',
    description: 'Ready-to-use concrete mix, 60lb bags',
    unit_price: 5.25,
    unit: 'bag',
    lead_time_days: 2,
    min_order_qty: 5,
    specifications: { weight: '60lb', type: 'general_purpose', coverage: '0.5 sqft per 2in depth' },
    supplier_id: 'sup_002',
    supplier_name: 'Concrete Supplies LLC',
    rating: 4.6,
    review_count: 89,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'lst_003',
    name: 'Steel Reinforcing Bar #4',
    category: 'steel',
    description: 'Rebar #4 (1/2 inch diameter), grade 60',
    unit_price: 0.85,
    unit: 'pound',
    lead_time_days: 5,
    min_order_qty: 100,
    specifications: { diameter: '0.5 inch', grade: '60', length: '20ft' },
    supplier_id: 'sup_003',
    supplier_name: 'Steel Distributors Inc',
    rating: 4.9,
    review_count: 203,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'lst_004',
    name: 'Romex Electrical Wire 12/2',
    category: 'electrical',
    description: '12 AWG/2 conductor Romex, 25ft roll',
    unit_price: 24.99,
    unit: 'roll',
    lead_time_days: 2,
    min_order_qty: 1,
    specifications: { awg: '12', conductors: '2', length: '25ft', voltage: '600V' },
    supplier_id: 'sup_004',
    supplier_name: 'Electrical Supplies Plus',
    rating: 4.7,
    review_count: 156,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'lst_005',
    name: 'PVC Pipe Schedule 40 1/2in',
    category: 'plumbing',
    description: '1/2 inch PVC schedule 40, 10ft length',
    unit_price: 1.85,
    unit: 'piece',
    lead_time_days: 2,
    min_order_qty: 5,
    specifications: { diameter: '0.5in', schedule: '40', material: 'PVC', length: '10ft' },
    supplier_id: 'sup_005',
    supplier_name: 'Plumbing Depot',
    rating: 4.5,
    review_count: 92,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const mockQuoteRequests: QuoteRequest[] = [];
const mockOrders: Order[] = [];

// Validate listing data
function validateCreateListing(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof data !== 'object' || !data) {
    return { valid: false, errors: ['Invalid request body'] };
  }

  const req = data as Record<string, unknown>;

  if (typeof req.name !== 'string' || !req.name.trim()) {
    errors.push('name is required and must be a non-empty string');
  }

  if (typeof req.category !== 'string' || !VALID_CATEGORIES.includes(req.category)) {
    errors.push(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }

  if (typeof req.description !== 'string' || !req.description.trim()) {
    errors.push('description is required and must be a non-empty string');
  }

  if (typeof req.unit_price !== 'number' || req.unit_price <= 0) {
    errors.push('unit_price must be a positive number');
  }

  if (typeof req.unit !== 'string' || !req.unit.trim()) {
    errors.push('unit is required (e.g., piece, bag, pound)');
  }

  if (typeof req.lead_time_days !== 'number' || req.lead_time_days < 0) {
    errors.push('lead_time_days must be a non-negative number');
  }

  if (typeof req.min_order_qty !== 'number' || req.min_order_qty <= 0) {
    errors.push('min_order_qty must be a positive number');
  }

  if (typeof req.supplier_id !== 'string' || !req.supplier_id.trim()) {
    errors.push('supplier_id is required');
  }

  return { valid: errors.length === 0, errors };
}

// Generate unique ID
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Filter and sort listings
function filterAndSortListings(
  listings: Listing[],
  category?: string,
  minPrice?: number,
  maxPrice?: number,
  supplierId?: string,
  search?: string,
  sortBy: 'price' | 'rating' | 'lead_time' = 'price'
): Listing[] {
  let filtered = [...listings];

  if (category) {
    filtered = filtered.filter(l => l.category === category);
  }

  if (supplierId) {
    filtered = filtered.filter(l => l.supplier_id === supplierId);
  }

  if (minPrice !== undefined) {
    filtered = filtered.filter(l => l.unit_price >= minPrice);
  }

  if (maxPrice !== undefined) {
    filtered = filtered.filter(l => l.unit_price <= maxPrice);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(l =>
      l.name.toLowerCase().includes(searchLower) ||
      l.description.toLowerCase().includes(searchLower)
    );
  }

  // Sort
  switch (sortBy) {
    case 'rating':
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    case 'lead_time':
      filtered.sort((a, b) => a.lead_time_days - b.lead_time_days);
      break;
    case 'price':
    default:
      filtered.sort((a, b) => a.unit_price - b.unit_price);
  }

  return filtered;
}

// Handle GET requests
async function handleGet(request: NextRequest): Promise<NextResponse<unknown>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'quote') {
      // Request a quote
      const listingId = searchParams.get('listing_id');
      const quantity = searchParams.get('quantity');
      const deliveryDate = searchParams.get('delivery_date');
      const projectId = searchParams.get('project_id');
      const buyerId = searchParams.get('buyer_id');

      if (!listingId || !quantity || !deliveryDate || !buyerId) {
        return NextResponse.json(
          { success: false, error: 'Missing required parameters: listing_id, quantity, delivery_date, buyer_id' },
          { status: 400 }
        );
      }

      const listing = mockListings.find(l => l.id === listingId);
      if (!listing) {
        return NextResponse.json(
          { success: false, error: 'Listing not found' },
          { status: 404 }
        );
      }

      const quoteRequest: QuoteRequest = {
        id: generateId('qte'),
        listing_id: listingId,
        quantity: parseInt(quantity, 10),
        delivery_date: deliveryDate,
        project_id: projectId || undefined,
        buyer_id: buyerId,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      mockQuoteRequests.push(quoteRequest);

      return NextResponse.json({
        success: true,
        data: quoteRequest
      });
    }

    if (action === 'orders') {
      // List orders
      const status = searchParams.get('status');
      const supplierId = searchParams.get('supplier_id');
      const buyerId = searchParams.get('buyer_id');
      const page = parseInt(searchParams.get('page') || '1', 10);
      const limit = parseInt(searchParams.get('limit') || '20', 10);

      let filtered = [...mockOrders];

      if (status) {
        filtered = filtered.filter(o => o.status === status);
      }
      if (supplierId) {
        filtered = filtered.filter(o => o.supplier_id === supplierId);
      }
      if (buyerId) {
        filtered = filtered.filter(o => o.buyer_id === buyerId);
      }

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
    }

    // Default: List products/suppliers
    const category = searchParams.get('category');
    const minPrice = searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : undefined;
    const maxPrice = searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : undefined;
    const supplierId = searchParams.get('supplier_id');
    const search = searchParams.get('search');
    const sortBy = (searchParams.get('sort_by') || 'price') as 'price' | 'rating' | 'lead_time';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const filtered = filterAndSortListings(
      mockListings,
      category || undefined,
      minPrice,
      maxPrice,
      supplierId || undefined,
      search || undefined,
      sortBy
    );

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / limit);
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    const response: ListingsResponse = {
      success: true,
      data: paginated,
      pagination: {
        page,
        limit,
        total_count: totalCount,
        total_pages: totalPages
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/v1/marketplace error:', error);
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

    if (action === 'order') {
      // Place an order from a quote
      const body = await request.json() as Record<string, unknown>;
      const quoteId = body.quote_id as string | undefined;
      const shippingAddress = body.shipping_address as string | undefined;
      const notes = body.notes as string | undefined;

      if (!quoteId) {
        return NextResponse.json(
          { success: false, error: 'quote_id is required' },
          { status: 400 }
        );
      }

      const quoteRequest = mockQuoteRequests.find(q => q.id === quoteId);
      if (!quoteRequest) {
        return NextResponse.json(
          { success: false, error: 'Quote request not found' },
          { status: 404 }
        );
      }

      const listing = mockListings.find(l => l.id === quoteRequest.listing_id);
      if (!listing) {
        return NextResponse.json(
          { success: false, error: 'Listing not found' },
          { status: 404 }
        );
      }

      const order: Order = {
        id: generateId('ord'),
        quote_id: quoteId,
        listing_id: quoteRequest.listing_id,
        buyer_id: quoteRequest.buyer_id,
        supplier_id: listing.supplier_id,
        quantity: quoteRequest.quantity,
        unit_price: listing.unit_price,
        total_amount: quoteRequest.quantity * listing.unit_price,
        status: 'ordered',
        shipping_address: shippingAddress as string | undefined,
        notes: notes as string | undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      mockOrders.push(order);

      return NextResponse.json(
        { success: true, data: order },
        { status: 201 }
      );
    }

    // Create new listing
    const body = await request.json();
    const validation = validateCreateListing(body);

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    const createReq = body as CreateListingRequest;

    const newListing: Listing = {
      id: generateId('lst'),
      name: createReq.name,
      category: createReq.category,
      description: createReq.description,
      unit_price: createReq.unit_price,
      unit: createReq.unit,
      lead_time_days: createReq.lead_time_days,
      min_order_qty: createReq.min_order_qty,
      specifications: createReq.specifications || {},
      supplier_id: createReq.supplier_id,
      rating: undefined,
      review_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockListings.push(newListing);

    return NextResponse.json(
      { success: true, data: newListing },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/v1/marketplace error:', error);
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
    const listingId = searchParams.get('listing_id');

    if (!listingId) {
      return NextResponse.json(
        { success: false, error: 'listing_id query parameter is required' },
        { status: 400 }
      );
    }

    const listingIndex = mockListings.findIndex(l => l.id === listingId);
    if (listingIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    const body = await request.json() as Partial<UpdateListingRequest>;

    // Validate category if provided
    if (body.category && !VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { success: false, error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    // Update listing
    const updated: Listing = {
      ...mockListings[listingIndex],
      ...body,
      updated_at: new Date().toISOString()
    };

    mockListings[listingIndex] = updated;

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('PATCH /api/v1/marketplace error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle DELETE requests
async function handleDelete(request: NextRequest): Promise<NextResponse<unknown>> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const listingId = searchParams.get('listing_id');

    if (!listingId) {
      return NextResponse.json(
        { success: false, error: 'listing_id query parameter is required' },
        { status: 400 }
      );
    }

    const listingIndex = mockListings.findIndex(l => l.id === listingId);
    if (listingIndex === -1) {
      return NextResponse.json(
        { success: false, error: 'Listing not found' },
        { status: 404 }
      );
    }

    const deleted = mockListings.splice(listingIndex, 1)[0];

    return NextResponse.json({
      success: true,
      data: { id: deleted.id, message: 'Listing deleted successfully' }
    });
  } catch (error) {
    console.error('DELETE /api/v1/marketplace error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Main route handler
export async function GET(request: NextRequest): Promise<NextResponse<unknown>> {
  return handleGet(request);
}

export async function POST(request: NextRequest): Promise<NextResponse<unknown>> {
  return handlePost(request);
}

export async function PATCH(request: NextRequest): Promise<NextResponse<unknown>> {
  return handlePatch(request);
}

export async function DELETE(request: NextRequest): Promise<NextResponse<unknown>> {
  return handleDelete(request);
}

// Config for Next.js
export const config = {
  runtime: 'nodejs',
  maxDuration: 30
};
