import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertThreadSchema, 
  insertThreadSegmentSchema,
  insertTagSchema,
  insertThreadTagSchema,
  insertCollectionSchema,
  insertBookmarkSchema,
  insertReactionSchema,
  insertDraftSchema
} from "@shared/schema";
import { z } from "zod";

// Auth middleware
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Thread routes
  app.get("/api/threads", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const tag = req.query.tag as string | undefined;

      let threads;
      if (tag) {
        const tagObj = await storage.getTagByName(tag);
        if (tagObj) {
          threads = await storage.getThreadsByTag(tagObj.id);
        } else {
          threads = [];
        }
      } else {
        threads = await storage.getThreads(limit, offset);
      }
      
      res.json(threads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch threads" });
    }
  });

  app.get("/api/threads/:id", async (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      const thread = await storage.getThread(threadId);
      
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      // Increment view count
      await storage.incrementThreadViews(threadId);
      
      res.json(thread);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch thread" });
    }
  });

  app.post("/api/threads", isAuthenticated, async (req, res) => {
    try {
      const threadData = insertThreadSchema.parse({
        ...req.body,
        authorId: req.user!.id
      });
      
      const thread = await storage.createThread(threadData);
      
      // Create segments if provided
      if (req.body.segments && Array.isArray(req.body.segments)) {
        for (let i = 0; i < req.body.segments.length; i++) {
          const segmentData = insertThreadSegmentSchema.parse({
            ...req.body.segments[i],
            threadId: thread.id,
            order: i
          });
          
          await storage.createThreadSegment(segmentData);
        }
      }
      
      // Add tags if provided
      if (req.body.tags && Array.isArray(req.body.tags)) {
        for (const tagName of req.body.tags) {
          let tag = await storage.getTagByName(tagName);
          
          if (!tag) {
            tag = await storage.createTag({ name: tagName });
          }
          
          await storage.addTagToThread({ threadId: thread.id, tagId: tag.id });
        }
      }
      
      const createdThread = await storage.getThread(thread.id);
      res.status(201).json(createdThread);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid thread data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create thread" });
    }
  });

  app.put("/api/threads/:id", isAuthenticated, async (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      const thread = await storage.getThread(threadId);
      
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      // Ensure the user is the author
      if (thread.authorId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to update this thread" });
      }
      
      const updatedThread = await storage.updateThread(threadId, req.body);
      res.json(updatedThread);
    } catch (error) {
      res.status(500).json({ message: "Failed to update thread" });
    }
  });

  app.delete("/api/threads/:id", isAuthenticated, async (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      const thread = await storage.getThread(threadId);
      
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      // Ensure the user is the author
      if (thread.authorId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to delete this thread" });
      }
      
      await storage.deleteThread(threadId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete thread" });
    }
  });

  app.post("/api/threads/:id/fork", isAuthenticated, async (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      const thread = await storage.getThread(threadId);
      
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      const forkedThread = await storage.forkThread(threadId, req.user!.id);
      
      if (!forkedThread) {
        return res.status(500).json({ message: "Failed to fork thread" });
      }
      
      const threadWithDetails = await storage.getThread(forkedThread.id);
      res.status(201).json(threadWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to fork thread" });
    }
  });

  // Thread segments routes
  app.post("/api/threads/:threadId/segments", isAuthenticated, async (req, res) => {
    try {
      const threadId = parseInt(req.params.threadId);
      const thread = await storage.getThread(threadId);
      
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      // Ensure the user is the author
      if (thread.authorId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to add segments to this thread" });
      }
      
      const segmentData = insertThreadSegmentSchema.parse({
        ...req.body,
        threadId
      });
      
      const segment = await storage.createThreadSegment(segmentData);
      res.status(201).json(segment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid segment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create segment" });
    }
  });

  app.put("/api/segments/:id", isAuthenticated, async (req, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const segment = await storage.threadSegments.get(segmentId);
      
      if (!segment) {
        return res.status(404).json({ message: "Segment not found" });
      }
      
      const thread = await storage.getThread(segment.threadId);
      
      // Ensure the user is the author of the thread
      if (thread?.authorId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to update this segment" });
      }
      
      const updatedSegment = await storage.updateThreadSegment(segmentId, req.body);
      res.json(updatedSegment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update segment" });
    }
  });

  app.delete("/api/segments/:id", isAuthenticated, async (req, res) => {
    try {
      const segmentId = parseInt(req.params.id);
      const segment = await storage.threadSegments.get(segmentId);
      
      if (!segment) {
        return res.status(404).json({ message: "Segment not found" });
      }
      
      const thread = await storage.getThread(segment.threadId);
      
      // Ensure the user is the author of the thread
      if (thread?.authorId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to delete this segment" });
      }
      
      await storage.deleteThreadSegment(segmentId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete segment" });
    }
  });

  // Tag routes
  app.get("/api/tags", async (req, res) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch tags" });
    }
  });

  app.post("/api/tags", isAuthenticated, async (req, res) => {
    try {
      const tagData = insertTagSchema.parse(req.body);
      
      let tag = await storage.getTagByName(tagData.name);
      
      if (!tag) {
        tag = await storage.createTag(tagData);
      }
      
      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid tag data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create tag" });
    }
  });

  app.post("/api/threads/:threadId/tags", isAuthenticated, async (req, res) => {
    try {
      const threadId = parseInt(req.params.threadId);
      const thread = await storage.getThread(threadId);
      
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      // Ensure the user is the author
      if (thread.authorId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to add tags to this thread" });
      }
      
      const tagName = req.body.name;
      let tag = await storage.getTagByName(tagName);
      
      if (!tag) {
        tag = await storage.createTag({ name: tagName });
      }
      
      const threadTagData = insertThreadTagSchema.parse({
        threadId,
        tagId: tag.id
      });
      
      await storage.addTagToThread(threadTagData);
      
      const tags = await storage.getThreadTags(threadId);
      res.status(201).json(tags);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid tag data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add tag to thread" });
    }
  });

  app.delete("/api/threads/:threadId/tags/:tagId", isAuthenticated, async (req, res) => {
    try {
      const threadId = parseInt(req.params.threadId);
      const tagId = parseInt(req.params.tagId);
      
      const thread = await storage.getThread(threadId);
      
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      // Ensure the user is the author
      if (thread.authorId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to remove tags from this thread" });
      }
      
      await storage.removeTagFromThread(threadId, tagId);
      
      const tags = await storage.getThreadTags(threadId);
      res.json(tags);
    } catch (error) {
      res.status(500).json({ message: "Failed to remove tag from thread" });
    }
  });

  // Collection routes
  app.get("/api/collections", isAuthenticated, async (req, res) => {
    try {
      const collections = await storage.getUserCollections(req.user!.id);
      res.json(collections);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch collections" });
    }
  });

  app.post("/api/collections", isAuthenticated, async (req, res) => {
    try {
      const collectionData = insertCollectionSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      const collection = await storage.createCollection(collectionData);
      res.status(201).json(collection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid collection data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create collection" });
    }
  });

  app.put("/api/collections/:id", isAuthenticated, async (req, res) => {
    try {
      const collectionId = parseInt(req.params.id);
      const collection = await storage.getCollection(collectionId);
      
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      
      // Ensure the user is the owner
      if (collection.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to update this collection" });
      }
      
      const updatedCollection = await storage.updateCollection(collectionId, req.body);
      res.json(updatedCollection);
    } catch (error) {
      res.status(500).json({ message: "Failed to update collection" });
    }
  });

  app.delete("/api/collections/:id", isAuthenticated, async (req, res) => {
    try {
      const collectionId = parseInt(req.params.id);
      const collection = await storage.getCollection(collectionId);
      
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }
      
      // Ensure the user is the owner
      if (collection.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to delete this collection" });
      }
      
      await storage.deleteCollection(collectionId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete collection" });
    }
  });

  // Bookmark routes
  app.get("/api/bookmarks", isAuthenticated, async (req, res) => {
    try {
      const bookmarks = await storage.getBookmarks(req.user!.id);
      
      // Get thread details for each bookmark
      const threadsPromises = bookmarks.map(bookmark => 
        storage.getThread(bookmark.threadId)
      );
      
      const threads = await Promise.all(threadsPromises);
      
      const bookmarksWithThreads = bookmarks.map((bookmark, index) => ({
        ...bookmark,
        thread: threads[index]
      }));
      
      res.json(bookmarksWithThreads);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookmarks" });
    }
  });

  app.post("/api/bookmarks", isAuthenticated, async (req, res) => {
    try {
      const bookmarkData = insertBookmarkSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      const bookmark = await storage.createBookmark(bookmarkData);
      res.status(201).json(bookmark);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid bookmark data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create bookmark" });
    }
  });

  app.delete("/api/bookmarks/:id", isAuthenticated, async (req, res) => {
    try {
      const bookmarkId = parseInt(req.params.id);
      const bookmark = await storage.bookmarks.get(bookmarkId);
      
      if (!bookmark) {
        return res.status(404).json({ message: "Bookmark not found" });
      }
      
      // Ensure the user is the owner
      if (bookmark.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to delete this bookmark" });
      }
      
      await storage.deleteBookmark(bookmarkId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete bookmark" });
    }
  });

  // Reaction routes
  app.get("/api/reaction-types", async (req, res) => {
    try {
      const reactionTypes = await storage.getReactionTypes();
      res.json(reactionTypes);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reaction types" });
    }
  });

  app.post("/api/reactions", isAuthenticated, async (req, res) => {
    try {
      const reactionData = insertReactionSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      const reaction = await storage.createReaction(reactionData);
      
      const reactionType = await storage.reactionTypes.get(reaction.reactionTypeId);
      res.status(201).json({ ...reaction, reactionType });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid reaction data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create reaction" });
    }
  });

  app.delete("/api/reactions/:id", isAuthenticated, async (req, res) => {
    try {
      const reactionId = parseInt(req.params.id);
      const reaction = await storage.reactions.get(reactionId);
      
      if (!reaction) {
        return res.status(404).json({ message: "Reaction not found" });
      }
      
      // Ensure the user is the owner
      if (reaction.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to delete this reaction" });
      }
      
      await storage.deleteReaction(reactionId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete reaction" });
    }
  });

  // Draft routes
  app.get("/api/drafts", isAuthenticated, async (req, res) => {
    try {
      const drafts = await storage.getUserDrafts(req.user!.id);
      res.json(drafts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch drafts" });
    }
  });

  app.post("/api/drafts", isAuthenticated, async (req, res) => {
    try {
      const draftData = insertDraftSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      
      const draft = await storage.createDraft(draftData);
      res.status(201).json(draft);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid draft data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create draft" });
    }
  });

  app.put("/api/drafts/:id", isAuthenticated, async (req, res) => {
    try {
      const draftId = parseInt(req.params.id);
      const draft = await storage.getDraft(draftId);
      
      if (!draft) {
        return res.status(404).json({ message: "Draft not found" });
      }
      
      // Ensure the user is the owner
      if (draft.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to update this draft" });
      }
      
      const updatedDraft = await storage.updateDraft(draftId, req.body);
      res.json(updatedDraft);
    } catch (error) {
      res.status(500).json({ message: "Failed to update draft" });
    }
  });

  app.delete("/api/drafts/:id", isAuthenticated, async (req, res) => {
    try {
      const draftId = parseInt(req.params.id);
      const draft = await storage.getDraft(draftId);
      
      if (!draft) {
        return res.status(404).json({ message: "Draft not found" });
      }
      
      // Ensure the user is the owner
      if (draft.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to delete this draft" });
      }
      
      await storage.deleteDraft(draftId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete draft" });
    }
  });

  // Analytics routes
  app.get("/api/threads/:id/analytics", isAuthenticated, async (req, res) => {
    try {
      const threadId = parseInt(req.params.id);
      const thread = await storage.getThread(threadId);
      
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      // Ensure the user is the author
      if (thread.authorId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to view analytics for this thread" });
      }
      
      const analytics = await storage.getThreadAnalytics(threadId);
      
      if (!analytics) {
        return res.status(404).json({ message: "Analytics not found" });
      }
      
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // User profile route
  app.get("/api/users/:username", async (req, res) => {
    try {
      const username = req.params.username;
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password
      const { password, ...userWithoutPassword } = user;
      
      // Get user's published threads
      const threads = await storage.getThreadsByAuthor(user.id);
      const publishedThreads = threads.filter(thread => thread.isPublished);
      
      res.json({
        ...userWithoutPassword,
        threads: publishedThreads
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
