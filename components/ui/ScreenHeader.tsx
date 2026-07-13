// components/ui/ScreenHeader.tsx - sticky top bar per Serene Logic design
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Type } from '../../constants/theme';

interface ScreenHeaderProps {
  title: string;
  /** larger Growth wordmark styling (home screen) */
  wordmark?: boolean;
  onMenuPress?: () => void;
  /** custom right side content; defaults to nothing */
  right?: React.ReactNode;
}

export function HeaderIconButton({
  icon,
  onPress,
  color = Colors.primary,
  children,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  onPress?: () => void;
  color?: string;
  children?: React.ReactNode;
}) {
  return (
    <TouchableOpacity style={styles.iconBtn} onPress={onPress} activeOpacity={0.7}>
      <MaterialIcons name={icon} size={22} color={color} />
      {children}
    </TouchableOpacity>
  );
}

export default function ScreenHeader({ title, wordmark, onMenuPress, right }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        {onMenuPress && <HeaderIconButton icon="settings" onPress={onMenuPress} />}
        <Text style={[styles.title, wordmark && styles.wordmark]}>{title}</Text>
      </View>
      <View style={styles.right}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(193,200,200,0.3)',
    zIndex: 40,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: {
    fontSize: 18,
    color: Colors.primary,
    fontFamily: Type.geistBold,
  },
  wordmark: {
    fontSize: 22,
    letterSpacing: -0.22,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
});
