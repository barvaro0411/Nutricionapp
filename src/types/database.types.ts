export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      personal_plans: {
        Row: { user_id: string; plan: Json; updated_at: string };
        Insert: { user_id: string; plan: Json; updated_at?: string };
        Update: { plan?: Json; updated_at?: string };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          gender: "male" | "female" | "other" | null;
          birth_date: string | null;
          age: number | null;
          height_cm: number | null;
          current_weight_kg: number | null;
          activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active" | null;
          objective: "lose_weight" | "maintain" | "gain_muscle" | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          gender?: "male" | "female" | "other" | null;
          birth_date?: string | null;
          age?: number | null;
          height_cm?: number | null;
          current_weight_kg?: number | null;
          activity_level?: "sedentary" | "light" | "moderate" | "active" | "very_active" | null;
          objective?: "lose_weight" | "maintain" | "gain_muscle" | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          gender?: "male" | "female" | "other" | null;
          birth_date?: string | null;
          age?: number | null;
          height_cm?: number | null;
          current_weight_kg?: number | null;
          activity_level?: "sedentary" | "light" | "moderate" | "active" | "very_active" | null;
          objective?: "lose_weight" | "maintain" | "gain_muscle" | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          calories?: number;
          protein_g?: number;
          carbs_g?: number;
          fat_g?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      meals: {
        Row: {
          id: string;
          user_id: string;
          meal_type: "desayuno" | "almuerzo" | "cena" | "snack";
          logged_at: string;
          image_path: string | null;
          total_calories: number;
          total_protein: number;
          total_carbs: number;
          total_fat: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          meal_type: "desayuno" | "almuerzo" | "cena" | "snack";
          logged_at?: string;
          image_path?: string | null;
          total_calories?: number;
          total_protein?: number;
          total_carbs?: number;
          total_fat?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          meal_type?: "desayuno" | "almuerzo" | "cena" | "snack";
          logged_at?: string;
          image_path?: string | null;
          total_calories?: number;
          total_protein?: number;
          total_carbs?: number;
          total_fat?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "meals_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      meal_items: {
        Row: {
          id: string;
          meal_id: string;
          food_name: string;
          grams: number;
          unit: "g" | "ml";
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          confidence: number | null;
          ai_detected: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          meal_id: string;
          food_name: string;
          grams: number;
          unit?: "g" | "ml";
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          confidence?: number | null;
          ai_detected?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          meal_id?: string;
          food_name?: string;
          grams?: number;
          unit?: "g" | "ml";
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
          confidence?: number | null;
          ai_detected?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "meal_items_meal_id_fkey";
            columns: ["meal_id"];
            isOneToOne: false;
            referencedRelation: "meals";
            referencedColumns: ["id"];
          }
        ];
      };
      barcode_products: {
        Row: {
          barcode: string;
          product_name: string;
          brand: string | null;
          serving_size_g: number;
          calories_per_100g: number;
          protein_per_100g: number;
          carbs_per_100g: number;
          fat_per_100g: number;
          country: string | null;
          verified: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          barcode: string;
          product_name: string;
          brand?: string | null;
          serving_size_g?: number;
          calories_per_100g: number;
          protein_per_100g: number;
          carbs_per_100g: number;
          fat_per_100g: number;
          country?: string | null;
          verified?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          barcode?: string;
          product_name?: string;
          brand?: string | null;
          serving_size_g?: number;
          calories_per_100g?: number;
          protein_per_100g?: number;
          carbs_per_100g?: number;
          fat_per_100g?: number;
          country?: string | null;
          verified?: boolean;
          created_by?: string | null;
        };
        Relationships: [];
      };
      water_logs: {
        Row: {
          id: string;
          user_id: string;
          amount_ml: number;
          logged_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount_ml: number;
          logged_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount_ml?: number;
          logged_at?: string;
        };
        Relationships: [];
      };
      favorite_meals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          meal_type: "desayuno" | "almuerzo" | "cena" | "snack";
          total_calories: number;
          total_protein: number;
          total_carbs: number;
          total_fat: number;
          usage_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          meal_type: "desayuno" | "almuerzo" | "cena" | "snack";
          total_calories?: number;
          total_protein?: number;
          total_carbs?: number;
          total_fat?: number;
          usage_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          meal_type?: "desayuno" | "almuerzo" | "cena" | "snack";
          total_calories?: number;
          total_protein?: number;
          total_carbs?: number;
          total_fat?: number;
          usage_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      favorite_meal_items: {
        Row: {
          id: string;
          favorite_meal_id: string;
          food_name: string;
          grams: number;
          unit: "g" | "ml";
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          favorite_meal_id: string;
          food_name: string;
          grams: number;
          unit?: "g" | "ml";
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          favorite_meal_id?: string;
          food_name?: string;
          grams?: number;
          unit?: "g" | "ml";
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
        };
        Relationships: [
          {
            foreignKeyName: "favorite_meal_items_favorite_meal_id_fkey";
            columns: ["favorite_meal_id"];
            isOneToOne: false;
            referencedRelation: "favorite_meals";
            referencedColumns: ["id"];
          }
        ];
      };
      coach_messages: {
        Row: {
          id: string;
          user_id: string;
          role: "user" | "assistant";
          content: string;
          context_snapshot: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: "user" | "assistant";
          content: string;
          context_snapshot?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: "user" | "assistant";
          content?: string;
          context_snapshot?: Json | null;
        };
        Relationships: [];
      };
      recipes: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          meal_type: "desayuno" | "almuerzo" | "cena" | "snack";
          prep_time_minutes: number;
          servings: number;
          calories_per_serving: number;
          protein_per_serving: number;
          carbs_per_serving: number;
          fat_per_serving: number;
          instructions: string[];
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          meal_type: "desayuno" | "almuerzo" | "cena" | "snack";
          prep_time_minutes?: number;
          servings?: number;
          calories_per_serving: number;
          protein_per_serving: number;
          carbs_per_serving: number;
          fat_per_serving: number;
          instructions: string[];
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          meal_type?: "desayuno" | "almuerzo" | "cena" | "snack";
          prep_time_minutes?: number;
          servings?: number;
          calories_per_serving?: number;
          protein_per_serving?: number;
          carbs_per_serving?: number;
          fat_per_serving?: number;
          instructions?: string[];
          image_url?: string | null;
        };
        Relationships: [];
      };
      recipe_ingredients: {
        Row: {
          id: string;
          recipe_id: string;
          food_name: string;
          grams: number;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          food_name: string;
          grams: number;
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          food_name?: string;
          grams?: number;
          calories?: number;
          protein?: number;
          carbs?: number;
          fat?: number;
        };
        Relationships: [
          {
            foreignKeyName: "recipe_ingredients_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          }
        ];
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          logged_at: string;
          active_calories_burned: number;
          steps: number | null;
          source: "apple_health" | "health_connect" | "manual";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          logged_at?: string;
          active_calories_burned?: number;
          steps?: number | null;
          source?: "apple_health" | "health_connect" | "manual";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          logged_at?: string;
          active_calories_burned?: number;
          steps?: number | null;
          source?: "apple_health" | "health_connect" | "manual";
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          user_id: string;
          status: "free" | "active" | "trialing" | "canceled" | "past_due";
          plan_id: "free" | "pro_monthly_clp" | "pro_annual_clp";
          revenuecat_customer_id: string | null;
          current_period_end: string | null;
          ai_photo_scans_today: number;
          last_scan_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          status?: "free" | "active" | "trialing" | "canceled" | "past_due";
          plan_id?: "free" | "pro_monthly_clp" | "pro_annual_clp";
          revenuecat_customer_id?: string | null;
          current_period_end?: string | null;
          ai_photo_scans_today?: number;
          last_scan_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "free" | "active" | "trialing" | "canceled" | "past_due";
          plan_id?: "free" | "pro_monthly_clp" | "pro_annual_clp";
          revenuecat_customer_id?: string | null;
          current_period_end?: string | null;
          ai_photo_scans_today?: number;
          last_scan_date?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      v_daily_totals: {
        Row: {
          user_id: string;
          log_date: string;
          meal_count: number;
          total_calories: number;
          total_protein: number;
          total_carbs: number;
          total_fat: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      complete_onboarding: { Args: { p_profile: Json; p_goals: Json }; Returns: Database["public"]["Tables"]["profiles"]["Row"] };
      save_favorite: { Args: { p_title: string; p_meal_type: string; p_items: Json }; Returns: Database["public"]["Tables"]["favorite_meals"]["Row"] };
      save_meal: {
        Args: { p_meal_type: string; p_items: Json; p_image_path?: string | null; p_notes?: string | null; p_logged_at?: string; p_client_request_id?: string };
        Returns: Json;
      };
      set_nutrition_goals: {
        Args: { p_calories: number; p_protein_g: number; p_carbs_g: number; p_fat_g: number };
        Returns: Database["public"]["Tables"]["goals"]["Row"];
      };
      check_and_increment_ai_quota: {
        Args: {
          target_user_id: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
