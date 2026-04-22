export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: Database["public"]["Enums"]["achievement_category"]
          created_at: string
          criteria: Json | null
          description: string
          icon: string | null
          id: string
          lane_specific: Database["public"]["Enums"]["user_lane"] | null
          rarity: Database["public"]["Enums"]["achievement_rarity"]
          slug: string
          title: string
          xp_reward: number
        }
        Insert: {
          category?: Database["public"]["Enums"]["achievement_category"]
          created_at?: string
          criteria?: Json | null
          description: string
          icon?: string | null
          id?: string
          lane_specific?: Database["public"]["Enums"]["user_lane"] | null
          rarity?: Database["public"]["Enums"]["achievement_rarity"]
          slug: string
          title: string
          xp_reward?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["achievement_category"]
          created_at?: string
          criteria?: Json | null
          description?: string
          icon?: string | null
          id?: string
          lane_specific?: Database["public"]["Enums"]["user_lane"] | null
          rarity?: Database["public"]["Enums"]["achievement_rarity"]
          slug?: string
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      agent_audit_log: {
        Row: {
          action: string
          agent_id: string
          created_at: string
          id: string
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          result: string | null
          tool_name: string | null
        }
        Insert: {
          action: string
          agent_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          result?: string | null
          tool_name?: string | null
        }
        Update: {
          action?: string
          agent_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          result?: string | null
          tool_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_audit_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_identities: {
        Row: {
          active: boolean | null
          api_key_hash: string
          api_key_prefix: string
          autonomy_mode: Database["public"]["Enums"]["agent_autonomy_mode"]
          created_at: string
          description: string | null
          id: string
          last_active_at: string | null
          name: string
          owner_id: string
          permissions: Json | null
          rate_limit_per_minute: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          api_key_hash: string
          api_key_prefix: string
          autonomy_mode?: Database["public"]["Enums"]["agent_autonomy_mode"]
          created_at?: string
          description?: string | null
          id?: string
          last_active_at?: string | null
          name: string
          owner_id: string
          permissions?: Json | null
          rate_limit_per_minute?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          api_key_hash?: string
          api_key_prefix?: string
          autonomy_mode?: Database["public"]["Enums"]["agent_autonomy_mode"]
          created_at?: string
          description?: string | null
          id?: string
          last_active_at?: string | null
          name?: string
          owner_id?: string
          permissions?: Json | null
          rate_limit_per_minute?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      broker_queries: {
        Row: {
          context_json: Json | null
          created_at: string
          kinds: string[]
          latency_ms: number | null
          query_text: string
          response_json: Json | null
          run_id: string
          sources: string[] | null
          total_found: number | null
          warnings: string[] | null
        }
        Insert: {
          context_json?: Json | null
          created_at?: string
          kinds: string[]
          latency_ms?: number | null
          query_text: string
          response_json?: Json | null
          run_id?: string
          sources?: string[] | null
          total_found?: number | null
          warnings?: string[] | null
        }
        Update: {
          context_json?: Json | null
          created_at?: string
          kinds?: string[]
          latency_ms?: number | null
          query_text?: string
          response_json?: Json | null
          run_id?: string
          sources?: string[] | null
          total_found?: number | null
          warnings?: string[] | null
        }
        Relationships: []
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          objective_index: number
          progress: number | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          objective_index: number
          progress?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          objective_index?: number
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "seasonal_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      command_center_attention: {
        Row: {
          ai_generated: boolean | null
          body: string | null
          created_at: string | null
          id: string
          options: Json | null
          project_id: string | null
          project_name: string | null
          resolved: boolean | null
          title: string
          urgency: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          body?: string | null
          created_at?: string | null
          id?: string
          options?: Json | null
          project_id?: string | null
          project_name?: string | null
          resolved?: boolean | null
          title: string
          urgency?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          body?: string | null
          created_at?: string | null
          id?: string
          options?: Json | null
          project_id?: string | null
          project_name?: string | null
          resolved?: boolean | null
          title?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "command_center_attention_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "command_center_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      command_center_projects: {
        Row: {
          budget_amount: number | null
          budget_status: string | null
          client_name: string | null
          created_at: string | null
          id: string
          jurisdiction: string | null
          location: string | null
          milestone_date: string | null
          name: string
          next_milestone: string | null
          notes: string | null
          phase: string | null
          progress: number | null
          project_type: string | null
          risk_level: string | null
          start_date: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          budget_amount?: number | null
          budget_status?: string | null
          client_name?: string | null
          created_at?: string | null
          id?: string
          jurisdiction?: string | null
          location?: string | null
          milestone_date?: string | null
          name: string
          next_milestone?: string | null
          notes?: string | null
          phase?: string | null
          progress?: number | null
          project_type?: string | null
          risk_level?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          budget_amount?: number | null
          budget_status?: string | null
          client_name?: string | null
          created_at?: string | null
          id?: string
          jurisdiction?: string | null
          location?: string | null
          milestone_date?: string | null
          name?: string
          next_milestone?: string | null
          notes?: string | null
          phase?: string | null
          progress?: number | null
          project_type?: string | null
          risk_level?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      daily_quests: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          quest_date: string
          quest_type: string | null
          title: string
          user_id: string
          xp_reward: number
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          quest_date?: string
          quest_type?: string | null
          title: string
          user_id: string
          xp_reward?: number
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          quest_date?: string
          quest_type?: string | null
          title?: string
          user_id?: string
          xp_reward?: number
        }
        Relationships: []
      }
      dream_project_links: {
        Row: {
          created_at: string | null
          created_by: string | null
          dream_id: string
          id: string
          match_percentage: number | null
          project_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          dream_id: string
          id?: string
          match_percentage?: number | null
          project_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          dream_id?: string
          id?: string
          match_percentage?: number | null
          project_id?: string
        }
        Relationships: []
      }
      inspection_items: {
        Row: {
          description: string | null
          id: string
          inspection_id: string
          item_order: number | null
          name: string
          notes: string | null
          photos_required: boolean | null
          status: string
        }
        Insert: {
          description?: string | null
          id?: string
          inspection_id: string
          item_order?: number | null
          name: string
          notes?: string | null
          photos_required?: boolean | null
          status?: string
        }
        Update: {
          description?: string | null
          id?: string
          inspection_id?: string
          item_order?: number | null
          name?: string
          notes?: string | null
          photos_required?: boolean | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_items_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspection_records"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_records: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          inspection_date: string | null
          inspector: string | null
          jurisdiction: string | null
          notes: string | null
          project_id: string
          signature_data: string | null
          status: string
          template_name: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          inspection_date?: string | null
          inspector?: string | null
          jurisdiction?: string | null
          notes?: string | null
          project_id: string
          signature_data?: string | null
          status?: string
          template_name: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          inspection_date?: string | null
          inspector?: string | null
          jurisdiction?: string | null
          notes?: string | null
          project_id?: string
          signature_data?: string | null
          status?: string
          template_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          created_at: string | null
          current_work: number | null
          description: string
          id: string
          invoice_id: string
          item_number: number
          materials_stored: number | null
          previous_work: number | null
          retainage_percent: number | null
          scheduled_value: number
          total_completed: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_work?: number | null
          description: string
          id?: string
          invoice_id: string
          item_number: number
          materials_stored?: number | null
          previous_work?: number | null
          retainage_percent?: number | null
          scheduled_value: number
          total_completed?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_work?: number | null
          description?: string
          id?: string
          invoice_id?: string
          item_number?: number
          materials_stored?: number | null
          previous_work?: number | null
          retainage_percent?: number | null
          scheduled_value?: number
          total_completed?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_address: string | null
          client_name: string
          contract_amount: number
          contractor_name: string
          created_at: string | null
          created_by: string
          id: string
          invoice_number: string
          project_id: string
          status: string
          total_completed: number | null
          total_retainage: number | null
          updated_at: string | null
        }
        Insert: {
          client_address?: string | null
          client_name: string
          contract_amount: number
          contractor_name: string
          created_at?: string | null
          created_by: string
          id?: string
          invoice_number: string
          project_id: string
          status?: string
          total_completed?: number | null
          total_retainage?: number | null
          updated_at?: string | null
        }
        Update: {
          client_address?: string | null
          client_name?: string
          contract_amount?: number
          contractor_name?: string
          created_at?: string | null
          created_by?: string
          id?: string
          invoice_number?: string
          project_id?: string
          status?: string
          total_completed?: number | null
          total_retainage?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      kg_api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          metadata: Json | null
          name: string
          org_id: string | null
          rate_limit: number | null
          role: Database["public"]["Enums"]["kg_stakeholder_role"] | null
          scopes: string[] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          metadata?: Json | null
          name: string
          org_id?: string | null
          rate_limit?: number | null
          role?: Database["public"]["Enums"]["kg_stakeholder_role"] | null
          scopes?: string[] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          metadata?: Json | null
          name?: string
          org_id?: string | null
          rate_limit?: number | null
          role?: Database["public"]["Enums"]["kg_stakeholder_role"] | null
          scopes?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kg_api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "kg_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kg_assertions: {
        Row: {
          authority_level: Database["public"]["Enums"]["kg_authority_level"]
          confidence: number | null
          created_at: string | null
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          entity_id: string
          field_path: string
          id: string
          metadata: Json | null
          source_doc_id: string | null
          source_ref: string | null
          source_type: string
          source_url: string | null
          value: Json
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          authority_level: Database["public"]["Enums"]["kg_authority_level"]
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          entity_id: string
          field_path: string
          id?: string
          metadata?: Json | null
          source_doc_id?: string | null
          source_ref?: string | null
          source_type: string
          source_url?: string | null
          value: Json
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          authority_level?: Database["public"]["Enums"]["kg_authority_level"]
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          entity_id?: string
          field_path?: string
          id?: string
          metadata?: Json | null
          source_doc_id?: string | null
          source_ref?: string | null
          source_type?: string
          source_url?: string | null
          value?: Json
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kg_assertions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "kg_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      kg_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string | null
          checksum: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: number
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string | null
          checksum?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: number
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string | null
          checksum?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: number
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      kg_domains: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      kg_entities: {
        Row: {
          authority_level:
            | Database["public"]["Enums"]["kg_authority_level"]
            | null
          content: Json | null
          created_at: string | null
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          entity_type_id: string
          id: string
          metadata: Json | null
          org_id: string | null
          search_vector: unknown
          slug: string
          status: Database["public"]["Enums"]["kg_entity_status"] | null
          summary: string | null
          superseded_by: string | null
          supersedes: string | null
          title: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          authority_level?:
            | Database["public"]["Enums"]["kg_authority_level"]
            | null
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          entity_type_id: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
          search_vector?: unknown
          slug: string
          status?: Database["public"]["Enums"]["kg_entity_status"] | null
          summary?: string | null
          superseded_by?: string | null
          supersedes?: string | null
          title: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          authority_level?:
            | Database["public"]["Enums"]["kg_authority_level"]
            | null
          content?: Json | null
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          entity_type_id?: string
          id?: string
          metadata?: Json | null
          org_id?: string | null
          search_vector?: unknown
          slug?: string
          status?: Database["public"]["Enums"]["kg_entity_status"] | null
          summary?: string | null
          superseded_by?: string | null
          supersedes?: string | null
          title?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kg_entities_entity_type_id_fkey"
            columns: ["entity_type_id"]
            isOneToOne: false
            referencedRelation: "kg_entity_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kg_entities_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "kg_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kg_entities_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "kg_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      kg_entity_jurisdictions: {
        Row: {
          applicability: string | null
          created_at: string | null
          effective_from: string | null
          effective_to: string | null
          entity_id: string
          id: string
          jurisdiction_id: string
          local_amendments: Json | null
          notes: string | null
        }
        Insert: {
          applicability?: string | null
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          entity_id: string
          id?: string
          jurisdiction_id: string
          local_amendments?: Json | null
          notes?: string | null
        }
        Update: {
          applicability?: string | null
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          entity_id?: string
          id?: string
          jurisdiction_id?: string
          local_amendments?: Json | null
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kg_entity_jurisdictions_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "kg_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kg_entity_jurisdictions_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "kg_jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      kg_entity_types: {
        Row: {
          created_at: string | null
          domain_id: string | null
          icon: string | null
          id: string
          metadata: Json | null
          name: string
          schema_def: Json | null
          slug: string
          tab_config: Json | null
        }
        Insert: {
          created_at?: string | null
          domain_id?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          name: string
          schema_def?: Json | null
          slug: string
          tab_config?: Json | null
        }
        Update: {
          created_at?: string | null
          domain_id?: string | null
          icon?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          schema_def?: Json | null
          slug?: string
          tab_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "kg_entity_types_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "kg_domains"
            referencedColumns: ["id"]
          },
        ]
      }
      kg_jurisdictions: {
        Row: {
          created_at: string | null
          effective_from: string | null
          effective_to: string | null
          geo_boundary: Json | null
          id: string
          jurisdiction_type: string
          metadata: Json | null
          name: string
          parent_id: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          geo_boundary?: Json | null
          id?: string
          jurisdiction_type: string
          metadata?: Json | null
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          effective_from?: string | null
          effective_to?: string | null
          geo_boundary?: Json | null
          id?: string
          jurisdiction_type?: string
          metadata?: Json | null
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kg_jurisdictions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "kg_jurisdictions"
            referencedColumns: ["id"]
          },
        ]
      }
      kg_org_members: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kg_org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "kg_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kg_organizations: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          metadata: Json | null
          name: string
          org_type: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          name: string
          org_type?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          org_type?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      kg_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          metadata: Json | null
          org_id: string | null
          role: Database["public"]["Enums"]["kg_stakeholder_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          metadata?: Json | null
          org_id?: string | null
          role?: Database["public"]["Enums"]["kg_stakeholder_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          metadata?: Json | null
          org_id?: string | null
          role?: Database["public"]["Enums"]["kg_stakeholder_role"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profiles_org"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "kg_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      kg_relationships: {
        Row: {
          authority_level:
            | Database["public"]["Enums"]["kg_authority_level"]
            | null
          confidence: number | null
          created_at: string | null
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          properties: Json | null
          relationship_type: string
          source_entity_id: string
          source_ref: string | null
          target_entity_id: string
        }
        Insert: {
          authority_level?:
            | Database["public"]["Enums"]["kg_authority_level"]
            | null
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          properties?: Json | null
          relationship_type: string
          source_entity_id: string
          source_ref?: string | null
          target_entity_id: string
        }
        Update: {
          authority_level?:
            | Database["public"]["Enums"]["kg_authority_level"]
            | null
          confidence?: number | null
          created_at?: string | null
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          properties?: Json | null
          relationship_type?: string
          source_entity_id?: string
          source_ref?: string | null
          target_entity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kg_relationships_source_entity_id_fkey"
            columns: ["source_entity_id"]
            isOneToOne: false
            referencedRelation: "kg_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kg_relationships_target_entity_id_fkey"
            columns: ["target_entity_id"]
            isOneToOne: false
            referencedRelation: "kg_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          lead_time_days: number | null
          min_order_qty: number | null
          name: string
          rating: number | null
          review_count: number | null
          specifications: Json | null
          supplier_id: string | null
          unit: string
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          min_order_qty?: number | null
          name: string
          rating?: number | null
          review_count?: number | null
          specifications?: Json | null
          supplier_id?: string | null
          unit?: string
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          min_order_qty?: number | null
          name?: string
          rating?: number | null
          review_count?: number | null
          specifications?: Json | null
          supplier_id?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      marketplace_orders: {
        Row: {
          buyer_id: string | null
          created_at: string | null
          expected_delivery: string | null
          id: string
          listing_id: string | null
          notes: string | null
          quantity: number
          shipping_address: string | null
          status: string
          supplier_id: string | null
          total_amount: number
          tracking_number: string | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string | null
          expected_delivery?: string | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          quantity: number
          shipping_address?: string | null
          status?: string
          supplier_id?: string | null
          total_amount: number
          tracking_number?: string | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string | null
          created_at?: string | null
          expected_delivery?: string | null
          id?: string
          listing_id?: string | null
          notes?: string | null
          quantity?: number
          shipping_address?: string | null
          status?: string
          supplier_id?: string | null
          total_amount?: number
          tracking_number?: string | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_transactions: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string | null
          fee_amount: number | null
          id: string
          idempotency_key: string | null
          net_amount: number | null
          order_id: string | null
          payment_method: string
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date?: string | null
          fee_amount?: number | null
          id?: string
          idempotency_key?: string | null
          net_amount?: number | null
          order_id?: string | null
          payment_method?: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string | null
          fee_amount?: number | null
          id?: string
          idempotency_key?: string | null
          net_amount?: number | null
          order_id?: string | null
          payment_method?: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "marketplace_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      morning_briefings: {
        Row: {
          briefing_date: string
          created_at: string
          dismissed: boolean | null
          id: string
          lane: Database["public"]["Enums"]["user_lane"] | null
          narrative: string
          quests: Json | null
          user_id: string
        }
        Insert: {
          briefing_date?: string
          created_at?: string
          dismissed?: boolean | null
          id?: string
          lane?: Database["public"]["Enums"]["user_lane"] | null
          narrative: string
          quests?: Json | null
          user_id: string
        }
        Update: {
          briefing_date?: string
          created_at?: string
          dismissed?: boolean | null
          id?: string
          lane?: Database["public"]["Enums"]["user_lane"] | null
          narrative?: string
          quests?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          body: string | null
          created_at: string
          dismissed: boolean | null
          id: string
          metadata: Json | null
          read: boolean | null
          title: string
          urgency: Database["public"]["Enums"]["notification_urgency"]
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          body?: string | null
          created_at?: string
          dismissed?: boolean | null
          id?: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          urgency?: Database["public"]["Enums"]["notification_urgency"]
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          body?: string | null
          created_at?: string
          dismissed?: boolean | null
          id?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          urgency?: Database["public"]["Enums"]["notification_urgency"]
          user_id?: string
        }
        Relationships: []
      }
      permits: {
        Row: {
          approval_date: string | null
          cost: number | null
          created_at: string | null
          created_by: string | null
          expiry_date: string | null
          id: string
          jurisdiction: string | null
          notes: string | null
          permit_number: string | null
          permit_type: string
          project_id: string
          status: string
          submitted_date: string | null
          updated_at: string | null
        }
        Insert: {
          approval_date?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          jurisdiction?: string | null
          notes?: string | null
          permit_number?: string | null
          permit_type: string
          project_id: string
          status?: string
          submitted_date?: string | null
          updated_at?: string | null
        }
        Update: {
          approval_date?: string | null
          cost?: number | null
          created_at?: string | null
          created_by?: string | null
          expiry_date?: string | null
          id?: string
          jurisdiction?: string | null
          notes?: string | null
          permit_number?: string | null
          permit_type?: string
          project_id?: string
          status?: string
          submitted_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      project_compliance: {
        Row: {
          applicable_codes: Json | null
          created_at: string | null
          estimated_permit_timeline: string | null
          flags: Json | null
          id: string
          inspection_requirements: Json | null
          project_id: string
          updated_at: string | null
        }
        Insert: {
          applicable_codes?: Json | null
          created_at?: string | null
          estimated_permit_timeline?: string | null
          flags?: Json | null
          id?: string
          inspection_requirements?: Json | null
          project_id: string
          updated_at?: string | null
        }
        Update: {
          applicable_codes?: Json | null
          created_at?: string | null
          estimated_permit_timeline?: string | null
          flags?: Json | null
          id?: string
          inspection_requirements?: Json | null
          project_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_compliance_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "command_center_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_schedules: {
        Row: {
          created_at: string | null
          critical_path: Json | null
          id: string
          jurisdiction_hold_points: Json | null
          phases: Json | null
          project_id: string
          total_duration_weeks: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          critical_path?: Json | null
          id?: string
          jurisdiction_hold_points?: Json | null
          phases?: Json | null
          project_id: string
          total_duration_weeks?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          critical_path?: Json | null
          id?: string
          jurisdiction_hold_points?: Json | null
          phases?: Json | null
          project_id?: string
          total_duration_weeks?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_schedules_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "command_center_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rfi_items: {
        Row: {
          answer: string | null
          assigned_to: string | null
          cost_impact: number | null
          created_at: string | null
          due_date: string | null
          id: string
          priority: string
          project_id: string
          question: string
          responded_at: string | null
          rfi_number: number
          schedule_impact: number | null
          status: string
          subject: string
          submitted_by: string | null
          updated_at: string | null
        }
        Insert: {
          answer?: string | null
          assigned_to?: string | null
          cost_impact?: number | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id: string
          question: string
          responded_at?: string | null
          rfi_number?: number
          schedule_impact?: number | null
          status?: string
          subject: string
          submitted_by?: string | null
          updated_at?: string | null
        }
        Update: {
          answer?: string | null
          assigned_to?: string | null
          cost_impact?: number | null
          created_at?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          project_id?: string
          question?: string
          responded_at?: string | null
          rfi_number?: number
          schedule_impact?: number | null
          status?: string
          subject?: string
          submitted_by?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rsi_deltas: {
        Row: {
          id: string
          status: string
          kind: string
          target: string
          rationale: string
          diff_preview: string | null
          patch: Json | null
          source_feedback_ids: string[] | null
          created_at: string
          applied_at: string | null
          reviewer: string | null
          review_notes?: string | null
        }
        Insert: {
          id?: string
          status?: string
          kind: string
          target: string
          rationale: string
          diff_preview?: string | null
          patch?: Json | null
          source_feedback_ids?: string[] | null
          created_at?: string
          applied_at?: string | null
          reviewer?: string | null
          review_notes?: string | null
        }
        Update: {
          id?: string
          status?: string
          kind?: string
          target?: string
          rationale?: string
          diff_preview?: string | null
          patch?: Json | null
          source_feedback_ids?: string[] | null
          created_at?: string
          applied_at?: string | null
          reviewer?: string | null
          review_notes?: string | null
        }
        Relationships: []
      }
      rsi_feedback: {
        Row: {
          id: string
          specialist_run_id: string
          user_id: string | null
          signal: string
          note: string | null
          created_at: string
          context: Json | null
        }
        Insert: {
          id?: string
          specialist_run_id: string
          user_id?: string | null
          signal: string
          note?: string | null
          created_at?: string
          context?: Json | null
        }
        Update: {
          id?: string
          specialist_run_id?: string
          user_id?: string | null
          signal?: string
          note?: string | null
          created_at?: string
          context?: Json | null
        }
        Relationships: []
      }
      saved_projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          project_type: string | null
          state: Json | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          project_type?: string | null
          state?: Json | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          project_type?: string | null
          state?: Json | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      schema_migrations: {
        Row: {
          applied_at: string
          description: string | null
          version: string
        }
        Insert: {
          applied_at?: string
          description?: string | null
          version: string
        }
        Update: {
          applied_at?: string
          description?: string | null
          version?: string
        }
        Relationships: []
      }
      seasonal_challenges: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          month: number
          objectives: Json | null
          theme: string
          year: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          month: number
          objectives?: Json | null
          theme: string
          year: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          month?: number
          objectives?: Json | null
          theme?: string
          year?: number
        }
        Relationships: []
      }
      social_shares: {
        Row: {
          card_data: Json | null
          clicks: number | null
          created_at: string | null
          id: string
          is_public: boolean | null
          reactions: Json | null
          share_type: string
          user_id: string
          views: number | null
        }
        Insert: {
          card_data?: Json | null
          clicks?: number | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          reactions?: Json | null
          share_type: string
          user_id: string
          views?: number | null
        }
        Update: {
          card_data?: Json | null
          clicks?: number | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          reactions?: Json | null
          share_type?: string
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      specialist_runs: {
        Row: {
          created_at: string
          error_text: string | null
          final_state_json: Json | null
          input_json: Json
          latency_ms: number | null
          output_json: Json | null
          prompt_version: string
          run_id: string
          specialist_id: string
          step_id: string | null
          updated_at: string
          user_edits_json: Json | null
          workflow_id: string
        }
        Insert: {
          created_at?: string
          error_text?: string | null
          final_state_json?: Json | null
          input_json: Json
          latency_ms?: number | null
          output_json?: Json | null
          prompt_version?: string
          run_id?: string
          specialist_id: string
          step_id?: string | null
          updated_at?: string
          user_edits_json?: Json | null
          workflow_id: string
        }
        Update: {
          created_at?: string
          error_text?: string | null
          final_state_json?: Json | null
          input_json?: Json
          latency_ms?: number | null
          output_json?: Json | null
          prompt_version?: string
          run_id?: string
          specialist_id?: string
          step_id?: string | null
          updated_at?: string
          user_edits_json?: Json | null
          workflow_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          email: string
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          lane: string | null
          notification_preferences: Json | null
          onboarded: boolean | null
          preferences: Json | null
          preferred_surface: string | null
          progressive_profile: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          lane?: string | null
          notification_preferences?: Json | null
          onboarded?: boolean | null
          preferences?: Json | null
          preferred_surface?: string | null
          progressive_profile?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          lane?: string | null
          notification_preferences?: Json | null
          onboarded?: boolean | null
          preferences?: Json | null
          preferred_surface?: string | null
          progressive_profile?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_xp: {
        Row: {
          created_at: string
          level: string
          longest_streak: number
          streak_days: number
          streak_last_date: string | null
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          level?: string
          longest_streak?: number
          streak_days?: number
          streak_last_date?: string | null
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          level?: string
          longest_streak?: number
          streak_days?: number
          streak_last_date?: string | null
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weather_logs: {
        Row: {
          condition: string | null
          created_at: string | null
          date: string
          id: string
          impact_assessment: string | null
          location: string | null
          precipitation_probability: number | null
          project_id: string | null
          temp_high: number | null
          temp_low: number | null
          wind_speed: number | null
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          date: string
          id?: string
          impact_assessment?: string | null
          location?: string | null
          precipitation_probability?: number | null
          project_id?: string | null
          temp_high?: number | null
          temp_low?: number | null
          wind_speed?: number | null
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          date?: string
          id?: string
          impact_assessment?: string | null
          location?: string | null
          precipitation_probability?: number | null
          project_id?: string | null
          temp_high?: number | null
          temp_low?: number | null
          wind_speed?: number | null
        }
        Relationships: []
      }
      worldwalker_jobs: {
        Row: {
          created_at: string | null
          dimensions: Json | null
          id: string
          input_image_url: string | null
          materials_detected: Json | null
          model_url: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dimensions?: Json | null
          id?: string
          input_image_url?: string | null
          materials_detected?: Json | null
          model_url?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dimensions?: Json | null
          id?: string
          input_image_url?: string | null
          materials_detected?: Json | null
          model_url?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          source_type: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          source_type: string
          user_id: string
          xp_earned: number
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          source_type?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      kg_entities_at_time: {
        Args: { query_time?: string }
        Returns: {
          authority_level:
            | Database["public"]["Enums"]["kg_authority_level"]
            | null
          content: Json | null
          created_at: string | null
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          entity_type_id: string
          id: string
          metadata: Json | null
          org_id: string | null
          search_vector: unknown
          slug: string
          status: Database["public"]["Enums"]["kg_entity_status"] | null
          summary: string | null
          superseded_by: string | null
          supersedes: string | null
          title: string
          updated_at: string | null
          version: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "kg_entities"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      kg_resolve_jurisdiction_stack: {
        Args: { jurisdiction_slug: string }
        Returns: {
          depth: number
          id: string
          jurisdiction_type: string
          name: string
          slug: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      achievement_category: "explorer" | "builder" | "architect" | "specialist"
      achievement_rarity: "common" | "rare" | "epic" | "legendary"
      agent_autonomy_mode: "watch" | "assist" | "autonomous"
      kg_authority_level:
        | "regulatory"
        | "manufacturer"
        | "professional"
        | "experiential"
        | "derived"
        | "sensor"
        | "unverified"
      kg_entity_status:
        | "active"
        | "superseded"
        | "deprecated"
        | "draft"
        | "archived"
        | "retracted"
      kg_stakeholder_role:
        | "builder_gc"
        | "architect_engineer"
        | "inspector"
        | "insurer"
        | "lawyer"
        | "subcontractor"
        | "supplier"
        | "property_owner"
        | "government_agency"
        | "robot_agent"
        | "ai_agent"
        | "admin"
      notification_urgency:
        | "celebration"
        | "good_news"
        | "heads_up"
        | "needs_you"
      user_lane:
        | "dreamer"
        | "builder"
        | "specialist"
        | "merchant"
        | "ally"
        | "crew"
        | "fleet"
        | "machine"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      achievement_category: ["explorer", "builder", "architect", "specialist"],
      achievement_rarity: ["common", "rare", "epic", "legendary"],
      agent_autonomy_mode: ["watch", "assist", "autonomous"],
      kg_authority_level: [
        "regulatory",
        "manufacturer",
        "professional",
        "experiential",
        "derived",
        "sensor",
        "unverified",
      ],
      kg_entity_status: [
        "active",
        "superseded",
        "deprecated",
        "draft",
        "archived",
        "retracted",
      ],
      kg_stakeholder_role: [
        "builder_gc",
        "architect_engineer",
        "inspector",
        "insurer",
        "lawyer",
        "subcontractor",
        "supplier",
        "property_owner",
        "government_agency",
        "robot_agent",
        "ai_agent",
        "admin",
      ],
      notification_urgency: [
        "celebration",
        "good_news",
        "heads_up",
        "needs_you",
      ],
      user_lane: [
        "dreamer",
        "builder",
        "specialist",
        "merchant",
        "ally",
        "crew",
        "fleet",
        "machine",
      ],
    },
  },
} as const
