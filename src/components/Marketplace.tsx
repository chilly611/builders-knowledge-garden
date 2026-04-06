'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface Supplier {
  id: string;
  company_name: string;
  trade: string;
  rating: number;
  location: string;
  certifications: string[];
  insurance_verified: boolean;
  response_time: string;
  projects_completed: number;
  phone?: string;
  email?: string;
  website?: string;
}

interface Product {
  id: string;
  name: string;
  category: 'lumber' | 'concrete' | 'steel' | 'electrical' | 'plumbing' | 'HVAC' | 'finishes' | 'tools';
  unit_price: number;
  unit: string;
  supplier_id: string;
  supplier_name: string;
  lead_time: string;
  min_order: number;
  specifications: string;
  image_placeholder: string;
}

interface Order {
  id: string;
  product_id: string;
  supplier_id: string;
  quantity: number;
  delivery_date: string;
  project_reference: string;
  status: 'quoted' | 'ordered' | 'shipped' | 'delivered' | 'installed';
  tracking_number?: string;
  expected_delivery?: string;
}

interface SavedSupplier {
  id: string;
  supplier_id: string;
  saved_at: string;
}

interface Review {
  id: string;
  supplier_id: string;
  rating: number;
  comment: string;
  date: string;
}

const CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  lumber: { label: 'Lumber & Wood', icon: '🪵', color: '#D85A30' },
  concrete: { label: 'Concrete & Masonry', icon: '🧱', color: '#6B7280' },
  steel: { label: 'Steel & Metals', icon: '⚙️', color: '#9CA3AF' },
  electrical: { label: 'Electrical', icon: '⚡', color: '#F59E0B' },
  plumbing: { label: 'Plumbing', icon: '🚰', color: '#378ADD' },
  HVAC: { label: 'HVAC', icon: '❄️', color: '#3B82F6' },
  finishes: { label: 'Finishes & Paint', icon: '🎨', color: '#7F77DD' },
  tools: { label: 'Tools & Equipment', icon: '🔧', color: '#1D9E75' },
};

const SUPPLIERS: Supplier[] = [
  {
    id: '1',
    company_name: 'Acme Lumber Co.',
    trade: 'Lumber & Wood',
    rating: 4.8,
    location: 'Portland, OR',
    certifications: ['FSC Certified', 'SFI'],
    insurance_verified: true,
    response_time: '2 hours',
    projects_completed: 245,
    phone: '(503) 555-0101',
    email: 'sales@acmelumber.com',
    website: 'www.acmelumber.com',
  },
  {
    id: '2',
    company_name: 'Premier Steel Supply',
    trade: 'Steel & Metals',
    rating: 4.6,
    location: 'Chicago, IL',
    certifications: ['AISC', 'ASTM'],
    insurance_verified: true,
    response_time: '1 hour',
    projects_completed: 189,
    phone: '(312) 555-0202',
    email: 'info@premiersteel.com',
    website: 'www.premiersteel.com',
  },
  {
    id: '3',
    company_name: 'Concrete Masters Inc.',
    trade: 'Concrete & Masonry',
    rating: 4.4,
    location: 'Houston, TX',
    certifications: ['ACI', 'NCMA'],
    insurance_verified: true,
    response_time: '3 hours',
    projects_completed: 167,
    phone: '(713) 555-0303',
    email: 'sales@concretemasters.com',
    website: 'www.concretemasters.com',
  },
  {
    id: '4',
    company_name: 'ElectriCom Solutions',
    trade: 'Electrical',
    rating: 4.9,
    location: 'San Francisco, CA',
    certifications: ['NECA', 'UL Listed'],
    insurance_verified: true,
    response_time: '1 hour',
    projects_completed: 212,
    phone: '(415) 555-0404',
    email: 'quotes@electricom.com',
    website: 'www.electricom.com',
  },
  {
    id: '5',
    company_name: 'PlumbPro Distribution',
    trade: 'Plumbing',
    rating: 4.5,
    location: 'Phoenix, AZ',
    certifications: ['PHCC', 'NSF'],
    insurance_verified: true,
    response_time: '2 hours',
    projects_completed: 198,
    phone: '(602) 555-0505',
    email: 'sales@plumbpro.com',
    website: 'www.plumbpro.com',
  },
  {
    id: '6',
    company_name: 'Climate Control LLC',
    trade: 'HVAC',
    rating: 4.7,
    location: 'Denver, CO',
    certifications: ['NATE', 'EPA'],
    insurance_verified: true,
    response_time: '2 hours',
    projects_completed: 154,
    phone: '(720) 555-0606',
    email: 'orders@climatecontrol.com',
    website: 'www.climatecontrol.com',
  },
];

