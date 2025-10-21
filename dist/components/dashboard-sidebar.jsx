"use client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Play, Layout, ImageIcon, Settings, Users, BarChart3, HelpCircle, LogOut, Home, Zap, CreditCard, } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "My Videos", href: "/dashboard/videos", icon: Play },
    { name: "Templates", href: "/dashboard/templates", icon: Layout },
    { name: "Media Library", href: "/dashboard/media", icon: ImageIcon },
    { name: "AI Studio", href: "/dashboard/ai", icon: Sparkles, badge: "New" },
    { name: "Collaboration", href: "/dashboard/collaborate", icon: Users },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
];
const bottomNavigation = [
    { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
    { name: "Help & Support", href: "/dashboard/help", icon: HelpCircle },
];
export function DashboardSidebar() {
    const pathname = usePathname();
    return (<div className="flex flex-col w-64 bg-sidebar border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-2 p-6 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <Sparkles className="h-5 w-5 text-sidebar-primary-foreground"/>
        </div>
        <span className="font-heading text-lg font-bold text-sidebar-foreground">ForgeVid</span>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src="/diverse-user-avatars.png"/>
            <AvatarFallback>JD</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">John Doe</p>
            <p className="text-xs text-sidebar-foreground/70 truncate">Pro Plan</p>
          </div>
          <Badge variant="secondary" className="text-xs">
            <Zap className="h-3 w-3 mr-1"/>
            Pro
          </Badge>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (<Link key={item.name} href={item.href} className={cn("flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors", isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50")}>
              <item.icon className="h-4 w-4"/>
              <span className="flex-1">{item.name}</span>
              {item.badge && (<Badge variant="secondary" className="text-xs">
                  {item.badge}
                </Badge>)}
            </Link>);
        })}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-4 border-t border-sidebar-border space-y-1">
        {bottomNavigation.map((item) => (<Link key={item.name} href={item.href} className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
            <item.icon className="h-4 w-4"/>
            <span>{item.name}</span>
          </Link>))}

        <Button variant="ghost" className="w-full justify-start gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50">
          <LogOut className="h-4 w-4"/>
          <span>Sign Out</span>
        </Button>
      </div>
    </div>);
}
