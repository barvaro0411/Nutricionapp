const mockUpload = jest.fn();
const mockRemove = jest.fn();

jest.mock("@/services/supabase", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => mockUpload(...args),
        remove: (...args: unknown[]) => mockRemove(...args),
      }),
    },
  },
}));

import {
  detectImageFormat,
  isHeicBytes,
  uploadMealPhoto,
} from "../storageService";

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, // RIFF
  0x24, 0x00, 0x00, 0x00,
  0x57, 0x45, 0x42, 0x50, // WEBP
]);
const HEIC_BYTES = new Uint8Array([
  0x00, 0x00, 0x00, 0x18,
  0x66, 0x74, 0x79, 0x70, // ftyp
  0x68, 0x65, 0x69, 0x63, // heic
]);

function toDataUrl(mime: string, bytes: Uint8Array): string {
  const b64 = Buffer.from(bytes).toString("base64");
  return `data:${mime};base64,${b64}`;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("detectImageFormat", () => {
  it("detecta JPEG, PNG y WebP por magic bytes incluso si el hint dice otro tipo", () => {
    expect(detectImageFormat(JPEG_BYTES, "image/png")).toEqual({
      contentType: "image/jpeg",
      extension: "jpg",
    });
    expect(detectImageFormat(PNG_BYTES, "image/jpeg")).toEqual({
      contentType: "image/png",
      extension: "png",
    });
    expect(detectImageFormat(WEBP_BYTES, "image/jpeg")).toEqual({
      contentType: "image/webp",
      extension: "webp",
    });
  });

  it("identifica y rechaza bytes HEIC sin caer al fallback de MIME", () => {
    expect(isHeicBytes(HEIC_BYTES)).toBe(true);
    expect(detectImageFormat(HEIC_BYTES, "image/jpeg")).toBeNull();
  });
});

describe("uploadMealPhoto", () => {
  it("decodifica data URLs JPEG y sube con extensión .jpg y contentType image/jpeg", async () => {
    mockUpload.mockImplementation(async (filePath: string) => ({
      data: { path: filePath },
      error: null,
    }));

    const result = await uploadMealPhoto("user-1", toDataUrl("image/jpeg", JPEG_BYTES));

    expect(result.error).toBeUndefined();
    expect(result.path).toMatch(/^user-1\/\d+-[a-z0-9]+\.jpg$/);
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/\d+-[a-z0-9]+\.jpg$/),
      expect.any(ArrayBuffer),
      { contentType: "image/jpeg", upsert: false }
    );
  });

  it("corrige extensión y contentType a PNG cuando los magic bytes reales son PNG", async () => {
    mockUpload.mockImplementation(async (filePath: string) => ({
      data: { path: filePath },
      error: null,
    }));

    const result = await uploadMealPhoto("user-1", toDataUrl("image/jpeg", PNG_BYTES));

    expect(result.error).toBeUndefined();
    expect(result.path).toMatch(/\.png$/);
    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringMatching(/\.png$/),
      expect.any(ArrayBuffer),
      { contentType: "image/png", upsert: false }
    );
  });

  it("entrega mensaje claro para imágenes HEIC no convertidas sin intentar subir", async () => {
    const result = await uploadMealPhoto("user-1", toDataUrl("image/heic", HEIC_BYTES));

    expect(result.path).toBe("");
    expect(result.error).toContain("HEIC");
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("rechaza imágenes vacías antes de subir", async () => {
    const result = await uploadMealPhoto("user-1", "data:image/jpeg;base64,");

    expect(result.path).toBe("");
    expect(result.error).toContain("vacía");
    expect(mockUpload).not.toHaveBeenCalled();
  });
});
