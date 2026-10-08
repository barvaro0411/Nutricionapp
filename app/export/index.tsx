import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { showAlert } from "@/utils/alerts";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  generateNutritionistReport,
  NutritionistReportData,
} from "@/services/nutritionistReportService";
import { colors, layout } from "@/constants/colors";

export default function ExportReportScreen() {
  const router = useRouter();
  const userId = useAuthStore(s => s.user?.id);

  const [daysBack, setDaysBack] = useState<7 | 30>(7);
  const [report, setReport] = useState<NutritionistReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoading(true); setReport(null); setError(null);
    generateNutritionistReport(userId, daysBack).then(data => { if (active) setReport(data); })
      .catch(e => { if (active) setError(e.message || "No se pudo generar el informe."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [daysBack, userId]);

  const handleShareWhatsApp = async () => {
    if (!report) return;
    try {
      await Share.share({
        message: report.formattedText,
        title: `Informe Nutricional - ${report.patientName}`,
      });
    } catch (err: any) {
      showAlert("Error al compartir", err?.message);
    }
  };

  const handleExportCSV = async () => {
    if (!report) return;
    try {
      const filename = "Nutricion_" + report.startDate + "_a_" + report.endDate + ".csv";
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob(["\ufeff" + report.csvContent], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a"); link.href = url; link.download = filename;
        document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        if (!await Sharing.isAvailableAsync()) throw new Error("Este dispositivo no permite compartir archivos.");
        const file = FileSystem.cacheDirectory + filename;
        await FileSystem.writeAsStringAsync(file, "\ufeff" + report.csvContent);
        try { await Sharing.shareAsync(file, { mimeType: "text/csv", UTI: "public.comma-separated-values-text" }); }
        finally { await FileSystem.deleteAsync(file, { idempotent: true }); }
      }
    } catch (err: any) {
      showAlert("Error al exportar CSV", err?.message);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Nav */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>‹ Volver</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Informe Nutricional</Text>
        <View style={{ width: 50 }} />
      </View>

      <Text style={styles.subtitle}>
        Exporta tus promedios reales y desglose de comidas para enviárselo directamente a tu nutricionista o médico tratante.
      </Text>

      {/* Selector de Rango */}
      <View style={styles.rangeRow}>
        <TouchableOpacity
          style={[styles.rangeBtn, daysBack === 7 && styles.rangeBtnActive]}
          onPress={() => setDaysBack(7)}
        >
          <Text style={[styles.rangeBtnText, daysBack === 7 && styles.rangeBtnTextActive]}>
            7 días
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rangeBtn, daysBack === 30 && styles.rangeBtnActive]}
          onPress={() => setDaysBack(30)}
        >
          <Text style={[styles.rangeBtnText, daysBack === 30 && styles.rangeBtnTextActive]}>
            30 días
          </Text>
        </TouchableOpacity>
      </View>

      {error && <Text accessibilityRole="alert" style={styles.subtitle}>{error}</Text>}
      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: 40 }} />
      ) : report ? (
        <>
          {/* Tarjeta de Resumen Clínico */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.patientName}>{report.patientName}</Text>
              <Text style={styles.dateRange}>
                {report.startDate} al {report.endDate}
              </Text>
            </View>

            <View style={styles.gridAverages}>
              <View style={styles.avgCol}>
                <Text style={styles.avgNum}>{report.avgCalories}</Text>
                <Text style={styles.avgLbl}>kcal / día</Text>
              </View>
              <View style={styles.avgCol}>
                <Text style={[styles.avgNum, { color: colors.protein }]}>
                  {report.avgProtein}g
                </Text>
                <Text style={styles.avgLbl}>Proteína</Text>
              </View>
              <View style={styles.avgCol}>
                <Text style={[styles.avgNum, { color: colors.carbs }]}>
                  {report.avgCarbs}g
                </Text>
                <Text style={styles.avgLbl}>Carbos</Text>
              </View>
              <View style={styles.avgCol}>
                <Text style={[styles.avgNum, { color: colors.fat }]}>{report.avgFat}g</Text>
                <Text style={styles.avgLbl}>Grasas</Text>
              </View>
            </View>

            <View style={styles.waterRow}>
              <Text style={styles.waterText}>
                Consumo promedio de agua: {report.avgWaterMl} ml / día
              </Text>
            </View>
          </View>

          {/* Botones de Acción */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShareWhatsApp}>
              <Text style={styles.shareBtnText}>Compartir mi informe</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.csvBtn} onPress={handleExportCSV}>
              <Text style={styles.csvBtnText}>Descargar CSV para Excel</Text>
            </TouchableOpacity>
          </View>

          {/* Vista previa de texto */}
          <Text style={styles.previewTitle}>Vista previa del informe:</Text>
          <View style={styles.previewBox}>
            <Text style={styles.previewText}>{report.formattedText}</Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    ...layout.narrowPage,
    paddingTop: Platform.OS === "ios" ? 48 : 20,
    paddingBottom: 48,
  },
  topNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  backBtn: {
    paddingVertical: 6,
  },
  backBtnText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: "700",
  },
  navTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  rangeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
  },
  rangeBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  rangeBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  rangeBtnTextActive: {
    color: colors.primaryDark,
    fontWeight: "800",
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    marginBottom: 20,
  },
  summaryHeader: {
    marginBottom: 16,
  },
  patientName: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  dateRange: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  gridAverages: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  avgCol: {
    alignItems: "center",
  },
  avgNum: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  avgLbl: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  waterRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  waterText: {
    fontSize: 13,
    color: "#0369A1",
    fontWeight: "600",
  },
  actionsContainer: {
    gap: 10,
    marginBottom: 24,
  },
  shareBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  shareBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  csvBtn: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  csvBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 8,
  },
  previewBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  previewText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
});
