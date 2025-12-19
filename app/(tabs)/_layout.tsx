import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { storage } from '../../services/storage';

export default function RootLayout() {
  useEffect(() => {
    // Initialize storage with dummy data on first launch
    const initializeApp = async () => {
      try {
        await storage.initializeDefaults();
        console.log('App initialized successfully');
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="events/add" />
      <Stack.Screen name="events/[id]" />
      <Stack.Screen name="goals/add" />
    </Stack>
  );
}