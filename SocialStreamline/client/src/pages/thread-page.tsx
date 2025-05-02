import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ThreadWithDetails } from "@shared/schema";
import { ThreadSegmentComponent } from "@/components/thread-segment";
import { ThreadReaction } from "@/components/thread-reaction";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { 
  ArrowLeft, 
  Bookmark, 
  Share2, 
  Copy, 
  GitFork, 
  User,
  Calendar,
  MessageSquare,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface ThreadPageProps {
  id: number;
}

export default function ThreadPage({ id }: ThreadPageProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  
  // Fetch thread data
  const {
    data: thread,
    isLoading,
    isError,
    error
  } = useQuery<ThreadWithDetails>({
    queryKey: [`/api/threads/${id}`],
  });
  
  // Check if thread is bookmarked by user
  useEffect(() => {
    if (user && thread) {
      const checkBookmark = async () => {
        try {
          const res = await fetch("/api/bookmarks");
          if (!res.ok) return;
          
          const bookmarks = await res.json();
          const isAlreadyBookmarked = bookmarks.some(
            (b: any) => b.threadId === thread.id
          );
          
          setIsBookmarked(isAlreadyBookmarked);
        } catch (err) {
          console.error("Failed to check bookmark status:", err);
        }
      };
      
      checkBookmark();
    }
  }, [user, thread]);
  
  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (isBookmarked) {
        // Find the bookmark ID to remove
        const res = await apiRequest("GET", "/api/bookmarks");
        const bookmarks = await res.json();
        const bookmark = bookmarks.find((b: any) => b.threadId === id);
        
        if (bookmark) {
          await apiRequest("DELETE", `/api/bookmarks/${bookmark.id}`);
          return { action: "removed" };
        }
        return { action: "notFound" };
      } else {
        // Create new bookmark
        await apiRequest("POST", "/api/bookmarks", { threadId: id });
        return { action: "added" };
      }
    },
    onSuccess: (data) => {
      setIsBookmarked(data.action === "added");
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      
      toast({
        title: data.action === "added" ? "Thread bookmarked" : "Bookmark removed",
        description: data.action === "added" 
          ? "Thread added to your bookmarks" 
          : "Thread removed from your bookmarks",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update bookmark",
        variant: "destructive",
      });
    },
  });
  
  // Fork thread mutation
  const forkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/threads/${id}/fork`);
      return await res.json();
    },
    onSuccess: (forkedThread) => {
      toast({
        title: "Thread forked successfully",
        description: "You can now edit your own version of this thread",
      });
      navigate(`/thread/${forkedThread.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to fork thread",
        variant: "destructive",
      });
    },
  });
  
  // Share thread
  const shareThread = async () => {
    const url = window.location.href;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: thread?.title || "Check out this thread",
          url
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShowShareTooltip(true);
        setTimeout(() => setShowShareTooltip(false), 2000);
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };
  
  // Handle bookmark
  const handleBookmark = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to bookmark threads",
        variant: "destructive",
      });
      return;
    }
    
    bookmarkMutation.mutate();
  };
  
  // Handle fork
  const handleFork = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to fork threads",
        variant: "destructive",
      });
      return;
    }
    
    forkMutation.mutate();
  };
  
  // Get author's initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
        
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-16 w-full" />
          
          <div className="flex items-center gap-2 mt-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-6 w-40" />
          </div>
        </div>
        
        <div className="space-y-6 mt-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex gap-2 items-center">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-40 w-full rounded-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold mb-2">Error Loading Thread</h2>
        <p className="text-muted-foreground mb-6">
          {error instanceof Error ? error.message : "Failed to load the thread"}
        </p>
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }
  
  if (!thread) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold mb-2">Thread Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The thread you're looking for doesn't exist or has been removed.
        </p>
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <div className="flex items-center mb-6">
        <Button variant="ghost" size="sm" className="gap-1" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
      </div>
      
      {/* Thread header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold tracking-tight mb-4">{thread.title}</h1>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {thread.tags.map((tag) => (
            <Link key={tag.id} href={`/?tag=${tag.name}`}>
              <Badge variant="outline" className="cursor-pointer hover:bg-secondary/80 transition-colors">
                {tag.name}
              </Badge>
            </Link>
          ))}
        </div>
        
        {thread.description && (
          <p className="text-muted-foreground mb-4">{thread.description}</p>
        )}
        
        {/* Author and date */}
        <div className="flex flex-wrap items-center gap-6 text-sm mb-6">
          <Link href={`/profile/${thread.author.username}`}>
            <div className="flex items-center group">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {getInitials(thread.author.displayName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="font-medium group-hover:text-primary transition-colors">
                  {thread.author.displayName}
                </span>
                <div className="text-xs text-muted-foreground">
                  @{thread.author.username}
                </div>
              </div>
            </div>
          </Link>
          
          <div className="flex items-center text-muted-foreground">
            <Calendar className="h-4 w-4 mr-1" />
            <span>{formatDate(thread.createdAt)}</span>
          </div>
          
          <div className="flex items-center text-muted-foreground">
            <MessageSquare className="h-4 w-4 mr-1" />
            <span>{thread.segments.length} segments</span>
          </div>
          
          <div className="flex items-center text-muted-foreground">
            <Eye className="h-4 w-4 mr-1" />
            <span>Views</span>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mb-6 mt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleBookmark}
            disabled={bookmarkMutation.isPending}
            className={cn(
              "gap-2",
              isBookmarked ? "bg-secondary/50" : ""
            )}
          >
            <Bookmark className={cn(
              "h-4 w-4",
              isBookmarked ? "fill-primary text-primary" : "fill-none"
            )} />
            {isBookmarked ? "Bookmarked" : "Bookmark"}
          </Button>
          
          <div className="relative">
            <Button 
              variant="outline" 
              size="sm"
              onClick={shareThread}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            
            {showShareTooltip && (
              <div className="absolute left-0 top-full mt-2 bg-secondary px-3 py-1 rounded text-xs">
                Link copied!
              </div>
            )}
          </div>
          
          {user && user.id !== thread.author.id && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleFork}
              disabled={forkMutation.isPending}
              className="gap-2"
            >
              <GitFork className="h-4 w-4" />
              Fork
            </Button>
          )}
        </div>
        
        {/* Reactions */}
        <div className="mb-6">
          <h3 className="text-sm font-medium mb-2">Reactions</h3>
          <ThreadReaction 
            threadId={thread.id} 
            reactions={thread.reactions} 
          />
        </div>
        
        <Separator className="my-6" />
      </motion.div>
      
      {/* Thread segments */}
      <div className="space-y-6">
        {thread.segments.map((segment, index) => (
          <ThreadSegmentComponent 
            key={segment.id} 
            segment={segment} 
            index={index} 
            isLast={index === thread.segments.length - 1}
          />
        ))}
      </div>
      
      {/* Related threads or call to action */}
      <div className="mt-12 pt-8 border-t">
        <h2 className="text-xl font-semibold mb-4">Continue Exploring</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/">
              Discover More Threads
            </Link>
          </Button>
          
          {user && (
            <Button variant="outline" asChild>
              <Link href="/create">
                Create Your Own Thread
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
