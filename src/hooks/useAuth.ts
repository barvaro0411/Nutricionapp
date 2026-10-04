import { useState, useCallback } from "react";
import { supabase } from "@/services/supabase";
import { useAuthStore } from "@/stores/useAuthStore";
import { Database } from "@/types/database.types";
import { translateAuthError } from "@/utils/authErrors";
import * as Linking from "expo-linking";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { session, user, profile, setSession, setProfile, reset } = useAuthStore();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Error al obtener perfil:", profileError);
        return null;
      }

      if (data) {
        if (useAuthStore.getState().user?.id === userId) setProfile(data);
        return data;
      }

      return null;
    } catch (err: any) {
      console.error("Error inesperado en fetchProfile:", err);
      return null;
    }
  }, [setProfile]);

  const signInWithEmail = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        const friendlyMsg = translateAuthError(authError);
        setError(friendlyMsg);
        return { success: false, error: friendlyMsg };
      }

      setSession(data.session);
      if (data.user) {
        await fetchProfile(data.user.id);
      }
      return { success: true };
    } catch (err: any) {
      const msg = translateAuthError(err);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: Linking.createURL("/"),
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (authError) {
        const friendlyMsg = translateAuthError(authError);
        setError(friendlyMsg);
        return { success: false, error: friendlyMsg };
      }

      // Si Supabase tiene protección de enumeración activada y el usuario ya existe,
      // identities es un array vacío y session es null.
      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        const existsMsg = "Este correo electrónico ya está registrado. Por favor inicia sesión.";
        setError(existsMsg);
        return { success: false, error: existsMsg, code: "user_already_exists" };
      }

      // Si la confirmación de correo está activada en Supabase, session es null
      const needsEmailConfirmation = !data.session;

      if (data.session) {
        setSession(data.session);
        if (data.user) {
          await fetchProfile(data.user.id);
        }
      }

      return {
        success: true,
        needsEmailConfirmation,
        user: data.user,
      };
    } catch (err: any) {
      const msg = translateAuthError(err);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      reset();
      return { success: true };
    } catch (err: any) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: Linking.createURL("/reset-password"),
      });
      if (resetError) {
        const friendlyMsg = translateAuthError(resetError);
        setError(friendlyMsg);
        return { success: false, error: friendlyMsg };
      }
      return { success: true };
    } catch (err: any) {
      const msg = translateAuthError(err);
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!user) return { success: false, error: "No hay sesión activa" };
    setLoading(true);
    try {
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (updateError) {
        setError(updateError.message);
        return { success: false, error: updateError.message };
      }

      setProfile(data);
      return { success: true, data };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    session,
    user,
    profile,
    loading,
    error,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    resetPassword,
    fetchProfile,
    updateProfile,
  };
}
