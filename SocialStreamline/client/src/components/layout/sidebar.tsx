import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Home, 
  PenSquare, 
  Hash, 
  Bookmark, 
  User, 
  Settings,
  Moon,
  Sun,
  Menu,
  X,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { Tag } from "@shared/schema";

export function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const { theme, setTheme } = useTheme();
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(false);
  
  // Query for tags
  const { data: tags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
    enabled: !!user,
  });
  
  // Toggle sidebar on mobile
  const toggleSidebar = () => {
    setExpanded(!expanded);
  };
  
  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      ? name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "U";
  };
  
  // Logout handler
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Toggle theme handler
  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };
  
  const isActive = (path: string) => {
    return location === path;
  };
  
  return (
    <>
      {/* Mobile menu toggle */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          className="h-9 w-9 rounded-full"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Sidebar overlay for mobile */}
      {expanded && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-40 h-full w-64 border-r bg-card transition-transform md:translate-x-0",
        expanded ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo and close button (mobile) */}
          <div className="flex items-center justify-between h-14 border-b px-4 py-2">
            <Link href="/">
              <h1 className="text-xl font-bold text-primary cursor-pointer">ThreadsApp</h1>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="md:hidden"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Navigation links */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              <NavItem 
                href="/" 
                icon={<Home className="w-4 h-4 mr-2" />}
                label="Home"
                isActive={isActive("/")} 
              />
              
              <NavItem 
                href="/create" 
                icon={<PenSquare className="w-4 h-4 mr-2" />}
                label="Create Thread"
                isActive={isActive("/create")} 
              />
              
              <NavItem 
                href="/collections" 
                icon={<Bookmark className="w-4 h-4 mr-2" />}
                label="My Collections"
                isActive={isActive("/collections")} 
              />
              
              {user && (
                <NavItem 
                  href={`/profile/${user.username}`}
                  icon={<User className="w-4 h-4 mr-2" />}
                  label="My Profile"
                  isActive={isActive(`/profile/${user.username}`)} 
                />
              )}
              
              {/* Tags section */}
              {user && tags && tags.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Popular Tags
                  </h3>
                  <div className="space-y-1">
                    {tags.slice(0, 10).map((tag) => (
                      <NavItem 
                        key={tag.id}
                        href={`/?tag=${tag.name}`}
                        icon={<Hash className="w-4 h-4 mr-2" />}
                        label={tag.name}
                        isActive={location === `/?tag=${tag.name}`} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </nav>
          </ScrollArea>
          
          {/* Bottom section with user and theme toggle */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between">
              {user ? (
                <div className="flex items-center">
                  <Avatar className="h-7 w-7 mr-2">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(user.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm font-medium truncate max-w-[120px]">
                    {user.displayName}
                  </div>
                </div>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link href="/auth">Sign In</Link>
                </Button>
              )}
              
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleTheme}
                  className="h-8 w-8"
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
                
                {user && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleLogout}
                    className="h-8 w-8 text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavItem({ 
  href, 
  icon, 
  label, 
  isActive 
}: { 
  href: string; 
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}) {
  return (
    <Link href={href}>
      <Button 
        variant={isActive ? "secondary" : "ghost"} 
        className={cn(
          "w-full justify-start font-normal",
          isActive ? "bg-secondary/80" : ""
        )}
      >
        {icon}
        <span>{label}</span>
      </Button>
    </Link>
  );
}
