'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

// Type definitions
interface WeatherData {
  day: string;
  date: Date;
  tempHigh: number;
  tempLow: number;
  condition: string;
  windSpeed: number;
  precipProbability: number;
  humidity: number;
}

interface ActivityThreshold {
  name: string;
  minTemp?: number;
  maxTemp?: number;
  maxWind?: number;
  maxPrecip?: number;
  maxHumidity?: number;
  noRain?: boolean;
}

interface ImpactAssessment {
  day: string;
  status: 'clear' | 'monitor' | 'delay' | 'nowork';
  affectedActivities: string[];
  recommendations: string[];
}

interface HistoricalEntry {
  date: Date;
  tempHigh: number;
  tempLow: number;
  condition: string;
  actualImpact: string;
}

interface ScheduledTask {
  id: string;
  name: string;
  activity: string;
  scheduledDate: Date;
  duration: number;
  dailyOverhead: number;
}

const WeatherImpact: React.FC = () => {
  // State management
  const [location, setLocation] = useState<string>('Denver, CO');
  const [isCelsius, setIsCelsius] = useState<boolean>(false);
  const [weatherData, setWeatherData] = useState<WeatherData[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalEntry[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'forecast' | 'calendar' | 'history'>('forecast');
  const [severity, setSeverity] = useState<'none' | 'watch' | 'warning'>('none');

  // Activity thresholds
  const activityThresholds: Record<string, ActivityThreshold> = {
    'Concrete Pour': {
      name: 'Concrete Pour',
      minTemp: 40,
      maxPrecip: 0,
      noRain: true,
    },
    'Crane Operations': {
      name: 'Crane Operations',
      maxWind: 25,
    },
    'Exterior Paint': {
      name: 'Exterior Paint',
      minTemp: 50,
      maxHumidity: 85,
      noRain: true,
    },
    'Roofing': {
      name: 'Roofing',
      maxWind: 20,
      noRain: true,
    },
    'Excavation': {
      name: 'Excavation',
      maxPrecip: 0.3,
    },
  };

  // Generate mock weather data
  const generateMockWeather = (locationName: string): WeatherData[] => {
    const data: WeatherData[] = [];
    const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Thunderstorm', 'Drizzle'];

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      const conditionIndex = Math.floor(Math.random() * conditions.length);
      const condition = conditions[conditionIndex];
      const precipChance = condition.includes('Rain') || condition.includes('Thunder') || condition.includes('Drizzle')
        ? 60 + Math.random() * 40
        : Math.random() * 30;

      data.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date,
        tempHigh: 55 + Math.floor(Math.random() * 20),
        tempLow: 40 + Math.floor(Math.random() * 15),
        condition,
        windSpeed: 5 + Math.random() * 20,
        precipProbability: precipChance,
        humidity: 40 + Math.random() * 45,
      });
    }

    return data;
  };

  // Generate mock historical data
  const generateMockHistory = (): HistoricalEntry[] => {
    const data: HistoricalEntry[] = [];
    const conditions = ['Clear', 'Cloudy', 'Rainy', 'Thunderstorm', 'Drizzle'];
    const impacts = ['No Impact', 'Minor Delay', 'Major Delay', 'Work Halted'];

    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      data.push({
        date,
        tempHigh: 50 + Math.floor(Math.random() * 25),
        tempLow: 35 + Math.floor(Math.random() * 20),
        condition: conditions[Math.floor(Math.random() * conditions.length)],
        actualImpact: impacts[Math.floor(Math.random() * impacts.length)],
      });
    }

    return data;
  };

  // Generate mock scheduled tasks
  const generateMockTasks = (): ScheduledTask[] => {
    const activities = Object.keys(activityThresholds);
    const tasks: ScheduledTask[] = [];

    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() + Math.floor(Math.random() * 7));

      tasks.push({
        id: `task-${i}`,
        name: `Activity ${i + 1}`,
        activity: activities[Math.floor(Math.random() * activities.length)],
        scheduledDate: date,
        duration: 1 + Math.floor(Math.random() * 3),
        dailyOverhead: 5000 + Math.random() * 5000,
      });
    }

    return tasks;
  };

  // Initialize data on mount
  useEffect(() => {
    setIsLoading(true);
    const weather = generateMockWeather(location);
    const history = generateMockHistory();
    const tasks = generateMockTasks();

    setWeatherData(weather);
    setHistoricalData(history);
    setScheduledTasks(tasks);

    // Simulate checking for severe weather
    const hasThunderstorm = weather.some(w => w.condition.includes('Thunder'));
    setSeverity(hasThunderstorm ? 'watch' : 'none');

    setIsLoading(false);
  }, [location]);

  // Assess weather impact for each day
  const impactAssessments = useMemo(() => {
    return weatherData.map(weather => {
      const assessments: ImpactAssessment = {
        day: weather.day,
        status: 'clear',
        affectedActivities: [],
        recommendations: [],
      };

      // Check each activity against threshold
      Object.entries(activityThresholds).forEach(([actName, threshold]) => {
        let isAffected = false;

        if (threshold.noRain && weather.precipProbability > 20) {
          isAffected = true;
        }
        if (threshold.minTemp && weather.tempHigh < threshold.minTemp) {
          isAffected = true;
        }
        if (threshold.maxTemp && weather.tempHigh > threshold.maxTemp) {
          isAffected = true;
        }
        if (threshold.maxWind && weather.windSpeed > threshold.maxWind) {
          isAffected = true;
        }
        if (threshold.maxPrecip && weather.precipProbability > threshold.maxPrecip * 100) {
          isAffected = true;
        }
        if (threshold.maxHumidity && weather.humidity > threshold.maxHumidity) {
          isAffected = true;
        }

        if (isAffected) {
          assessments.affectedActivities.push(actName);
        }
      });

      // Determine status based on affected activities
      if (assessments.affectedActivities.length === 0) {
        assessments.status = 'clear';
      } else if (assessments.affectedActivities.length <= 2) {
        assessments.status = 'monitor';
      } else if (assessments.affectedActivities.length <= 4) {
        assessments.status = 'delay';
      } else {
        assessments.status = 'nowork';
      }

      // Generate recommendations
      if (assessments.affectedActivities.includes('Concrete Pour') && weather.precipProbability > 20) {
        assessments.recommendations.push('Reschedule concrete pour - rain predicted');
      }
      if (assessments.affectedActivities.includes('Roofing') && weather.windSpeed > 20) {
        assessments.recommendations.push('High winds expected - postpone roofing work');
      }
      if (assessments.affectedActivities.includes('Exterior Paint') && weather.humidity > 85) {
        assessments.recommendations.push('High humidity may prevent paint curing');
      }

      return assessments;
    });
  }, [weatherData]);

  // Calculate cost impact
  const costImpact = useMemo(() => {
    let totalCost = 0;

    scheduledTasks.forEach(task => {
      const impact = impactAssessments.find(
        a => a.day === task.scheduledDate.toLocaleDateString('en-US', { weekday: 'short' })
      );

      if (impact && impact.status !== 'clear') {
        const delayCost = (impact.status === 'nowork' ? 1 : 0.5) * task.dailyOverhead * task.duration;
        totalCost += delayCost;
      }
    });

    return totalCost;
  }, [scheduledTasks, impactAssessments]);

  // Convert temperature
  const convertTemp = (fahrenheit: number): number => {
    return isCelsius ? Math.round(((fahrenheit - 32) * 5) / 9) : fahrenheit;
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'clear':
        return '#1D9E75';
      case 'monitor':
        return '#D85A30';
      case 'delay':
        return '#E8443A';
      case 'nowork':
        return '#E8443A';
      default:
        return '#378ADD';
    }
  };

  // Get status label
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'clear':
        return 'Clear to Work';
      case 'monitor':
        return 'Monitor';
      case 'delay':
        return 'Delay Risk';
      case 'nowork':
        return 'No Work';
      default:
        return 'Unknown';
    }
  };

  // Render severity banner
  const renderSeverityBanner = () => {
    if (severity === 'none') return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        style={{
          backgroundColor: severity === 'warning' ? '#E8443A' : '#D85A30',
          color: 'white',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: 'Archivo',
        }}
      >
        <span style={{ fontSize: '20px' }}>⚠️</span>
        <div>
          <div style={{ fontWeight: 'bold' }}>
            {severity === 'warning' ? 'Severe Weather Warning' : 'Weather Watch in Effect'}
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>
            {severity === 'warning'
              ? 'Severe weather conditions expected - work halts recommended'
              : 'Monitor conditions - potential weather impacts on schedule'}
          </div>
        </div>
      </motion.div>
    );
  };

  // Render forecast view
  const renderForecastView = () => {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {weatherData.map((weather, idx) => {
            const impact = impactAssessments[idx];
            const statusColor = getStatusColor(impact.status);

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => setSelectedDay(weather.day)}
                style={{
                  backgroundColor: selectedDay === weather.day ? '#f0f0f0' : 'white',
                  border: `2px solid ${selectedDay === weather.day ? statusColor : '#e0e0e0'}`,
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              >
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontFamily: 'Archivo' }}>
                  {weather.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'Archivo Black' }}>
                  {weather.day}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', fontFamily: 'Archivo' }}>
                  {convertTemp(weather.tempHigh)}°{isCelsius ? 'C' : 'F'}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', fontFamily: 'Archivo' }}>
                  {weather.condition}
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '12px', fontFamily: 'Archivo' }}>
                  💨 {Math.round(weather.windSpeed)} mph
                </div>
                <div style={{ fontSize: '11px', color: '#999', marginBottom: '12px', fontFamily: 'Archivo' }}>
                  💧 {Math.round(weather.precipProbability)}%
                </div>
                <div
                  style={{
                    backgroundColor: statusColor,
                    color: 'white',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    fontFamily: 'Archivo',
                  }}
                >
                  {getStatusLabel(impact.status)}
                </div>
              </motion.div>
            );
          })}
        </div>

        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              backgroundColor: '#f9f9f9',
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              padding: '20px',
              marginTop: '20px',
            }}
          >
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', fontFamily: 'Archivo Black' }}>
              {selectedDay} Detailed Analysis
            </div>

            {impactAssessments
              .filter(a => a.day === selectedDay)
              .map((impact, idx) => (
                <div key={idx}>
                  {impact.affectedActivities.length > 0 ? (
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#666', fontFamily: 'Archivo' }}>
                        Affected Activities:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                        {impact.affectedActivities.map((act, i) => (
                          <span
                            key={i}
                            style={{
                              backgroundColor: '#FFE8E8',
                              color: '#E8443A',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontFamily: 'Archivo',
                            }}
                          >
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '14px', color: '#1D9E75', marginBottom: '16px', fontFamily: 'Archivo' }}>
                      ✓ All activities can proceed as scheduled
                    </div>
                  )}

                  {impact.recommendations.length > 0 && (
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#666', fontFamily: 'Archivo' }}>
                        Recommendations:
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontFamily: 'Archivo' }}>
                        {impact.recommendations.map((rec, i) => (
                          <li key={i} style={{ fontSize: '13px', marginBottom: '6px', color: '#333' }}>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
          </motion.div>
        )}
      </div>
    );
  };

  // Render calendar view
  const renderCalendarView = () => {
    const tasksByDay = new Map<string, ScheduledTask[]>();

    scheduledTasks.forEach(task => {
      const dayKey = task.scheduledDate.toLocaleDateString('en-US', { weekday: 'short' });
      if (!tasksByDay.has(dayKey)) {
        tasksByDay.set(dayKey, []);
      }
      tasksByDay.get(dayKey)!.push(task);
    });

    return (
      <div style={{ display: 'grid', gap: '16px' }}>
        {weatherData.map((weather, idx) => {
          const impact = impactAssessments[idx];
          const statusColor = getStatusColor(impact.status);
          const tasks = tasksByDay.get(weather.day) || [];

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              style={{
                backgroundColor: 'white',
                border: `2px solid ${statusColor}`,
                borderRadius: '12px',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: '120px 1fr auto',
                gap: '16px',
                alignItems: 'start',
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'Archivo Black' }}>
                  {weather.day}
                </div>
                <div style={{ fontSize: '12px', color: '#666', fontFamily: 'Archivo' }}>
                  {weather.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    backgroundColor: statusColor,
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    fontFamily: 'Archivo',
                  }}
                >
                  {getStatusLabel(impact.status)}
                </div>
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                {tasks.length > 0 ? (
                  tasks.map(task => (
                    <div
                      key={task.id}
                      style={{
                        backgroundColor: impact.status === 'clear' ? '#f0fff4' : '#fff5f5',
                        border: `1px solid ${impact.affectedActivities.includes(task.activity) ? '#E8443A' : '#1D9E75'}`,
                        borderRadius: '6px',
                        padding: '10px 12px',
                        fontSize: '13px',
                        fontFamily: 'Archivo',
                      }}
                    >
                      <div style={{ fontWeight: 'bold' }}>{task.name}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {task.activity} • {task.duration} day{task.duration > 1 ? 's' : ''}
                      </div>
                      {impact.affectedActivities.includes(task.activity) && (
                        <div style={{ fontSize: '11px', color: '#E8443A', marginTop: '4px', fontWeight: 'bold' }}>
                          ⚠️ Activity at risk
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '13px', color: '#999', fontStyle: 'italic', fontFamily: 'Archivo' }}>
                    No tasks scheduled
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'right', fontSize: '12px', color: '#666', fontFamily: 'Archivo' }}>
                <div>{convertTemp(weather.tempHigh)}°</div>
                <div>{Math.round(weather.precipProbability)}% rain</div>
                <div>{Math.round(weather.windSpeed)} mph wind</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Render history view
  const renderHistoryView = () => {
    return (
      <div style={{ display: 'grid', gap: '2px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '140px 80px 100px 120px',
            gap: '12px',
            padding: '12px',
            backgroundColor: '#f0f0f0',
            borderRadius: '8px 8px 0 0',
            fontWeight: 'bold',
            fontSize: '12px',
            fontFamily: 'Archivo Black',
          }}
        >
          <div>Date</div>
          <div>High/Low</div>
          <div>Condition</div>
          <div>Impact</div>
        </div>

        {historicalData.map((entry, idx) => {
          const impactColor =
            entry.actualImpact === 'No Impact'
              ? '#1D9E75'
              : entry.actualImpact === 'Minor Delay'
              ? '#D85A30'
              : '#E8443A';

          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (Math.min(idx, 10) * 0.03) }}
              style={{
                display: 'grid',
                gridTemplateColumns: '140px 80px 100px 120px',
                gap: '12px',
                padding: '12px',
                backgroundColor: idx % 2 === 0 ? 'white' : '#f9f9f9',
                borderBottom: '1px solid #e0e0e0',
                fontSize: '12px',
                fontFamily: 'Archivo',
              }}
            >
              <div>{entry.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              <div>
                {convertTemp(entry.tempHigh)}° / {convertTemp(entry.tempLow)}°
              </div>
              <div>{entry.condition}</div>
              <div
                style={{
                  backgroundColor: impactColor,
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}
              >
                {entry.actualImpact}
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px', fontFamily: 'Archivo Black', color: '#1D1D1D' }}>
          Weather Impact Automation
        </h1>
        <p style={{ fontSize: '14px', color: '#666', fontFamily: 'Archivo' }}>
          AI-powered weather analysis for construction scheduling
        </p>
      </div>

      {/* Severity Banner */}
      {renderSeverityBanner()}

      {/* Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto auto auto 1fr auto', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
        <div>
          <label style={{ fontSize: '12px', color: '#666', fontFamily: 'Archivo', display: 'block', marginBottom: '6px' }}>
            Location
          </label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'Archivo',
              minWidth: '140px',
            }}
          />
        </div>

        <button
          onClick={() => setIsCelsius(!isCelsius)}
          style={{
            padding: '8px 16px',
            backgroundColor: isCelsius ? '#378ADD' : '#e0e0e0',
            color: isCelsius ? 'white' : '#333',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            fontFamily: 'Archivo',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            if (!isCelsius) (e.target as HTMLButtonElement).style.backgroundColor = '#d0d0d0';
          }}
          onMouseLeave={e => {
            if (!isCelsius) (e.target as HTMLButtonElement).style.backgroundColor = '#e0e0e0';
          }}
        >
          {isCelsius ? '°C' : '°F'}
        </button>

        <div style={{ display: 'flex', gap: '8px' }}>
          {['forecast', 'calendar', 'history'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              style={{
                padding: '8px 14px',
                backgroundColor: viewMode === mode ? '#1D9E75' : '#e0e0e0',
                color: viewMode === mode ? 'white' : '#333',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                fontFamily: 'Archivo',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s ease',
              }}
            >
              {mode}
            </button>
          ))}
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: '#999', fontFamily: 'Archivo' }}>
            Last updated
          </div>
          <div style={{ fontSize: '12px', color: '#666', fontFamily: 'Archivo', fontWeight: 'bold' }}>
            {lastRefresh.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Cost Impact Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          backgroundColor: '#fff5f5',
          border: '1px solid #FFD5D5',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          fontFamily: 'Archivo',
        }}
      >
        <div style={{ fontSize: '24px' }}>💰</div>
        <div>
          <div style={{ fontSize: '13px', color: '#666' }}>Projected Weather Impact Cost</div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#E8443A' }}>
            ${costImpact.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
        </div>
      </motion.div>

      {/* View Content */}
      <div>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999', fontFamily: 'Archivo' }}>
            Loading weather data...
          </div>
        ) : viewMode === 'forecast' ? (
          renderForecastView()
        ) : viewMode === 'calendar' ? (
          renderCalendarView()
        ) : (
          renderHistoryView()
        )}
      </div>

      {/* Auto-refresh indicator */}
      <motion.div
        animate={{ opacity: [0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ fontSize: '12px', color: '#999', marginTop: '20px', textAlign: 'center', fontFamily: 'Archivo' }}
      >
        🔄 Auto-refresh in 5 minutes
      </motion.div>
    </div>
  );
};

export default WeatherImpact;
