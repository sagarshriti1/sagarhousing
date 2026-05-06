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
      favorites: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          bypass_payment: boolean
          created_at: string
          description: string | null
          fee: number
          id: string
          key: string
          label: string
          promo_ends_at: string | null
          promo_label: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bypass_payment?: boolean
          created_at?: string
          description?: string | null
          fee?: number
          id?: string
          key: string
          label: string
          promo_ends_at?: string | null
          promo_label?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bypass_payment?: boolean
          created_at?: string
          description?: string | null
          fee?: number
          id?: string
          key?: string
          label?: string
          promo_ends_at?: string | null
          promo_label?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean
          job_title: string | null
          location: string | null
          phone: string | null
          street_address: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          location?: string | null
          phone?: string | null
          street_address?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          job_title?: string | null
          location?: string | null
          phone?: string | null
          street_address?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      realtors: {
        Row: {
          bio: string | null
          city: string
          created_at: string
          district: string
          email: string | null
          expiration_date: string | null
          id: string
          is_featured: boolean
          license_number: string | null
          name: string
          payment_bypassed: boolean
          payment_status: string
          phone: string | null
          photo_url: string | null
          specialties: string[] | null
          start_date: string | null
          state: string
          street_address: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
          years_experience: number | null
        }
        Insert: {
          bio?: string | null
          city: string
          created_at?: string
          district?: string
          email?: string | null
          expiration_date?: string | null
          id?: string
          is_featured?: boolean
          license_number?: string | null
          name: string
          payment_bypassed?: boolean
          payment_status?: string
          phone?: string | null
          photo_url?: string | null
          specialties?: string[] | null
          start_date?: string | null
          state: string
          street_address?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          years_experience?: number | null
        }
        Update: {
          bio?: string | null
          city?: string
          created_at?: string
          district?: string
          email?: string | null
          expiration_date?: string | null
          id?: string
          is_featured?: boolean
          license_number?: string | null
          name?: string
          payment_bypassed?: boolean
          payment_status?: string
          phone?: string | null
          photo_url?: string | null
          specialties?: string[] | null
          start_date?: string | null
          state?: string
          street_address?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
          years_experience?: number | null
        }
        Relationships: []
      }
      saved_realtors: {
        Row: {
          created_at: string
          id: string
          realtor_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          realtor_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          realtor_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_properties: {
        Row: {
          address: string
          bathrooms: number
          bedrooms: number
          bike_parking: number | null
          car_parking: number | null
          city: string
          created_at: string
          description: string | null
          district: string
          expiration_date: string | null
          features: string[] | null
          garage_spaces: number | null
          id: string
          images: string[] | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          lot_size: number | null
          maintenance_fee: number | null
          payment_date: string | null
          price: number
          property_code: number
          property_type: Database["public"]["Enums"]["property_type"]
          sqft: number | null
          state: string
          status: Database["public"]["Enums"]["listing_status"]
          stories: number | null
          title: string
          updated_at: string
          updated_by: string | null
          user_id: string
          year_built: number | null
          zip_code: string
        }
        Insert: {
          address: string
          bathrooms?: number
          bedrooms?: number
          bike_parking?: number | null
          car_parking?: number | null
          city: string
          created_at?: string
          description?: string | null
          district?: string
          expiration_date?: string | null
          features?: string[] | null
          garage_spaces?: number | null
          id?: string
          images?: string[] | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          lot_size?: number | null
          maintenance_fee?: number | null
          payment_date?: string | null
          price: number
          property_code?: number
          property_type?: Database["public"]["Enums"]["property_type"]
          sqft?: number | null
          state?: string
          status?: Database["public"]["Enums"]["listing_status"]
          stories?: number | null
          title: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
          year_built?: number | null
          zip_code?: string
        }
        Update: {
          address?: string
          bathrooms?: number
          bedrooms?: number
          bike_parking?: number | null
          car_parking?: number | null
          city?: string
          created_at?: string
          description?: string | null
          district?: string
          expiration_date?: string | null
          features?: string[] | null
          garage_spaces?: number | null
          id?: string
          images?: string[] | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          lot_size?: number | null
          maintenance_fee?: number | null
          payment_date?: string | null
          price?: number
          property_code?: number
          property_type?: Database["public"]["Enums"]["property_type"]
          sqft?: number | null
          state?: string
          status?: Database["public"]["Enums"]["listing_status"]
          stories?: number | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
          year_built?: number | null
          zip_code?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_by: string | null
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_by?: string | null
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
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
      app_role: "admin" | "realtor" | "user"
      listing_status: "active" | "pending" | "sold" | "rented"
      listing_type: "sale" | "rent"
      property_type:
        | "house"
        | "condo"
        | "townhouse"
        | "apartment"
        | "commercial"
        | "land"
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
      app_role: ["admin", "realtor", "user"],
      listing_status: ["active", "pending", "sold", "rented"],
      listing_type: ["sale", "rent"],
      property_type: [
        "house",
        "condo",
        "townhouse",
        "apartment",
        "commercial",
        "land",
      ],
    },
  },
} as const
