# AgriGuard - AI-Powered Rice Pest Detection App

AgriGuard is a React Native Expo application designed to help rice farmers detect and manage pests using AI-powered image recognition technology.

## Features

### 🤖 AI-Powered Pest Detection
- **TensorFlow JS Integration**: On-device AI model for real-time pest detection
- **Rice-Specific Pests**: Detects 4 critical rice pests:
  - Golden Apple Snail
  - Rice Field Rat
  - Rice Black Bug
  - Grasshoppers

### 📱 Core Functionality
- **Real-time Camera Detection**: Live pest detection through device camera
- **Continuous Scanning**: Automated monitoring with notifications
- **Detection History**: Track and review past detections
- **Treatment Recommendations**: AI-powered treatment suggestions
- **Schedule Management**: Set up monitoring schedules with duplicate prevention

### 📊 Analytics & Reporting
- **Detection Statistics**: Track detection rates and trends
- **Comprehensive Reports**: Weekly and monthly pest activity reports
- **Data Visualization**: Charts and insights for better decision making

## Technology Stack

### Frontend
- **React Native**: Cross-platform mobile development
- **Expo**: Development platform and toolchain
- **TypeScript**: Type-safe JavaScript development
- **Lucide React Native**: Modern icon library

### AI & Machine Learning
- **Custom Pest Detection Model**: Trained specifically for rice pests

### Data Management
- **SQLite**: Local database for offline data storage
- **Expo SQLite**: React Native SQLite integration
- **Context API**: State management for schedules and settings

### UI/UX
- **Custom Components**: Reusable UI components
- **Responsive Design**: Optimized for various screen sizes
- **Intuitive Navigation**: Tab-based navigation with stack screens

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agriguard-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

## TensorFlow Lite Integration

### Model Requirements
The app expects a TensorFlow Lite model that can detect the following rice pests:
- Golden Apple Snail (Pomacea canaliculata)
- Rice Field Rat (Rattus argentiventer)
- Rice Black Bug (Scotinophara lurida)
- Grasshoppers (Locusta migratoria)

### Model Specifications
- **Input Size**: 224×224×3 (RGB images)
- **Output**: 4 classes (one for each pest type)
- **Format**: TensorFlow Lite (.tflite) or TensorFlow.js format
- **Confidence Threshold**: 90% (configurable)

### Adding Your Own Model
1. Place your trained model file in the `assets/models/` directory
2. Update the model path in `services/model.json`
3. Adjust the `PEST_CLASSES` array if needed
4. Configure input size and threshold in `MODEL_CONFIG`

## Project Structure

```
agriguard-app/
├── app/                          # Expo Router pages
│   ├── (tabs)/                   # Tab navigation screens
│   │   ├── index.tsx            # Dashboard
│   │   ├── detect.tsx           # Camera detection
│   │   ├── schedule.tsx         # Schedule management
│   │   ├── reports.tsx          # Analytics & reports
│   │   └── settings.tsx         # App settings
│   ├── schedule/
│   │   └── setup.tsx            # Schedule creation/editing
│   └── _layout.tsx              # Root layout
├── components/                   # Reusable UI components
├── services/                     # Business logic services
│   ├── MQTTService.ts            # MQTT service
│   ├── NotificationService.ts    # Notification service
│   ├── PestDetectionService.ts  # Main detection service & TFJS integration
│   └── ScheduleMonitoringService.ts # Schedule Monitoring service
├── database/                     # Data management
│   └── DatabaseManager.ts       # SQLite operations
├── context/                      # React Context providers
├── hooks/                        # Custom React hooks
└── assets/                       # Static assets
```

## Key Components

### TensorFlowLiteService
Handles on-device AI model loading and inference:
- Model initialization and loading
- Image preprocessing
- Inference execution
- Result post-processing
- Memory management

### PestDetectionService
Main service for pest detection functionality:
- Integrates TensorFlow Lite service
- Manages detection history
- Handles continuous scanning
- Provides fallback to mock detection

### DatabaseManager
Manages local data storage:
- Pest detection records
- Pest species information
- User preferences
- Analytics data

## Configuration

### AI Model Settings 
Configure AI model parameters in `services/TensorFlowLiteService.ts`:
```typescript
private readonly MODEL_CONFIG = {
  inputSize: 224,        // Input image size
  threshold: 0.7,        // Confidence threshold
};
```

### Detection Settings
Adjust detection behavior in `services/PestDetectionService.ts`:
- Continuous scanning intervals
- Detection probability
- Callback management

## Development

### Running the App
```bash
# Start development server
npm run dev

# Build for Android
npm run build:android

# Build for production
npm run build:android:prod
```

### Testing
The app includes comprehensive testing for:
- AI model integration
- Database operations
- UI components
- Detection workflows

## Deployment

### Android
1. Configure signing keys in `eas.json`
2. Build APK: `npm run build:android`
3. Deploy to Google Play Store or distribute directly

### iOS
1. Configure Apple Developer account
2. Build IPA using EAS Build
3. Deploy to App Store or TestFlight

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## Acknowledgments

- TensorFlow team for TensorFlow Lite
- Expo team for the development platform
- React Native community for components and tools
- Agricultural research institutions for pest identification data
