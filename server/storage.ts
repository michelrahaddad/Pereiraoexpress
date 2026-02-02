import { 
  userProfiles, serviceCategories, serviceRequests, serviceChatMessages, reviews, conversations, messages,
  systemSettings, payments,
  type UserProfile, type InsertUserProfile,
  type ServiceCategory, type InsertServiceCategory,
  type ServiceRequest, type InsertServiceRequest,
  type ServiceChatMessage, type InsertServiceChatMessage,
  type Review, type InsertReview,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type SystemSetting, type InsertSystemSetting,
  type Payment, type InsertPayment,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql } from "drizzle-orm";

export interface IStorage {
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  
  getCategories(): Promise<ServiceCategory[]>;
  getCategoryById(id: number): Promise<ServiceCategory | undefined>;
  createCategory(category: InsertServiceCategory): Promise<ServiceCategory>;
  
  getServicesByClient(clientId: string): Promise<ServiceRequest[]>;
  getServiceById(id: number): Promise<ServiceRequest | undefined>;
  getAvailableServices(): Promise<ServiceRequest[]>;
  getServicesByProvider(providerId: string): Promise<ServiceRequest[]>;
  getAllServices(): Promise<ServiceRequest[]>;
  createService(service: InsertServiceRequest): Promise<ServiceRequest>;
  updateService(id: number, data: Partial<InsertServiceRequest>): Promise<ServiceRequest | undefined>;
  
  getMessagesByService(serviceRequestId: number): Promise<ServiceChatMessage[]>;
  createServiceMessage(message: InsertServiceChatMessage): Promise<ServiceChatMessage>;
  
  getReviewsByProvider(providerId: string): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  
  getConversation(id: number): Promise<Conversation | undefined>;
  getConversationsByUser(userId: string): Promise<Conversation[]>;
  createConversation(data: InsertConversation): Promise<Conversation>;
  deleteConversation(id: number): Promise<void>;
  
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  createMessage(data: InsertMessage): Promise<Message>;
  
  // System settings
  getSystemSettings(): Promise<SystemSetting[]>;
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  upsertSystemSetting(data: InsertSystemSetting): Promise<SystemSetting>;
  
  // Payments
  getPaymentsByUser(userId: string): Promise<Payment[]>;
  getPaymentById(id: number): Promise<Payment | undefined>;
  createPayment(data: InsertPayment): Promise<Payment>;
  updatePaymentStatus(id: number, status: string): Promise<Payment | undefined>;
  getAllPayments(): Promise<Payment[]>;
  
  // Admin
  getAllUserProfiles(): Promise<UserProfile[]>;
}

class DatabaseStorage implements IStorage {
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [newProfile] = await db.insert(userProfiles).values(profile).returning();
    return newProfile;
  }

  async updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [updated] = await db.update(userProfiles)
      .set(data)
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated;
  }

  async getCategories(): Promise<ServiceCategory[]> {
    return db.select().from(serviceCategories).orderBy(serviceCategories.name);
  }

  async getCategoryById(id: number): Promise<ServiceCategory | undefined> {
    const [category] = await db.select().from(serviceCategories).where(eq(serviceCategories.id, id));
    return category;
  }

  async createCategory(category: InsertServiceCategory): Promise<ServiceCategory> {
    const [newCategory] = await db.insert(serviceCategories).values(category).returning();
    return newCategory;
  }

  async getServicesByClient(clientId: string): Promise<ServiceRequest[]> {
    return db.select().from(serviceRequests)
      .where(eq(serviceRequests.clientId, clientId))
      .orderBy(desc(serviceRequests.createdAt));
  }

  async getServiceById(id: number): Promise<ServiceRequest | undefined> {
    const [service] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id));
    return service;
  }

  async getAvailableServices(): Promise<ServiceRequest[]> {
    return db.select().from(serviceRequests)
      .where(eq(serviceRequests.status, "waiting_provider"))
      .orderBy(desc(serviceRequests.createdAt));
  }

  async getServicesByProvider(providerId: string): Promise<ServiceRequest[]> {
    return db.select().from(serviceRequests)
      .where(eq(serviceRequests.providerId, providerId))
      .orderBy(desc(serviceRequests.createdAt));
  }

  async getAllServices(): Promise<ServiceRequest[]> {
    return db.select().from(serviceRequests).orderBy(desc(serviceRequests.createdAt));
  }

  async createService(service: InsertServiceRequest): Promise<ServiceRequest> {
    const [newService] = await db.insert(serviceRequests).values(service).returning();
    return newService;
  }

  async updateService(id: number, data: Partial<InsertServiceRequest>): Promise<ServiceRequest | undefined> {
    const [updated] = await db.update(serviceRequests)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(serviceRequests.id, id))
      .returning();
    return updated;
  }

  async getMessagesByService(serviceRequestId: number): Promise<ServiceChatMessage[]> {
    return db.select().from(serviceChatMessages)
      .where(eq(serviceChatMessages.serviceRequestId, serviceRequestId))
      .orderBy(serviceChatMessages.createdAt);
  }

  async createServiceMessage(message: InsertServiceChatMessage): Promise<ServiceChatMessage> {
    const [newMessage] = await db.insert(serviceChatMessages).values(message).returning();
    return newMessage;
  }

  async getReviewsByProvider(providerId: string): Promise<Review[]> {
    return db.select().from(reviews)
      .where(eq(reviews.providerId, providerId))
      .orderBy(desc(reviews.createdAt));
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    return newReview;
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation;
  }

  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    return db.select().from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt));
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values(data).returning();
    return conversation;
  }

  async deleteConversation(id: number): Promise<void> {
    await db.delete(messages).where(eq(messages.conversationId, id));
    await db.delete(conversations).where(eq(conversations.id, id));
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(data).returning();
    return message;
  }

  // System settings
  async getSystemSettings(): Promise<SystemSetting[]> {
    return db.select().from(systemSettings);
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting;
  }

  async upsertSystemSetting(data: InsertSystemSetting): Promise<SystemSetting> {
    const existing = await this.getSystemSetting(data.key);
    if (existing) {
      const [updated] = await db.update(systemSettings)
        .set({ value: data.value, description: data.description, updatedAt: new Date() })
        .where(eq(systemSettings.key, data.key))
        .returning();
      return updated;
    }
    const [newSetting] = await db.insert(systemSettings).values(data).returning();
    return newSetting;
  }

  // Payments
  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    return db.select().from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }

  async getPaymentById(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(data).returning();
    return payment;
  }

  async updatePaymentStatus(id: number, status: string): Promise<Payment | undefined> {
    const [updated] = await db.update(payments)
      .set({ status: status as any, completedAt: status === "completed" ? new Date() : null })
      .where(eq(payments.id, id))
      .returning();
    return updated;
  }

  async getAllPayments(): Promise<Payment[]> {
    return db.select().from(payments).orderBy(desc(payments.createdAt));
  }

  // Admin
  async getAllUserProfiles(): Promise<UserProfile[]> {
    return db.select().from(userProfiles).orderBy(desc(userProfiles.createdAt));
  }
}

export const storage = new DatabaseStorage();
