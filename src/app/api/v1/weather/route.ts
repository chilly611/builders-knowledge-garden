import { NextRequest, NextResponse } from 'next/server';

// Type definitions
interface DayWeather {
  date: string;
  temp_high: number;
  temp_low: number;
  temp_avg: number;
  condition: 'sunny' | 'partly_cloudy' | 'cloudy' | 'light_rain' | 'heavy_rain' | 'thunderstorm' | 'snow' | 'fog' | 'windy';
  wind_speed: number;
  wind_direction: string;
  precipitation_probability: number;
  humidity: number;
  uv_index: number;
  construction_impact: {
    safe_for_concrete: boolean;
    safe_for_crane: boolean;
    safe_for_paint: boolean;
    safe_for_roofing: boolean;
    safe_for_excavation: boolean;
    rain_delay_probability: number;
  };
}

interface WeatherAlert {
  id: string;
  severity: 'low' | 'moderate' | 'high' | 'severe';
  message: string;
  startDate: string;
  endDate: string;
}

interface LocationCoordinates {
  lat: number;
  lng: number;
  city: string;
  state?: string;
  country: string;
}

interface WeatherResponse {
  location: {
    name: string;
    coordinates: LocationCoordinates;
    timezone: string;
  };
  generatedAt: string;
  forecast: DayWeather[];
  alerts: WeatherAlert[];
  cacheInfo: {
    fromCache: boolean;
    expiresAt: string;
  };
}

// Simple in-memory cache
const weatherCache: Map<string, { data: WeatherResponse; expiresAt: number }> = new Map();

// City coordinates database
const CITY_COORDINATES: Record<string, LocationCoordinates> = {
  'new york': {
    lat: 40.7128,
    lng: -74.006,
    city: 'New York',
    state: 'NY',
    country: 'USA',
  },
  'los angeles': {
    lat: 34.0522,
    lng: -118.2437,
    city: 'Los Angeles',
    state: 'CA',
    country: 'USA',
  },
  'chicago': {
    lat: 41.8781,
    lng: -87.6298,
    city: 'Chicago',
    state: 'IL',
    country: 'USA',
  },
  'houston': {
    lat: 29.7604,
    lng: -95.3698,
    city: 'Houston',
    state: 'TX',
    country: 'USA',
  },
  'phoenix': {
    lat: 33.4484,
    lng: -112.074,
    city: 'Phoenix',
    state: 'AZ',
    country: 'USA',
  },
  'denver': {
    lat: 39.7392,
    lng: -104.9903,
    city: 'Denver',
    state: 'CO',
    country: 'USA',
  },
  'seattle': {
    lat: 47.6062,
    lng: -122.3321,
    city: 'Seattle',
    state: 'WA',
    country: 'USA',
  },
  'miami': {
    lat: 25.7617,
    lng: -80.1918,
    city: 'Miami',
    state: 'FL',
    country: 'USA',
  },
  'boston': {
    lat: 42.3601,
    lng: -71.0589,
    city: 'Boston',
    state: 'MA',
    country: 'USA',
  },
  'san francisco': {
    lat: 37.7749,
    lng: -122.4194,
    city: 'San Francisco',
    state: 'CA',
    country: 'USA',
  },
};

// Get current month for seasonal calculations
const getCurrentMonth = (): number => {
  return new Date().getMonth();
};

// Generate realistic seasonal temperatures
const getSeasonalBaseTemp = (lat: number, day: number): { high: number; low: number } => {
  const month = getCurrentMonth();
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000) + day;
  const seasonalCycle = Math.sin((dayOfYear / 365) * Math.PI * 2);

  // Base temp varies by latitude and season
  let baseHigh = 70;
  let baseLow = 50;

  if (lat > 40) {
    // Northern regions - colder
    baseHigh = 60 + seasonalCycle * 20;
    baseLow = 40 + seasonalCycle * 20;
  } else if (lat < 30) {
    // Southern regions - warmer
    baseHigh = 80 + seasonalCycle * 10;
    baseLow = 65 + seasonalCycle * 10;
  } else {
    // Mid regions
    baseHigh = 70 + seasonalCycle * 15;
    baseLow = 50 + seasonalCycle * 15;
  }

  return {
    high: Math.round(baseHigh + (Math.random() - 0.5) * 8),
    low: Math.round(baseLow + (Math.random() - 0.5) * 8),
  };
};

// Generate weather conditions with realistic clustering
const generateWeatherPattern = (lat: number, lng: number, dayIndex: number): string => {
  // High latitude coastal areas get more rain
  const coastalFactor = Math.abs(lng) > 100 ? 0.2 : 0.1;
  const latitudeFactor = Math.abs(lat) > 40 ? 0.15 : 0;
  const rainProbability = 0.3 + coastalFactor + latitudeFactor;

  // Create clusters of weather patterns
  const weatherCluster = Math.floor(Math.random() * 7);
  const randomValue = Math.random();

  // Simulate weather fronts that last 2-3 days
  if (dayIndex % 3 === 0) {
    if (randomValue > 0.7) {
      return 'thunderstorm';
    } else if (randomValue > 0.5) {
      return 'heavy_rain';
    }
  }

  if (randomValue < rainProbability * 0.4) {
    return 'light_rain';
  } else if (randomValue < rainProbability * 0.6) {
    return 'cloudy';
  } else if (randomValue < rainProbability * 0.75) {
    return 'partly_cloudy';
  } else if (randomValue < rainProbability * 0.85) {
    return 'sunny';
  } else if (randomValue < rainProbability * 0.92) {
    return 'fog';
  } else {
    return 'windy';
  }
};

