"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Thermometer, CloudRain, Wind, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

/**
 * Weather Dashboard Component
 * 
 * Shows current weather conditions for monitored locations
 * Helps users understand when their orders might trigger
 */

interface WeatherData {
  location: string;
  temperature: number;
  precipitation: number;
  windSpeed: number;
  lastUpdate: Date;
  trend: "up" | "down" | "stable";
}

// Mock weather data for demo
// In production, this would come from Chainlink Functions or weather API
const mockWeatherData: WeatherData[] = [
  {
    location: "Des Moines, IA",
    temperature: -2, // Below freezing!
    precipitation: 0,
    windSpeed: 15,
    lastUpdate: new Date(),
    trend: "down"
  },
  {
    location: "Miami, FL",
    temperature: 28,
    precipitation: 5,
    windSpeed: 25,
    lastUpdate: new Date(),
    trend: "up"
  },
  {
    location: "Phoenix, AZ",
    temperature: 42,
    precipitation: 0,
    windSpeed: 10,
    lastUpdate: new Date(),
    trend: "stable"
  },
  {
    location: "Chicago, IL",
    temperature: -5,
    precipitation: 10,
    windSpeed: 30,
    lastUpdate: new Date(),
    trend: "down"
  }
];

export function WeatherDashboard() {
  const [weatherData, setWeatherData] = useState<WeatherData[]>(mockWeatherData);
  const [isLoading, setIsLoading] = useState(false);
  
  // Simulate weather updates
  useEffect(() => {
    const interval = setInterval(() => {
      setWeatherData(prevData => 
        prevData.map(data => ({
          ...data,
          temperature: data.temperature + (Math.random() - 0.5) * 2,
          lastUpdate: new Date()
        }))
      );
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  const getTempColor = (temp: number) => {
    if (temp <= 0) return "text-blue-600";
    if (temp >= 30) return "text-red-600";
    return "text-green-600";
  };
  
  const getTempIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-red-500" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-blue-500" />;
    return null;
  };
  
  const getAlertBadge = (temp: number) => {
    if (temp <= 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Frost Alert
        </Badge>
      );
    }
    if (temp >= 40) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Heat Alert
        </Badge>
      );
    }
    return null;
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Live Weather Conditions</h2>
        <p className="text-muted-foreground">
          Real-time weather data from monitored locations. Orders trigger when conditions are met.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        {weatherData.map((data) => (
          <Card key={data.location}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{data.location}</CardTitle>
                {getAlertBadge(data.temperature)}
              </div>
              <CardDescription>
                Last updated: {data.lastUpdate.toLocaleTimeString()}
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Thermometer className="h-4 w-4" />
                    Temperature
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${getTempColor(data.temperature)}`}>
                      {data.temperature.toFixed(1)}°C
                    </span>
                    {getTempIcon(data.trend)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {(data.temperature * 9/5 + 32).toFixed(1)}°F
                  </p>
                </div>
                
                {/* Precipitation */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CloudRain className="h-4 w-4" />
                    Precipitation
                  </div>
                  <div>
                    <span className="text-2xl font-bold">
                      {data.precipitation}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">mm</span>
                  </div>
                </div>
                
                {/* Wind Speed */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wind className="h-4 w-4" />
                    Wind Speed
                  </div>
                  <div>
                    <span className="text-2xl font-bold">
                      {data.windSpeed}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">km/h</span>
                  </div>
                </div>
              </div>
              
              {/* Alert Messages */}
              {data.temperature <= 0 && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Freezing conditions detected. Frost protection orders may trigger.
                  </p>
                </div>
              )}
              
              {data.temperature >= 40 && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Extreme heat detected. Drought protection orders may trigger.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Economic Impact Card */}
      <Card>
        <CardHeader>
          <CardTitle>Economic Impact of Weather Trading</CardTitle>
          <CardDescription>
            How TriggerFi helps protect against weather-related losses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Agricultural Losses</p>
              <p className="text-2xl font-bold">$25B</p>
              <p className="text-xs text-muted-foreground">Annual crop losses from weather</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Insurance Gap</p>
              <p className="text-2xl font-bold">65%</p>
              <p className="text-xs text-muted-foreground">Farmers without adequate coverage</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Potential Savings</p>
              <p className="text-2xl font-bold">$10B+</p>
              <p className="text-xs text-muted-foreground">With automated hedging</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}