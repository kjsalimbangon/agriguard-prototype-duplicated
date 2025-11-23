import { Platform } from 'react-native';

// Conditionally import SQLite only for native platforms
let SQLite: any = null;
if (Platform.OS !== 'web') {
  SQLite = require('expo-sqlite');
}

export interface PestDetection {
  id?: number;
  pestType: string;
  confidence: number;
  timestamp: string;
  location?: string;
  imageUri?: string;
  notes?: string;
}

export interface PestSpecies {
  id?: number;
  name: string;
  scientificName: string;
  description: string;
  symptoms: string;
  treatment: string;
  imageUri?: string;
  pesticideImageUri?: string;
  dangerLevel: 'low' | 'medium' | 'high';
}

export interface UserPreference {
  id?: number;
  key: string;
  value: string;
}

class DatabaseManager {
  private db: any = null;

  async initialize(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // For web platform, use a mock implementation
        console.log('Database initialized (web mock)');
        return;
      }

      if (!SQLite) {
        throw new Error('SQLite module not available');
      }

      this.db = await SQLite.openDatabaseAsync('agriguard.db');
      await this.createTables();
      await this.seedPestData();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      // Don't throw error for web platform to prevent app crashes
      if (Platform.OS !== 'web') {
        throw error;
      }
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db || Platform.OS === 'web') return;

    // Create pest_detections table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS pest_detections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pest_type TEXT NOT NULL,
        confidence REAL NOT NULL,
        timestamp TEXT NOT NULL,
        location TEXT,
        image_uri TEXT,
        notes TEXT
      );
    `);

    // Create pest_species table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS pest_species (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        scientific_name TEXT,
        description TEXT,
        symptoms TEXT,
        treatment TEXT,
        image_uri TEXT,
        pesticide_image_uri TEXT,
        danger_level TEXT DEFAULT 'medium'
      );
    `);

    // Create user_preferences table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL
      );
    `);

    // Create indexes for better performance
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_pest_detections_timestamp 
      ON pest_detections(timestamp);
    `);

    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_pest_detections_type 
      ON pest_detections(pest_type);
    `);

    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_pest_species_name 
      ON pest_species(name);
    `);
  }

  private async seedPestData(): Promise<void> {
    if (!this.db || Platform.OS === 'web') return;

    const pestSpecies: Omit<PestSpecies, 'id'>[] = [
      {
        name: 'Golden Apple Snail',
        scientificName: 'Pomacea canaliculata',
        description: 'Large freshwater snails that feed on young rice plants and seedlings, causing significant damage to rice crops',
        symptoms: 'Missing rice seedlings, irregular holes in leaves, pink egg masses on plants, visible snails in water',
        treatment: 'PESTICIDE: Apply molluscicides like metaldehyde or iron phosphate baits around field edges. MANUAL: Hand-picking snails during early morning, install copper barriers, drain fields periodically, use duck predators. LOCAL STORES: Available at agricultural supply stores like Ramgo, Agricom, or local farm cooperatives',
        imageUri: 'https://newsecuritybeat-org.s3.amazonaws.com/uploads/2021/05/APPLE-SNAIL-FOR-BLOG-584x430.jpg',
        dangerLevel: 'high',
        pesticideImageUri: 'https://www.pestcontrolphilippines.com/cdn/shop/products/Bayonet_1200x1200.jpg?v=1610094463'
      },
      {
        name: 'Rice Field Rat',
        scientificName: 'Rattus argentiventer',
        description: 'Small rodents that damage rice crops by eating grains, cutting stems, and creating burrows in field embankments',
        symptoms: 'Cut rice stems at base, missing grains, burrow holes in field banks, rat droppings, damaged seedbeds',
        treatment: 'PESTICIDE: Use rodenticides like bromadiolone, Racumin,  or TROPP Rodenticide in bait stations. MANUAL: Install rat guards, use snap traps, maintain clean field surroundings, community-wide trapping programs, barn owl boxes. LOCAL STORES: Hardware stores like Ace Hardware, True Value, or agricultural centers',
        imageUri: 'https://cdn.britannica.com/26/65326-050-53232216/Norway-rat.jpg',
        dangerLevel: 'high',
        pesticideImageUri: 'https://www.pestcontrolphilippines.com/cdn/shop/products/racuminpaste_480x.jpg?v=1678795855'
      },
      {
        name: 'Rice Black Bug',
        scientificName: 'Scotinophara lurida',
        description: 'Dark-colored bugs that suck plant juices from rice stems and leaves, causing yellowing and stunted growth',
        symptoms: 'Yellowing of rice plants, stunted growth, bronze-colored leaves, visible black bugs on plants, reduced grain filling',
        treatment: 'PESTICIDE: Apply insecticides like imidacloprid, thiamethoxam, or cypermethrin during early infestation. MANUAL: Use light traps at night, sweep nets for collection, maintain field hygiene, biological control with spiders. LOCAL STORES: Agricultural supply stores, plant nurseries, or online agricultural retailers',
        imageUri: 'https://www.lsuagcenter.com/~/media/system/4/4/9/0/44905786674c92a2bd77b2be0d8f534b/blackricebug6.jpg?h=1058&la=en&w=1410',
        dangerLevel: 'medium',
        pesticideImageUri: 'https://www.pestcontrolphilippines.com/cdn/shop/products/maxforce_480x.jpg?v=1595397096'
      },
      {
        name: 'Grasshoppers',
        scientificName: 'Locusta migratoria',
        description: 'Jumping insects that feed on rice leaves and stems, capable of causing severe defoliation during outbreaks',
        symptoms: 'Chewed leaf edges, defoliation, visible grasshoppers jumping in field, damaged rice panicles, reduced plant vigor',
        treatment: 'PESTICIDE: Use contact insecticides like malathion, carbaryl, or pyrethroids during nymph stage. MANUAL: Early morning collection when sluggish, use sweep nets, encourage natural predators like birds, maintain field borders. LOCAL STORES: Garden centers, farm supply stores like Wilcon Depot garden section, or specialized pest control suppliers',
        imageUri: 'https://www.cleggs.com/wp-content/uploads/2014/09/Guide-to-Grasshoppers.jpg',
        dangerLevel: 'medium',
        pesticideImageUri: 'https://www.pestcontrolphilippines.com/cdn/shop/products/sevin_480x.jpg?v=1612364203'
      }
    ];

    for (const pest of pestSpecies) {
      try {
        await this.db.runAsync(
          `INSERT OR IGNORE INTO pest_species 
           (name, scientific_name, description, symptoms, treatment, image_uri, pesticide_image_uri, danger_level) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [pest.name, pest.scientificName, pest.description, pest.symptoms, pest.treatment, pest.imageUri, pest.pesticideImageUri, pest.dangerLevel]
        );
      } catch (error) {
        console.log(`Pest ${pest.name} already exists or error occurred:`, error);
      }
    }
  }

  // Pest Detection CRUD operations
  async addPestDetection(detection: Omit<PestDetection, 'id'>): Promise<number> {
    if (Platform.OS === 'web') {
      // For web, store in localStorage to persist data
      const storedDetections = localStorage.getItem('agriguard_mock_detections');
      let detections = [];
      
      if (storedDetections) {
        try {
          detections = JSON.parse(storedDetections);
        } catch (error) {
          console.error('Error parsing stored detections:', error);
          detections = [];
        }
      }
      
      const newDetection = {
        id: Date.now() + Math.random(),
        ...detection
      };
      
      detections.unshift(newDetection); // Add to beginning
      localStorage.setItem('agriguard_mock_detections', JSON.stringify(detections));
      
      console.log('Added pest detection to localStorage:', newDetection);
      return newDetection.id;
    }

    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.runAsync(
      `INSERT INTO pest_detections (pest_type, confidence, timestamp, location, image_uri, notes) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [detection.pestType, detection.confidence, detection.timestamp, detection.location, detection.imageUri, detection.notes]
    );

    return result.lastInsertRowId;
  }

  async getPestDetections(limit: number = 50): Promise<PestDetection[]> {
    if (Platform.OS === 'web') {
      // For web, try to get data from localStorage if available
      const storedDetections = localStorage.getItem('agriguard_mock_detections');
      if (storedDetections) {
        try {
          const detections = JSON.parse(storedDetections);
          return detections.slice(0, limit).map((d: any) => ({
            id: d.id,
            pestType: d.pestType,
            confidence: d.confidence,
            timestamp: d.timestamp,
            location: d.location,
            imageUri: d.imageUri,
            notes: d.notes
          }));
        } catch (error) {
          console.error('Error parsing stored detections:', error);
        }
      }
      return [];
    }

    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      `SELECT * FROM pest_detections ORDER BY timestamp DESC LIMIT ?`,
      [limit]
    );

    return result.map((row: any) => ({
      id: row.id,
      pestType: row.pest_type,
      confidence: row.confidence,
      timestamp: row.timestamp,
      location: row.location,
      imageUri: row.image_uri,
      notes: row.notes
    }));
  }

  async getPestDetectionsByType(pestType: string): Promise<PestDetection[]> {
    if (Platform.OS === 'web') {
      return [];
    }

    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      `SELECT * FROM pest_detections WHERE pest_type = ? ORDER BY timestamp DESC`,
      [pestType]
    );

    return result.map((row: any) => ({
      id: row.id,
      pestType: row.pest_type,
      confidence: row.confidence,
      timestamp: row.timestamp,
      location: row.location,
      imageUri: row.image_uri,
      notes: row.notes
    }));
  }

  async deletePestDetection(id: number): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Mock: Deleted pest detection', id);
      return;
    }

    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(`DELETE FROM pest_detections WHERE id = ?`, [id]);
  }

  // Pest Species CRUD operations
  async getPestSpecies(): Promise<PestSpecies[]> {
    if (Platform.OS === 'web') {
      // Return mock data for web
      return [
        {
          id: 1,
          name: 'Golden Apple Snail',
          scientificName: 'Pomacea canaliculata',
          description: 'Large freshwater snails that feed on young rice plants and seedlings, causing significant damage to rice crops',
          symptoms: 'Missing rice seedlings, irregular holes in leaves, pink egg masses on plants, visible snails in water',
          treatment: 'PESTICIDE: Apply molluscicides like metaldehyde or iron phosphate baits around field edges. MANUAL: Hand-picking snails during early morning, install copper barriers, drain fields periodically, use duck predators. LOCAL STORES: Available at agricultural supply stores like Ramgo, Agricom, or local farm cooperatives',
          imageUri: 'https://images.pexels.com/photos/7828011/pexels-photo-7828011.jpeg',
          pesticideImageUri: 'https://www.pestcontrolphilippines.com/cdn/shop/products/Bayonet_1200x1200.jpg?v=1610094463',
          dangerLevel: 'high'
        },
        {
          id: 2,
          name: 'Rice Field Rat',
          scientificName: 'Rattus argentiventer',
          description: 'Small rodents that damage rice crops by eating grains, cutting stems, and creating burrows in field embankments',
          symptoms: 'Cut rice stems at base, missing grains, burrow holes in field banks, rat droppings, damaged seedbeds',
          treatment: 'PESTICIDE: Use rodenticides like bromadiolone or warfarin in bait stations. MANUAL: Install rat guards, use snap traps, maintain clean field surroundings, community-wide trapping programs, barn owl boxes. LOCAL STORES: Hardware stores like Ace Hardware, True Value, or agricultural centers',
          imageUri: 'https://images.pexels.com/photos/8142977/pexels-photo-8142977.jpeg',
          pesticideImageUri: 'https://www.pestcontrolphilippines.com/cdn/shop/products/racuminpaste_480x.jpg?v=1678795855',
          dangerLevel: 'high'
        },
        {
          id: 3,
          name: 'Rice Black Bug',
          scientificName: 'Scotinophara lurida',
          description: 'Dark-colored bugs that suck plant juices from rice stems and leaves, causing yellowing and stunted growth',
          symptoms: 'Yellowing of rice plants, stunted growth, bronze-colored leaves, visible black bugs on plants, reduced grain filling',
          treatment: 'PESTICIDE: Apply insecticides like imidacloprid, thiamethoxam, or cypermethoxam during early infestation. MANUAL: Use light traps at night, sweep nets for collection, maintain field hygiene, biological control with spiders. LOCAL STORES: Agricultural supply stores, plant nurseries, or online agricultural retailers',
          imageUri: 'https://images.pexels.com/photos/7828012/pexels-photo-7828012.jpeg',
          pesticideImageUri: 'https://www.pestcontrolphilippines.com/cdn/shop/products/maxforce_480x.jpg?v=1595397096',
          dangerLevel: 'medium'
        },
        {
          id: 4,
          name: 'Grasshoppers',
          scientificName: 'Locusta migratoria',
          description: 'Jumping insects that feed on rice leaves and stems, capable of causing severe defoliation during outbreaks',
          symptoms: 'Chewed leaf edges, defoliation, visible grasshoppers jumping in field, damaged rice panicles, reduced plant vigor',
          treatment: 'PESTICIDE: Use contact insecticides like malathion, carbaryl, or pyrethroids during nymph stage. MANUAL: Early morning collection when sluggish, use sweep nets, encourage natural predators like birds, maintain field borders. LOCAL STORES: Garden centers, farm supply stores like Wilcon Depot garden section, or specialized pest control suppliers',
          imageUri: 'https://images.pexels.com/photos/7828013/pexels-photo-7828013.jpeg',
          pesticideImageUri: 'https://www.pestcontrolphilippines.com/cdn/shop/products/sevin_480x.jpg?v=1612364203',
          dangerLevel: 'medium'
        }
      ];
    }

    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(`SELECT * FROM pest_species ORDER BY name`);

    return result.map((row: any) => ({
      id: row.id,
      name: row.name,
      scientificName: row.scientific_name,
      description: row.description,
      symptoms: row.symptoms,
      treatment: row.treatment,
      imageUri: row.image_uri,
      pesticideImageUri: row.pesticide_image_uri,
      dangerLevel: row.danger_level
    }));
  }

  async getPestSpeciesByName(name: string): Promise<PestSpecies | null> {
    if (Platform.OS === 'web') {
      const mockSpecies = await this.getPestSpecies();
      return mockSpecies.find(species => species.name === name) || null;
    }

    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      `SELECT * FROM pest_species WHERE name = ?`,
      [name]
    );

    if (!result) return null;

    return {
      id: result.id,
      name: result.name,
      scientificName: result.scientific_name,
      description: result.description,
      symptoms: result.symptoms,
      treatment: result.treatment,
      imageUri: result.image_uri,
      pesticideImageUri: result.pesticide_image_uri,
      dangerLevel: result.danger_level
    };
  }

  // User Preferences CRUD operations
  async setUserPreference(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(`agriguard_${key}`, value);
      return;
    }

    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT OR REPLACE INTO user_preferences (key, value) VALUES (?, ?)`,
      [key, value]
    );
  }

  async getUserPreference(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(`agriguard_${key}`);
    }

    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getFirstAsync(
      `SELECT value FROM user_preferences WHERE key = ?`,
      [key]
    );

    return result ? result.value : null;
  }

  // Analytics and Statistics
  async getDetectionStats(): Promise<{
    totalDetections: number;
    todayDetections: number;
    mostCommonPest: string;
    averageConfidence: number;
  }> {
    if (Platform.OS === 'web') {
      // For web, try to get data from localStorage if available
      const storedDetections = localStorage.getItem('agriguard_mock_detections');
      if (storedDetections) {
        try {
          const detections = JSON.parse(storedDetections);
          const today = new Date().toISOString().split('T')[0];
          const todayDetections = detections.filter((d: any) => 
            d.timestamp.startsWith(today)
          ).length;
          
          // Calculate most common pest
          const pestCounts: { [key: string]: number } = {};
          detections.forEach((d: any) => {
            pestCounts[d.pestType] = (pestCounts[d.pestType] || 0) + 1;
          });
          
          const mostCommon = Object.keys(pestCounts).reduce((a, b) => 
            pestCounts[a] > pestCounts[b] ? a : b, 'None'
          );
          
          const avgConfidence = detections.reduce((sum: number, d: any) => 
            sum + d.confidence, 0) / detections.length;
          
          return {
            totalDetections: detections.length,
            todayDetections,
            mostCommonPest: mostCommon,
            averageConfidence: Math.round(avgConfidence)
          };
        } catch (error) {
          console.error('Error parsing stored detections:', error);
        }
      }
      
      return {
        totalDetections: 0,
        todayDetections: 0,
        mostCommonPest: 'None',
        averageConfidence: 0
      };
    }

    if (!this.db) throw new Error('Database not initialized');

    const today = new Date().toISOString().split('T')[0];

    const totalResult = await this.db.getFirstAsync(
      `SELECT COUNT(*) as count FROM pest_detections`
    );

    const todayResult = await this.db.getFirstAsync(
      `SELECT COUNT(*) as count FROM pest_detections WHERE date(timestamp) = ?`,
      [today]
    );

    const mostCommonResult = await this.db.getFirstAsync(
      `SELECT pest_type, COUNT(*) as count FROM pest_detections 
       GROUP BY pest_type ORDER BY count DESC LIMIT 1`
    );

    const avgConfidenceResult = await this.db.getFirstAsync(
      `SELECT AVG(confidence) as avg FROM pest_detections`
    );

    return {
      totalDetections: totalResult?.count || 0,
      todayDetections: todayResult?.count || 0,
      mostCommonPest: mostCommonResult?.pest_type || 'None',
      averageConfidence: avgConfidenceResult?.avg || 0
    };
  }
}

export const databaseManager = new DatabaseManager();