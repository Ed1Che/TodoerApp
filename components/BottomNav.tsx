// components/BottomNav.tsx - glass bottom nav with center FAB (Serene Logic)
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Type } from '../constants/theme';

export type NavTab = 'home' | 'shop' | 'create' | 'review' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
}

interface NavBtnProps {
  tab: NavTab;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  activeTab: NavTab;
  onPress: () => void;
}

function NavBtn({ tab, icon, label, activeTab, onPress }: NavBtnProps) {
  const active = activeTab === tab;
  return (
    <TouchableOpacity style={styles.navBtn} onPress={onPress} activeOpacity={0.7}>
      <MaterialIcons name={icon} size={22} color={active ? Colors.secondary : Colors.outline} />
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>{label}</Text>
      {active && <View style={styles.activeDot} />}
    </TouchableOpacity>
  );
}

export default function BottomNav({ activeTab }: BottomNavProps) {
  const router = useRouter();
  const fabActive = activeTab === 'create';

  return (
    <View style={styles.container}>
      <NavBtn
        tab="home"
        icon="home"
        label="Home"
        activeTab={activeTab}
        onPress={() => router.push('/')}
      />
      <NavBtn
        tab="shop"
        icon="shopping-bag"
        label="Shop"
        activeTab={activeTab}
        onPress={() => router.push('/(tabs)/leisure')}
      />
      <TouchableOpacity
        style={[styles.fab, fabActive && styles.fabActive]}
        onPress={() => router.push('/goals/add')}
        activeOpacity={0.85}
      >
        <MaterialIcons name="add" size={26} color="#fff" />
      </TouchableOpacity>
      <NavBtn
        tab="review"
        icon="analytics"
        label="Review"
        activeTab={activeTab}
        onPress={() => router.push('/(tabs)/goals')}
      />
      <NavBtn
        tab="profile"
        icon="person"
        label="Profile"
        activeTab={activeTab}
        onPress={() => router.push('/(tabs)/weekly')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(248,249,255,0.97)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(193,200,200,0.2)',
  },
  navBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'relative',
    minWidth: 44,
  },
  navLabel: {
    fontSize: 11,
    letterSpacing: 0.44,
    color: Colors.outline,
    fontFamily: Type.geistSemiBold,
  },
  navLabelActive: {
    color: Colors.secondary,
  },
  activeDot: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    backgroundColor: Colors.secondary,
    borderRadius: 2,
  },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 8,
  },
  fabActive: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
  },
});
