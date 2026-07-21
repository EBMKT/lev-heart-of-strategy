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
      briefings: {
        Row: {
          audio_url: string | null
          conteudo: Json
          created_at: string
          data: string
          id: string
          periodo: Database["public"]["Enums"]["briefing_periodo"]
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          conteudo?: Json
          created_at?: string
          data?: string
          id?: string
          periodo: Database["public"]["Enums"]["briefing_periodo"]
          user_id: string
        }
        Update: {
          audio_url?: string | null
          conteudo?: Json
          created_at?: string
          data?: string
          id?: string
          periodo?: Database["public"]["Enums"]["briefing_periodo"]
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          caption: string | null
          created_at: string
          hashtags: string[]
          id: string
          plataforma: Database["public"]["Enums"]["post_platform"]
          scheduled_at: string | null
          script: string | null
          status: Database["public"]["Enums"]["post_status"]
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          hashtags?: string[]
          id?: string
          plataforma: Database["public"]["Enums"]["post_platform"]
          scheduled_at?: string | null
          script?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          hashtags?: string[]
          id?: string
          plataforma?: Database["public"]["Enums"]["post_platform"]
          scheduled_at?: string | null
          script?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          elevenlabs_voice_id: string | null
          id: string
          lev_tone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          elevenlabs_voice_id?: string | null
          id: string
          lev_tone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          elevenlabs_voice_id?: string | null
          id?: string
          lev_tone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_updates: {
        Row: {
          ai_analysis: string | null
          conteudo: string
          created_at: string
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          ai_analysis?: string | null
          conteudo: string
          created_at?: string
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          ai_analysis?: string | null
          conteudo?: string
          created_at?: string
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          prioridade: Database["public"]["Enums"]["project_priority"]
          progresso: number
          proximas_acoes: Json
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          prioridade?: Database["public"]["Enums"]["project_priority"]
          progresso?: number
          proximas_acoes?: Json
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          prioridade?: Database["public"]["Enums"]["project_priority"]
          progresso?: number
          proximas_acoes?: Json
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          config: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          config?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      briefing_periodo: "manha" | "tarde" | "noite"
      post_platform: "instagram" | "tiktok"
      post_status: "ideia" | "rascunho" | "aprovado" | "publicado"
      project_priority: "baixa" | "media" | "alta" | "critica"
      project_status: "ativo" | "pausado" | "concluido" | "arquivado"
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
      briefing_periodo: ["manha", "tarde", "noite"],
      post_platform: ["instagram", "tiktok"],
      post_status: ["ideia", "rascunho", "aprovado", "publicado"],
      project_priority: ["baixa", "media", "alta", "critica"],
      project_status: ["ativo", "pausado", "concluido", "arquivado"],
    },
  },
} as const