const PRODUCTS: Product[] = [
  {
    id: '1',
    name: '2x4 Premium Framing Lumber',
    category: 'lumber',
    unit_price: 8.5,
    unit: 'board foot',
    supplier_id: '1',
    supplier_name: 'Acme Lumber Co.',
    lead_time: '1-2 days',
    min_order: 100,
    specifications: 'Grade #2, 8ft length, kiln-dried',
    image_placeholder: '🪵',
  },
  {
    id: '2',
    name: 'Structural Steel I-Beam',
    category: 'steel',
    unit_price: 125.0,
    unit: 'piece',
    supplier_id: '2',
    supplier_name: 'Premier Steel Supply',
    lead_time: '3-5 days',
    min_order: 1,
    specifications: 'W12x40, ASTM A992, Cut to length available',
    image_placeholder: '⚙️',
  },
  {
    id: '3',
    name: 'Ready-Mix Concrete 4000 PSI',
    category: 'concrete',
    unit_price: 185.0,
    unit: 'cubic yard',
    supplier_id: '3',
    supplier_name: 'Concrete Masters Inc.',
    lead_time: 'Same day',
    min_order: 1,
    specifications: '4000 PSI strength, air-entrained, 28-day cure',
    image_placeholder: '🧱',
  },
  {
    id: '4',
    name: 'Romex 14/2 NM Cable',
    category: 'electrical',
    unit_price: 0.45,
    unit: 'foot',
    supplier_id: '4',
    supplier_name: 'ElectriCom Solutions',
    lead_time: '1 day',
    min_order: 500,
    specifications: '14 AWG, 2 conductor, white sheathing, UL Listed',
    image_placeholder: '⚡',
  },
  {
    id: '5',
    name: 'PVC Schedule 40 Pipe 2"',
    category: 'plumbing',
    unit_price: 12.75,
    unit: 'foot',
    supplier_id: '5',
    supplier_name: 'PlumbPro Distribution',
    lead_time: '1-2 days',
    min_order: 20,
    specifications: 'Schedule 40, NSF-PW certified, white',
    image_placeholder: '🚰',
  },
  {
    id: '6',
    name: 'Central AC Unit 5-Ton',
    category: 'HVAC',
    unit_price: 3500.0,
    unit: 'unit',
    supplier_id: '6',
    supplier_name: 'Climate Control LLC',
    lead_time: '5-7 days',
    min_order: 1,
    specifications: 'R410A refrigerant, 16 SEER, 5-year warranty',
    image_placeholder: '❄️',
  },
  {
    id: '7',
    name: 'Interior Paint - Premium Grade',
    category: 'finishes',
    unit_price: 65.0,
    unit: 'gallon',
    supplier_id: '1',
    supplier_name: 'Acme Lumber Co.',
    lead_time: '1 day',
    min_order: 1,
    specifications: 'Zero-VOC, satin finish, covers 400 sqft/gal',
    image_placeholder: '🎨',
  },
  {
    id: '8',
    name: 'Cordless Impact Driver',
    category: 'tools',
    unit_price: 299.0,
    unit: 'unit',
    supplier_id: '2',
    supplier_name: 'Premier Steel Supply',
    lead_time: '2 days',
    min_order: 1,
    specifications: '20V, lithium battery, 2-year warranty',
    image_placeholder: '🔧',
  },
];

