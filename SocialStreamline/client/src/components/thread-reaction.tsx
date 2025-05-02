import { Reaction, ReactionType } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ThreadReactionProps {
  threadId: number;
  reactions: (Reaction & { reactionType: ReactionType })[];
  minimal?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ThreadReaction({ 
  threadId, 
  reactions,
  minimal = false,
  size = "md"
}: ThreadReactionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Get reaction types
  const { data: reactionTypes } = useQuery<ReactionType[]>({
    queryKey: ["/api/reaction-types"],
    enabled: !minimal,
  });
  
  // Group reactions by type
  const reactionsByType = reactions.reduce((acc, reaction) => {
    const { reactionTypeId } = reaction;
    if (!acc[reactionTypeId]) {
      acc[reactionTypeId] = [];
    }
    acc[reactionTypeId].push(reaction);
    return acc;
  }, {} as Record<number, (Reaction & { reactionType: ReactionType })[]>);
  
  // Check which reactions the current user has made
  const userReactions = user 
    ? reactions.filter(reaction => reaction.userId === user.id)
    : [];
  
  const userReactionIds = userReactions.map(r => r.reactionTypeId);
  
  // React mutation
  const reactMutation = useMutation({
    mutationFn: async ({ reactionTypeId, hasReacted }: { reactionTypeId: number, hasReacted: boolean }) => {
      if (hasReacted) {
        // Find the reaction to delete
        const reaction = reactions.find(
          r => r.userId === user?.id && r.reactionTypeId === reactionTypeId
        );
        
        if (reaction) {
          await apiRequest("DELETE", `/api/reactions/${reaction.id}`);
        }
      } else {
        await apiRequest("POST", "/api/reactions", {
          threadId,
          reactionTypeId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/threads/${threadId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/threads"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update reaction",
        variant: "destructive",
      });
    },
  });
  
  // Handle reaction
  const handleReaction = (reactionTypeId: number) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to react to threads",
        variant: "destructive",
      });
      return;
    }
    
    const hasReacted = userReactionIds.includes(reactionTypeId);
    reactMutation.mutate({ reactionTypeId, hasReacted });
  };
  
  // Render just counts in minimal mode
  if (minimal) {
    // Get total reaction count
    const totalReactions = reactions.length;
    
    if (totalReactions === 0) {
      return null;
    }
    
    return (
      <div className="flex items-center text-muted-foreground">
        {Object.entries(reactionsByType).map(([typeId, reactions]) => {
          const emoji = reactions[0].reactionType.emoji;
          return (
            <div key={typeId} className="flex items-center mr-2">
              <span className={cn(
                size === "sm" ? "text-sm" : size === "md" ? "text-base" : "text-lg"
              )}>
                {emoji}
              </span>
              <span className={cn(
                "ml-1",
                size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
              )}>
                {reactions.length}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  
  // Full reaction UI with buttons
  if (!reactionTypes) {
    return <div className="flex gap-1 animate-pulse h-8 bg-muted rounded-md w-40"></div>;
  }
  
  return (
    <div className="flex flex-wrap gap-2">
      <TooltipProvider>
        {reactionTypes.map((type) => {
          const hasReacted = userReactionIds.includes(type.id);
          const count = reactionsByType[type.id]?.length || 0;
          
          return (
            <Tooltip key={type.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={hasReacted ? "secondary" : "outline"}
                  size="sm"
                  className={cn(
                    "flex items-center gap-1 transition-all",
                    hasReacted && "border-primary/30",
                    count > 0 && !hasReacted && "bg-muted/50"
                  )}
                  onClick={() => handleReaction(type.id)}
                  disabled={reactMutation.isPending}
                >
                  <span className="text-base">{type.emoji}</span>
                  {count > 0 && (
                    <span className="text-xs font-medium">
                      {count}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{hasReacted ? `Remove ${type.name} reaction` : `React with ${type.name}`}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
