"use client"

import Link from "next/link"
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Button } from "@/components/ui/button"

export function Navbar() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
              TriggerFi
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/create-order"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Create Order
            </Link>
            <Link
              href="/dashboard"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Dashboard
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
          </div>
          <nav className="flex items-center">
            <ConnectButton />
          </nav>
        </div>
      </div>
    </nav>
  )
}
