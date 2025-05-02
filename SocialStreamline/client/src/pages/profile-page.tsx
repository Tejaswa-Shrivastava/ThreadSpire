import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { User, ThreadWithDetails } from "@shared/schema";
import { ThreadCard } from "@/components/thread-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, MessageSquare, User as UserIcon } from "lucide-react";
import { Link } from "wouter";

interface ProfilePageProps {
  username: string;
}

export default function ProfilePage({ username }: ProfilePageProps) {
  const { user: currentUser } = useAuth();
  
  // Fetch user profile
  const {
    data: profile,
    isLoading,
    isError,
    error
  } = useQuery<User & { threads: ThreadWithDetails[] }>({
    queryKey: [`/api/users/${username}`],
  });
  
  // Check if this is the current user's profile
  const isCurrentUser = currentUser?.username === username;
  
  // Get initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  
  // Format date
  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-16 w-full max-w-md" />
            <div className="flex gap-4 mt-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        
        <Skeleton className="h-10 w-full max-w-xs" />
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
      </div>
    );
  }
  
  if (isError || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-2xl font-bold mb-2">Profile Not Found</h2>
        <p className="text-muted-foreground mb-6">
          {error instanceof Error ? error.message : "The user you're looking for doesn't exist"}
        </p>
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-8">
      {/* Profile header */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="bg-primary/10 text-primary text-xl">
            {getInitials(profile.displayName)}
          </AvatarFallback>
        </Avatar>
        
        <div className="space-y-3 flex-1">
          <div>
            <h1 className="text-2xl font-bold">{profile.displayName}</h1>
            <p className="text-muted-foreground">@{profile.username}</p>
          </div>
          
          {profile.bio && (
            <p className="text-foreground max-w-2xl">{profile.bio}</p>
          )}
          
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Joined {formatJoinDate(profile.createdAt)}</span>
            </div>
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-1" />
              <span>{profile.threads.length} threads</span>
            </div>
          </div>
          
          {/* Actions for current user */}
          {isCurrentUser && (
            <div className="pt-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/create">Create New Thread</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* Profile content */}
      <Tabs defaultValue="threads" className="w-full">
        <TabsList>
          <TabsTrigger value="threads">Threads</TabsTrigger>
          {isCurrentUser && (
            <TabsTrigger value="drafts">Drafts</TabsTrigger>
          )}
          {isCurrentUser && (
            <TabsTrigger value="forked">Forked</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="threads" className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Published Threads</h2>
          
          {profile.threads.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {profile.threads.map((thread) => (
                <ThreadCard key={thread.id} thread={thread} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium mb-1">No Published Threads</h3>
              <p className="text-muted-foreground mb-4">
                {isCurrentUser 
                  ? "You haven't published any threads yet" 
                  : `${profile.displayName} hasn't published any threads yet`}
              </p>
              
              {isCurrentUser && (
                <Button asChild>
                  <Link href="/create">Create Your First Thread</Link>
                </Button>
              )}
            </div>
          )}
        </TabsContent>
        
        {isCurrentUser && (
          <TabsContent value="drafts" className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Draft Threads</h2>
            
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <UserIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium mb-1">Private Section</h3>
              <p className="text-muted-foreground mb-4">
                Your draft threads will appear here
              </p>
              <Button asChild>
                <Link href="/create">Create New Draft</Link>
              </Button>
            </div>
          </TabsContent>
        )}
        
        {isCurrentUser && (
          <TabsContent value="forked" className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Forked Threads</h2>
            
            <div className="text-center py-12 bg-muted/30 rounded-lg">
              <UserIcon className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <h3 className="text-lg font-medium mb-1">Private Section</h3>
              <p className="text-muted-foreground mb-4">
                Threads you've forked from others will appear here
              </p>
              <Button asChild>
                <Link href="/">Browse Threads to Fork</Link>
              </Button>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
