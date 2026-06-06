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
      announcements: {
        Row: {
          created_at: string
          date: string | null
          description: string | null
          id: string
          image_url: string | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          date?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_messages: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          profile_photo: string | null
          user_id: string
          username: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          profile_photo?: string | null
          user_id: string
          username: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          profile_photo?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      livestream_blacklist: {
        Row: {
          created_at: string
          id: string
          profile_code: string
          reason: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          profile_code: string
          reason?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          profile_code?: string
          reason?: string | null
        }
        Relationships: []
      }
      livestream_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          profile_photo: string | null
          user_id: string
          username: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          profile_photo?: string | null
          user_id: string
          username: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          profile_photo?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      livestream_moderators: {
        Row: {
          created_at: string
          id: string
          profile_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_code: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_code?: string
        }
        Relationships: []
      }
      livestream_viewers: {
        Row: {
          id: string
          last_seen: string | null
          user_id: string
          username: string
        }
        Insert: {
          id?: string
          last_seen?: string | null
          user_id: string
          username: string
        }
        Update: {
          id?: string
          last_seen?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      paid_livestream_access: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          note: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          note?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          note?: string | null
        }
        Relationships: []
      }
      paid_livestream_chat: {
        Row: {
          content: string
          created_at: string
          id: string
          profile_photo: string | null
          user_id: string
          username: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          profile_photo?: string | null
          user_id: string
          username: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          profile_photo?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      paid_livestream_lineup: {
        Row: {
          created_at: string
          generation: number
          id: string
          member_id: number
          nickname: string
          photo_url: string | null
          position: number
        }
        Insert: {
          created_at?: string
          generation: number
          id?: string
          member_id: number
          nickname: string
          photo_url?: string | null
          position?: number
        }
        Update: {
          created_at?: string
          generation?: number
          id?: string
          member_id?: number
          nickname?: string
          photo_url?: string | null
          position?: number
        }
        Relationships: []
      }
      paid_livestream_link_claims: {
        Row: {
          claimed_at: string
          fingerprint: string
          id: string
          link_id: string
        }
        Insert: {
          claimed_at?: string
          fingerprint: string
          id?: string
          link_id: string
        }
        Update: {
          claimed_at?: string
          fingerprint?: string
          id?: string
          link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "paid_livestream_link_claims_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "paid_livestream_links"
            referencedColumns: ["id"]
          },
        ]
      }
      paid_livestream_links: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          label: string | null
          link_type: string
          max_uses: number
          revoked: boolean
          token: string
          used_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          label?: string | null
          link_type: string
          max_uses?: number
          revoked?: boolean
          token: string
          used_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          label?: string | null
          link_type?: string
          max_uses?: number
          revoked?: boolean
          token?: string
          used_count?: number
        }
        Relationships: []
      }
      paid_livestream_pulse: {
        Row: {
          id: number
          updated_at: string
        }
        Insert: {
          id?: number
          updated_at?: string
        }
        Update: {
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      paid_livestream_settings: {
        Row: {
          active_server: string
          background_url: string
          description: string
          id: string
          is_live: boolean
          logo_url: string
          m3u8_url: string
          public_access: boolean
          rtmp_url: string
          start_time: string | null
          title: string
          updated_at: string
          youtube_url: string
        }
        Insert: {
          active_server?: string
          background_url?: string
          description?: string
          id?: string
          is_live?: boolean
          logo_url?: string
          m3u8_url?: string
          public_access?: boolean
          rtmp_url?: string
          start_time?: string | null
          title?: string
          updated_at?: string
          youtube_url?: string
        }
        Update: {
          active_server?: string
          background_url?: string
          description?: string
          id?: string
          is_live?: boolean
          logo_url?: string
          m3u8_url?: string
          public_access?: boolean
          rtmp_url?: string
          start_time?: string | null
          title?: string
          updated_at?: string
          youtube_url?: string
        }
        Relationships: []
      }
      paid_livestream_tokens: {
        Row: {
          banned: boolean
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          label: string | null
          token: string
        }
        Insert: {
          banned?: boolean
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          label?: string | null
          token: string
        }
        Update: {
          banned?: boolean
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          label?: string | null
          token?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image: string | null
          name: string
          price: number
          show_date: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          name: string
          price?: number
          show_date?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string | null
          name?: string
          price?: number
          show_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          is_blacklisted: boolean
          oshi_member_id: number | null
          phone: string | null
          premium_plan: string | null
          premium_until: string | null
          profile_code: string | null
          profile_photo: string | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_blacklisted?: boolean
          oshi_member_id?: number | null
          phone?: string | null
          premium_plan?: string | null
          premium_until?: string | null
          profile_code?: string | null
          profile_photo?: string | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_blacklisted?: boolean
          oshi_member_id?: number | null
          phone?: string | null
          premium_plan?: string | null
          premium_until?: string | null
          profile_code?: string | null
          profile_photo?: string | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          id: string
          product_id: string
          product_name: string
          product_price: number
          purchase_id: string
          quantity: number
        }
        Insert: {
          id?: string
          product_id: string
          product_name: string
          product_price: number
          purchase_id: string
          quantity?: number
        }
        Update: {
          id?: string
          product_id?: string
          product_name?: string
          product_price?: number
          purchase_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          id: string
          payment_method: string
          status: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_method?: string
          status?: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_method?: string
          status?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      replay_access: {
        Row: {
          created_at: string
          id: string
          unlocked_via: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          unlocked_via?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          unlocked_via?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      replay_videos: {
        Row: {
          created_at: string
          id: string
          password: string
          title: string
          youtube_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          password?: string
          title: string
          youtube_url: string
        }
        Update: {
          created_at?: string
          id?: string
          password?: string
          title?: string
          youtube_url?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          product_id: string
          product_name: string
          rating: number
          user_id: string
          username: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          product_id: string
          product_name: string
          rating: number
          user_id: string
          username: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          product_id?: string
          product_name?: string
          rating?: number
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      songs: {
        Row: {
          artist: string
          created_at: string
          duration_seconds: number | null
          id: string
          position: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          artist?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          position?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          artist?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          position?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      create_paid_link: {
        Args: { _label?: string; _max: number; _type: string }
        Returns: Json
      }
      get_my_contact: {
        Args: never
        Returns: {
          email: string
          phone: string
        }[]
      }
      get_paid_livestream_public: {
        Args: never
        Returns: {
          active_server: string
          background_url: string
          description: string
          id: string
          is_live: boolean
          logo_url: string
          public_access: boolean
          rtmp_url: string
          start_time: string
          title: string
          updated_at: string
          youtube_url: string
        }[]
      }
      get_paid_m3u8_url: { Args: { _token?: string }; Returns: string }
      get_public_profiles_by_codes: {
        Args: { _codes: string[] }
        Returns: {
          profile_code: string
          profile_photo: string
          user_id: string
          username: string
        }[]
      }
      get_public_profiles_by_ids: {
        Args: { _ids: string[] }
        Returns: {
          profile_code: string
          profile_photo: string
          user_id: string
          username: string
        }[]
      }
      get_ranking_data: {
        Args: never
        Returns: {
          profile_photo: string
          purchase_count: number
          total_items: number
          total_spent: number
          user_id: string
          username: string
        }[]
      }
      grant_premium_by_code: {
        Args: { _code: string; _plan: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_paid_links: {
        Args: never
        Returns: {
          created_at: string
          expires_at: string
          id: string
          label: string
          link_type: string
          max_uses: number
          revoked: boolean
          token: string
          used_count: number
        }[]
      }
      list_premium_users: {
        Args: never
        Returns: {
          premium_plan: string
          premium_until: string
          profile_code: string
          user_id: string
          username: string
        }[]
      }
      list_public_profiles: {
        Args: never
        Returns: {
          profile_code: string
          profile_photo: string
          user_id: string
          username: string
        }[]
      }
      list_replay_videos: {
        Args: never
        Returns: {
          created_at: string
          has_password: boolean
          id: string
          title: string
          youtube_url: string
        }[]
      }
      revoke_premium_by_code: { Args: { _code: string }; Returns: Json }
      validate_and_claim_link: {
        Args: { _fingerprint: string; _token: string }
        Returns: Json
      }
      validate_paid_token: {
        Args: { _token: string }
        Returns: {
          banned: boolean
          expires_at: string
          token: string
          valid: boolean
        }[]
      }
      verify_replay_password: {
        Args: { _password: string; _video_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
