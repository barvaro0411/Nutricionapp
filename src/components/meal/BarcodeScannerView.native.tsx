import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Flashlight, FlashlightOff, RotateCcw } from "lucide-react-native";
import { colors } from "@/constants/colors";

interface BarcodeScannerViewProps {
  onBarcodeScanned: (barcode: string) => void;
  isPaused: boolean;
}

export function BarcodeScannerView({ onBarcodeScanned, isPaused }: BarcodeScannerViewProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const scanLocked = useRef(false);

  useEffect(() => {
    scanLocked.current = isPaused;
    if (!isPaused) setReady(false);
  }, [isPaused]);

  const retry = () => { setError(null); setReady(false); setAttempt(value => value + 1); };
  const allowCamera = async () => {
    try {
      if (permission?.canAskAgain === false) await Linking.openSettings();
      else await requestPermission();
    } catch { setError("No se pudo solicitar acceso a la cámara."); }
  };

  if (!permission) return <View style={styles.container}><ActivityIndicator color={colors.primary} /></View>;
  if (!permission.granted) return <View style={[styles.container, styles.center]}>
    <Text style={styles.text}>Permite el acceso a la cámara para escanear el código del producto.</Text>
    {error && <Text style={styles.text}>{error}</Text>}
    <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={allowCamera}>
      <Text style={styles.text}>{permission.canAskAgain ? "Permitir cámara" : "Abrir ajustes"}</Text>
    </TouchableOpacity>
  </View>;

  return <View style={styles.container}>
    {!isPaused && !error && <CameraView
      key={attempt}
      style={StyleSheet.absoluteFillObject}
      facing="back"
      enableTorch={torch}
      barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "itf14"] }}
      onCameraReady={() => setReady(true)}
      onMountError={() => setError("No se pudo iniciar la cámara. Reintenta.")}
      onBarcodeScanned={({ data }) => {
        if (isPaused || scanLocked.current || !/^[0-9]{8,14}$/.test(data)) return;
        scanLocked.current = true;
        onBarcodeScanned(data);
      }}
    />}
    {error ? <View style={styles.center}>
      <Text style={styles.text}>{error}</Text>
      <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={retry}>
        <RotateCcw size={16} color="white" /><Text style={styles.text}>Reintentar</Text>
      </TouchableOpacity>
    </View> : !ready && !isPaused ? <View style={styles.center}>
      <ActivityIndicator color="white" /><Text style={styles.text}>Iniciando cámara trasera...</Text>
    </View> : <View style={styles.center} pointerEvents="box-none">
      <View style={styles.frame} pointerEvents="none" />
      <Text style={styles.instruction}>{isPaused ? "Código capturado" : "Centra las barras del producto en el recuadro"}</Text>
      {!isPaused && <TouchableOpacity accessibilityRole="button" accessibilityLabel={torch ? "Apagar linterna" : "Encender linterna"} style={styles.torch} onPress={() => setTorch(value => !value)}>
        {torch ? <FlashlightOff color="white" size={22} /> : <Flashlight color="white" size={22} />}
      </TouchableOpacity>}
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  container: { width: "100%", height: 300, borderRadius: 20, overflow: "hidden", backgroundColor: "#111827", justifyContent: "center" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 14 },
  text: { color: "white", textAlign: "center", fontSize: 14 },
  button: { backgroundColor: colors.primary, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  frame: { width: 250, height: 140, borderWidth: 3, borderColor: colors.primary, borderRadius: 12 },
  instruction: { color: "white", fontSize: 13, backgroundColor: "rgba(0,0,0,0.65)", padding: 8, borderRadius: 8 },
  torch: { position: "absolute", top: 14, right: 14, padding: 10, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 24 },
});
