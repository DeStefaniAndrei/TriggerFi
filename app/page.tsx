import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, TrendingUp, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-16">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent leading-tight pb-2">
            TriggerFi
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Intelligent Limit Orders with Real-World Triggers
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create limit orders that execute based on weather conditions, yield rates, or any external data. 
            The first protocol to bring real-world data to DeFi trading.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/create-order">
            <Button size="lg" className="text-lg px-8">
              Create Order
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="text-lg px-8 bg-transparent">
              View Dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-3 gap-8">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Real-World Triggers</CardTitle>
            <CardDescription>Weather, yield rates, inflation data, and more</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Trade based on ANY external condition - from frost warnings to interest rates. Perfect for hedging and risk management.
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>1inch Integration</CardTitle>
            <CardDescription>Powered by 1inch Limit Order Protocol for secure execution</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Leverage the battle-tested 1inch infrastructure for reliable and efficient order execution.
            </p>
          </CardContent>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <CardTitle>24/7 Monitoring</CardTitle>
            <CardDescription>Watches real-world data and executes automatically</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Our bots monitor weather APIs, Chainlink oracles, and market data round the clock. Orders execute instantly when conditions trigger.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* How It Works */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Create intelligent limit orders with real-world triggers in three simple steps
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center text-2xl font-bold">
              1
            </div>
            <h3 className="text-xl font-semibold">Set Conditions</h3>
            <p className="text-muted-foreground">Choose your trigger: weather data, yield rates, or market conditions</p>
          </div>

          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-500 text-white rounded-full flex items-center justify-center text-2xl font-bold">
              2
            </div>
            <h3 className="text-xl font-semibold">Sign Order</h3>
            <p className="text-muted-foreground">Review and sign your order with your connected wallet</p>
          </div>

          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-purple-500 text-white rounded-full flex items-center justify-center text-2xl font-bold">
              3
            </div>
            <h3 className="text-xl font-semibold">Auto Execute</h3>
            <p className="text-muted-foreground">Order executes automatically when your conditions trigger</p>
          </div>
        </div>
      </section>
    </div>
  );
}
