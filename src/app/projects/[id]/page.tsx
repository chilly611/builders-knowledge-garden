'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
    Scale,
      Calendar,
        Package,
          Users,
            FileCheck,
              DollarSign,
                ArrowLeft,
                  Settings,
                    Download,
                      Trash2,
                        AlertTriangle,
                          CheckCircle,
                            Clock,
                              TrendingUp,
                              } from 'lucide-react';
                              import { useAuth } from '@/lib/auth';

                              /* ─── Types ─── */
                              type TabId = 'overview' | 'codes' | 'schedule' | 'materials' | 'team' | 'permits' | 'estimate';
                              type ProjectPhase = 'DREAM' | 'DESIGN' | 'PLAN' | 'BUILD' | 'DELIVER' | 'GROW';

                              interface Project {
                                id: string;
                                  name: string;
                                    phase: ProjectPhase;
                                      progress: number;
                                        budget_amount: number;
                                          buildingType?: string;
                                            jurisdiction?: string;
                                              location: string;
                                                totalSqFt?: number;
                                                  created_at: string;
                                                    updated_at: string;
                                                    }

                                                    interface AIAttentionItem {
                                                      id: string;
                                                        title: string;
                                                          body: string;
                                                            urgency: 'red' | 'yellow' | 'green';
                                                            }

                                                            interface Milestone {
                                                              id: string;
                                                                name: string;
                                                                  date: string;
                                                                    status: 'not_started' | 'in_progress' | 'completed';
                                                                    }

                                                                    interface TeamMember {
                                                                      id: string;
                                                                        name: string;
                                                                          trade: string;
                                                                            status: 'active' | 'inactive';
                                                                              contact: string;
                                                                              }

                                                                              interface Permit {
                                                                                id: string;
                                                                                  name: string;
                                                                                    status: 'not_started' | 'in_progress' | 'approved';
                                                                                      deadline?: string;
                                                                                      }

                                                                                      interface EstimateData {
                                                                                        total_cost: number;
                                                                                          cost_per_sqft: number;
                                                                                            contingency_percent: number;
                                                                                              market_rate_estimate: number;
                                                                                                divisions: Array<{
                                                                                                    code: string;
                                                                                                        name: string;
                                                                                                            estimated_qty: number;
                                                                                                                unit: string;
                                                                                                                    cost: number;
                                                                                                                      }>;
                                                                                                                      }
                                                                                                                      
                                                                                                                      interface CSIDivision {
                                                                                                                        code: string;
                                                                                                                          name: string;
                                                                                                                            estimated_qty: number;
                                                                                                                              unit: string;
                                                                                                                                cost: number;
                                                                                                                                }
