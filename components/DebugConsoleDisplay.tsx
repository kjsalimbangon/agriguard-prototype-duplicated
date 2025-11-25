import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { X, Trash2 } from 'lucide-react-native';
import { DebugLog } from '@/hooks/useDebugConsole';

interface DebugConsoleDisplayProps {
  logs: DebugLog[];
  onClear: () => void;
  onClose: () => void;
}

export function DebugConsoleDisplay({ logs, onClear, onClose }: DebugConsoleDisplayProps) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return '#FF6B6B';
      case 'warn':
        return '#FFD93D';
      case 'info':
        return '#6BCB77';
      case 'log':
      default:
        return '#999';
    }
  };

  const getLevelBgColor = (level: string) => {
    switch (level) {
      case 'error':
        return '#FFE5E5';
      case 'warn':
        return '#FFF9E6';
      case 'info':
        return '#E5F9EC';
      case 'log':
      default:
        return '#F5F5F5';
    }
  };

  if (Platform.OS === 'web') return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Debug Console</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={onClear}
          >
            <Trash2 size={16} color="#8BA840" />
            <Text style={styles.headerButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={onClose}
          >
            <X size={16} color="#8BA840" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.logContainer}
        scrollEnabled={true}
        nestedScrollEnabled={true}
      >
        {logs.length === 0 ? (
          <Text style={styles.emptyText}>No logs yet</Text>
        ) : (
          logs.map((log) => (
            <View 
              key={log.id}
              style={[
                styles.logEntry,
                { backgroundColor: getLevelBgColor(log.level) }
              ]}
            >
              <View style={styles.logHeader}>
                <Text 
                  style={[
                    styles.logLevel,
                    { color: getLevelColor(log.level) }
                  ]}
                >
                  [{log.level.toUpperCase()}]
                </Text>
                <Text style={styles.logTime}>{log.timestamp}</Text>
              </View>
              <Text 
                style={styles.logMessage}
                numberOfLines={3}
              >
                {log.message}
              </Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  headerButtonText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#8BA840',
  },
  logContainer: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  logEntry: {
    marginVertical: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#8BA840',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  logLevel: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
  },
  logTime: {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    color: '#999',
  },
  logMessage: {
    fontFamily: 'Courier New',
    fontSize: 11,
    color: '#333',
    lineHeight: 16,
  },
  emptyText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 20,
  },
});