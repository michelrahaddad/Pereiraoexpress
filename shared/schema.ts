import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const userRoleEnum = pgEnum("user_role", ["client", "provider", "admin"]);
export const serviceStatusEnum = pgEnum("service_status", ["pending", "diagnosed", "waiting_provider", "accepted", "in_progress", "completed", "cancelled"]);
export const slaPriorityEnum = pgEnum("sla_priority", ["standard", "express", "urgent"]);

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: userRoleEnum("role").notNull().default("client"),
  phone: varchar("phone"),
  address: text("address"),
  bio: text("bio"),
  specialties: text("specialties"),
  rating: integer("rating").default(0),
  totalServices: integer("total_services").default(0),
  isAvailable: boolean("is_available").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  icon: varchar("icon").notNull(),
  description: text("description"),
  basePrice: integer("base_price").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceRequests = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  clientId: varchar("client_id").notNull(),
  providerId: varchar("provider_id"),
  categoryId: integer("category_id").notNull(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  status: serviceStatusEnum("status").notNull().default("pending"),
  slaPriority: slaPriorityEnum("sla_priority").default("standard"),
  estimatedPrice: integer("estimated_price"),
  finalPrice: integer("final_price"),
  diagnosis: text("diagnosis"),
  materials: text("materials"),
  address: text("address"),
  scheduledDate: timestamp("scheduled_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const serviceChatMessages = pgTable("service_chat_messages", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  senderId: varchar("sender_id"),
  senderType: varchar("sender_type").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  clientId: varchar("client_id").notNull(),
  providerId: varchar("provider_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  userId: varchar("user_id"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, createdAt: true });
export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({ id: true, createdAt: true });
export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceChatMessageSchema = createInsertSchema(serviceChatMessages).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type InsertServiceChatMessage = z.infer<typeof insertServiceChatMessageSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type UserProfile = typeof userProfiles.$inferSelect;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type ServiceChatMessage = typeof serviceChatMessages.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
