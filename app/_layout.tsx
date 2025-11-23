import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Poppins_400Regular, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { SplashScreen } from 'expo-router';
import { ScheduleProvider } from '@/context/ScheduleContext';
import { databaseManager } from '@/database/DatabaseManager';
import { notificationService } from '@/services/NotificationService';

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // Initialize database when app starts
    const initializeDatabase = async () => {
      try {
        await databaseManager.initialize();
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };

    // Initialize notification service
    const initializeNotifications = async () => {
      try {
        await notificationService.initialize();
        console.log('Notification service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize notification service:', error);
      }
    };

    initializeDatabase();
    initializeNotifications();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ScheduleProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
        <Stack.Screen name="setup" />
        <Stack.Screen name="recommendations" />
      </Stack>
      <StatusBar style="auto" />
    </ScheduleProvider>
  );
}