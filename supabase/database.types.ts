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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cp_applications: {
        Row: {
          business_id: string
          created_at: string
          id: string
          job_id: string
          state: string
          worker_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          job_id: string
          state: string
          worker_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          job_id?: string
          state?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_applications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "cp_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "cp_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_applications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "cp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_assignments: {
        Row: {
          application_id: string
          business_id: string
          cancellation_reason: string | null
          closed_at: string | null
          created_at: string
          ends_at: string
          finished_at: string | null
          id: string
          job_id: string
          paid_marked_at: string | null
          release_reason: string | null
          released_at: string | null
          slot_no: number
          started_at: string | null
          starts_at: string
          state: string
          worker_id: string
        }
        Insert: {
          application_id: string
          business_id: string
          cancellation_reason?: string | null
          closed_at?: string | null
          created_at?: string
          ends_at: string
          finished_at?: string | null
          id?: string
          job_id: string
          paid_marked_at?: string | null
          release_reason?: string | null
          released_at?: string | null
          slot_no: number
          started_at?: string | null
          starts_at: string
          state?: string
          worker_id: string
        }
        Update: {
          application_id?: string
          business_id?: string
          cancellation_reason?: string | null
          closed_at?: string | null
          created_at?: string
          ends_at?: string
          finished_at?: string | null
          id?: string
          job_id?: string
          paid_marked_at?: string | null
          release_reason?: string | null
          released_at?: string | null
          slot_no?: number
          started_at?: string | null
          starts_at?: string
          state?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_assignments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "cp_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_assignments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "cp_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "cp_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "cp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_availability: {
        Row: {
          ends_at: string
          id: string
          starts_at: string
          worker_id: string
        }
        Insert: {
          ends_at: string
          id?: string
          starts_at: string
          worker_id: string
        }
        Update: {
          ends_at?: string
          id?: string
          starts_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_availability_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "cp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_business_members: {
        Row: {
          active: boolean
          business_id: string
          created_at: string
          member_role: string
          user_id: string
        }
        Insert: {
          active?: boolean
          business_id: string
          created_at?: string
          member_role: string
          user_id: string
        }
        Update: {
          active?: boolean
          business_id?: string
          created_at?: string
          member_role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_business_members_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "cp_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_business_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "cp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_businesses: {
        Row: {
          created_at: string
          created_by: string
          display_name: string
          id: string
          legal_name: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          display_name: string
          id?: string
          legal_name: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          display_name?: string
          id?: string
          legal_name?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_businesses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "cp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_incidents: {
        Row: {
          assignment_id: string
          author_id: string
          created_at: string
          description: string
          id: string
          incident_type: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          assignment_id: string
          author_id: string
          created_at?: string
          description: string
          id?: string
          incident_type?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          assignment_id?: string
          author_id?: string
          created_at?: string
          description?: string
          id?: string
          incident_type?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_incidents_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "cp_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_incidents_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "cp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_incidents_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "cp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_jobs: {
        Row: {
          business_id: string
          created_at: string
          created_by: string
          description: string
          ends_at: string
          id: string
          location: string
          pay_cents: number
          slots: number
          specialty: string
          starts_at: string
          state: string
          title: string
          urgent: boolean
          venue_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          created_by: string
          description?: string
          ends_at: string
          id?: string
          location: string
          pay_cents: number
          slots: number
          specialty: string
          starts_at: string
          state?: string
          title: string
          urgent?: boolean
          venue_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          created_by?: string
          description?: string
          ends_at?: string
          id?: string
          location?: string
          pay_cents?: number
          slots?: number
          specialty?: string
          starts_at?: string
          state?: string
          title?: string
          urgent?: boolean
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "cp_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "cp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_jobs_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "cp_venues"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_messages: {
        Row: {
          application_id: string
          body: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          application_id: string
          body: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          application_id?: string
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_messages_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "cp_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "cp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_notifications: {
        Row: {
          application_id: string | null
          assignment_id: string | null
          body: string
          created_at: string
          id: string
          job_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          application_id?: string | null
          assignment_id?: string | null
          body?: string
          created_at?: string
          id?: string
          job_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          application_id?: string | null
          assignment_id?: string | null
          body?: string
          created_at?: string
          id?: string
          job_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_notifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "cp_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_notifications_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "cp_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "cp_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "cp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_policy_acceptances: {
        Row: {
          accepted_at: string
          created_at: string
          id: string
          policy_code: string
          source: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          created_at?: string
          id?: string
          policy_code: string
          source?: string
          user_id?: string
          version: string
        }
        Update: {
          accepted_at?: string
          created_at?: string
          id?: string
          policy_code?: string
          source?: string
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_policy_acceptances_document_fkey"
            columns: ["policy_code", "version"]
            isOneToOne: false
            referencedRelation: "cp_policy_documents"
            referencedColumns: ["policy_code", "version"]
          },
        ]
      }
      cp_policy_documents: {
        Row: {
          content_sha256: string | null
          created_at: string
          current_for_onboarding: boolean
          effective_at: string | null
          policy_code: string
          production_ready: boolean
          status: string
          title: string
          version: string
        }
        Insert: {
          content_sha256?: string | null
          created_at?: string
          current_for_onboarding?: boolean
          effective_at?: string | null
          policy_code: string
          production_ready?: boolean
          status?: string
          title: string
          version: string
        }
        Update: {
          content_sha256?: string | null
          created_at?: string
          current_for_onboarding?: boolean
          effective_at?: string | null
          policy_code?: string
          production_ready?: boolean
          status?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      cp_profiles: {
        Row: {
          available: boolean
          bio: string
          city: string
          created_at: string
          display_name: string
          id: string
          role: string
          specialty: string | null
        }
        Insert: {
          available?: boolean
          bio?: string
          city?: string
          created_at?: string
          display_name: string
          id: string
          role: string
          specialty?: string | null
        }
        Update: {
          available?: boolean
          bio?: string
          city?: string
          created_at?: string
          display_name?: string
          id?: string
          role?: string
          specialty?: string | null
        }
        Relationships: []
      }
      cp_reviews: {
        Row: {
          assignment_id: string
          author_id: string
          comment: string
          created_at: string
          id: string
          stars: number
          subject_type: string
          target_business_id: string | null
          target_worker_id: string | null
          venue_id: string
        }
        Insert: {
          assignment_id: string
          author_id: string
          comment?: string
          created_at?: string
          id?: string
          stars: number
          subject_type: string
          target_business_id?: string | null
          target_worker_id?: string | null
          venue_id: string
        }
        Update: {
          assignment_id?: string
          author_id?: string
          comment?: string
          created_at?: string
          id?: string
          stars?: number
          subject_type?: string
          target_business_id?: string | null
          target_worker_id?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_reviews_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "cp_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_reviews_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "cp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_reviews_target_business_id_fkey"
            columns: ["target_business_id"]
            isOneToOne: false
            referencedRelation: "cp_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_reviews_target_worker_id_fkey"
            columns: ["target_worker_id"]
            isOneToOne: false
            referencedRelation: "cp_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_reviews_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "cp_venues"
            referencedColumns: ["id"]
          },
        ]
      }
      cp_venues: {
        Row: {
          active: boolean
          address: string
          business_id: string
          city: string
          created_at: string
          created_by: string
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          address: string
          business_id: string
          city?: string
          created_at?: string
          created_by: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          business_id?: string
          city?: string
          created_at?: string
          created_by?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cp_venues_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "cp_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cp_venues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "cp_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cp_command: { Args: { p_action: string; p_data?: Json }; Returns: Json }
      cp_mark_notifications_read: {
        Args: { p_job_id?: string }
        Returns: number
      }
      cp_onboard: {
        Args: {
          p_accept_privacy?: boolean
          p_accept_terms?: boolean
          p_display_name: string
          p_role: string
          p_specialty?: string
        }
        Returns: {
          available: boolean
          bio: string
          city: string
          created_at: string
          display_name: string
          id: string
          role: string
          specialty: string | null
        }
        SetofOptions: {
          from: "*"
          to: "cp_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
