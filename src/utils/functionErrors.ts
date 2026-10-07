/**
 * Desempaqueta y extrae mensajes legibles de errores retornados por Supabase Edge Functions.
 * En el cliente de Supabase JS, los errores HTTP no-2xx a menudo vienen como "Edge Function returned a non-2xx status code",
 * ocultando el mensaje amigable real contenido en el payload JSON (error.context).
 */
export async function extractFunctionErrorMessage(
  error: any,
  fallbackMessage: string = "No se pudo completar la solicitud con el servicio de IA. Inténtalo de nuevo."
): Promise<string> {
  if (!error) return fallbackMessage;

  // 1. Extraer del contexto HTTP Response si existe
  if (error.context && typeof error.context.json === "function") {
    try {
      // Clonar para no consumir el stream si ya fue leído
      const response = typeof error.context.clone === "function" ? error.context.clone() : error.context;
      const body = await response.json();
      if (body?.error?.message && typeof body.error.message === "string") {
        return body.error.message;
      }
      if (body?.message && typeof body.message === "string") {
        return body.message;
      }
    } catch {
      try {
        const response = typeof error.context.clone === "function" ? error.context.clone() : error.context;
        const text = await response.text();
        if (text && text.trim().length > 0 && text.length < 200) {
          return text.trim();
        }
      } catch {
        // Ignorar fallo de lectura de texto
      }
    }
  }

  // 2. Extraer del cuerpo directo del error si ya viene parseado
  if (error.error?.message && typeof error.error.message === "string") {
    return error.error.message;
  }

  // 3. Extraer de error.message siempre que no sea el texto genérico
  if (
    error.message &&
    typeof error.message === "string" &&
    !error.message.toLowerCase().includes("non-2xx")
  ) {
    return error.message;
  }

  return fallbackMessage;
}
