const mockManipulateAsync = jest.fn();

jest.mock("expo-image-manipulator", () => ({
  SaveFormat: {
    JPEG: "jpeg",
    PNG: "png",
    WEBP: "webp",
  },
  manipulateAsync: (...args: unknown[]) => mockManipulateAsync(...args),
}));

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

import { compressMealImage } from "../imageCompressor";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("compressMealImage", () => {
  it("comprime siempre como JPEG real (nunca WebP) para evitar desajustes MIME", async () => {
    mockManipulateAsync.mockResolvedValue({
      uri: "file:///compressed.jpg",
      width: 960,
      height: 720,
    });

    const result = await compressMealImage("file:///original.jpg");

    expect(result).toEqual({
      uri: "file:///compressed.jpg",
      width: 960,
      height: 720,
    });
    expect(mockManipulateAsync).toHaveBeenCalledWith(
      "file:///original.jpg",
      [{ resize: { width: 960 } }],
      expect.objectContaining({ format: "jpeg" })
    );
  });

  it("devuelve el URI original de forma segura si la compresión falla", async () => {
    mockManipulateAsync.mockRejectedValue(new Error("native error"));

    const result = await compressMealImage("file:///original.jpg");

    expect(result).toEqual({
      uri: "file:///original.jpg",
      width: 0,
      height: 0,
    });
  });
});
