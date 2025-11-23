import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useState } from 'react';
import { Bell, Wifi, ShieldCheck, CircleHelp as HelpCircle, ChevronRight } from 'lucide-react-native';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [autoDetect, setAutoDetect] = useState(true);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>
          Configure your AgriGuard experience
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>General Settings</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Bell size={20} color="#8BA840" style={styles.settingIcon} />
            <Text style={styles.settingLabel}>Notifications</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#d1d1d1', true: '#c5d86d' }}
            thumbColor={notifications ? '#8BA840' : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Wifi size={20} color="#8BA840" style={styles.settingIcon} />
            <Text style={styles.settingLabel}>Auto Sync</Text>
          </View>
          <Switch
            value={autoSync}
            onValueChange={setAutoSync}
            trackColor={{ false: '#d1d1d1', true: '#c5d86d' }}
            thumbColor={autoSync ? '#8BA840' : '#f4f3f4'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <ShieldCheck size={20} color="#8BA840" style={styles.settingIcon} />
            <Text style={styles.settingLabel}>Auto Detection</Text>
          </View>
          <Switch
            value={autoDetect}
            onValueChange={setAutoDetect}
            trackColor={{ false: '#d1d1d1', true: '#c5d86d' }}
            thumbColor={autoDetect ? '#8BA840' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Settings</Text>
        
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Connection Settings</Text>
          </View>
          <ChevronRight size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Camera Preferences</Text>
          </View>
          <ChevronRight size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Storage Management</Text>
          </View>
          <ChevronRight size={20} color="#999" />
        </TouchableOpacity>
      </View>

      

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.settingInfo}>
            <HelpCircle size={20} color="#8BA840" style={styles.settingIcon} />
            <Text style={styles.settingLabel}>Help & Support</Text>
          </View>
          <ChevronRight size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>About AgriGuard</Text>
          </View>
          <ChevronRight size={20} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>Privacy Policy</Text>
          </View>
          <ChevronRight size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <Text style={styles.versionText}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    backgroundColor: 'white',
  },
  headerTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    marginTop: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#333',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  navItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    marginRight: 12,
  },
  settingLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#333',
  },
  versionText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 32,
  },
});