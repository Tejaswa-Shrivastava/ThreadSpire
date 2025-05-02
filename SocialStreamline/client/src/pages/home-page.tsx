import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ThreadWithDetails, Tag } from "@shared/schema";
import { ThreadCard } from "@/components/thread-card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const [location] = useLocation();
  const [selectedTab, setSelectedTab] = useState<string>("latest");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Parse URL for tag filter and search query
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1]);
    const tagParam = params.get("tag");
    const searchParam = params.get("search");
    
    if (tagParam) {
      setActiveFilters([tagParam]);
    }
    
    if (searchParam) {
      setSearchQuery(searchParam);
    }
  }, [location]);
  
  // Fetch threads
  const { data: threads, isLoading: threadsLoading } = useQuery<ThreadWithDetails[]>({
    queryKey: ["/api/threads"],
  });
  
  // Fetch tags
  const { data: tags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });
  
  // Filter threads based on selected filters and search query
  const filteredThreads = threads?.filter(thread => {
    // Filter by tags if active
    const matchesTags = activeFilters.length === 0 || 
      thread.tags.some(tag => activeFilters.includes(tag.name));
    
    // Filter by search query if present
    const matchesSearch = !searchQuery ||
      thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.segments.some(segment => 
        segment.content.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    return matchesTags && matchesSearch;
  });
  
  // Sort threads based on selected tab
  const sortedThreads = filteredThreads ? [...filteredThreads] : [];
  
  if (selectedTab === "latest") {
    sortedThreads.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } else if (selectedTab === "popular") {
    // Sort by reaction count
    sortedThreads.sort((a, b) => b.reactions.length - a.reactions.length);
  }
  
  // Handle adding filter
  const addFilter = (tag: string) => {
    if (!activeFilters.includes(tag)) {
      setActiveFilters([...activeFilters, tag]);
    }
  };
  
  // Handle removing filter
  const removeFilter = (tag: string) => {
    setActiveFilters(activeFilters.filter(t => t !== tag));
  };
  
  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Update URL with search query
    window.history.pushState(
      {}, 
      "", 
      searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : "/"
    );
  };
  
  // Clear all filters and search
  const clearFilters = () => {
    setActiveFilters([]);
    setSearchQuery("");
    window.history.pushState({}, "", "/");
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discover Threads</h1>
          <p className="text-muted-foreground mt-1">
            Explore thoughtful long-form content from the community
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search threads..."
              className="pl-9 w-full sm:w-[200px] md:w-[300px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>
      </div>
      
      {/* Filters and sorting */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs defaultValue="latest" value={selectedTab} onValueChange={setSelectedTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="latest">Latest</TabsTrigger>
            <TabsTrigger value="popular">Popular</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="flex flex-wrap gap-2 items-center">
          {activeFilters.map((filter) => (
            <Badge key={filter} variant="secondary" className="flex items-center gap-1">
              {filter}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter(filter)} 
              />
            </Badge>
          ))}
          
          {(activeFilters.length > 0 || searchQuery) && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="h-7 px-2 text-xs"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>
      
      {/* Popular tags */}
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 10).map((tag) => (
            <Badge 
              key={tag.id} 
              variant={activeFilters.includes(tag.name) ? "default" : "outline"}
              className="cursor-pointer hover:bg-secondary/80 transition-colors"
              onClick={() => 
                activeFilters.includes(tag.name) 
                  ? removeFilter(tag.name) 
                  : addFilter(tag.name)
              }
            >
              {tag.name}
            </Badge>
          ))}
        </div>
      )}
      
      {/* Thread grid */}
      {threadsLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-[200px] w-full rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedThreads.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedThreads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 bg-muted/30 rounded-lg">
          <h3 className="text-xl font-medium">No threads found</h3>
          <p className="text-muted-foreground mt-1">
            {activeFilters.length > 0 || searchQuery
              ? "Try adjusting your filters or search query"
              : "Be the first to create a thread!"}
          </p>
          {(activeFilters.length > 0 || searchQuery) && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearFilters}
              className="mt-4"
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
