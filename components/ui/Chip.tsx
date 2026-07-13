// components/ui/Chip.tsx - uppercase pill badge (Serene Logic)
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Type } from '../../constants/theme';

interface ChipProps {
  label: string;
  background: string;
  color: string;
  style?: ViewStyle;
  leading?: React.ReactNode;
}

export default function Chip({ label, background, color, style, leading }: ChipProps) {
  return (
    <View style={[styles.chip, { backgroundColor: background }, style]}>
      {leading}
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    lineHeight: 16,
    fontFamily: Type.geistBold,
  },
});
