import { translateAuthError } from "../authErrors";

describe("translateAuthError", () => {
  it("translates rate limit errors", () => {
    const error = { message: "email rate limit exceeded" };
    expect(translateAuthError(error)).toContain("límite temporal de correos");
  });

  it("translates user already registered errors", () => {
    const error = { message: "User already registered" };
    expect(translateAuthError(error)).toContain("ya está registrado");
  });

  it("translates invalid login credentials", () => {
    const error = { message: "Invalid login credentials" };
    expect(translateAuthError(error)).toContain("Correo o contraseña incorrectos");
  });

  it("translates unconfirmed email", () => {
    const error = { message: "Email not confirmed" };
    expect(translateAuthError(error)).toContain("confirmar tu correo");
  });

  it("translates password too short", () => {
    const error = { message: "Password should be at least 6 characters" };
    expect(translateAuthError(error)).toContain("al menos 6 caracteres");
  });

  it("translates invalid email address error", () => {
    const error = { message: 'Email address "test@example.com" is invalid' };
    expect(translateAuthError(error)).toContain("no es válido");
  });

  it("handles empty or unknown errors gracefully", () => {
    expect(translateAuthError("")).toBe("Ha ocurrido un error inesperado.");
    expect(translateAuthError({})).toBe("Ha ocurrido un error inesperado.");
    expect(translateAuthError({ message: 500 })).toBe("Ha ocurrido un error inesperado.");
    expect(translateAuthError("Custom error message")).toBe("Custom error message");
  });

  it.each(["Failed to fetch", "fetch failed", "Network request failed", "Request timeout"])(
    "explains the connection failure %s in Spanish",
    message => {
      expect(translateAuthError({ message })).toBe(
        "Error de conexión. Revisa tu conexión a internet e inténtalo de nuevo."
      );
    }
  );
});
