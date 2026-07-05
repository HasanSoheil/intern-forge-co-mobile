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
      admins: {
        Row: { id: string; created_at: string }
        Insert: { id: string; created_at?: string }
        Update: { id?: string; created_at?: string }
        Relationships: []
      }
      fields: {
        Row: { id: string; label: string; sort_order: number; created_at: string }
        Insert: { id: string; label: string; sort_order?: number; created_at?: string }
        Update: { id?: string; label?: string; sort_order?: number; created_at?: string }
        Relationships: []
      }
      skills: {
        Row: { id: string; field_id: string; name: string }
        Insert: { id?: string; field_id: string; name: string }
        Update: { id?: string; field_id?: string; name?: string }
        Relationships: [
          {
            foreignKeyName: "skills_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "fields"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: { tier: string; name: string; price_cents: number; posts_allowed: number; invitations_allowed: number; features: string[]; is_popular: boolean; active: boolean; sort_order: number; created_at: string }
        Insert: { tier: string; name: string; price_cents?: number; posts_allowed?: number; invitations_allowed?: number; features?: string[]; is_popular?: boolean; active?: boolean; sort_order?: number; created_at?: string }
        Update: { tier?: string; name?: string; price_cents?: number; posts_allowed?: number; invitations_allowed?: number; features?: string[]; is_popular?: boolean; active?: boolean; sort_order?: number; created_at?: string }
        Relationships: []
      }
      applications: {
        Row: {
          created_at: string
          id: string
          internship_id: string
          match_score: number
          status: Database["public"]["Enums"]["application_status"]
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          internship_id: string
          match_score?: number
          status?: Database["public"]["Enums"]["application_status"]
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          internship_id?: string
          match_score?: number
          status?: Database["public"]["Enums"]["application_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_profile_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_submissions: {
        Row: {
          github_url: string
          id: string
          internship_challenge_id: string | null
          platform_challenge_id: string | null
          report: Json | null
          score: number
          status: Database["public"]["Enums"]["submission_status"]
          student_id: string
          submitted_at: string
        }
        Insert: {
          github_url: string
          id?: string
          internship_challenge_id?: string | null
          platform_challenge_id?: string | null
          report?: Json | null
          score?: number
          status?: Database["public"]["Enums"]["submission_status"]
          student_id: string
          submitted_at?: string
        }
        Update: {
          github_url?: string
          id?: string
          internship_challenge_id?: string | null
          platform_challenge_id?: string | null
          report?: Json | null
          score?: number
          status?: Database["public"]["Enums"]["submission_status"]
          student_id?: string
          submitted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_submissions_internship_challenge_id_fkey"
            columns: ["internship_challenge_id"]
            isOneToOne: false
            referencedRelation: "internship_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_platform_challenge_id_fkey"
            columns: ["platform_challenge_id"]
            isOneToOne: false
            referencedRelation: "platform_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_submissions_student_profile_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          company_name: string
          created_at: string
          description: string | null
          id: string
          industry: string | null
          location: string | null
          logo_url: string | null
          size: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          company_name: string
          created_at?: string
          description?: string | null
          id: string
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          size?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          location?: string | null
          logo_url?: string | null
          size?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      internship_challenges: {
        Row: {
          category: string
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["challenge_difficulty"]
          id: string
          instructions: string | null
          internship_id: string
          required_files: string[]
          required_keywords: string[]
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          difficulty?: Database["public"]["Enums"]["challenge_difficulty"]
          id?: string
          instructions?: string | null
          internship_id: string
          required_files?: string[]
          required_keywords?: string[]
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["challenge_difficulty"]
          id?: string
          instructions?: string | null
          internship_id?: string
          required_files?: string[]
          required_keywords?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "internship_challenges_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
        ]
      }
      internships: {
        Row: {
          application_deadline: string | null
          company_id: string
          created_at: string
          description: string
          duration_months: number | null
          id: string
          location: string | null
          remote: boolean
          required_skills: string[]
          role: string
          status: Database["public"]["Enums"]["internship_status"]
          stipend: number | null
          title: string
          updated_at: string
        }
        Insert: {
          application_deadline?: string | null
          company_id: string
          created_at?: string
          description: string
          duration_months?: number | null
          id?: string
          location?: string | null
          remote?: boolean
          required_skills?: string[]
          role: string
          status?: Database["public"]["Enums"]["internship_status"]
          stipend?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          application_deadline?: string | null
          company_id?: string
          created_at?: string
          description?: string
          duration_months?: number | null
          id?: string
          location?: string | null
          remote?: boolean
          required_skills?: string[]
          role?: string
          status?: Database["public"]["Enums"]["internship_status"]
          stipend?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          internship_id: string
          message: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          student_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          internship_id: string
          message?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          student_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          internship_id?: string
          message?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_company_profile_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_internship_id_fkey"
            columns: ["internship_id"]
            isOneToOne: false
            referencedRelation: "internships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_student_profile_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          internship_id: string
          read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          internship_id: string
          read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          internship_id?: string
          read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          internship_id: string | null
          message: string | null
          read: boolean
          recipient_id: string
          student_id: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          internship_id?: string | null
          message?: string | null
          read?: boolean
          recipient_id: string
          student_id?: string | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          internship_id?: string | null
          message?: string | null
          read?: boolean
          recipient_id?: string
          student_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_student_profile_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_challenges: {
        Row: {
          category: string
          created_at: string
          description: string
          difficulty: Database["public"]["Enums"]["challenge_difficulty"]
          field: string | null
          id: string
          instructions: string | null
          points: number
          required_files: string[]
          skill: string
          title: string
        }
        Insert: {
          category?: string
          created_at?: string
          description: string
          difficulty?: Database["public"]["Enums"]["challenge_difficulty"]
          field?: string | null
          id?: string
          instructions?: string | null
          points?: number
          required_files?: string[]
          skill: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          difficulty?: Database["public"]["Enums"]["challenge_difficulty"]
          field?: string | null
          id?: string
          instructions?: string | null
          points?: number
          required_files?: string[]
          skill?: string
          title?: string
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          created_at: string
          id: string
          viewed_id: string
          viewer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          viewed_id: string
          viewer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          viewed_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_views_viewed_id_fkey"
            columns: ["viewed_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          notif_email: boolean
          notif_in_app: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          notif_email?: boolean
          notif_in_app?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          notif_email?: boolean
          notif_in_app?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      student_media: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          media_type: string
          post_id: string | null
          student_id: string
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          media_type: string
          post_id?: string | null
          student_id: string
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          media_type?: string
          post_id?: string | null
          student_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_media_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "student_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      student_posts: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link_url: string | null
          student_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link_url?: string | null
          student_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link_url?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_posts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          avatar_url: string | null
          bio: string | null
          challenges_completed: number
          created_at: string
          demo_links: string[]
          desired_role: string | null
          field: string | null
          github_username: string | null
          id: string
          location: string | null
          portfolio_url: string | null
          progress_percentage: number
          projects: Json
          skills: string[]
          university: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          challenges_completed?: number
          created_at?: string
          demo_links?: string[]
          desired_role?: string | null
          field?: string | null
          github_username?: string | null
          id: string
          location?: string | null
          portfolio_url?: string | null
          progress_percentage?: number
          projects?: Json
          skills?: string[]
          university?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          challenges_completed?: number
          created_at?: string
          demo_links?: string[]
          desired_role?: string | null
          field?: string | null
          github_username?: string | null
          id?: string
          location?: string | null
          portfolio_url?: string | null
          progress_percentage?: number
          projects?: Json
          skills?: string[]
          university?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_profile_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          invitations_allowed: number
          posts_allowed: number
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invitations_allowed: number
          posts_allowed: number
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier: string
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invitations_allowed?: number
          posts_allowed?: number
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_message: {
        Args: { _a: string; _b: string; _internship: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "student" | "company" | "admin"
      application_status: "pending" | "reviewed" | "accepted" | "rejected"
      challenge_difficulty: "easy" | "medium" | "hard"
      internship_status: "draft" | "open" | "closed"
      invitation_status: "pending" | "accepted" | "declined"
      submission_status: "pending" | "validated" | "failed"
      subscription_status: "active" | "inactive" | "canceled"
      subscription_tier: "basic" | "pro" | "enterprise"
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
      app_role: ["student", "company", "admin"],
      application_status: ["pending", "reviewed", "accepted", "rejected"],
      challenge_difficulty: ["easy", "medium", "hard"],
      internship_status: ["draft", "open", "closed"],
      invitation_status: ["pending", "accepted", "declined"],
      submission_status: ["pending", "validated", "failed"],
      subscription_status: ["active", "inactive", "canceled"],
      subscription_tier: ["basic", "pro", "enterprise"],
    },
  },
} as const
