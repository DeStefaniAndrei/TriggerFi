"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ConnectWallet } from "@/components/connect-wallet"

export function Navbar() {
  const pathname = usePathname()

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Create Order", href: "/create-order" },
    { name: "Dashboard", href: "/dashboard" },
  ]

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="font-bold text-xl">TriggerFi</span>
            </Link>

            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={pathname === item.href ? "default" : "ghost"}
                    className={cn(
                      "text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.name}
                  </Button>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <ConnectWallet />
          </div>
        </div>
      </div>
    </nav>
  )
}
