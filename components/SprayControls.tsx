import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Droplets, Play, Square, Timer } from 'lucide-react-native';
import { useMQTT } from '@/hooks/useMQTT';
import { SprayCommand } from '@/services/MQTTService';

export function SprayControls() {
  const { isConnected, sendSprayCommand } = useMQTT();
  const [duration, setDuration] = useState('30');
  const [intensity, setIntensity] = useState('5');
  const [isLoading, setIsLoading] = useState(false);

  const handleSprayCommand = async (action: 'start' | 'stop') => {
    if (!isConnected) {
      Alert.alert('Error', 'Device not connected. Please check your connection.');
      return;
    }

    setIsLoading(true);

    const command: SprayCommand = {
      action,
      pestType: 'Manual Control'
    };

    try {
      const success = await sendSprayCommand(command);
      if (success) {
        Alert.alert(
          'Command Sent',
          `${action === 'start' ? 'Start' : 'Stop'} spray command sent successfully.`
        );
      } else {
        Alert.alert('Error', 'Failed to send command. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while sending the command.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manual Spray Control</Text>
      
      <View style={styles.controlsRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Duration (seconds)</Text>
          <View style={styles.inputContainer}>
            <Timer size={16} color="#8BA840" />
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              keyboardType="numeric"
              placeholder="30"
            />
          </View>
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Intensity (1-10)</Text>
          <View style={styles.inputContainer}>
            <Droplets size={16} color="#8BA840" />
            <TextInput
              style={styles.input}
              value={intensity}
              onChangeText={setIntensity}
              keyboardType="numeric"
              placeholder="5"
            />
          </View>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.button,
            styles.startButton,
            (!isConnected || isLoading) && styles.disabledButton
          ]}
          onPress={() => handleSprayCommand('start')}
          disabled={!isConnected || isLoading}
        >
          <Play size={20} color="white" />
          <Text style={styles.buttonText}>Start Spray</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.button,
            styles.stopButton,
            (!isConnected || isLoading) && styles.disabledButton
          ]}
          onPress={() => handleSprayCommand('stop')}
          disabled={!isConnected || isLoading}
        >
          <Square size={20} color="white" />
          <Text style={styles.buttonText}>Stop Spray</Text>
        </TouchableOpacity>
      </View>

      {!isConnected && (
        <Text style={styles.warningText}>
          Device not connected. Check your MQTT connection.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
    marginHorizontal: 4,
  },
  label: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: 'white',
    marginLeft: 8,
  },
  warningText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 8,
  },
});