import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { RotateCcw, Camera as CameraIcon } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { BarcodeScannerView } from "@/components/meal/BarcodeScannerView";

export interface BarcodeCameraPanelProps {
  onBarcodeScanned: (code: string) => void;
  isPaused: boolean;
  scanned: boolean;
  onResetScanner: () => void;
  onTakePhoto: () => void;
}

export function BarcodeCameraPanel({
  onBarcodeScanned,
  isPaused,
  scanned,
  onResetScanner,
  onTakePhoto,
}: BarcodeCameraPanelProps) {
  return (
    <View style={styles.cameraSection}>
      <BarcodeScannerView
        onBarcodeScanned={onBarcodeScanned}
        isPaused={isPaused}
      />

      <View style={styles.cameraActionsRow}>
        {scanned ? (
          <TouchableOpacity
            style={styles.rescanBtn}
            onPress={onResetScanner}
            activeOpacity={0.85}
          >
            <RotateCcw size={16} color={colors.text} />
            <Text style={styles.rescanBtnText}>Escanear otro código</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.snapPhotoBtn}
            onPress={onTakePhoto}
            activeOpacity={0.85}
          >
            <CameraIcon size={16} color="#FFFFFF" />
            <Text style={styles.snapPhotoBtnText}>
              Tomar foto al código o producto
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraSection: {
    marginBottom: 16,
  },
  cameraActionsRow: {
    marginTop: 12,
  },
  rescanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  rescanBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  snapPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
  },
  snapPhotoBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
