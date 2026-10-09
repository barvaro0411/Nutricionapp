import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/constants/colors";
import { parseCoachBlocks, parseCoachInline } from "@/utils/coachFormatting";

function Inline({ text }: { text: string }) {
  return <>{parseCoachInline(text).map((part, index) => <Text key={index} style={part.style ? styles[part.style] : undefined}>{part.text}</Text>)}</>;
}

export const CoachMessageContent = memo(function CoachMessageContent({ content }: { content: string }) {
  return <View style={styles.content}>{parseCoachBlocks(content).map((block, index) => {
    if (block.type === "divider") return <View key={index} style={styles.divider} />;
    if (block.type === "table") return <View key={index} testID="coach-table" style={styles.table}>
      <Text style={styles.tableCaption}><Inline text={block.headers[0]} /></Text>
      {block.rows.map((row, rowIndex) => <View key={rowIndex} style={styles.tableRow}>
        <Text selectable style={styles.rowTitle}><Inline text={row[0] || ""} /></Text>
        {row.slice(1).map((cell, cellIndex) => <Text selectable key={cellIndex} style={styles.text}>
          <Text style={styles.cellLabel}>{block.headers[cellIndex + 1]}: </Text><Inline text={cell} />
        </Text>)}
      </View>)}
    </View>;
    if (block.type === "list") return <View key={index} style={styles.list}>{block.items.map((item, itemIndex) => <View key={itemIndex} style={styles.listRow}>
      <Text style={styles.marker}>{block.ordered ? `${itemIndex + 1}.` : "•"}</Text>
      <Text selectable style={[styles.text, styles.listText]}><Inline text={item} /></Text>
    </View>)}</View>;
    return <Text selectable key={index} accessibilityRole={block.type === "heading" ? "header" : undefined} style={block.type === "heading" ? styles.heading : styles.text}>
      <Inline text={block.text} />
    </Text>;
  })}</View>;
});

const styles = StyleSheet.create({
  content: { gap: 12, minWidth: 0 }, text: { color: colors.text, fontSize: 15, lineHeight: 23 },
  heading: { color: colors.primaryDark, fontSize: 17, lineHeight: 25, fontWeight: "700" },
  strong: { fontWeight: "700" }, emphasis: { fontStyle: "italic" }, code: { fontFamily: "monospace" },
  divider: { height: 1, backgroundColor: colors.cardBorder, marginVertical: 3 },
  table: { gap: 8 }, tableCaption: { fontSize: 12, color: colors.textSecondary, fontWeight: "600" },
  tableRow: { gap: 3, padding: 12, borderRadius: 12, backgroundColor: colors.primaryGhost, borderWidth: 1, borderColor: colors.cardBorder },
  rowTitle: { color: colors.text, fontSize: 15, lineHeight: 23, fontWeight: "600" }, cellLabel: { color: colors.textSecondary },
  list: { gap: 7 }, listRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  marker: { color: colors.primary, lineHeight: 23, minWidth: 14 }, listText: { flex: 1, minWidth: 0 },
});
