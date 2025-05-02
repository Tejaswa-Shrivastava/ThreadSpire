import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Collection, CollectionWithThreads, Thread } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { ThreadCard } from "@/components/thread-card";
import {
  Plus,
  FolderPlus,
  Bookmark,
  Folder,
  Trash2,
  Edit,
  AlertCircle,
  Loader2
} from "lucide-react";

// Create collection form schema
const createCollectionSchema = z.object({
  name: z.string().min(1, "Collection name is required"),
  description: z.string().optional(),
});

export default function CollectionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCollection, setActiveCollection] = useState<number | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [collectionToEdit, setCollectionToEdit] = useState<Collection | null>(null);
  
  // Get collections
  const {
    data: collections,
    isLoading: collectionsLoading,
  } = useQuery<CollectionWithThreads[]>({
    queryKey: ["/api/collections"],
    enabled: !!user,
  });
  
  // Get bookmarks
  const {
    data: bookmarks,
    isLoading: bookmarksLoading,
  } = useQuery({
    queryKey: ["/api/bookmarks"],
    enabled: !!user,
  });
  
  // Collection form
  const form = useForm<z.infer<typeof createCollectionSchema>>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  // Edit collection form
  const editForm = useForm<z.infer<typeof createCollectionSchema>>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  // Create collection mutation
  const createCollectionMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createCollectionSchema>) => {
      const res = await apiRequest("POST", "/api/collections", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      form.reset();
      toast({
        title: "Collection created",
        description: "Your new collection has been created",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create collection",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Update collection mutation
  const updateCollectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof createCollectionSchema> }) => {
      const res = await apiRequest("PUT", `/api/collections/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setShowEditDialog(false);
      toast({
        title: "Collection updated",
        description: "Your collection has been updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update collection",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Delete collection mutation
  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/collections/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      setActiveCollection(null);
      toast({
        title: "Collection deleted",
        description: "Your collection has been deleted",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete collection",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Remove bookmark mutation
  const removeBookmarkMutation = useMutation({
    mutationFn: async (bookmarkId: number) => {
      await apiRequest("DELETE", `/api/bookmarks/${bookmarkId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      toast({
        title: "Bookmark removed",
        description: "Thread has been removed from your bookmarks",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove bookmark",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Handle collection creation
  const onCreateCollection = (data: z.infer<typeof createCollectionSchema>) => {
    createCollectionMutation.mutate(data);
  };
  
  // Handle collection edit
  const onEditCollection = (data: z.infer<typeof createCollectionSchema>) => {
    if (!collectionToEdit) return;
    updateCollectionMutation.mutate({ id: collectionToEdit.id, data });
  };
  
  // Open edit dialog with collection data
  const openEditDialog = (collection: Collection) => {
    setCollectionToEdit(collection);
    editForm.reset({
      name: collection.name,
      description: collection.description || "",
    });
    setShowEditDialog(true);
  };
  
  // Get active collection data
  const activeCollectionData = collections?.find(c => c.id === activeCollection);
  
  // Get uncategorized bookmarks (not in any collection)
  const uncategorizedBookmarks = bookmarks?.filter(
    (bookmark: any) => !bookmark.collectionId
  );
  
  // Handle removing a bookmark
  const removeBookmark = (bookmarkId: number) => {
    if (window.confirm("Are you sure you want to remove this bookmark?")) {
      removeBookmarkMutation.mutate(bookmarkId);
    }
  };
  
  // Loading state
  if (collectionsLoading || bookmarksLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Collections</h1>
          <p className="text-muted-foreground mt-1">Organize your bookmarked threads</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          
          <div className="md:col-span-3 space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // No collections or bookmarks yet
  if ((!collections || collections.length === 0) && (!bookmarks || bookmarks.length === 0)) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Collections</h1>
          <p className="text-muted-foreground mt-1">Organize your bookmarked threads</p>
        </div>
        
        <div className="flex flex-col items-center justify-center py-12 bg-muted/30 rounded-lg">
          <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Bookmarks or Collections Yet</h2>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Start by bookmarking threads you'd like to save for later, then organize them into collections.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild>
              <Link href="/">Browse Threads</Link>
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-1">
                  <FolderPlus className="h-4 w-4" /> Create Collection
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Collection</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onCreateCollection)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Collection Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter collection name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter a description" 
                              {...field} 
                              rows={3}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline" type="button">Cancel</Button>
                      </DialogClose>
                      <Button type="submit" disabled={createCollectionMutation.isPending}>
                        {createCollectionMutation.isPending ? "Creating..." : "Create Collection"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Collections</h1>
        <p className="text-muted-foreground mt-1">Organize your bookmarked threads</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar with collections */}
        <div className="md:col-span-1 space-y-4">
          {/* Create collection button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full gap-1">
                <Plus className="h-4 w-4" /> New Collection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Collection</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onCreateCollection)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collection Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter collection name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter a description" 
                            {...field} 
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" type="button">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={createCollectionMutation.isPending}>
                      {createCollectionMutation.isPending ? "Creating..." : "Create Collection"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          
          {/* All bookmarks */}
          <Button
            variant={activeCollection === null ? "secondary" : "outline"}
            className="w-full justify-start gap-2"
            onClick={() => setActiveCollection(null)}
          >
            <Bookmark className="h-4 w-4" />
            All Bookmarks
            {bookmarks && (
              <span className="ml-auto bg-primary/10 text-primary text-xs rounded-full px-2 py-0.5">
                {bookmarks.length}
              </span>
            )}
          </Button>
          
          {/* Collection list */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium px-2">Collections</h3>
            {collections?.map(collection => (
              <div key={collection.id} className="flex items-center gap-2">
                <Button
                  variant={activeCollection === collection.id ? "secondary" : "outline"}
                  className="w-full justify-start gap-2"
                  onClick={() => setActiveCollection(collection.id)}
                >
                  <Folder className="h-4 w-4" />
                  {collection.name}
                  {collection.threads && (
                    <span className="ml-auto bg-primary/10 text-primary text-xs rounded-full px-2 py-0.5">
                      {collection.threads.length}
                    </span>
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => openEditDialog(collection)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {collections?.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                No collections yet
              </div>
            )}
          </div>
        </div>
        
        {/* Main content area */}
        <div className="md:col-span-3 space-y-6">
          {/* Collection title and actions */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">
              {activeCollection 
                ? activeCollectionData?.name 
                : "All Bookmarks"}
            </h2>
            
            {activeCollection && (
              <Button
                variant="destructive"
                size="sm"
                className="gap-1"
                onClick={() => {
                  if (window.confirm("Are you sure you want to delete this collection? Bookmarks in this collection will be kept but moved to uncategorized.")) {
                    deleteCollectionMutation.mutate(activeCollection);
                  }
                }}
                disabled={deleteCollectionMutation.isPending}
              >
                {deleteCollectionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete Collection
              </Button>
            )}
          </div>
          
          {/* Collection description */}
          {activeCollection && activeCollectionData?.description && (
            <p className="text-muted-foreground">
              {activeCollectionData.description}
            </p>
          )}
          
          {activeCollection === null ? (
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All Bookmarks</TabsTrigger>
                <TabsTrigger value="uncategorized">Uncategorized</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-4">
                {bookmarks?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {bookmarks.map((bookmark: any) => (
                      <ThreadCard 
                        key={bookmark.id} 
                        thread={bookmark.thread}
                        isBookmarked={true}
                        removeBookmark={() => removeBookmark(bookmark.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/30 rounded-lg">
                    <Bookmark className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="text-lg font-medium mt-4 mb-2">No Bookmarks Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      You haven't bookmarked any threads yet
                    </p>
                    <Button asChild>
                      <Link href="/">Browse Threads</Link>
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="uncategorized" className="mt-4">
                {uncategorizedBookmarks?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {uncategorizedBookmarks.map((bookmark: any) => (
                      <ThreadCard 
                        key={bookmark.id} 
                        thread={bookmark.thread}
                        isBookmarked={true}
                        removeBookmark={() => removeBookmark(bookmark.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/30 rounded-lg">
                    <FolderPlus className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h3 className="text-lg font-medium mt-4 mb-2">No Uncategorized Bookmarks</h3>
                    <p className="text-muted-foreground">
                      All your bookmarks are organized in collections
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div>
              {activeCollectionData?.threads && activeCollectionData.threads.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeCollectionData.threads.map((thread) => {
                    // Find the bookmark ID for this thread
                    const bookmark = bookmarks?.find(
                      (b: any) => b.threadId === thread.id
                    );
                    
                    return (
                      <ThreadCard 
                        key={thread.id} 
                        thread={thread}
                        isBookmarked={true}
                        removeBookmark={() => bookmark && removeBookmark(bookmark.id)}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-muted/30 rounded-lg">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-medium mt-4 mb-2">No Threads in Collection</h3>
                  <p className="text-muted-foreground mb-4">
                    This collection doesn't have any threads yet
                  </p>
                  <Button asChild>
                    <Link href="/">Browse Threads</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Edit Collection Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditCollection)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Collection Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter collection name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter a description" 
                        {...field} 
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateCollectionMutation.isPending}>
                  {updateCollectionMutation.isPending ? "Updating..." : "Update Collection"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
