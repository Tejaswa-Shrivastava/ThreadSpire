import { 
  User, InsertUser, Thread, InsertThread, 
  ThreadSegment, InsertThreadSegment, Tag, InsertTag,
  ThreadTag, InsertThreadTag, Collection, InsertCollection,
  Bookmark, InsertBookmark, ReactionType, InsertReactionType,
  Reaction, InsertReaction, Draft, InsertDraft, Analytics,
  ThreadWithDetails, CollectionWithThreads,
  users, threads, threadSegments, tags, threadTags, collections,
  bookmarks, reactionTypes, reactions, drafts, analytics
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { eq, and, desc, asc, count, sql, inArray } from "drizzle-orm";
import { db, pool } from "./db";

// Extend SessionData interface if needed
declare module "express-session" {
  interface SessionData {
    // Add custom session properties here if needed
    userId?: number;
  }
}

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Storage interface for all database operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;

  // Thread operations
  getThread(id: number): Promise<ThreadWithDetails | undefined>;
  getThreads(limit?: number, offset?: number): Promise<ThreadWithDetails[]>;
  getThreadsByAuthor(authorId: number): Promise<ThreadWithDetails[]>;
  getThreadsByTag(tagId: number): Promise<ThreadWithDetails[]>;
  createThread(thread: InsertThread): Promise<Thread>;
  updateThread(id: number, thread: Partial<Thread>): Promise<Thread | undefined>;
  deleteThread(id: number): Promise<boolean>;
  forkThread(id: number, authorId: number): Promise<Thread | undefined>;

  // Thread segment operations
  getThreadSegments(threadId: number): Promise<ThreadSegment[]>;
  createThreadSegment(segment: InsertThreadSegment): Promise<ThreadSegment>;
  updateThreadSegment(id: number, segment: Partial<ThreadSegment>): Promise<ThreadSegment | undefined>;
  deleteThreadSegment(id: number): Promise<boolean>;

  // Tag operations
  getTag(id: number): Promise<Tag | undefined>;
  getTagByName(name: string): Promise<Tag | undefined>;
  getTags(): Promise<Tag[]>;
  createTag(tag: InsertTag): Promise<Tag>;
  addTagToThread(threadTag: InsertThreadTag): Promise<ThreadTag>;
  removeTagFromThread(threadId: number, tagId: number): Promise<boolean>;
  getThreadTags(threadId: number): Promise<Tag[]>;

  // Collection operations
  getCollection(id: number): Promise<Collection | undefined>;
  getUserCollections(userId: number): Promise<CollectionWithThreads[]>;
  createCollection(collection: InsertCollection): Promise<Collection>;
  updateCollection(id: number, collection: Partial<Collection>): Promise<Collection | undefined>;
  deleteCollection(id: number): Promise<boolean>;

  // Bookmark operations
  getBookmarks(userId: number): Promise<Bookmark[]>;
  getBookmarksByCollection(collectionId: number): Promise<Bookmark[]>;
  createBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  deleteBookmark(id: number): Promise<boolean>;
  isThreadBookmarked(threadId: number, userId: number): Promise<boolean>;

  // Reaction operations
  getReactionTypes(): Promise<ReactionType[]>;
  createReactionType(reactionType: InsertReactionType): Promise<ReactionType>;
  getThreadReactions(threadId: number): Promise<(Reaction & { reactionType: ReactionType })[]>;
  createReaction(reaction: InsertReaction): Promise<Reaction>;
  deleteReaction(id: number): Promise<boolean>;
  getUserReactionToThread(threadId: number, userId: number, reactionTypeId: number): Promise<Reaction | undefined>;

  // Draft operations
  getDraft(id: number): Promise<Draft | undefined>;
  getUserDrafts(userId: number): Promise<Draft[]>;
  createDraft(draft: InsertDraft): Promise<Draft>;
  updateDraft(id: number, draft: Partial<Draft>): Promise<Draft | undefined>;
  deleteDraft(id: number): Promise<boolean>;

  // Analytics operations
  getThreadAnalytics(threadId: number): Promise<Analytics | undefined>;
  incrementThreadViews(threadId: number): Promise<Analytics | undefined>;
  updateThreadAnalytics(threadId: number, analytics: Partial<Analytics>): Promise<Analytics | undefined>;

  // Session store
  sessionStore: any; // Using any to avoid type issues with session store
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private threads: Map<number, Thread>;
  private threadSegments: Map<number, ThreadSegment>;
  private tags: Map<number, Tag>;
  private threadTags: Map<number, ThreadTag>;
  private collections: Map<number, Collection>;
  private bookmarks: Map<number, Bookmark>;
  private reactionTypes: Map<number, ReactionType>;
  private reactions: Map<number, Reaction>;
  private drafts: Map<number, Draft>;
  private analytics: Map<number, Analytics>;
  
  private userId: number = 1;
  private threadId: number = 1;
  private segmentId: number = 1;
  private tagId: number = 1;
  private threadTagId: number = 1;
  private collectionId: number = 1;
  private bookmarkId: number = 1;
  private reactionTypeId: number = 1;
  private reactionId: number = 1;
  private draftId: number = 1;
  private analyticsId: number = 1;

  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.threads = new Map();
    this.threadSegments = new Map();
    this.tags = new Map();
    this.threadTags = new Map();
    this.collections = new Map();
    this.bookmarks = new Map();
    this.reactionTypes = new Map();
    this.reactions = new Map();
    this.drafts = new Map();
    this.analytics = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });

    // Initialize default reaction types
    this.initializeReactionTypes();
  }

  private initializeReactionTypes() {
    const defaultReactions: InsertReactionType[] = [
      { name: "like", emoji: "👍" },
      { name: "love", emoji: "❤️" },
      { name: "insightful", emoji: "💡" },
      { name: "curious", emoji: "🤔" },
      { name: "celebrate", emoji: "🎉" }
    ];

    defaultReactions.forEach(reaction => {
      this.createReactionType(reaction);
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Thread operations
  async getThread(id: number): Promise<ThreadWithDetails | undefined> {
    const thread = this.threads.get(id);
    if (!thread) return undefined;

    const author = await this.getUser(thread.authorId);
    if (!author) return undefined;

    const segments = await this.getThreadSegments(id);
    const tags = await this.getThreadTags(id);
    const reactions = await this.getThreadReactions(id);

    return {
      ...thread,
      author,
      segments,
      tags,
      reactions,
    };
  }

  async getThreads(limit: number = 20, offset: number = 0): Promise<ThreadWithDetails[]> {
    const threads = Array.from(this.threads.values())
      .filter(thread => thread.isPublished)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    const threadsWithDetails = await Promise.all(
      threads.map(async (thread) => {
        const author = await this.getUser(thread.authorId);
        const segments = await this.getThreadSegments(thread.id);
        const tags = await this.getThreadTags(thread.id);
        const reactions = await this.getThreadReactions(thread.id);

        return {
          ...thread,
          author: author!,
          segments,
          tags,
          reactions,
        };
      })
    );

    return threadsWithDetails;
  }

  async getThreadsByAuthor(authorId: number): Promise<ThreadWithDetails[]> {
    const threads = Array.from(this.threads.values())
      .filter(thread => thread.authorId === authorId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const threadsWithDetails = await Promise.all(
      threads.map(async (thread) => {
        const author = await this.getUser(thread.authorId);
        const segments = await this.getThreadSegments(thread.id);
        const tags = await this.getThreadTags(thread.id);
        const reactions = await this.getThreadReactions(thread.id);

        return {
          ...thread,
          author: author!,
          segments,
          tags,
          reactions,
        };
      })
    );

    return threadsWithDetails;
  }

  async getThreadsByTag(tagId: number): Promise<ThreadWithDetails[]> {
    const threadTags = Array.from(this.threadTags.values())
      .filter(tt => tt.tagId === tagId);
    
    const threadIds = threadTags.map(tt => tt.threadId);
    
    const threads = Array.from(this.threads.values())
      .filter(thread => threadIds.includes(thread.id) && thread.isPublished)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const threadsWithDetails = await Promise.all(
      threads.map(async (thread) => {
        const author = await this.getUser(thread.authorId);
        const segments = await this.getThreadSegments(thread.id);
        const tags = await this.getThreadTags(thread.id);
        const reactions = await this.getThreadReactions(thread.id);

        return {
          ...thread,
          author: author!,
          segments,
          tags,
          reactions,
        };
      })
    );

    return threadsWithDetails;
  }

  async createThread(insertThread: InsertThread): Promise<Thread> {
    const id = this.threadId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    const thread: Thread = { 
      ...insertThread, 
      id, 
      createdAt, 
      updatedAt 
    };
    
    this.threads.set(id, thread);

    // Create analytics entry for the thread
    this.analytics.set(this.analyticsId++, {
      id: this.analyticsId,
      threadId: id,
      views: 0,
      uniqueVisitors: 0,
      totalReactions: 0,
      lastUpdated: new Date()
    });
    
    return thread;
  }

  async updateThread(id: number, updates: Partial<Thread>): Promise<Thread | undefined> {
    const thread = this.threads.get(id);
    if (!thread) return undefined;
    
    const updatedThread: Thread = { 
      ...thread, 
      ...updates, 
      updatedAt: new Date() 
    };
    
    this.threads.set(id, updatedThread);
    return updatedThread;
  }

  async deleteThread(id: number): Promise<boolean> {
    const thread = this.threads.get(id);
    if (!thread) return false;
    
    // Delete associated segments
    const segments = await this.getThreadSegments(id);
    segments.forEach(segment => {
      this.threadSegments.delete(segment.id);
    });
    
    // Delete associated thread tags
    const threadTagsToDelete = Array.from(this.threadTags.values())
      .filter(tt => tt.threadId === id);
    threadTagsToDelete.forEach(tt => {
      this.threadTags.delete(tt.id);
    });
    
    // Delete associated bookmarks
    const bookmarksToDelete = Array.from(this.bookmarks.values())
      .filter(b => b.threadId === id);
    bookmarksToDelete.forEach(b => {
      this.bookmarks.delete(b.id);
    });
    
    // Delete associated reactions
    const reactionsToDelete = Array.from(this.reactions.values())
      .filter(r => r.threadId === id);
    reactionsToDelete.forEach(r => {
      this.reactions.delete(r.id);
    });
    
    // Delete associated analytics
    const analyticsToDelete = Array.from(this.analytics.values())
      .filter(a => a.threadId === id);
    analyticsToDelete.forEach(a => {
      this.analytics.delete(a.id);
    });
    
    // Delete the thread
    this.threads.delete(id);
    return true;
  }

  async forkThread(id: number, authorId: number): Promise<Thread | undefined> {
    const originalThread = this.threads.get(id);
    if (!originalThread) return undefined;
    
    // Create a new thread as a fork
    const forkedThread = await this.createThread({
      title: `Fork of: ${originalThread.title}`,
      description: originalThread.description,
      authorId,
      isPublished: false,
      forkedFromId: id
    });
    
    // Copy all segments
    const originalSegments = await this.getThreadSegments(id);
    for (const segment of originalSegments) {
      await this.createThreadSegment({
        threadId: forkedThread.id,
        content: segment.content,
        richContent: segment.richContent,
        order: segment.order
      });
    }
    
    // Copy all tags
    const originalTags = await this.getThreadTags(id);
    for (const tag of originalTags) {
      const existingTag = await this.getTagByName(tag.name) || await this.createTag({ name: tag.name });
      await this.addTagToThread({
        threadId: forkedThread.id,
        tagId: existingTag.id
      });
    }
    
    return forkedThread;
  }

  // Thread segment operations
  async getThreadSegments(threadId: number): Promise<ThreadSegment[]> {
    return Array.from(this.threadSegments.values())
      .filter(segment => segment.threadId === threadId)
      .sort((a, b) => a.order - b.order);
  }

  async createThreadSegment(insertSegment: InsertThreadSegment): Promise<ThreadSegment> {
    const id = this.segmentId++;
    const createdAt = new Date();
    const updatedAt = new Date();
    
    const segment: ThreadSegment = { 
      ...insertSegment, 
      id, 
      createdAt, 
      updatedAt 
    };
    
    this.threadSegments.set(id, segment);
    return segment;
  }

  async updateThreadSegment(id: number, updates: Partial<ThreadSegment>): Promise<ThreadSegment | undefined> {
    const segment = this.threadSegments.get(id);
    if (!segment) return undefined;
    
    const updatedSegment: ThreadSegment = { 
      ...segment, 
      ...updates, 
      updatedAt: new Date() 
    };
    
    this.threadSegments.set(id, updatedSegment);
    return updatedSegment;
  }

  async deleteThreadSegment(id: number): Promise<boolean> {
    const segment = this.threadSegments.get(id);
    if (!segment) return false;
    
    this.threadSegments.delete(id);
    return true;
  }

  // Tag operations
  async getTag(id: number): Promise<Tag | undefined> {
    return this.tags.get(id);
  }

  async getTagByName(name: string): Promise<Tag | undefined> {
    return Array.from(this.tags.values()).find(
      tag => tag.name.toLowerCase() === name.toLowerCase()
    );
  }

  async getTags(): Promise<Tag[]> {
    return Array.from(this.tags.values());
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    const id = this.tagId++;
    const tag: Tag = { ...insertTag, id };
    this.tags.set(id, tag);
    return tag;
  }

  async addTagToThread(insertThreadTag: InsertThreadTag): Promise<ThreadTag> {
    // Check if this tag is already on the thread
    const existingTag = Array.from(this.threadTags.values()).find(
      tt => tt.threadId === insertThreadTag.threadId && tt.tagId === insertThreadTag.tagId
    );
    
    if (existingTag) return existingTag;
    
    const id = this.threadTagId++;
    const threadTag: ThreadTag = { ...insertThreadTag, id };
    this.threadTags.set(id, threadTag);
    return threadTag;
  }

  async removeTagFromThread(threadId: number, tagId: number): Promise<boolean> {
    const threadTagToRemove = Array.from(this.threadTags.values()).find(
      tt => tt.threadId === threadId && tt.tagId === tagId
    );
    
    if (!threadTagToRemove) return false;
    
    this.threadTags.delete(threadTagToRemove.id);
    return true;
  }

  async getThreadTags(threadId: number): Promise<Tag[]> {
    const threadTagIds = Array.from(this.threadTags.values())
      .filter(tt => tt.threadId === threadId)
      .map(tt => tt.tagId);
    
    return Array.from(this.tags.values())
      .filter(tag => threadTagIds.includes(tag.id));
  }

  // Collection operations
  async getCollection(id: number): Promise<Collection | undefined> {
    return this.collections.get(id);
  }

  async getUserCollections(userId: number): Promise<CollectionWithThreads[]> {
    const collections = Array.from(this.collections.values())
      .filter(collection => collection.userId === userId);
    
    const collectionsWithThreads = await Promise.all(
      collections.map(async (collection) => {
        const bookmarks = await this.getBookmarksByCollection(collection.id);
        const threadIds = bookmarks.map(b => b.threadId);
        
        const threads = await Promise.all(
          threadIds.map(async (id) => this.getThread(id))
        );
        
        return {
          ...collection,
          threads: threads.filter((t): t is ThreadWithDetails => t !== undefined)
        };
      })
    );
    
    return collectionsWithThreads;
  }

  async createCollection(insertCollection: InsertCollection): Promise<Collection> {
    const id = this.collectionId++;
    const createdAt = new Date();
    
    const collection: Collection = { 
      ...insertCollection, 
      id, 
      createdAt 
    };
    
    this.collections.set(id, collection);
    return collection;
  }

  async updateCollection(id: number, updates: Partial<Collection>): Promise<Collection | undefined> {
    const collection = this.collections.get(id);
    if (!collection) return undefined;
    
    const updatedCollection: Collection = { 
      ...collection, 
      ...updates
    };
    
    this.collections.set(id, updatedCollection);
    return updatedCollection;
  }

  async deleteCollection(id: number): Promise<boolean> {
    const collection = this.collections.get(id);
    if (!collection) return false;
    
    // Update bookmarks in this collection to remove collection reference
    const bookmarksToUpdate = Array.from(this.bookmarks.values())
      .filter(b => b.collectionId === id);
    
    bookmarksToUpdate.forEach(bookmark => {
      const updatedBookmark = { ...bookmark, collectionId: null };
      this.bookmarks.set(bookmark.id, updatedBookmark as Bookmark);
    });
    
    this.collections.delete(id);
    return true;
  }

  // Bookmark operations
  async getBookmarks(userId: number): Promise<Bookmark[]> {
    return Array.from(this.bookmarks.values())
      .filter(bookmark => bookmark.userId === userId);
  }

  async getBookmarksByCollection(collectionId: number): Promise<Bookmark[]> {
    return Array.from(this.bookmarks.values())
      .filter(bookmark => bookmark.collectionId === collectionId);
  }

  async createBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    // Check if bookmark already exists
    const existingBookmark = Array.from(this.bookmarks.values()).find(
      b => b.threadId === insertBookmark.threadId && b.userId === insertBookmark.userId
    );
    
    if (existingBookmark) {
      // Update collection if needed
      if (insertBookmark.collectionId !== existingBookmark.collectionId) {
        const updatedBookmark = { 
          ...existingBookmark, 
          collectionId: insertBookmark.collectionId 
        };
        this.bookmarks.set(existingBookmark.id, updatedBookmark);
        return updatedBookmark;
      }
      return existingBookmark;
    }
    
    const id = this.bookmarkId++;
    const createdAt = new Date();
    
    const bookmark: Bookmark = { 
      ...insertBookmark, 
      id, 
      createdAt 
    };
    
    this.bookmarks.set(id, bookmark);
    return bookmark;
  }

  async deleteBookmark(id: number): Promise<boolean> {
    const bookmark = this.bookmarks.get(id);
    if (!bookmark) return false;
    
    this.bookmarks.delete(id);
    return true;
  }

  async isThreadBookmarked(threadId: number, userId: number): Promise<boolean> {
    return Array.from(this.bookmarks.values()).some(
      bookmark => bookmark.threadId === threadId && bookmark.userId === userId
    );
  }

  // Reaction operations
  async getReactionTypes(): Promise<ReactionType[]> {
    return Array.from(this.reactionTypes.values());
  }

  async createReactionType(insertReactionType: InsertReactionType): Promise<ReactionType> {
    const id = this.reactionTypeId++;
    const reactionType: ReactionType = { ...insertReactionType, id };
    this.reactionTypes.set(id, reactionType);
    return reactionType;
  }

  async getThreadReactions(threadId: number): Promise<(Reaction & { reactionType: ReactionType })[]> {
    const reactions = Array.from(this.reactions.values())
      .filter(reaction => reaction.threadId === threadId);
    
    return reactions.map(reaction => {
      const reactionType = this.reactionTypes.get(reaction.reactionTypeId)!;
      return { ...reaction, reactionType };
    });
  }

  async createReaction(insertReaction: InsertReaction): Promise<Reaction> {
    // Check if user already reacted with this type
    const existingReaction = await this.getUserReactionToThread(
      insertReaction.threadId, 
      insertReaction.userId, 
      insertReaction.reactionTypeId
    );
    
    if (existingReaction) {
      return existingReaction;
    }
    
    const id = this.reactionId++;
    const createdAt = new Date();
    
    const reaction: Reaction = { 
      ...insertReaction, 
      id, 
      createdAt 
    };
    
    this.reactions.set(id, reaction);
    
    // Update analytics
    const threadAnalytics = await this.getThreadAnalytics(insertReaction.threadId);
    if (threadAnalytics) {
      await this.updateThreadAnalytics(insertReaction.threadId, {
        totalReactions: threadAnalytics.totalReactions + 1,
        lastUpdated: new Date()
      });
    }
    
    return reaction;
  }

  async deleteReaction(id: number): Promise<boolean> {
    const reaction = this.reactions.get(id);
    if (!reaction) return false;
    
    this.reactions.delete(id);
    
    // Update analytics
    const threadAnalytics = await this.getThreadAnalytics(reaction.threadId);
    if (threadAnalytics && threadAnalytics.totalReactions > 0) {
      await this.updateThreadAnalytics(reaction.threadId, {
        totalReactions: threadAnalytics.totalReactions - 1,
        lastUpdated: new Date()
      });
    }
    
    return true;
  }

  async getUserReactionToThread(threadId: number, userId: number, reactionTypeId: number): Promise<Reaction | undefined> {
    return Array.from(this.reactions.values()).find(
      reaction => reaction.threadId === threadId && 
                reaction.userId === userId && 
                reaction.reactionTypeId === reactionTypeId
    );
  }

  // Draft operations
  async getDraft(id: number): Promise<Draft | undefined> {
    return this.drafts.get(id);
  }

  async getUserDrafts(userId: number): Promise<Draft[]> {
    return Array.from(this.drafts.values())
      .filter(draft => draft.userId === userId)
      .sort((a, b) => b.lastSaved.getTime() - a.lastSaved.getTime());
  }

  async createDraft(insertDraft: InsertDraft): Promise<Draft> {
    const id = this.draftId++;
    const lastSaved = new Date();
    
    const draft: Draft = { 
      ...insertDraft, 
      id, 
      lastSaved 
    };
    
    this.drafts.set(id, draft);
    return draft;
  }

  async updateDraft(id: number, updates: Partial<Draft>): Promise<Draft | undefined> {
    const draft = this.drafts.get(id);
    if (!draft) return undefined;
    
    const updatedDraft: Draft = { 
      ...draft, 
      ...updates, 
      lastSaved: new Date() 
    };
    
    this.drafts.set(id, updatedDraft);
    return updatedDraft;
  }

  async deleteDraft(id: number): Promise<boolean> {
    const draft = this.drafts.get(id);
    if (!draft) return false;
    
    this.drafts.delete(id);
    return true;
  }

  // Analytics operations
  async getThreadAnalytics(threadId: number): Promise<Analytics | undefined> {
    return Array.from(this.analytics.values())
      .find(a => a.threadId === threadId);
  }

  async incrementThreadViews(threadId: number): Promise<Analytics | undefined> {
    const analytics = Array.from(this.analytics.values())
      .find(a => a.threadId === threadId);
    
    if (!analytics) return undefined;
    
    const updatedAnalytics: Analytics = {
      ...analytics,
      views: analytics.views + 1,
      lastUpdated: new Date()
    };
    
    this.analytics.set(analytics.id, updatedAnalytics);
    return updatedAnalytics;
  }

  async updateThreadAnalytics(threadId: number, updates: Partial<Analytics>): Promise<Analytics | undefined> {
    const analytics = Array.from(this.analytics.values())
      .find(a => a.threadId === threadId);
    
    if (!analytics) return undefined;
    
    const updatedAnalytics: Analytics = {
      ...analytics,
      ...updates,
      lastUpdated: new Date()
    };
    
    this.analytics.set(analytics.id, updatedAnalytics);
    return updatedAnalytics;
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
    // We'll initialize reaction types after tables are created
  }

  private async initializeReactionTypes() {
    const existingTypes = await db.select().from(reactionTypes);
    if (existingTypes.length === 0) {
      const defaultReactions: InsertReactionType[] = [
        { name: "like", emoji: "👍" },
        { name: "love", emoji: "❤️" },
        { name: "insightful", emoji: "💡" },
        { name: "curious", emoji: "🤔" },
        { name: "celebrate", emoji: "🎉" }
      ];

      for (const reaction of defaultReactions) {
        await this.createReactionType(reaction);
      }
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  // Thread operations
  async getThread(id: number): Promise<ThreadWithDetails | undefined> {
    const [thread] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, id));

    if (!thread) return undefined;

    const author = await this.getUser(thread.authorId);
    if (!author) return undefined;

    const segments = await this.getThreadSegments(id);
    const tags = await this.getThreadTags(id);
    const reactions = await this.getThreadReactions(id);

    return {
      ...thread,
      author,
      segments,
      tags,
      reactions,
    };
  }

  async getThreads(limit: number = 20, offset: number = 0): Promise<ThreadWithDetails[]> {
    const threadsData = await db
      .select()
      .from(threads)
      .where(eq(threads.isPublished, true))
      .orderBy(desc(threads.createdAt))
      .limit(limit)
      .offset(offset);

    const threadsWithDetails = await Promise.all(
      threadsData.map(async (thread) => {
        const author = await this.getUser(thread.authorId);
        const segments = await this.getThreadSegments(thread.id);
        const tags = await this.getThreadTags(thread.id);
        const reactions = await this.getThreadReactions(thread.id);

        return {
          ...thread,
          author: author!,
          segments,
          tags,
          reactions,
        };
      })
    );

    return threadsWithDetails;
  }

  async getThreadsByAuthor(authorId: number): Promise<ThreadWithDetails[]> {
    const threadsData = await db
      .select()
      .from(threads)
      .where(eq(threads.authorId, authorId))
      .orderBy(desc(threads.createdAt));

    const threadsWithDetails = await Promise.all(
      threadsData.map(async (thread) => {
        const author = await this.getUser(thread.authorId);
        const segments = await this.getThreadSegments(thread.id);
        const tags = await this.getThreadTags(thread.id);
        const reactions = await this.getThreadReactions(thread.id);

        return {
          ...thread,
          author: author!,
          segments,
          tags,
          reactions,
        };
      })
    );

    return threadsWithDetails;
  }

  async getThreadsByTag(tagId: number): Promise<ThreadWithDetails[]> {
    const threadTagsData = await db
      .select()
      .from(threadTags)
      .where(eq(threadTags.tagId, tagId));

    const threadIds = threadTagsData.map(tt => tt.threadId);

    if (threadIds.length === 0) return [];

    const threadsData = await db
      .select()
      .from(threads)
      .where(and(
        inArray(threads.id, threadIds),
        eq(threads.isPublished, true)
      ))
      .orderBy(desc(threads.createdAt));

    const threadsWithDetails = await Promise.all(
      threadsData.map(async (thread) => {
        const author = await this.getUser(thread.authorId);
        const segments = await this.getThreadSegments(thread.id);
        const tags = await this.getThreadTags(thread.id);
        const reactions = await this.getThreadReactions(thread.id);

        return {
          ...thread,
          author: author!,
          segments,
          tags,
          reactions,
        };
      })
    );

    return threadsWithDetails;
  }

  async createThread(insertThread: InsertThread): Promise<Thread> {
    const [thread] = await db
      .insert(threads)
      .values(insertThread)
      .returning();

    // Create analytics entry for the thread
    await db
      .insert(analytics)
      .values({
        threadId: thread.id,
        views: 0,
        uniqueVisitors: 0,
        totalReactions: 0,
        lastUpdated: new Date()
      });

    return thread;
  }

  async updateThread(id: number, updates: Partial<Thread>): Promise<Thread | undefined> {
    const [updatedThread] = await db
      .update(threads)
      .set(updates)
      .where(eq(threads.id, id))
      .returning();

    return updatedThread || undefined;
  }

  async deleteThread(id: number): Promise<boolean> {
    // Delete associated segments
    await db
      .delete(threadSegments)
      .where(eq(threadSegments.threadId, id));

    // Delete associated threadTags
    await db
      .delete(threadTags)
      .where(eq(threadTags.threadId, id));

    // Delete associated bookmarks
    await db
      .delete(bookmarks)
      .where(eq(bookmarks.threadId, id));

    // Delete associated reactions
    await db
      .delete(reactions)
      .where(eq(reactions.threadId, id));

    // Delete associated analytics
    await db
      .delete(analytics)
      .where(eq(analytics.threadId, id));

    // Delete the thread
    const result = await db
      .delete(threads)
      .where(eq(threads.id, id));

    return result.count > 0;
  }

  async forkThread(id: number, authorId: number): Promise<Thread | undefined> {
    const [originalThread] = await db
      .select()
      .from(threads)
      .where(eq(threads.id, id));

    if (!originalThread) return undefined;

    // Create a new thread as a fork
    const [forkedThread] = await db
      .insert(threads)
      .values({
        title: `Fork of: ${originalThread.title}`,
        description: originalThread.description,
        authorId,
        isPublished: false,
        forkedFromId: id
      })
      .returning();

    // Copy all segments
    const originalSegments = await this.getThreadSegments(id);
    for (const segment of originalSegments) {
      await this.createThreadSegment({
        threadId: forkedThread.id,
        content: segment.content,
        richContent: segment.richContent,
        order: segment.order
      });
    }

    // Copy all tags
    const originalTags = await this.getThreadTags(id);
    for (const tag of originalTags) {
      const existingTag = await this.getTagByName(tag.name) || await this.createTag({ name: tag.name });
      await this.addTagToThread({
        threadId: forkedThread.id,
        tagId: existingTag.id
      });
    }

    return forkedThread;
  }

  // Thread segment operations
  async getThreadSegments(threadId: number): Promise<ThreadSegment[]> {
    return db
      .select()
      .from(threadSegments)
      .where(eq(threadSegments.threadId, threadId))
      .orderBy(asc(threadSegments.order));
  }

  async createThreadSegment(insertSegment: InsertThreadSegment): Promise<ThreadSegment> {
    const [segment] = await db
      .insert(threadSegments)
      .values(insertSegment)
      .returning();

    return segment;
  }

  async updateThreadSegment(id: number, updates: Partial<ThreadSegment>): Promise<ThreadSegment | undefined> {
    const [updatedSegment] = await db
      .update(threadSegments)
      .set(updates)
      .where(eq(threadSegments.id, id))
      .returning();

    return updatedSegment || undefined;
  }

  async deleteThreadSegment(id: number): Promise<boolean> {
    const result = await db
      .delete(threadSegments)
      .where(eq(threadSegments.id, id));

    return result.count > 0;
  }

  // Tag operations
  async getTag(id: number): Promise<Tag | undefined> {
    const [tag] = await db
      .select()
      .from(tags)
      .where(eq(tags.id, id));

    return tag || undefined;
  }

  async getTagByName(name: string): Promise<Tag | undefined> {
    const [tag] = await db
      .select()
      .from(tags)
      .where(eq(tags.name, name));

    return tag || undefined;
  }

  async getTags(): Promise<Tag[]> {
    return db.select().from(tags);
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    const [tag] = await db
      .insert(tags)
      .values(insertTag)
      .returning();

    return tag;
  }

  async addTagToThread(insertThreadTag: InsertThreadTag): Promise<ThreadTag> {
    // Check if this tag is already on the thread
    const [existingThreadTag] = await db
      .select()
      .from(threadTags)
      .where(and(
        eq(threadTags.threadId, insertThreadTag.threadId),
        eq(threadTags.tagId, insertThreadTag.tagId)
      ));

    if (existingThreadTag) return existingThreadTag;

    const [threadTag] = await db
      .insert(threadTags)
      .values(insertThreadTag)
      .returning();

    return threadTag;
  }

  async removeTagFromThread(threadId: number, tagId: number): Promise<boolean> {
    const result = await db
      .delete(threadTags)
      .where(and(
        eq(threadTags.threadId, threadId),
        eq(threadTags.tagId, tagId)
      ));

    return result.count > 0;
  }

  async getThreadTags(threadId: number): Promise<Tag[]> {
    const threadTagsData = await db
      .select()
      .from(threadTags)
      .where(eq(threadTags.threadId, threadId));

    if (threadTagsData.length === 0) return [];

    const tagIds = threadTagsData.map(tt => tt.tagId);

    return db
      .select()
      .from(tags)
      .where(inArray(tags.id, tagIds));
  }

  // Collection operations
  async getCollection(id: number): Promise<Collection | undefined> {
    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, id));

    return collection || undefined;
  }

  async getUserCollections(userId: number): Promise<CollectionWithThreads[]> {
    const collectionsData = await db
      .select()
      .from(collections)
      .where(eq(collections.userId, userId));

    const collectionsWithThreads = await Promise.all(
      collectionsData.map(async (collection) => {
        const bookmarksData = await this.getBookmarksByCollection(collection.id);
        const threadIds = bookmarksData.map(b => b.threadId);

        const threads: ThreadWithDetails[] = [];
        for (const threadId of threadIds) {
          const thread = await this.getThread(threadId);
          if (thread) threads.push(thread);
        }

        return {
          ...collection,
          threads
        };
      })
    );

    return collectionsWithThreads;
  }

  async createCollection(insertCollection: InsertCollection): Promise<Collection> {
    const [collection] = await db
      .insert(collections)
      .values(insertCollection)
      .returning();

    return collection;
  }

  async updateCollection(id: number, updates: Partial<Collection>): Promise<Collection | undefined> {
    const [updatedCollection] = await db
      .update(collections)
      .set(updates)
      .where(eq(collections.id, id))
      .returning();

    return updatedCollection || undefined;
  }

  async deleteCollection(id: number): Promise<boolean> {
    // Delete associated bookmarks
    await db
      .delete(bookmarks)
      .where(eq(bookmarks.collectionId, id));

    const result = await db
      .delete(collections)
      .where(eq(collections.id, id));

    return result.count > 0;
  }

  // Bookmark operations
  async getBookmarks(userId: number): Promise<Bookmark[]> {
    return db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId));
  }

  async getBookmarksByCollection(collectionId: number): Promise<Bookmark[]> {
    return db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.collectionId, collectionId));
  }

  async createBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    const [bookmark] = await db
      .insert(bookmarks)
      .values(insertBookmark)
      .returning();

    return bookmark;
  }

  async deleteBookmark(id: number): Promise<boolean> {
    const result = await db
      .delete(bookmarks)
      .where(eq(bookmarks.id, id));

    return result.count > 0;
  }

  async isThreadBookmarked(threadId: number, userId: number): Promise<boolean> {
    const [bookmark] = await db
      .select()
      .from(bookmarks)
      .where(and(
        eq(bookmarks.threadId, threadId),
        eq(bookmarks.userId, userId)
      ));

    return !!bookmark;
  }

  // Reaction operations
  async getReactionTypes(): Promise<ReactionType[]> {
    return db.select().from(reactionTypes);
  }

  async createReactionType(insertReactionType: InsertReactionType): Promise<ReactionType> {
    const [reactionType] = await db
      .insert(reactionTypes)
      .values(insertReactionType)
      .returning();

    return reactionType;
  }

  async getThreadReactions(threadId: number): Promise<(Reaction & { reactionType: ReactionType })[]> {
    const reactionsData = await db
      .select()
      .from(reactions)
      .where(eq(reactions.threadId, threadId));

    const reactionsWithType = await Promise.all(
      reactionsData.map(async (reaction) => {
        const [reactionType] = await db
          .select()
          .from(reactionTypes)
          .where(eq(reactionTypes.id, reaction.reactionTypeId));

        return {
          ...reaction,
          reactionType
        };
      })
    );

    return reactionsWithType;
  }

  async createReaction(insertReaction: InsertReaction): Promise<Reaction> {
    const [reaction] = await db
      .insert(reactions)
      .values(insertReaction)
      .returning();

    // Update analytics
    const [analytics] = await db
      .select()
      .from(analytics)
      .where(eq(analytics.threadId, insertReaction.threadId));

    if (analytics) {
      await db
        .update(analytics)
        .set({
          totalReactions: analytics.totalReactions + 1,
          lastUpdated: new Date()
        })
        .where(eq(analytics.threadId, insertReaction.threadId));
    }

    return reaction;
  }

  async deleteReaction(id: number): Promise<boolean> {
    const [reaction] = await db
      .select()
      .from(reactions)
      .where(eq(reactions.id, id));

    if (!reaction) return false;

    const result = await db
      .delete(reactions)
      .where(eq(reactions.id, id));

    // Update analytics
    const [analyticsData] = await db
      .select()
      .from(analytics)
      .where(eq(analytics.threadId, reaction.threadId));

    if (analyticsData && analyticsData.totalReactions > 0) {
      await db
        .update(analytics)
        .set({
          totalReactions: analyticsData.totalReactions - 1,
          lastUpdated: new Date()
        })
        .where(eq(analytics.threadId, reaction.threadId));
    }

    return result.count > 0;
  }

  async getUserReactionToThread(threadId: number, userId: number, reactionTypeId: number): Promise<Reaction | undefined> {
    const [reaction] = await db
      .select()
      .from(reactions)
      .where(and(
        eq(reactions.threadId, threadId),
        eq(reactions.userId, userId),
        eq(reactions.reactionTypeId, reactionTypeId)
      ));

    return reaction || undefined;
  }

  // Draft operations
  async getDraft(id: number): Promise<Draft | undefined> {
    const [draft] = await db
      .select()
      .from(drafts)
      .where(eq(drafts.id, id));

    return draft || undefined;
  }

  async getUserDrafts(userId: number): Promise<Draft[]> {
    return db
      .select()
      .from(drafts)
      .where(eq(drafts.userId, userId))
      .orderBy(desc(drafts.updatedAt));
  }

  async createDraft(insertDraft: InsertDraft): Promise<Draft> {
    const [draft] = await db
      .insert(drafts)
      .values(insertDraft)
      .returning();

    return draft;
  }

  async updateDraft(id: number, updates: Partial<Draft>): Promise<Draft | undefined> {
    const [updatedDraft] = await db
      .update(drafts)
      .set(updates)
      .where(eq(drafts.id, id))
      .returning();

    return updatedDraft || undefined;
  }

  async deleteDraft(id: number): Promise<boolean> {
    const result = await db
      .delete(drafts)
      .where(eq(drafts.id, id));

    return result.count > 0;
  }

  // Analytics operations
  async getThreadAnalytics(threadId: number): Promise<Analytics | undefined> {
    const [analyticsData] = await db
      .select()
      .from(analytics)
      .where(eq(analytics.threadId, threadId));

    return analyticsData || undefined;
  }

  async incrementThreadViews(threadId: number): Promise<Analytics | undefined> {
    const [analyticsData] = await db
      .select()
      .from(analytics)
      .where(eq(analytics.threadId, threadId));

    if (!analyticsData) return undefined;

    const [updatedAnalytics] = await db
      .update(analytics)
      .set({
        views: analyticsData.views + 1,
        lastUpdated: new Date()
      })
      .where(eq(analytics.threadId, threadId))
      .returning();

    return updatedAnalytics || undefined;
  }

  async updateThreadAnalytics(threadId: number, updates: Partial<Analytics>): Promise<Analytics | undefined> {
    const [analytics] = await db
      .select()
      .from(analytics)
      .where(eq(analytics.threadId, threadId));

    if (!analytics) return undefined;

    const [updatedAnalytics] = await db
      .update(analytics)
      .set({
        ...updates,
        lastUpdated: new Date()
      })
      .where(eq(analytics.threadId, threadId))
      .returning();

    return updatedAnalytics || undefined;
  }
}

// Change from MemStorage to DatabaseStorage
export const storage = new DatabaseStorage();
