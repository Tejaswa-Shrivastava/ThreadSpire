import { ThreadWithDetails } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ThreadReaction } from "./thread-reaction";
import { Link } from "wouter";
import { BookmarkIcon, MessageSquare, Eye } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ThreadCardProps {
  thread: ThreadWithDetails;
  isBookmarked?: boolean;
  removeBookmark?: (id: number) => void;
}

export function ThreadCard({ thread, isBookmarked, removeBookmark }: ThreadCardProps) {
  const { user } = useAuth();
  const [isBookmarkedState, setIsBookmarkedState] = useState(isBookmarked);
  
  // Get the total reaction count
  const reactionCount = thread.reactions.length;
  
  // Format date
  const formattedDate = new Date(thread.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  
  // Get first segment preview (truncated)
  const firstSegment = thread.segments[0];
  const previewText = firstSegment ? 
    firstSegment.content.replace(/<[^>]*>/g, "").slice(0, 120) + (firstSegment.content.length > 120 ? "..." : "") : 
    "";
  
  // Create bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      if (isBookmarkedState) {
        // Find the bookmark ID to remove
        const res = await apiRequest("GET", "/api/bookmarks");
        const bookmarks = await res.json();
        const bookmark = bookmarks.find((b: any) => b.threadId === thread.id);
        
        if (bookmark) {
          await apiRequest("DELETE", `/api/bookmarks/${bookmark.id}`);
          return { action: "removed" };
        }
        return { action: "notFound" };
      } else {
        // Create new bookmark
        await apiRequest("POST", "/api/bookmarks", { threadId: thread.id });
        return { action: "added" };
      }
    },
    onSuccess: (data) => {
      setIsBookmarkedState(data.action === "added");
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      
      // If this is being used in a collection view and we're removing
      if (removeBookmark && data.action === "removed") {
        removeBookmark(thread.id);
      }
    },
  });
  
  // Get author's initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden transition-all hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <Link href={`/thread/${thread.id}`}>
              <CardTitle className="text-xl cursor-pointer hover:text-primary transition-colors line-clamp-2">
                {thread.title}
              </CardTitle>
            </Link>
            
            {user && (
              <button
                onClick={() => bookmarkMutation.mutate()}
                className="text-gray-400 hover:text-primary"
                disabled={bookmarkMutation.isPending}
              >
                <BookmarkIcon 
                  className={cn(
                    "h-5 w-5 transition-colors", 
                    isBookmarkedState ? "fill-primary text-primary" : "fill-none"
                  )} 
                />
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2 mt-2">
            {thread.tags.map((tag) => (
              <Link key={tag.id} href={`/?tag=${tag.name}`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-secondary transition-colors">
                  {tag.name}
                </Badge>
              </Link>
            ))}
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="mt-2 text-muted-foreground text-sm line-clamp-3">
            {previewText}
          </div>
          
          <div className="flex items-center mt-4">
            <Link href={`/profile/${thread.author.username}`}>
              <div className="flex items-center group">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(thread.author.displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium group-hover:text-primary transition-colors">
                  {thread.author.displayName}
                </span>
              </div>
            </Link>
            <span className="text-xs text-muted-foreground ml-3">{formattedDate}</span>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-4 pb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-1" />
              <span>{thread.segments.length} segments</span>
            </div>
            <div className="flex items-center">
              <Eye className="h-4 w-4 mr-1" />
              <span>Views</span>
            </div>
          </div>
          
          <div className="flex gap-1">
            <ThreadReaction 
              threadId={thread.id} 
              reactions={thread.reactions} 
              minimal={true}
              size="sm"
            />
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
