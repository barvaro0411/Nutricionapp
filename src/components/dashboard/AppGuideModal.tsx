import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from "react-native";
import {
  Camera,
  Plus,
  Flame,
  Sparkles,
  Barcode,
  Droplets,
  X,
  CheckCircle2,
  HelpCircle,
} from "lucide-react-native";
import { colors } from "@/constants/colors";

interface AppGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AppGuideModal({ visible, onClose }: AppGuideModalProps) {
  const guideSections = [
    {
      icon: <Plus size={22} color="#FFFFFF" strokeWidth={3} />,
      iconBg: colors.primary,
      title: "Botón Central (+) 'Registrar'",
      subtitle: "Tu botón principal para agregar comidas",
      desc: "Tócalo en cualquier momento para registrar lo que comiste. Tienes 4 formas: tomar una foto con IA, dictar por voz, escanear el código de barras o elegir tus favoritas.",
    },
    {
      icon: <Camera size={22} color="#FFFFFF" />,
      iconBg: "#4F46E5",
      title: "Foto IA (Reconocimiento Automático)",
      subtitle: "El método más rápido y mágico",
      desc: "Simplemente toma una foto de tu plato. La inteligencia artificial identificará los alimentos, estimará el peso en gramos y calculará las calorías y proteínas.",
    },
    {
      icon: <Flame size={22} color="#FFFFFF" fill="#FFFFFF" />,
      iconBg: "#EA580C",
      title: "Racha de Hábitos (🔥)",
      subtitle: "Tu indicador de constancia",
      desc: "Cada día que registres al menos 1 comida, tu racha avanza (+1 día). Tócalo en la cabecera para ver tu calendario de 7 días y tu récord histórico.",
    },
    {
      icon: <Sparkles size={22} color="#FFFFFF" />,
      iconBg: "#D97706",
      title: "Coach Nutricional IA",
      subtitle: "Tu asistente personal 24/7",
      desc: "¿No sabes qué cenar con las calorías que te sobran? ¿Te falta proteína? Pregúntale al Coach en la pestaña inferior y te dará recomendaciones con comida chilena real.",
    },
    {
      icon: <Barcode size={22} color="#FFFFFF" />,
      iconBg: "#0EA5E9",
      title: "Escáner de Código de Barras",
      subtitle: "Para alimentos envasados de supermercado",
      desc: "Apunta la cámara al envase (leche, galletas, atún, cereales) para leer sus datos nutricionales al instante. Si no tiene código, puedes fotografiar la tabla nutricional.",
    },
    {
      icon: <Droplets size={22} color="#FFFFFF" />,
      iconBg: "#0284C7",
      title: "Control de Agua (+250 / +500 ml)",
      subtitle: "Hidratación en 1 toque",
      desc: "Toca los botones del widget de agua para sumar vasos rápidamente hasta alcanzar tu meta de 2.000 ml diarios.",
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <HelpCircle size={22} color={colors.primary} />
              <Text style={styles.headerTitle}>¿Cómo funciona la App?</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.introText}>
            Guía rápida de los botones y funciones clave para sacarle el máximo provecho a tu plan nutricional:
          </Text>

          <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
            {guideSections.map((item, index) => (
              <View key={index} style={styles.guideCard}>
                <View style={[styles.iconWrap, { backgroundColor: item.iconBg }]}>
                  {item.icon}
                </View>
                <View style={styles.textWrap}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                  <Text style={styles.cardDesc}>{item.desc}</Text>
                </View>
              </View>
            ))}
            <View style={{ height: 10 }} />
          </ScrollView>

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <CheckCircle2 size={18} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>¡Entendido, gracias!</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "85%",
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  introText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  scrollList: {
    marginBottom: 16,
  },
  guideCard: {
    flexDirection: "row",
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
