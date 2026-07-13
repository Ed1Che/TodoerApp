// components/ui/Seg.tsx - segmented control with sliding white thumb (Serene Logic)
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Type } from '../../constants/theme';

interface SegProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export default function Seg({ options, value, onChange }: SegProps) {
  return (
    <View style={styles.track}>
      {options.map(opt => {
        const active = opt === value;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.btn, active && styles.btnActive]}
            onPress={() => onChange(opt)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.btnText, active && styles.btnTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 999,
    padding: 5,
    flexDirection: 'row',
  },
  btn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActive: {
    backgroundColor: Colors.surfaceContainerLowest,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  btnText: {
    fontSize: 14,
    letterSpacing: 0.14,
    color: Colors.outline,
    fontFamily: Type.geistMedium,
  },
  btnTextActive: {
    color: Colors.onSurface,
    fontFamily: Type.geistSemiBold,
  },
});
