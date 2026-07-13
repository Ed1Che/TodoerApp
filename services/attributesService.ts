// services/attributesService.ts - user-editable life attributes (replaces the old fixed LifeSector enum)
import { MaterialIcons } from '@expo/vector-icons';
import { storage } from './storage';
import { Colors } from '../constants/theme';

export interface Attribute {
  id: string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
}

export const DEFAULT_ATTRIBUTES: Attribute[] = [
  { id: 'health', name: 'Health', icon: 'favorite', color: Colors.primary },
  { id: 'career', name: 'Career', icon: 'work', color: Colors.secondary },
  { id: 'academic', name: 'Academic', icon: 'school', color: Colors.tertiary },
  { id: 'cyber', name: 'Cyber', icon: 'computer', color: Colors.primaryFixedDim },
  { id: 'social', name: 'Social', icon: 'groups', color: Colors.tertiary },
  { id: 'hobbies', name: 'Hobbies', icon: 'palette', color: Colors.secondaryContainer },
  { id: 'finance', name: 'Finance', icon: 'payments', color: Colors.error },
];

export async function getAttributes(): Promise<Attribute[]> {
  const stored = await storage.get('attributes', null);
  return stored && stored.length > 0 ? stored : DEFAULT_ATTRIBUTES;
}

export async function saveAttributes(attributes: Attribute[]): Promise<void> {
  await storage.set('attributes', attributes);
}

export const ATTRIBUTE_ICON_CHOICES: (keyof typeof MaterialIcons.glyphMap)[] = [
  'favorite', 'work', 'self-improvement', 'payments', 'fitness-center',
  'school', 'savings', 'groups', 'palette', 'book',
];

export const ATTRIBUTE_COLOR_CHOICES: string[] = [
  Colors.primary,
  Colors.secondary,
  Colors.tertiary,
  Colors.error,
  Colors.primaryFixedDim,
  Colors.secondaryContainer,
  Colors.primaryContainer,
];
