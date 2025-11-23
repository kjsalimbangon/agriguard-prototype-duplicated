import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import React, { ReactNode } from 'react';

interface QuickActionButtonProps {
  title: string;
  icon: ReactNode;
  onPress: () => void;
}

export function QuickActionButton({ title, icon, onPress }: QuickActionButtonProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.iconContainer}>
        {icon}
      </View>
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    marginBottom: 8,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 40,
  },
  title: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
});