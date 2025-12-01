"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Database,
    Layers,
    Files,
    Upload,
    Search,
    Settings,
    Zap,
    LogOut,
    User,
    Key,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
    { href: "/", icon: Zap, label: "Dashboard" },
    { href: "/connections", icon: Database, label: "Connections" },
    { href: "/collections", icon: Layers, label: "Collections" },
    { href: "/documents", icon: Files, label: "Documents" },
    { href: "/upload", icon: Upload, label: "Upload" },
    { href: "/search", icon: Search, label: "Search" },
];

const bottomNavItems = [
    { href: "/integrations", icon: Key, label: "Integrations" },
    { href: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname.startsWith(href);
    };

    return (
        <div className="flex h-full w-64 flex-col border-r bg-card/50 backdrop-blur-sm">
            {/* Logo */}
            <div className="flex h-14 items-center border-b px-4">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="relative">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
                            <Zap className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary to-primary/60 blur-lg opacity-40 group-hover:opacity-60 transition-opacity" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">
                        Vector<span className="text-primary">Hub</span>
                    </span>
                </Link>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 space-y-1 p-3">
                <div className="mb-2">
                    <span className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Main
                    </span>
                </div>
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link key={item.href} href={item.href}>
                            <motion.div
                                className={cn(
                                    "relative flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                    active
                                        ? "text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                                whileHover={{ x: 2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {active && (
                                    <motion.div
                                        layoutId="sidebar-active"
                                        className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/20"
                                        initial={false}
                                        transition={{
                                            type: "spring",
                                            stiffness: 350,
                                            damping: 30,
                                        }}
                                    />
                                )}
                                <item.icon
                                    className={cn(
                                        "relative mr-3 h-4 w-4",
                                        active && "text-primary"
                                    )}
                                />
                                <span className="relative">{item.label}</span>
                            </motion.div>
                        </Link>
                    );
                })}

                <div className="mt-6 mb-2">
                    <span className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        System
                    </span>
                </div>
                {bottomNavItems.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link key={item.href} href={item.href}>
                            <motion.div
                                className={cn(
                                    "relative flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                    active
                                        ? "text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                                whileHover={{ x: 2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {active && (
                                    <motion.div
                                        layoutId="sidebar-active-bottom"
                                        className="absolute inset-0 rounded-lg bg-primary/10 border border-primary/20"
                                        initial={false}
                                        transition={{
                                            type: "spring",
                                            stiffness: 350,
                                            damping: 30,
                                        }}
                                    />
                                )}
                                <item.icon
                                    className={cn(
                                        "relative mr-3 h-4 w-4",
                                        active && "text-primary"
                                    )}
                                />
                                <span className="relative">{item.label}</span>
                            </motion.div>
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile */}
            <div className="border-t p-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 h-auto py-3 px-3"
                        >
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/10">
                                <User className="h-4 w-4 text-primary" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-sm font-medium">Admin User</span>
                                <span className="text-xs text-muted-foreground">
                                    admin@vectorhub.io
                                </span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <User className="mr-2 h-4 w-4" />
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive">
                            <LogOut className="mr-2 h-4 w-4" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
