import React, { useEffect } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { useQuickLogStore } from "@/stores/useQuickLogStore";

export default function RecordScreen() {
  const router = useRouter();
  const { openQuickLog } = useQuickLogStore();

  useEffect(() => {
    openQuickLog();
    router.replace("/(tabs)");
  }, [openQuickLog, router]);

  return <View />;
}
