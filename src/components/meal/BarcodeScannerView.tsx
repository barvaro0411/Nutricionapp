import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  DecodeHintType,
} from "@zxing/library";
import { Flashlight, FlashlightOff, AlertCircle, RotateCcw } from "lucide-react-native";
import { colors } from "@/constants/colors";

interface BarcodeScannerViewProps {
  onBarcodeScanned: (barcode: string) => void;
  isPaused: boolean;
}

export function BarcodeScannerView({
  onBarcodeScanned,
  isPaused,
}: BarcodeScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const stopScanning = useCallback(() => {
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startScanning = useCallback(async () => {
    if (Platform.OS !== "web") return;
    setErrorMsg(null);
    setLoading(true);

    try {
      stopScanning();

      // Configurar formatos de códigos de barras (EAN-13 chileno, UPC, Code 128, etc.)
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.ITF,
        BarcodeFormat.QR_CODE,
      ]);

      const reader = new BrowserMultiFormatReader(hints, 250);
      readerRef.current = reader;

      if (videoRef.current) {
        videoRef.current.setAttribute("playsinline", "true");

        await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result, _err) => {
            if (result && !isPaused) {
              const code = result.getText();
              if (code && code.trim().length >= 4) {
                onBarcodeScanned(code.trim());
              }
            }
          }
        );

        const track = (videoRef.current?.srcObject as MediaStream)?.getVideoTracks()[0];
        if (track && typeof (track as any).getCapabilities === "function") {
          const caps = (track as any).getCapabilities();
          if (caps && "torch" in caps) {
            setTorchAvailable(true);
          }
        }
      }
      setLoading(false);
    } catch (err: any) {
      console.warn("Error accediendo a la cámara:", err);
      setLoading(false);
      if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
        setErrorMsg("Permiso de cámara denegado. Permite el acceso para escanear.");
      } else {
        setErrorMsg("No se pudo iniciar la cámara en este navegador.");
      }
    }
  }, [isPaused, onBarcodeScanned, stopScanning]);

  useEffect(() => {
    if (!isPaused) {
      void startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isPaused, startScanning, stopScanning]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && typeof (track as any).applyConstraints === "function") {
      try {
        const next = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: next }],
        });
        setTorchOn(next);
      } catch (e) {
        console.warn("No se pudo alternar linterna:", e);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Contenedor del Video HTML nativo */}
      <View style={styles.videoWrapper}>
        {Platform.OS === "web" && (
          <video
            ref={videoRef as any}
            autoPlay
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: errorMsg ? "none" : "block",
            }}
          />
        )}

        {/* Loading Spinner */}
        {loading && !errorMsg && (
          <View style={styles.overlayCenter}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Iniciando cámara trasera...</Text>
          </View>
        )}

        {/* Mensaje de Error */}
        {errorMsg && (
          <View style={styles.overlayCenter}>
            <AlertCircle size={36} color="#EA580C" />
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={startScanning}>
              <RotateCcw size={16} color="#FFFFFF" />
              <Text style={styles.retryBtnText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* HUD: Retícula de escaneo y láser rojo */}
        {!loading && !errorMsg && (
          <View style={styles.hudOverlay} pointerEvents="box-none">
            {/* Botón de linterna */}
            {torchAvailable && (
              <TouchableOpacity
                style={styles.torchBtn}
                onPress={toggleTorch}
                activeOpacity={0.8}
              >
                {torchOn ? (
                  <FlashlightOff size={18} color="#FFFFFF" />
                ) : (
                  <Flashlight size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )}

            {/* Recuadro de escaneo */}
            <View style={styles.scanFrame}>
              <View style={styles.cornerTL} />
              <View style={styles.cornerTR} />
              <View style={styles.cornerBL} />
              <View style={styles.cornerBR} />
              <View style={styles.laserLine} />
            </View>

            <View style={styles.instructionPill}>
              <Text style={styles.instructionText}>
                Centra las barras del producto en el recuadro
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: "#000000",
  },
  videoWrapper: {
    width: "100%",
    height: 300,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  overlayCenter: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 10,
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 10,
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 13,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 16,
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  retryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  hudOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  torchBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  scanFrame: {
    width: 250,
    height: 140,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 22,
    height: 22,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#10B981",
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 22,
    height: 22,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#10B981",
    borderTopRightRadius: 6,
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 22,
    height: 22,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#10B981",
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#10B981",
    borderBottomRightRadius: 6,
  },
  laserLine: {
    width: "88%",
    height: 2,
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  instructionPill: {
    position: "absolute",
    bottom: 14,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  instructionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
});
