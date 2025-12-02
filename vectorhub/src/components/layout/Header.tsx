"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Bell, ChevronRight, Moon, Sun, Search, Check, Trash2, Layers, FileText, Database, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

// Route to breadcrumb label mapping
const routeLabels: Record<string, string> = {
    "": "Dashboard",
    connections: "Connections",
    collections: "Collections",
    documents: "Documents",
    upload: "Upload",
    search: "Search",
    settings: "Settings",
};

function Breadcrumbs() {
    const pathname = usePathname();
    const segments = pathname.split("/").filter(Boolean);

    const breadcrumbs = segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const label = routeLabels[segment] || segment;
        const isLast = index === segments.length - 1;

        return { href, label, isLast };
    });

    // Always include home/dashboard
    if (breadcrumbs.length === 0) {
        breadcrumbs.push({ href: "/", label: "Dashboard", isLast: true });
    }

    return (
        <nav className="flex items-center space-x-1 text-sm">
            <Link
                href="/"
                className={cn(
                    "transition-colors hover:text-foreground",
                    breadcrumbs.length === 1 && breadcrumbs[0].href === "/"
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                )}
            >
                Dashboard
            </Link>
            {breadcrumbs.map(
                (crumb) =>
                    crumb.href !== "/" && (
                        <div key={crumb.href} className="flex items-center">
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            <Link
                                href={crumb.href}
                                className={cn(
                                    "ml-1 transition-colors hover:text-foreground",
                                    crumb.isLast
                                        ? "text-foreground font-medium"
                                        : "text-muted-foreground"
                                )}
                            >
                                {crumb.label}
                            </Link>
                        </div>
                    )
            )}
        </nav>
    );
}

function ThemeToggle() {
    const { theme, setTheme } = useTheme();

    const toggleTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    return (
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={toggleTheme}>
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    );
}

interface Notification {
    id: string;
    title: string;
    description: string;
    time: string;
    read: boolean;
    icon: "collection" | "document" | "connection" | "search";
}

const mockNotifications: Notification[] = [
    {
        id: "1",
        title: "Collection created",
        description: "product_embeddings is ready to use",
        time: "2 min ago",
        read: false,
        icon: "collection",
    },
    {
        id: "2",
        title: "Documents indexed",
        description: "150 documents added successfully",
        time: "15 min ago",
        read: false,
        icon: "document",
    },
    {
        id: "3",
        title: "Connection synced",
        description: "Pinecone Prod is up to date",
        time: "1 hour ago",
        read: true,
        icon: "connection",
    },
    {
        id: "4",
        title: "Search completed",
        description: 'Query "AI assistants" returned 12 results',
        time: "2 hours ago",
        read: true,
        icon: "search",
    },
];

function NotificationIcon({ type }: { type: Notification["icon"] }) {
    const iconClass = "h-4 w-4";
    switch (type) {
        case "collection":
            return <Layers className={iconClass} />;
        case "document":
            return <FileText className={iconClass} />;
        case "connection":
            return <Database className={iconClass} />;
        case "search":
            return <Zap className={iconClass} />;
    }
}

function NotificationsDropdown() {
    const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
    const unreadCount = notifications.filter((n) => !n.read).length;

    const markAllRead = () => {
        setNotifications(notifications.map((n) => ({ ...n, read: true })));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    const markAsRead = (id: string) => {
        setNotifications(
            notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-medium text-primary-foreground flex items-center justify-center">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Notifications</span>
                    {notifications.length > 0 && (
                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={markAllRead}
                            >
                                <Check className="h-3 w-3 mr-1" />
                                Mark all read
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-destructive hover:text-destructive"
                                onClick={clearAll}
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </div>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                        <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">No notifications</p>
                    </div>
                ) : (
                    <ScrollArea className="h-[300px]">
                        {notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={cn(
                                    "flex items-start gap-3 p-3 cursor-pointer",
                                    !notification.read && "bg-muted/50"
                                )}
                                onClick={() => markAsRead(notification.id)}
                            >
                                <div
                                    className={cn(
                                        "h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                                        notification.read
                                            ? "bg-muted text-muted-foreground"
                                            : "bg-primary/10 text-primary"
                                    )}
                                >
                                    <NotificationIcon type={notification.icon} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p
                                        className={cn(
                                            "text-sm truncate",
                                            !notification.read && "font-medium"
                                        )}
                                    >
                                        {notification.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {notification.description}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        {notification.time}
                                    </p>
                                </div>
                                {!notification.read && (
                                    <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                                )}
                            </DropdownMenuItem>
                        ))}
                    </ScrollArea>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/layout/Sidebar";
import { Menu } from "lucide-react";

function MobileNav() {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden mr-2">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r-0">
                <SidebarContent onNavigate={() => setOpen(false)} className="w-full border-r-0" />
            </SheetContent>
        </Sheet>
    );
}

export function Header() {
    return (
        <header className="flex h-14 items-center justify-between border-b bg-card/50 backdrop-blur-sm px-4 md:px-6 sticky top-0 z-40">
            <div className="flex items-center">
                <MobileNav />
                <Breadcrumbs />
            </div>
            <div className="flex items-center space-x-2">
                <Link href="/search">
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Search className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </Link>
                <NotificationsDropdown />
                <ThemeToggle />
            </div>
        </header>
    );
}