// Calculate construction safety based on conditions
const calculateConstructionSafety = (
  condition: string,
  temp_high: number,
  temp_low: number,
  wind_speed: number,
  precipitation_probability: number
): DayWeather['construction_impact'] => {
  const isFreezing = temp_low <= 32;
  const isVeryHot = temp_high >= 95;
  const isHighWind = wind_speed > 30;
  const isRainy = precipitation_probability > 60;

  return {
    safe_for_concrete: !isFreezing && !isRainy && temp_high >= 50,
    safe_for_crane: !isHighWind && wind_speed <= 35,
    safe_for_paint: temp_high >= 55 && temp_high <= 85 && !isRainy && precipitation_probability < 50,
    safe_for_roofing: !isHighWind && !isRainy && wind_speed < 25,
    safe_for_excavation: !isFreezing && !isRainy && precipitation_probability < 40,
    rain_delay_probability: precipitation_probability > 70 ? 0.8 : precipitation_probability > 40 ? 0.4 : 0.1,
  };
};

// Resolve location from city name or coordinates
const resolveLocation = (locationParam: string | null, lat: string | null, lng: string | null): LocationCoordinates | null => {
  if (lat && lng) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (!isNaN(latitude) && !isNaN(longitude)) {
      // Find nearest city or use generic coordinates
      let nearest = { city: 'Unknown Location', state: undefined as string | undefined, country: 'Unknown' };

      if (latitude > 25 && latitude < 50 && longitude > -130 && longitude < -65) {
        // USA bounds
        nearest.country = 'USA';
        if (latitude < 35) {
          nearest.state = 'South';
        } else if (latitude < 40) {
          nearest.state = 'Central';
        } else {
          nearest.state = 'North';
        }
      }

      return {
        lat: latitude,
        lng: longitude,
        city: nearest.city,
        state: nearest.state,
        country: nearest.country,
      };
    }
  }

  if (locationParam) {
    const normalized = locationParam.toLowerCase().trim();
    const coord = CITY_COORDINATES[normalized];
    if (coord) {
      return coord;
    }

    // Try fuzzy matching
    for (const [key, value] of Object.entries(CITY_COORDINATES)) {
      if (key.includes(normalized) || normalized.includes(key)) {
        return value;
      }
    }
  }

  return null;
};

// Format date as YYYY-MM-DD
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Generate wind direction
const getWindDirection = (seed: number): string => {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.floor(seed % 8)];
};

// Generate forecast for specified number of days
const generateForecast = (location: LocationCoordinates, days: number): DayWeather[] => {
  const forecast: DayWeather[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const forecastDate = new Date(today);
    forecastDate.setDate(today.getDate() + i);
    const dateStr = formatDate(forecastDate);

    const temps = getSeasonalBaseTemp(location.lat, i);
    const condition = generateWeatherPattern(location.lat, location.lng, i) as DayWeather['condition'];

    // Base precipitation probability on condition
    let basePrecipitation = 0;
    if (condition === 'heavy_rain') basePrecipitation = 85;
    else if (condition === 'light_rain') basePrecipitation = 50;
    else if (condition === 'thunderstorm') basePrecipitation = 90;
    else if (condition === 'cloudy') basePrecipitation = 30;
    else if (condition === 'partly_cloudy') basePrecipitation = 15;
    else basePrecipitation = 5;

    const precipitation_probability = Math.max(0, Math.min(100, basePrecipitation + (Math.random() - 0.5) * 20));

    // Wind speed varies by condition
    let baseWind = 8;
    if (condition === 'thunderstorm') baseWind = 25;
    else if (condition === 'windy') baseWind = 28;
    else if (condition === 'heavy_rain') baseWind = 18;
    else if (condition === 'cloudy') baseWind = 12;

    const wind_speed = baseWind + (Math.random() - 0.5) * 6;

    const temp_avg = Math.round((temps.high + temps.low) / 2);
    const humidity = Math.max(30, Math.min(95, 50 + precipitation_probability * 0.3 + (Math.random() - 0.5) * 15));
    const uv_index = condition === 'sunny' ? Math.floor(6 + Math.random() * 4) : Math.floor(2 + Math.random() * 3);

    const constructionImpact = calculateConstructionSafety(
      condition,
      temps.high,
      temps.low,
      wind_speed,
      precipitation_probability
    );

    forecast.push({
      date: dateStr,
      temp_high: temps.high,
      temp_low: temps.low,
      temp_avg,
      condition,
      wind_speed: Math.round(wind_speed * 10) / 10,
      wind_direction: getWindDirection(i * 1357),
      precipitation_probability: Math.round(precipitation_probability),
      humidity: Math.round(humidity),
      uv_index,
      construction_impact: constructionImpact,
    });
  }

  return forecast;
};

