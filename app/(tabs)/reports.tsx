import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { ChartBar as BarChart2, Calendar, Download, Filter, TrendingUp, Bug } from 'lucide-react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ReportCard } from '@/components/ReportCard';
import { usePestDetection } from '@/hooks/usePestDetection';
import { useEffect, useState } from 'react';

export default function ReportsScreen() {
  const { stats, detectionHistory, refreshData, isLoading } = usePestDetection();
  const [recentDetections, setRecentDetections] = useState(0);
  const [weeklyReports, setWeeklyReports] = useState<any[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<any[]>([]);

  // Refresh data when component mounts or becomes focused
  useEffect(() => {
    refreshData();
    
    // Set up periodic refresh every 5 seconds (same as dashboard)
    const refreshInterval = setInterval(() => {
      refreshData();
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, [refreshData]);

  useEffect(() => {
    // Calculate recent detections (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recent = detectionHistory.filter(detection => 
      new Date(detection.timestamp) > weekAgo
    ).length;
    
    setRecentDetections(recent);

    // Generate reports based on actual detection data
    // For now, keep empty until we have real data
    // In the future, you can generate reports from detectionHistory
    if (detectionHistory.length > 0) {
      // TODO: Generate weekly and monthly reports from detectionHistory
      // This is where you would process the detection data into report format
      setWeeklyReports([]);
      setMonthlyReports([]);
    }
  }, [detectionHistory]);

  const generateReportHtml = (stats: any, detectionHistory: any[]) => {
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>AgriGuard Pest Detection Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #8BA840;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo {
              color: #8BA840;
              font-size: 28px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .report-info {
              color: #666;
              font-size: 14px;
            }
            .stats-grid {
              display: flex;
              justify-content: space-around;
              margin-bottom: 30px;
            }
            .stat-card {
              text-align: center;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 8px;
              min-width: 120px;
            }
            .stat-number {
              font-size: 24px;
              font-weight: bold;
              color: #8BA840;
              margin-bottom: 5px;
            }
            .stat-label {
              font-size: 12px;
              color: #666;
            }
            .insights {
              background-color: #f9f9f9;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
            }
            .insights h3 {
              color: #8BA840;
              margin-top: 0;
            }
            .insight-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
            }
            .insight-label {
              font-weight: bold;
            }
            .history-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .history-table th,
            .history-table td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            .history-table th {
              background-color: #8BA840;
              color: white;
              font-weight: bold;
            }
            .history-table tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .confidence-high {
              color: #4CAF50;
              font-weight: bold;
            }
            .confidence-medium {
              color: #F2C94C;
              font-weight: bold;
            }
            .confidence-low {
              color: #FF6B6B;
              font-weight: bold;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">AGRIGUARD</div>
            <div class="report-info">
              <h2>Pest Detection Report</h2>
              <p>Generated on ${currentDate} at ${currentTime}</p>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${stats.totalDetections}</div>
              <div class="stat-label">Total Detections</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${recentDetections}</div>
              <div class="stat-label">This Week</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.todayDetections}</div>
              <div class="stat-label">Today</div>
            </div>
          </div>

          <div class="insights">
            <h3>Detection Insights</h3>
            <div class="insight-row">
              <span class="insight-label">Most Common Pest:</span>
              <span>${stats.totalDetections > 0 ? stats.mostCommonPest : 'None detected'}</span>
            </div>
            <div class="insight-row">
              <span class="insight-label">Average Confidence:</span>
              <span>${stats.totalDetections > 0 ? `${stats.averageConfidence.toFixed(1)}%` : 'N/A'}</span>
            </div>
            <div class="insight-row">
              <span class="insight-label">Detection Rate:</span>
              <span>${stats.totalDetections > 0 
                ? `${((stats.todayDetections / stats.totalDetections) * 100).toFixed(1)}% today`
                : 'No detections yet'
              }</span>
            </div>
          </div>

          <h3>Detection History</h3>
          ${detectionHistory.length > 0 ? `
            <table class="history-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Pest Type</th>
                  <th>Confidence</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${detectionHistory.slice(0, 20).map(detection => {
                  const date = new Date(detection.timestamp);
                  const confidenceClass = detection.confidence >= 90 ? 'confidence-high' : 
                                        detection.confidence >= 75 ? 'confidence-medium' : 'confidence-low';
                  return `
                    <tr>
                      <td>${date.toLocaleDateString()} ${date.toLocaleTimeString()}</td>
                      <td>${detection.pestType}</td>
                      <td class="${confidenceClass}">${detection.confidence}%</td>
                      <td>${detection.notes || 'N/A'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          ` : `
            <p style="text-align: center; color: #666; font-style: italic;">
              No detection history available yet. Start scanning to generate reports.
            </p>
          `}

          <div class="footer">
            <p>This report was generated by AgriGuard - AI-Powered Rice Pest Detection System</p>
            <p>For support, contact: support@agriguard.com</p>
          </div>
        </body>
      </html>
    `;
  };

  const handleExportPdf = async () => {
    try {
      Alert.alert(
        'Generating Report',
        'Please wait while we generate your PDF report...',
        [{ text: 'OK' }]
      );

      // Generate HTML content
      const htmlContent = generateReportHtml(stats, detectionHistory);

      // Create PDF from HTML
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      // Share the PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Export AgriGuard Report',
          UTI: 'com.adobe.pdf',
        });
        
        Alert.alert(
          'Export Successful',
          'Your pest detection report has been exported successfully!',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Export Complete',
          'PDF report has been generated and saved.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Failed to export PDF:', error);
      Alert.alert(
        'Export Failed',
        'There was an error generating the PDF report. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading reports data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pest Detection Reports</Text>
        <Text style={styles.headerSubtitle}>
          Track your pest detection history and treatment results
        </Text>
      </View>

      <View style={styles.statsOverview}>
        <View style={styles.statCard}>
          <Bug size={24} color="#8BA840" />
          <Text style={styles.statNumber}>{stats.totalDetections}</Text>
          <Text style={styles.statLabel}>Total detections</Text>
        </View>
        <View style={styles.statCard}>
          <TrendingUp size={24} color="#F2C94C" />
          <Text style={styles.statNumber}>{recentDetections}</Text>
          <Text style={styles.statLabel}>This week</Text>
        </View>
        <View style={styles.statCard}>
          <BarChart2 size={24} color="#FF6B6B" />
          <Text style={styles.statNumber}>{stats.todayDetections}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
      </View>

      <View style={styles.insightsCard}>
        <Text style={styles.insightsTitle}>Detection Insights</Text>
        <View style={styles.insightRow}>
          <Text style={styles.insightLabel}>Most Common Pest:</Text>
          <Text style={styles.insightValue}>
            {stats.totalDetections > 0 ? stats.mostCommonPest : 'None detected'}
          </Text>
        </View>
        <View style={styles.insightRow}>
          <Text style={styles.insightLabel}>Average Confidence:</Text>
          <Text style={styles.insightValue}>
            {stats.totalDetections > 0 ? `${stats.averageConfidence.toFixed(1)}%` : 'N/A'}
          </Text>
        </View>
        <View style={styles.insightRow}>
          <Text style={styles.insightLabel}>Detection Rate:</Text>
          <Text style={styles.insightValue}>
            {stats.totalDetections > 0 
              ? `${((stats.todayDetections / stats.totalDetections) * 100).toFixed(1)}% today`
              : 'No detections yet'
            }
          </Text>
        </View>
      </View>

      <View style={styles.filters}>
        <TouchableOpacity style={styles.filterButton}>
          <Calendar size={16} color="#8BA840" />
          <Text style={styles.filterText}>Date Range</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={16} color="#8BA840" />
          <Text style={styles.filterText}>Filter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Weekly Reports</Text>
          {weeklyReports.length > 0 && (
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {weeklyReports.length > 0 ? (
          weeklyReports.map(report => (
            <ReportCard 
              key={report.id}
              title={report.title}
              date={report.date}
              detections={report.detections}
              treatments={report.treatments}
            />
          ))
        ) : (
          <View style={styles.emptyReports}>
            <Text style={styles.emptyReportsText}>No weekly reports yet</Text>
            <Text style={styles.emptyReportsSubtext}>Reports will be generated after pest detections</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Monthly Reports</Text>
          {monthlyReports.length > 0 && (
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          )}
        </View>

        {monthlyReports.length > 0 ? (
          monthlyReports.map(report => (
            <ReportCard 
              key={report.id}
              title={report.title}
              date={report.date}
              detections={report.detections}
              treatments={report.treatments}
            />
          ))
        ) : (
          <View style={styles.emptyReports}>
            <Text style={styles.emptyReportsText}>No monthly reports yet</Text>
            <Text style={styles.emptyReportsSubtext}>Reports will be generated after pest detections</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.exportButton} onPress={handleExportPdf}>
        <Download size={20} color="white" />
        <Text style={styles.exportButtonText}>Export All Reports</Text>
      </TouchableOpacity>
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
  statsOverview: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    width: '31%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontFamily: 'Poppins-Bold',
    fontSize: 24,
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  insightsCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  insightsTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#666',
  },
  insightValue: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    color: '#333',
  },
  filters: {
    flexDirection: 'row',
    padding: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  filterText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8BA840',
    marginLeft: 8,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#333',
  },
  viewAllButton: {
    padding: 4,
  },
  viewAllText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#8BA840',
  },
  exportButton: {
    backgroundColor: '#8BA840',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    margin: 16,
    marginTop: 32,
    marginBottom: 40,
  },
  exportButtonText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: 'white',
    marginLeft: 8,
  },
  emptyReports: {
    alignItems: 'center',
    padding: 32,
  },
  emptyReportsText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptyReportsSubtext: {
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
    color: '#666',
  },
});