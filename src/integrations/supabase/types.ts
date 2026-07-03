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
      addresses: {
        Row: {
          created_at: string
          district: string
          id: string
          is_default: boolean
          label: string | null
          landmark: string | null
          municipality: string
          phone: string
          postal_code: string | null
          province: string
          recipient_name: string
          street_address: string
          updated_at: string
          user_id: string
          ward: string | null
        }
        Insert: {
          created_at?: string
          district: string
          id?: string
          is_default?: boolean
          label?: string | null
          landmark?: string | null
          municipality: string
          phone: string
          postal_code?: string | null
          province: string
          recipient_name: string
          street_address: string
          updated_at?: string
          user_id: string
          ward?: string | null
        }
        Update: {
          created_at?: string
          district?: string
          id?: string
          is_default?: boolean
          label?: string | null
          landmark?: string | null
          municipality?: string
          phone?: string
          postal_code?: string | null
          province?: string
          recipient_name?: string
          street_address?: string
          updated_at?: string
          user_id?: string
          ward?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          selected_options: Json
          updated_at: string
          user_id: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          selected_options?: Json
          updated_at?: string
          user_id: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          selected_options?: Json
          updated_at?: string
          user_id?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          line_total_npr: number
          order_id: string
          product_id: string | null
          product_name: string
          product_sku: string | null
          quantity: number
          selected_options: Json
          unit_price_npr: number
          variant_id: string | null
          variant_label: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          line_total_npr: number
          order_id: string
          product_id?: string | null
          product_name: string
          product_sku?: string | null
          quantity: number
          selected_options?: Json
          unit_price_npr: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          line_total_npr?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_sku?: string | null
          quantity?: number
          selected_options?: Json
          unit_price_npr?: number
          variant_id?: string | null
          variant_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address: Json | null
          cancelled_at: string | null
          confirmed_at: string | null
          coupon_code: string | null
          created_at: string
          currency: string
          customer_note: string | null
          delivered_at: string | null
          discount_npr: number
          guest_email: string | null
          guest_phone: string | null
          id: string
          internal_note: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipped_at: string | null
          shipping_address: Json
          shipping_npr: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal_npr: number
          tax_npr: number
          total_npr: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          billing_address?: Json | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          customer_note?: string | null
          delivered_at?: string | null
          discount_npr?: number
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          internal_note?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipped_at?: string | null
          shipping_address: Json
          shipping_npr?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_npr: number
          tax_npr?: number
          total_npr: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          billing_address?: Json | null
          cancelled_at?: string | null
          confirmed_at?: string | null
          coupon_code?: string | null
          created_at?: string
          currency?: string
          customer_note?: string | null
          delivered_at?: string | null
          discount_npr?: number
          guest_email?: string | null
          guest_phone?: string | null
          id?: string
          internal_note?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipped_at?: string | null
          shipping_address?: Json
          shipping_npr?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_npr?: number
          tax_npr?: number
          total_npr?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number
          id: string
          is_primary: boolean
          product_id: string
          url: string
          variant_id: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          product_id: string
          url: string
          variant_id?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_primary?: boolean
          product_id?: string
          url?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_images_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          compare_at_price_npr: number | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          options: Json
          price_npr: number | null
          product_id: string
          sku: string | null
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          compare_at_price_npr?: number | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          options?: Json
          price_npr?: number | null
          product_id: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          compare_at_price_npr?: number | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          options?: Json
          price_npr?: number | null
          product_id?: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          category_id: string | null
          compare_at_price_npr: number | null
          cost_price_npr: number | null
          created_at: string
          description: string | null
          flash_sale_ends_at: string | null
          id: string
          is_best_seller: boolean
          is_featured: boolean
          is_flash_sale: boolean
          is_new_arrival: boolean
          is_trending: boolean
          low_stock_threshold: number
          meta_description: string | null
          meta_title: string | null
          name: string
          price_npr: number
          short_description: string | null
          sku: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          stock_quantity: number
          tags: string[]
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          brand_id?: string | null
          category_id?: string | null
          compare_at_price_npr?: number | null
          cost_price_npr?: number | null
          created_at?: string
          description?: string | null
          flash_sale_ends_at?: string | null
          id?: string
          is_best_seller?: boolean
          is_featured?: boolean
          is_flash_sale?: boolean
          is_new_arrival?: boolean
          is_trending?: boolean
          low_stock_threshold?: number
          meta_description?: string | null
          meta_title?: string | null
          name: string
          price_npr: number
          short_description?: string | null
          sku?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          tags?: string[]
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          brand_id?: string | null
          category_id?: string | null
          compare_at_price_npr?: number | null
          cost_price_npr?: number | null
          created_at?: string
          description?: string | null
          flash_sale_ends_at?: string | null
          id?: string
          is_best_seller?: boolean
          is_featured?: boolean
          is_flash_sale?: boolean
          is_new_arrival?: boolean
          is_trending?: boolean
          low_stock_threshold?: number
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          price_npr?: number
          short_description?: string | null
          sku?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          tags?: string[]
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_order_as_admin: { Args: { _order_id: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "manager" | "staff" | "customer"
      order_status:
        | "pending"
        | "confirmed"
        | "packed"
        | "ready_to_ship"
        | "shipped"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
        | "returned"
        | "refunded"
        | "failed"
      payment_method:
        | "cod"
        | "esewa"
        | "khalti"
        | "fonepay"
        | "ime_pay"
        | "stripe"
      payment_status:
        | "pending"
        | "partially_paid"
        | "paid"
        | "refunded"
        | "failed"
      product_status: "draft" | "active" | "archived"
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
      app_role: ["admin", "manager", "staff", "customer"],
      order_status: [
        "pending",
        "confirmed",
        "packed",
        "ready_to_ship",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "returned",
        "refunded",
        "failed",
      ],
      payment_method: [
        "cod",
        "esewa",
        "khalti",
        "fonepay",
        "ime_pay",
        "stripe",
      ],
      payment_status: [
        "pending",
        "partially_paid",
        "paid",
        "refunded",
        "failed",
      ],
      product_status: ["draft", "active", "archived"],
    },
  },
} as const