// Generate weather alerts if conditions are severe
const generateAlerts = (forecast: DayWeather[]): WeatherAlert[] => {
  const alerts: WeatherAlert[] = [];
  const today = new Date();

  forecast.forEach((day, index) => {
    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() + index);

    // Severe thunderstorm alert
    if (day.condition === 'thunderstorm' && day.wind_speed > 25) {
      alerts.push({
        id: `alert-${index}-thunderstorm`,
        severity: 'high',
        message: 'Severe Thunderstorm Warning: High winds and heavy rain expected. Avoid outdoor construction.',
        startDate: formatDate(dayDate),
        endDate: formatDate(dayDate),
      });
    }

    // Extreme heat alert
    if (day.temp_high >= 95) {
      alerts.push({
        id: `alert-${index}-heat`,
        severity: 'moderate',
        message: 'Heat Advisory: Extreme temperatures. Ensure adequate hydration for construction crews.',
        startDate: formatDate(dayDate),
        endDate: formatDate(dayDate),
      });
    }

    // Extreme cold alert
    if (day.temp_low <= 0) {
      alerts.push({
        id: `alert-${index}-cold`,
        severity: 'high',
        message: 'Winter Storm Warning: Freezing temperatures. Concrete work not recommended.',
        startDate: formatDate(dayDate),
        endDate: formatDate(dayDate),
      });
    }

    // High wind alert
    if (day.wind_speed > 35) {
      alerts.push({
        id: `alert-${index}-wind`,
        severity: 'high',
        message: 'High Wind Warning: Gusts exceed 35 mph. Crane operations suspended.',
        startDate: formatDate(dayDate),
        endDate: formatDate(dayDate),
      });
    }

    // Heavy rain alert
    if (day.condition === 'heavy_rain') {
      alerts.push({
        id: `alert-${index}-rain`,
        severity: 'moderate',
        message: 'Heavy Rain Warning: Significant precipitation expected. Site may become hazardous.',
        startDate: formatDate(dayDate),
        endDate: formatDate(dayDate),
      });
    }
  });

  return alerts;
};

// Main API handler
export async function GET(request: NextRequest): Promise<NextResponse<WeatherResponse | { error: string }>> {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const daysParam = searchParams.get('days');

    // Validate and default parameters
    let days = 7;
    if (daysParam) {
      const parsedDays = parseInt(daysParam, 10);
      if (!isNaN(parsedDays) && parsedDays > 0 && parsedDays <= 14) {
        days = parsedDays;
      }
    }

    // Create cache key
    const cacheKey = `weather-${location || `${lat},${lng}`}-${days}`;

    // Check cache
    const cached = weatherCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json({
        ...cached.data,
        cacheInfo: {
          fromCache: true,
          expiresAt: new Date(cached.expiresAt).toISOString(),
        },
      } as WeatherResponse);
    }

    // Resolve location
    const resolvedLocation = resolveLocation(location, lat, lng);
    if (!resolvedLocation) {
      return NextResponse.json(
        {
          error: 'Location not found. Provide a city name, or valid lat/lng coordinates.',
        },
        { status: 400 }
      );
    }

    // Generate timezone based on longitude
    const timezone = resolvedLocation.lng < -105 ? 'MST' : resolvedLocation.lng < -90 ? 'CST' : resolvedLocation.lng < -75 ? 'EST' : 'PST';

    // Generate forecast
    const forecast = generateForecast(resolvedLocation, days);

    // Generate alerts
    const alerts = generateAlerts(forecast);

    // Create response
    const response: WeatherResponse = {
      location: {
        name: `${resolvedLocation.city}${resolvedLocation.state ? ', ' + resolvedLocation.state : ''}, ${resolvedLocation.country}`,
        coordinates: resolvedLocation,
        timezone,
      },
      generatedAt: new Date().toISOString(),
      forecast,
      alerts,
      cacheInfo: {
        fromCache: false,
        expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour cache
      },
    };

    // Store in cache (1 hour expiration)
    weatherCache.set(cacheKey, {
      data: response,
      expiresAt: Date.now() + 3600000,
    });

    // Clean old cache entries
    for (const [key, value] of weatherCache) {
      if (value.expiresAt <= Date.now()) {
        weatherCache.delete(key);
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error generating weather forecast.',
      },
      { status: 500 }
    );
  }
}

// HEAD request support for cache validation
export async function HEAD(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get('location');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const daysParam = searchParams.get('days');

  let days = 7;
  if (daysParam) {
    const parsedDays = parseInt(daysParam, 10);
    if (!isNaN(parsedDays) && parsedDays > 0 && parsedDays <= 14) {
      days = parsedDays;
    }
  }

  const cacheKey = `weather-${location || `${lat},${lng}`}-${days}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'X-Cache': 'HIT',
      },
    });
  }

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'X-Cache': 'MISS',
    },
  });
}

// OPTIONS for CORS
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
