import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  bio: text("bio"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Thread schema (main content unit)
export const threads = pgTable("threads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  authorId: integer("author_id").notNull().references(() => users.id),
  isPublished: boolean("is_published").default(false).notNull(),
  forkedFromId: integer("forked_from_id").references(() => threads.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Thread segments schema (individual content parts)
export const threadSegments = pgTable("thread_segments", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => threads.id),
  content: text("content").notNull(),
  richContent: json("rich_content"), // Stores the rich text JSON format
  order: integer("order").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Thread tags for organization
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

// Many-to-many relation for threads and tags
export const threadTags = pgTable("thread_tags", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => threads.id),
  tagId: integer("tag_id").notNull().references(() => tags.id),
});

// Collections for organizing bookmarks
export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bookmarks
export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => threads.id),
  userId: integer("user_id").notNull().references(() => users.id),
  collectionId: integer("collection_id").references(() => collections.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reaction types for the emoji reactions
export const reactionTypes = pgTable("reaction_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  emoji: text("emoji").notNull(),
});

// Thread reactions
export const reactions = pgTable("reactions", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => threads.id),
  userId: integer("user_id").notNull().references(() => users.id),
  reactionTypeId: integer("reaction_type_id").notNull().references(() => reactionTypes.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Draft threads for auto-saving
export const drafts = pgTable("drafts", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").references(() => threads.id),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title"),
  content: json("content"), // Array of draft segments
  lastSaved: timestamp("last_saved").defaultNow().notNull(),
});

// Analytics for thread creators
export const analytics = pgTable("analytics", {
  id: serial("id").primaryKey(),
  threadId: integer("thread_id").notNull().references(() => threads.id),
  views: integer("views").default(0).notNull(),
  uniqueVisitors: integer("unique_visitors").default(0).notNull(),
  totalReactions: integer("total_reactions").default(0).notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// Create Zod schemas for insertions
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertThreadSchema = createInsertSchema(threads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertThreadSegmentSchema = createInsertSchema(threadSegments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true,
});

export const insertThreadTagSchema = createInsertSchema(threadTags).omit({
  id: true,
});

export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
  createdAt: true,
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({
  id: true,
  createdAt: true,
});

export const insertReactionTypeSchema = createInsertSchema(reactionTypes).omit({
  id: true,
});

export const insertReactionSchema = createInsertSchema(reactions).omit({
  id: true,
  createdAt: true,
});

export const insertDraftSchema = createInsertSchema(drafts).omit({
  id: true,
  lastSaved: true,
});

// Create types from schemas
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertThread = z.infer<typeof insertThreadSchema>;
export type InsertThreadSegment = z.infer<typeof insertThreadSegmentSchema>;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type InsertThreadTag = z.infer<typeof insertThreadTagSchema>;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type InsertReactionType = z.infer<typeof insertReactionTypeSchema>;
export type InsertReaction = z.infer<typeof insertReactionSchema>;
export type InsertDraft = z.infer<typeof insertDraftSchema>;

// Create select types
export type User = typeof users.$inferSelect;
export type Thread = typeof threads.$inferSelect;
export type ThreadSegment = typeof threadSegments.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type ThreadTag = typeof threadTags.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Bookmark = typeof bookmarks.$inferSelect;
export type ReactionType = typeof reactionTypes.$inferSelect;
export type Reaction = typeof reactions.$inferSelect;
export type Draft = typeof drafts.$inferSelect;
export type Analytics = typeof analytics.$inferSelect;

// Extended types for responses with relationships
export type ThreadWithDetails = Thread & {
  author: User;
  segments: ThreadSegment[];
  tags: Tag[];
  reactions: (Reaction & { reactionType: ReactionType })[];
};

export type CollectionWithThreads = Collection & {
  threads: ThreadWithDetails[];
};
