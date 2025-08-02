"use client";

import { CreateWeatherOrder } from "@/components/create-weather-order";
import { WeatherDashboard } from "@/components/weather-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Weather Trading Page
 * 
 * Main interface for creating and monitoring weather-based orders
 * Demonstrates real-world data integration with DeFi
 */

export default function WeatherTradingPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Weather Trading</h1>
        <p className="text-lg text-muted-foreground">
          Automated trading based on real-world weather conditions. Perfect for agricultural hedging, 
          insurance, and climate risk management.
        </p>
      </div>
      
      {/* Main Content */}
      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="create">Create Order</TabsTrigger>
          <TabsTrigger value="monitor">Monitor Weather</TabsTrigger>
        </TabsList>
        
        <TabsContent value="create" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Order Creation Form */}
            <CreateWeatherOrder />
            
            {/* Use Cases */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Use Cases</h3>
              
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-1">🌾 Agricultural Hedging</h4>
                  <p className="text-sm text-muted-foreground">
                    When frost threatens crops (temp {"<"} 0°C), automatically buy crop insurance tokens 
                    or hedge positions. Protects farmers from $25B+ in annual weather losses.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-1">🏢 Insurance Companies</h4>
                  <p className="text-sm text-muted-foreground">
                    When hurricanes approach (wind {">"} 120 km/h), automatically rebalance portfolios 
                    to liquid assets for claim payouts. Saves millions in emergency liquidation costs.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-1">⚡ Energy Markets</h4>
                  <p className="text-sm text-muted-foreground">
                    When extreme heat hits (temp {">"} 40°C), buy energy tokens before demand spikes. 
                    Capture price movements from increased AC usage.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-1">💧 Water Rights</h4>
                  <p className="text-sm text-muted-foreground">
                    When drought conditions persist (precipitation {"<"} 10mm/month), acquire water 
                    rights tokens. Essential for agricultural operations and municipalities.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">💡 Why Weather Trading Matters</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• $250B+ in annual weather-related economic losses globally</li>
                  <li>• 70% of businesses affected by weather volatility</li>
                  <li>• Only 35% have adequate hedging strategies</li>
                  <li>• TriggerFi enables automated, trustless weather hedging</li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="monitor">
          <WeatherDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}