export default function Marketplace() {
  const [viewType, setViewType] = useState<'suppliers' | 'products'>('products');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [savedSuppliers, setSavedSuppliers] = useState<SavedSupplier[]>([]);
  const [comparisonSuppliers, setComparisonSuppliers] = useState<string[]>([]);
  const [showQuoteForm, setShowQuoteForm] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quoteFormData, setQuoteFormData] = useState({ quantity: 0, delivery_date: '', project_reference: '' });
  const [orders, setOrders] = useState<Order[]>([]);
  const [showReviewForm, setShowReviewForm] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([
    {
      id: '1',
      supplier_id: '1',
      rating: 5,
      comment: 'Excellent quality lumber and fast delivery. Highly recommend!',
      date: '2024-03-10',
    },
    {
      id: '2',
      supplier_id: '4',
      rating: 5,
      comment: 'Best electrical supplier in the region. Always in stock.',
      date: '2024-03-08',
    },
  ]);
  const [reviewFormData, setReviewFormData] = useState({ rating: 5, comment: '' });

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((product) => {
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      const matchesSearch =
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.supplier_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPrice = product.unit_price >= priceRange[0] && product.unit_price <= priceRange[1];
      return matchesCategory && matchesSearch && matchesPrice;
    });
  }, [selectedCategory, searchTerm, priceRange]);

  const isSaved = useCallback(
    (supplierId: string) => savedSuppliers.some((s) => s.supplier_id === supplierId),
    [savedSuppliers]
  );

  const handleSaveSupplier = useCallback((supplierId: string) => {
    setSavedSuppliers((prev) => {
      const isAlreadySaved = prev.some((s) => s.supplier_id === supplierId);
      if (isAlreadySaved) {
        return prev.filter((s) => s.supplier_id !== supplierId);
      } else {
        return [...prev, { id: String(Date.now()), supplier_id: supplierId, saved_at: new Date().toISOString() }];
      }
    });
  }, []);

  const handleAddToComparison = useCallback((supplierId: string) => {
    setComparisonSuppliers((prev) => {
      if (prev.includes(supplierId)) {
        return prev.filter((id) => id !== supplierId);
      } else {
        if (prev.length >= 3) {
          alert('You can compare up to 3 suppliers at a time');
          return prev;
        }
        return [...prev, supplierId];
      }
    });
  }, []);

  const handleRequestQuote = useCallback((product: Product) => {
    setSelectedProduct(product);
    setQuoteFormData({ quantity: product.min_order, delivery_date: '', project_reference: '' });
    setShowQuoteForm(true);
  }, []);

  const handleSubmitQuote = useCallback(() => {
    if (!selectedProduct || !quoteFormData.delivery_date || !quoteFormData.project_reference) {
      alert('Please fill in all required fields');
      return;
    }

    const newOrder: Order = {
      id: String(Date.now()),
      product_id: selectedProduct.id,
      supplier_id: selectedProduct.supplier_id,
      quantity: quoteFormData.quantity,
      delivery_date: quoteFormData.delivery_date,
      project_reference: quoteFormData.project_reference,
      status: 'quoted',
      tracking_number: undefined,
      expected_delivery: undefined,
    };

    setOrders((prev) => [newOrder, ...prev]);
    setShowQuoteForm(false);
    setSelectedProduct(null);
    setQuoteFormData({ quantity: 0, delivery_date: '', project_reference: '' });
    alert('Quote request submitted to ' + selectedProduct.supplier_name);
  }, [selectedProduct, quoteFormData]);

  const handleSubmitReview = useCallback(
    (supplierId: string) => {
      if (!reviewFormData.comment) {
        alert('Please write a review comment');
        return;
      }

      const newReview: Review = {
        id: String(Date.now()),
        supplier_id: supplierId,
        rating: reviewFormData.rating,
        comment: reviewFormData.comment,
        date: new Date().toISOString().split('T')[0],
      };

      setReviews((prev) => [newReview, ...prev]);
      setShowReviewForm(null);
      setReviewFormData({ rating: 5, comment: '' });
      alert('Review submitted successfully!');
    },
    [reviewFormData]
  );

  const getSupplierReviews = useCallback(
    (supplierId: string) => {
      return reviews.filter((r) => r.supplier_id === supplierId);
    },
    [reviews]
  );

  const getAverageRating = useCallback((supplierId: string) => {
    const supplierReviews = reviews.filter((r) => r.supplier_id === supplierId);
    if (supplierReviews.length === 0) return 0;
    const sum = supplierReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / supplierReviews.length).toFixed(1);
  }, [reviews]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(price);
  };

  const renderStars = (rating: number) => {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} style={{ color: star <= Math.round(rating) ? '#F59E0B' : '#D1D5DB', fontSize: '16px' }}>
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#FAFAF9', minHeight: '100vh', fontFamily: 'Archivo, sans-serif' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#1F2937', marginBottom: '8px' }}>
            Construction Marketplace
          </h1>
          <p style={{ fontSize: '16px', color: '#6B7280' }}>
            Find suppliers, compare products, and manage orders
          </p>
        </div>

        {/* View Toggle */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => setViewType('products')}
            style={{
              padding: '10px 20px',
              backgroundColor: viewType === 'products' ? '#1D9E75' : 'white',
              color: viewType === 'products' ? 'white' : '#1F2937',
              border: viewType === 'products' ? 'none' : '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Archivo, sans-serif',
            }}
          >
            Product Catalog
          </button>
          <button
            onClick={() => setViewType('suppliers')}
            style={{
              padding: '10px 20px',
              backgroundColor: viewType === 'suppliers' ? '#1D9E75' : 'white',
              color: viewType === 'suppliers' ? 'white' : '#1F2937',
              border: viewType === 'suppliers' ? 'none' : '1px solid #D1D5DB',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Archivo, sans-serif',
            }}
          >
            Supplier Directory
          </button>

          {comparisonSuppliers.length > 0 && (
            <button
              onClick={() => setViewType('suppliers')}
              style={{
                padding: '10px 20px',
                backgroundColor: '#D85A30',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Archivo, sans-serif',
              }}
            >
              Compare ({comparisonSuppliers.length})
            </button>
          )}

          {orders.length > 0 && (
            <button
              style={{
                padding: '10px 20px',
                backgroundColor: '#E5E7EB',
                color: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Archivo, sans-serif',
              }}
            >
              Orders ({orders.length})
            </button>
          )}

          {savedSuppliers.length > 0 && (
            <button
              style={{
                padding: '10px 20px',
                backgroundColor: '#E5E7EB',
                color: '#1F2937',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Archivo, sans-serif',
              }}
            >
              Saved ({savedSuppliers.length})
            </button>
          )}
        </div>

        {/* Products View */}
        {viewType === 'products' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {/* Filters */}
            <div
              style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid #E5E7EB',
                marginBottom: '24px',
              }}
            >
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                  Search Products
                </label>
                <input
                  type="text"
                  placeholder="Search by product name or supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'Archivo, sans-serif',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '16px',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      fontFamily: 'Archivo, sans-serif',
                    }}
                  >
                    <option value="all">All Categories</option>
                    {Object.entries(CATEGORIES).map(([key, { label }]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                    Price Range: {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Category Quick Filters */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setSelectedCategory('all')}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: selectedCategory === 'all' ? '#1D9E75' : '#E5E7EB',
                    color: selectedCategory === 'all' ? 'white' : '#1F2937',
                    border: 'none',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Archivo, sans-serif',
                  }}
                >
                  All
                </button>
                {Object.entries(CATEGORIES).map(([key, { label, icon }]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCategory(key)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: selectedCategory === key ? CATEGORIES[key].color : '#E5E7EB',
                      color: selectedCategory === key ? 'white' : '#1F2937',
                      border: 'none',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'Archivo, sans-serif',
                    }}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div
                style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '60px 20px',
                  textAlign: 'center',
                  color: '#9CA3AF',
                }}
              >
                <p style={{ fontSize: '18px', margin: 0 }}>No products found matching your criteria</p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '20px',
                }}
              >
                <AnimatePresence>
                  {filteredProducts.map((product, idx) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: idx * 0.05 }}
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        border: '1px solid #E5E7EB',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: CATEGORIES[product.category].color,
                          padding: '40px 20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '48px',
                        }}
                      >
                        {CATEGORIES[product.category].icon}
                      </div>

                      <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1F2937', marginBottom: '8px', margin: 0 }}>
                          {product.name}
                        </h3>

                        <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', margin: '8px 0 0 0' }}>
                          {product.supplier_name}
                        </p>

                        <p style={{ fontSize: '13px', color: '#4B5563', marginBottom: '8px', margin: '8px 0 0 0', fontStyle: 'italic' }}>
                          {product.specifications}
                        </p>

                        <div style={{ backgroundColor: '#F3F4F6', padding: '8px', borderRadius: '6px', marginBottom: '12px' }}>
                          <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>
                            <strong>Min Order:</strong> {product.min_order} {product.unit}
                          </p>
                          <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0' }}>
                            <strong>Lead Time:</strong> {product.lead_time}
                          </p>
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div>
                              <p style={{ fontSize: '24px', fontWeight: 700, color: '#1D9E75', margin: 0 }}>
                                {formatPrice(product.unit_price)}
                              </p>
                              <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0 0' }}>per {product.unit}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRequestQuote(product)}
                            style={{
                              width: '100%',
                              padding: '10px',
                              backgroundColor: '#1D9E75',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'Archivo, sans-serif',
                            }}
                          >
                            Request Quote
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}

        {/* Suppliers View */}
        {viewType === 'suppliers' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            {comparisonSuppliers.length > 0 && (
              <div
                style={{
                  backgroundColor: 'white',
                  padding: '24px',
                  borderRadius: '12px',
                  border: '2px solid #D85A30',
                  marginBottom: '24px',
                }}
              >
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1F2937', marginBottom: '16px' }}>
                  Supplier Comparison
                </h2>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: '#6B7280' }}>
                          Criteria
                        </th>
                        {comparisonSuppliers.map((supplierId) => {
                          const supplier = SUPPLIERS.find((s) => s.id === supplierId);
                          return (
                            <th
                              key={supplierId}
                              style={{
                                padding: '12px',
                                textAlign: 'center',
                                fontSize: '13px',
                                fontWeight: 700,
                                color: '#1F2937',
                                backgroundColor: '#F3F4F6',
                              }}
                            >
                              {supplier?.company_name}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: 'Rating', accessor: (s: Supplier) => `${s.rating} ⭐` },
                        { label: 'Response Time', accessor: (s: Supplier) => s.response_time },
                        { label: 'Projects Completed', accessor: (s: Supplier) => s.projects_completed.toString() },
                        {
                          label: 'Insurance Verified',
                          accessor: (s: Supplier) => (s.insurance_verified ? '✓ Yes' : '✗ No'),
                        },
                        {
                          label: 'Certifications',
                          accessor: (s: Supplier) => s.certifications.slice(0, 2).join(', '),
                        },
                      ].map((row) => (
                        <tr key={row.label} style={{ borderBottom: '1px solid #E5E7EB' }}>
                          <td style={{ padding: '12px', fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>
                            {row.label}
                          </td>
                          {comparisonSuppliers.map((supplierId) => {
                            const supplier = SUPPLIERS.find((s) => s.id === supplierId);
                            return (
                              <td
                                key={supplierId}
                                style={{
                                  padding: '12px',
                                  textAlign: 'center',
                                  fontSize: '13px',
                                  color: '#4B5563',
                                  backgroundColor: '#FAFAF9',
                                }}
                              >
                                {supplier ? row.accessor(supplier) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={() => setComparisonSuppliers([])}
                  style={{
                    marginTop: '16px',
                    padding: '8px 16px',
                    backgroundColor: '#FEE2E2',
                    color: '#DC2626',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Archivo, sans-serif',
                  }}
                >
                  Clear Comparison
                </button>
              </div>
            )}

            {/* Suppliers Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '20px',
              }}
            >
              <AnimatePresence>
                {SUPPLIERS.map((supplier, idx) => (
                  <motion.div
                    key={supplier.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      border: comparisonSuppliers.includes(supplier.id) ? '2px solid #D85A30' : '1px solid #E5E7EB',
                      padding: '20px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1F2937', margin: '0 0 4px 0' }}>
                          {supplier.company_name}
                        </h3>
                        <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>{supplier.trade}</p>
                      </div>
                      <button
                        onClick={() => handleSaveSupplier(supplier.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '24px',
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        {isSaved(supplier.id) ? '❤️' : '🤍'}
                      </button>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        {renderStars(supplier.rating)}
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1F2937' }}>
                          {supplier.rating} ({getSupplierReviews(supplier.id).length} reviews)
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>📍 {supplier.location}</p>
                    </div>

                    <div style={{ backgroundColor: '#F3F4F6', padding: '12px', borderRadius: '8px', marginBottom: '12px' }}>
                      <p style={{ fontSize: '13px', color: '#4B5563', margin: '0 0 6px 0' }}>
                        <strong>Response:</strong> {supplier.response_time}
                      </p>
                      <p style={{ fontSize: '13px', color: '#4B5563', margin: '0 0 6px 0' }}>
                        <strong>Projects:</strong> {supplier.projects_completed} completed
                      </p>
                      <p
                        style={{
                          fontSize: '13px',
                          color: supplier.insurance_verified ? '#10B981' : '#EF4444',
                          margin: 0,
                        }}
                      >
                        {supplier.insurance_verified ? '✓' : '✗'} <strong>Insurance Verified</strong>
                      </p>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937', marginBottom: '6px' }}>Certifications:</p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {supplier.certifications.map((cert, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '11px',
                              backgroundColor: '#ECFDF5',
                              color: '#047857',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>

                    {supplier.email && (
                      <p style={{ fontSize: '12px', color: '#3B82F6', margin: '12px 0 0 0' }}>
                        📧{' '}
                        <a href={`mailto:${supplier.email}`} style={{ color: '#3B82F6', textDecoration: 'none' }}>
                          {supplier.email}
                        </a>
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                      <button
                        onClick={() => handleAddToComparison(supplier.id)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          backgroundColor: comparisonSuppliers.includes(supplier.id) ? '#D85A30' : '#E5E7EB',
                          color: comparisonSuppliers.includes(supplier.id) ? 'white' : '#1F2937',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'Archivo, sans-serif',
                        }}
                      >
                        {comparisonSuppliers.includes(supplier.id) ? '✓ Comparing' : 'Compare'}
                      </button>
                      <button
                        onClick={() => setShowReviewForm(showReviewForm === supplier.id ? null : supplier.id)}
                        style={{
                          flex: 1,
                          padding: '8px',
                          backgroundColor: '#1D9E75',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'Archivo, sans-serif',
                        }}
                      >
                        Review
                      </button>
                    </div>

                    {showReviewForm === supplier.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        style={{
                          marginTop: '12px',
                          padding: '12px',
                          backgroundColor: '#FFFBEB',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937' }}>Rating</label>
                          <select
                            value={reviewFormData.rating}
                            onChange={(e) => setReviewFormData({ ...reviewFormData, rating: parseInt(e.target.value) })}
                            style={{
                              width: '100%',
                              padding: '6px 8px',
                              border: '1px solid #D1D5DB',
                              borderRadius: '6px',
                              fontSize: '12px',
                              marginTop: '4px',
                              fontFamily: 'Archivo, sans-serif',
                            }}
                          >
                            {[5, 4, 3, 2, 1].map((r) => (
                              <option key={r} value={r}>
                                {r} Stars
                              </option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          placeholder="Write your review..."
                          value={reviewFormData.comment}
                          onChange={(e) => setReviewFormData({ ...reviewFormData, comment: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #D1D5DB',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontFamily: 'Archivo, sans-serif',
                            minHeight: '60px',
                            boxSizing: 'border-box',
                            marginBottom: '8px',
                          }}
                        />
                        <button
                          onClick={() => handleSubmitReview(supplier.id)}
                          style={{
                            width: '100%',
                            padding: '6px',
                            backgroundColor: '#10B981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'Archivo, sans-serif',
                          }}
                        >
                          Submit Review
                        </button>
                      </motion.div>
                    )}

                    {getSupplierReviews(supplier.id).length > 0 && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#1F2937', marginBottom: '8px' }}>Recent Reviews</p>
                        {getSupplierReviews(supplier.id)
                          .slice(0, 2)
                          .map((review) => (
                            <div
                              key={review.id}
                              style={{
                                backgroundColor: '#F9FAFB',
                                padding: '8px',
                                borderRadius: '6px',
                                marginBottom: '6px',
                              }}
                            >
                              <div style={{ display: 'flex', gap: '4px', marginBottom: '2px' }}>
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <span key={s} style={{ color: s <= review.rating ? '#F59E0B' : '#D1D5DB', fontSize: '12px' }}>
                                    ★
                                  </span>
                                ))}
                              </div>
                              <p style={{ fontSize: '11px', color: '#4B5563', margin: '2px 0 0 0' }}>{review.comment}</p>
                              <p style={{ fontSize: '10px', color: '#9CA3AF', margin: '2px 0 0 0' }}>{review.date}</p>
                            </div>
                          ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Quote Form Modal */}
      <AnimatePresence>
        {showQuoteForm && selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setShowQuoteForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '500px',
                width: '90%',
                boxShadow: '0 20px 25px rgba(0, 0, 0, 0.15)',
              }}
            >
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1F2937', marginBottom: '8px' }}>
                Request Quote
              </h2>
              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>
                {selectedProduct.name} from {selectedProduct.supplier_name}
              </p>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                  Quantity (minimum: {selectedProduct.min_order})
                </label>
                <input
                  type="number"
                  value={quoteFormData.quantity}
                  onChange={(e) => setQuoteFormData({ ...quoteFormData, quantity: parseInt(e.target.value) || 0 })}
                  min={selectedProduct.min_order}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    fontFamily: 'Archivo, sans-serif',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                  Desired Delivery Date*
                </label>
                <input
                  type="date"
                  value={quoteFormData.delivery_date}
                  onChange={(e) => setQuoteFormData({ ...quoteFormData, delivery_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    fontFamily: 'Archivo, sans-serif',
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#1F2937' }}>
                  Project Reference*
                </label>
                <input
                  type="text"
                  placeholder="e.g., Main Street Renovation"
                  value={quoteFormData.project_reference}
                  onChange={(e) => setQuoteFormData({ ...quoteFormData, project_reference: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    fontFamily: 'Archivo, sans-serif',
                  }}
                />
              </div>

              <div
                style={{
                  backgroundColor: '#ECFDF5',
                  padding: '12px',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  fontSize: '13px',
                  color: '#047857',
                }}
              >
                Estimated Total: {formatPrice(selectedProduct.unit_price * quoteFormData.quantity)}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setShowQuoteForm(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid #D1D5DB',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Archivo, sans-serif',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitQuote}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#1D9E75',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Archivo, sans-serif',
                  }}
                >
                  Submit Quote Request
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
