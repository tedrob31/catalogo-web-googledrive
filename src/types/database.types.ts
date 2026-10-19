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
      albums: {
        Row: {
          cover_photo_r2_key: string | null
          created_at: string
          drive_folder_id: string
          id: string
          name: string
          order_index: number
          parent_id: string | null
          path: string
          slug: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cover_photo_r2_key?: string | null
          created_at?: string
          drive_folder_id: string
          id?: string
          name: string
          order_index?: number
          parent_id?: string | null
          path?: string
          slug: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cover_photo_r2_key?: string | null
          created_at?: string
          drive_folder_id?: string
          id?: string
          name?: string
          order_index?: number
          parent_id?: string | null
          path?: string
          slug?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "albums_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "albums_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      google_integrations: {
        Row: {
          access_token: string | null
          catalog_folder_id: string | null
          catalog_folder_name: string | null
          cover_folder_id: string | null
          cover_folder_name: string | null
          google_email: string | null
          is_connected: boolean | null
          last_synced_at: string | null
          refresh_token: string | null
          tenant_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          catalog_folder_id?: string | null
          catalog_folder_name?: string | null
          cover_folder_id?: string | null
          cover_folder_name?: string | null
          google_email?: string | null
          is_connected?: boolean | null
          last_synced_at?: string | null
          refresh_token?: string | null
          tenant_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          catalog_folder_id?: string | null
          catalog_folder_name?: string | null
          cover_folder_id?: string | null
          cover_folder_name?: string | null
          google_email?: string | null
          is_connected?: boolean | null
          last_synced_at?: string | null
          refresh_token?: string | null
          tenant_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_integrations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          album_id: string
          created_at: string
          drive_file_id: string
          drive_modified_time: string | null
          height: number | null
          id: string
          md5_checksum: string | null
          mime_type: string
          name: string
          order_index: number
          r2_key: string
          size_bytes: number
          tenant_id: string
          width: number | null
        }
        Insert: {
          album_id: string
          created_at?: string
          drive_file_id: string
          drive_modified_time?: string | null
          height?: number | null
          id?: string
          md5_checksum?: string | null
          mime_type?: string
          name: string
          order_index?: number
          r2_key: string
          size_bytes?: number
          tenant_id: string
          width?: number | null
        }
        Update: {
          album_id?: string
          created_at?: string
          drive_file_id?: string
          drive_modified_time?: string | null
          height?: number | null
          id?: string
          md5_checksum?: string | null
          mime_type?: string
          name?: string
          order_index?: number
          r2_key?: string
          size_bytes?: number
          tenant_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_whitelist: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_photos: number
          max_storage_mb: number
          name: string
          price_monthly: number
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_photos?: number
          max_storage_mb?: number
          name: string
          price_monthly?: number
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_photos?: number
          max_storage_mb?: number
          name?: string
          price_monthly?: number
          slug?: string
        }
        Relationships: []
      }
      sync_logs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          items_processed: number | null
          started_at: string
          status: string
          tenant_id: string
          total_albums: number | null
          total_photos: number | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          items_processed?: number | null
          started_at?: string
          status?: string
          tenant_id: string
          total_albums?: number | null
          total_photos?: number | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          items_processed?: number | null
          started_at?: string
          status?: string
          tenant_id?: string
          total_albums?: number | null
          total_photos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      tenant_configs: {
        Row: {
          created_at: string
          favicon_url: string | null
          logo_url: string | null
          primary_color: string
          seo_metadata: Json
          settings: Json
          social_links: Json
          subtitle: string | null
          tenant_id: string
          theme: string
          title: string
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          favicon_url?: string | null
          logo_url?: string | null
          primary_color?: string
          seo_metadata?: Json
          settings?: Json
          social_links?: Json
          subtitle?: string | null
          tenant_id: string
          theme?: string
          title?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          favicon_url?: string | null
          logo_url?: string | null
          primary_color?: string
          seo_metadata?: Json
          settings?: Json
          social_links?: Json
          subtitle?: string | null
          tenant_id?: string
          theme?: string
          title?: string
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_page_metrics: {
        Row: {
          created_at: string
          date: string
          id: string
          path: string
          tenant_id: string
          title: string
          updated_at: string
          views_count: number
          whatsapp_clicks: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          path?: string
          tenant_id: string
          title?: string
          updated_at?: string
          views_count?: number
          whatsapp_clicks?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          path?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          views_count?: number
          whatsapp_clicks?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_page_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_users: {
        Row: {
          created_at: string
          id: string
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          current_photos_count: number
          current_storage_bytes: number
          custom_domain: string | null
          custom_domain_enabled: boolean
          id: string
          name: string
          plan_id: string | null
          status: string
          subdomain: string
          subscription_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_photos_count?: number
          current_storage_bytes?: number
          custom_domain?: string | null
          custom_domain_enabled?: boolean
          id?: string
          name: string
          plan_id?: string | null
          status?: string
          subdomain: string
          subscription_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_photos_count?: number
          current_storage_bytes?: number
          custom_domain?: string | null
          custom_domain_enabled?: boolean
          id?: string
          name?: string
          plan_id?: string | null
          status?: string
          subdomain?: string
          subscription_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_page_metric: {
        Args: {
          p_date: string
          p_path: string
          p_tenant_id: string
          p_title: string
          p_views: number
          p_whatsapp: number
        }
        Returns: undefined
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
