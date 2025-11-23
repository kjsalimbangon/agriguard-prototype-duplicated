// ✅ Remove expo-gl / WebGL backend completely
// This version uses CPU backend (stable for Android builds)

// Polyfills needed for TensorFlow.js
import { Buffer } from 'buffer';
global.Buffer = Buffer;

// Define global process to avoid TFJS errors
global.process = {
  env: {},
  version: '',
} as any;

// 🧠 TensorFlow.js initialization
import '@tensorflow/tfjs-react-native';
import * as tf from '@tensorflow/tfjs';

import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Linking,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import { SplashScreen } from 'expo-router';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function WelcomeScreen() {
  const [fontsLoaded, fontError] = useFonts({
    'Poppins-Regular': Poppins_400Regular,
    'Poppins-SemiBold': Poppins_600SemiBold,
    'Poppins-Bold': Poppins_700Bold,
  });

  // 🧠 TensorFlow initialization flag
  const [tfReady, setTfReady] = useState(false);

  useEffect(() => {
    const initTensorFlow = async () => {
      try {
        // ✅ Explicitly set backend to CPU
        await tf.setBackend('cpu');
        await tf.ready();

        console.log('✅ TensorFlow.js initialized with backend:', tf.getBackend());
        setTfReady(true);
      } catch (err) {
        console.error('⚠️ TensorFlow.js failed to initialize:', err);
      }
    };

    initTensorFlow();
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && tfReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, tfReady]);

  if (!fontsLoaded || !tfReady) {
    // Show loading screen while initializing TF + fonts
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8BA840" />
        <Text style={{ marginTop: 10, color: '#666' }}>Initializing AI engine...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.logoText}>AGRIGUARD</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(tabs)')}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Application not working?</Text>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:support@agriguard.com')}>
          <Text style={styles.linkText}>Contact here</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
  logoText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
    color: '#8BA840',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#8BA840',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '90%',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    color: 'white',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
  },
  linkText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#8BA840',
    marginTop: 4,
  },
});
