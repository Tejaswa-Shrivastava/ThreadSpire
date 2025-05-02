import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertThreadSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { TiptapEditor } from "@/components/ui/tiptap-editor";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Trash2,
  Plus,
  Save,
  ArrowUp,
  ArrowDown,
  ClipboardCheck,
  FileQuestion,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

// Extend the thread schema for the form
const createThreadSchema = insertThreadSchema.extend({
  segments: z.array(
    z.object({
      content: z.string().min(1, "Content cannot be empty"),
      richContent: z.any().optional(),
      order: z.number(),
    })
  ).min(1, "At least one segment is required"),
  tags: z.array(z.string()).optional(),
});

type CreateThreadFormValues = z.infer<typeof createThreadSchema>;

export default function CreateThreadPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [tagInput, setTagInput] = useState("");
  
  // Initialize form
  const form = useForm<CreateThreadFormValues>({
    resolver: zodResolver(createThreadSchema),
    defaultValues: {
      title: "",
      description: "",
      authorId: user?.id || 0,
      isPublished: false,
      segments: [
        {
          content: "",
          order: 0,
        },
      ],
      tags: [],
    },
  });
  
  // Set up field array for segments
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "segments",
  });
  
  // Create thread mutation
  const createThreadMutation = useMutation({
    mutationFn: async (data: CreateThreadFormValues) => {
      const res = await apiRequest("POST", "/api/threads", data);
      return await res.json();
    },
    onSuccess: (thread) => {
      toast({
        title: "Thread created successfully",
        description: thread.isPublished 
          ? "Your thread is now published" 
          : "Your thread has been saved as a draft",
      });
      navigate(`/thread/${thread.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to create thread",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Auto-save draft
  const saveDraftMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/drafts", {
        content: data,
        userId: user?.id,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Draft saved",
        description: "Your draft has been saved automatically",
      });
    },
  });
  
  // Add a tag
  const addTag = () => {
    if (!tagInput.trim()) return;
    
    const currentTags = form.getValues("tags") || [];
    
    // Check if tag already exists
    if (currentTags.includes(tagInput.trim())) {
      toast({
        title: "Tag already exists",
        description: "This tag has already been added",
        variant: "destructive",
      });
      return;
    }
    
    form.setValue("tags", [...currentTags, tagInput.trim()]);
    setTagInput("");
  };
  
  // Remove a tag
  const removeTag = (tag: string) => {
    const currentTags = form.getValues("tags") || [];
    form.setValue(
      "tags",
      currentTags.filter((t) => t !== tag)
    );
  };
  
  // Handle tag input keydown
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };
  
  // Add a new segment
  const addSegment = () => {
    append({
      content: "",
      order: fields.length,
    });
  };
  
  // Move a segment up or down
  const moveSegment = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;
    move(index, newIndex);
  };
  
  // Submit form
  const onSubmit = (data: CreateThreadFormValues) => {
    // Ensure authorId is set correctly
    data.authorId = user?.id || 0;
    
    // Ensure segments have the correct order
    data.segments = data.segments.map((segment, index) => ({
      ...segment,
      order: index,
    }));
    
    createThreadMutation.mutate(data);
  };
  
  // Save draft
  const saveDraft = () => {
    const data = form.getValues();
    saveDraftMutation.mutate(data);
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Create a New Thread</h1>
        <p className="text-muted-foreground mt-1">
          Share your thoughts with the community in a structured format
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardContent className="pt-6">
              {/* Thread title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="mb-6">
                    <FormLabel>Thread Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter a descriptive title for your thread" 
                        {...field} 
                        className="text-lg font-medium"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Thread description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Briefly describe what your thread is about" 
                        {...field} 
                        className="resize-none"
                        rows={2}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          {/* Thread segments */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Thread Segments</h2>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={addSegment}
                className="gap-1"
              >
                <Plus className="h-4 w-4" /> Add Segment
              </Button>
            </div>
            
            <AnimatePresence>
              {fields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative border rounded-lg p-4 bg-card"
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium">
                        {index === 0 ? "Opening" : index === fields.length - 1 ? "Conclusion" : `Segment ${index + 1}`}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveSegment(index, "up")}
                        disabled={index === 0}
                        className="h-8 w-8"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => moveSegment(index, "down")}
                        disabled={index === fields.length - 1}
                        className="h-8 w-8"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => fields.length > 1 && remove(index)}
                        disabled={fields.length <= 1}
                        className="h-8 w-8 text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name={`segments.${index}.content`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <TiptapEditor
                            content={field.value}
                            onChange={field.onChange}
                            placeholder={`Write the content for segment ${index + 1}...`}
                            className="min-h-[150px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            
            {fields.length === 0 && (
              <div className="text-center py-8 border rounded-lg bg-muted/30">
                <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <h3 className="text-lg font-medium mb-1">No Segments Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Add at least one segment to your thread
                </p>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={addSegment} 
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" /> Add First Segment
                </Button>
              </div>
            )}
          </div>
          
          {/* Tags */}
          <Card>
            <CardContent className="pt-6">
              <div className="mb-6">
                <FormLabel className="block mb-2">Tags</FormLabel>
                <div className="flex flex-wrap gap-2 mb-3">
                  {form.getValues("tags")?.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="px-3 py-1 gap-1"
                    >
                      {tag}
                      <button 
                        type="button" 
                        className="text-muted-foreground hover:text-foreground ml-1"
                        onClick={() => removeTag(tag)}
                      >
                        &times;
                      </button>
                    </Badge>
                  ))}
                  
                  {(!form.getValues("tags") || form.getValues("tags")?.length === 0) && (
                    <span className="text-sm text-muted-foreground">
                      No tags added yet
                    </span>
                  )}
                </div>
                <div className="flex">
                  <Input
                    type="text"
                    placeholder="Add a tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="w-auto"
                  />
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={addTag}
                    className="ml-2"
                  >
                    Add
                  </Button>
                </div>
              </div>
              
              {/* Publish switch */}
              <FormField
                control={form.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Publish Thread</FormLabel>
                      <div className="text-sm text-muted-foreground">
                        {field.value 
                          ? "Your thread will be published and visible to others" 
                          : "Save as draft (only visible to you)"}
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <div className="flex flex-wrap justify-end gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={saveDraft}
              disabled={saveDraftMutation.isPending}
              className="gap-1"
            >
              {saveDraftMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Draft
            </Button>
            
            <Button 
              type="submit" 
              disabled={createThreadMutation.isPending}
              className="gap-1"
            >
              {createThreadMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardCheck className="h-4 w-4" />
              )}
              {form.getValues("isPublished") ? "Publish Thread" : "Save Thread"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
