import { 
  userProfiles, serviceCategories, serviceRequests, serviceChatMessages, reviews, conversations, messages,
  systemSettings, payments, suppliers, materials, materialOrders,
  aiDiagnoses, providerDiagnoses, digitalAcceptances, serviceExecutionLogs, paymentEscrows, antifraudFlags,
  symptoms, symptomQuestions, symptomDiagnoses, localKnowledge, referencePrices, materialSuppliers,
  notifications, twilioCalls, pushSubscriptions,
  type UserProfile, type InsertUserProfile,
  type ServiceCategory, type InsertServiceCategory,
  type ServiceRequest, type InsertServiceRequest,
  type ServiceChatMessage, type InsertServiceChatMessage,
  type Review, type InsertReview,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type SystemSetting, type InsertSystemSetting,
  type Payment, type InsertPayment,
  type Supplier, type InsertSupplier,
  type Material, type InsertMaterial,
  type MaterialOrder, type InsertMaterialOrder,
  type AiDiagnosis, type InsertAiDiagnosis,
  type ProviderDiagnosis, type InsertProviderDiagnosis,
  type DigitalAcceptance, type InsertDigitalAcceptance,
  type ServiceExecutionLog, type InsertServiceExecutionLog,
  type PaymentEscrow, type InsertPaymentEscrow,
  type AntifraudFlag, type InsertAntifraudFlag,
  type Symptom, type InsertSymptom,
  type SymptomQuestion, type InsertSymptomQuestion,
  type SymptomDiagnosis, type InsertSymptomDiagnosis,
  type LocalKnowledge, type InsertLocalKnowledge,
  type ReferencePrice, type InsertReferencePrice,
  type MaterialSupplier, type InsertMaterialSupplier,
  type Notification, type InsertNotification,
  type TwilioCall, type InsertTwilioCall,
  type PushSubscription, type InsertPushSubscription,
} from "@shared/schema";
import { users } from "@shared/models/auth";
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
  
  // Providers
  getAvailableProviders(city?: string, categoryId?: number): Promise<(UserProfile & { latitude?: string | null; longitude?: string | null })[]>;
  updateProviderRating(userId: string, newRating: number, totalRatings: number): Promise<UserProfile | undefined>;
  
  // ==================== NOVO FLUXO DE INTELIGÊNCIA INTEGRAL ====================
  
  // AI Diagnosis
  createAiDiagnosis(data: InsertAiDiagnosis): Promise<AiDiagnosis>;
  getAiDiagnosisByServiceId(serviceRequestId: number): Promise<AiDiagnosis | undefined>;
  
  // Provider Diagnosis
  createProviderDiagnosis(data: InsertProviderDiagnosis): Promise<ProviderDiagnosis>;
  getProviderDiagnosisByServiceId(serviceRequestId: number): Promise<ProviderDiagnosis | undefined>;
  
  // Digital Acceptance
  createDigitalAcceptance(data: InsertDigitalAcceptance): Promise<DigitalAcceptance>;
  getDigitalAcceptanceByServiceId(serviceRequestId: number): Promise<DigitalAcceptance | undefined>;
  
  // Service Execution Logs
  createServiceExecutionLog(data: InsertServiceExecutionLog): Promise<ServiceExecutionLog>;
  getServiceExecutionLog(serviceRequestId: number): Promise<ServiceExecutionLog | undefined>;
  updateServiceExecutionLog(serviceRequestId: number, data: Partial<InsertServiceExecutionLog>): Promise<ServiceExecutionLog | undefined>;
  
  // Payment Escrows
  createPaymentEscrow(data: InsertPaymentEscrow): Promise<PaymentEscrow>;
  getPaymentEscrowByServiceId(serviceRequestId: number): Promise<PaymentEscrow | undefined>;
  updatePaymentEscrowStatus(id: number, status: string): Promise<PaymentEscrow | undefined>;
  releasePaymentEscrow(id: number): Promise<PaymentEscrow | undefined>;
  
  // Antifraud
  createAntifraudFlag(data: InsertAntifraudFlag): Promise<AntifraudFlag>;
  getAntifraudFlagsByServiceId(serviceRequestId: number): Promise<AntifraudFlag[]>;
  resolveAntifraudFlag(id: number, resolvedBy: string): Promise<AntifraudFlag | undefined>;
  getPendingAntifraudFlags(): Promise<AntifraudFlag[]>;
  
  // ==================== FORNECEDORES E MATERIAIS ====================
  
  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplierById(id: number): Promise<Supplier | undefined>;
  getSuppliersByCity(city: string): Promise<Supplier[]>;
  createSupplier(data: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, data: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  
  // Materials
  getMaterials(): Promise<Material[]>;
  getMaterialById(id: number): Promise<Material | undefined>;
  getMaterialsBySupplierId(supplierId: number): Promise<Material[]>;
  getMaterialsByCategory(category: string): Promise<Material[]>;
  createMaterial(data: InsertMaterial): Promise<Material>;
  updateMaterial(id: number, data: Partial<InsertMaterial>): Promise<Material | undefined>;
  
  // Material Orders
  createMaterialOrder(data: InsertMaterialOrder): Promise<MaterialOrder>;
  getMaterialOrderByServiceId(serviceRequestId: number): Promise<MaterialOrder | undefined>;
  getMaterialOrdersBySupplierId(supplierId: number): Promise<MaterialOrder[]>;
  updateMaterialOrderStatus(id: number, status: string): Promise<MaterialOrder | undefined>;
  
  // ==================== BANCO DE SINTOMAS PARA DIAGNÓSTICO ====================
  
  // Symptoms
  getSymptoms(): Promise<Symptom[]>;
  getSymptomById(id: number): Promise<Symptom | undefined>;
  getSymptomsByCategoryId(categoryId: number): Promise<Symptom[]>;
  getSymptomWithDetails(id: number): Promise<{ name: string; description: string | null; questions: SymptomQuestion[]; diagnoses: SymptomDiagnosis[] } | null>;
  createSymptom(data: InsertSymptom): Promise<Symptom>;
  updateSymptom(id: number, data: Partial<InsertSymptom>): Promise<Symptom | undefined>;
  deleteSymptom(id: number): Promise<void>;
  
  // Symptom Questions
  getSymptomQuestions(symptomId: number): Promise<SymptomQuestion[]>;
  createSymptomQuestion(data: InsertSymptomQuestion): Promise<SymptomQuestion>;
  updateSymptomQuestion(id: number, data: Partial<InsertSymptomQuestion>): Promise<SymptomQuestion | undefined>;
  deleteSymptomQuestion(id: number): Promise<void>;
  
  // Symptom Diagnoses
  getSymptomDiagnoses(symptomId: number): Promise<SymptomDiagnosis[]>;
  createSymptomDiagnosis(data: InsertSymptomDiagnosis): Promise<SymptomDiagnosis>;
  updateSymptomDiagnosis(id: number, data: Partial<InsertSymptomDiagnosis>): Promise<SymptomDiagnosis | undefined>;
  deleteSymptomDiagnosis(id: number): Promise<void>;
  
  // Local Knowledge
  getLocalKnowledge(): Promise<LocalKnowledge[]>;
  getLocalKnowledgeByCity(city: string): Promise<LocalKnowledge[]>;
  createLocalKnowledge(data: InsertLocalKnowledge): Promise<LocalKnowledge>;
  updateLocalKnowledge(id: number, data: Partial<InsertLocalKnowledge>): Promise<LocalKnowledge | undefined>;
  deleteLocalKnowledge(id: number): Promise<void>;
  
  // Reference Prices (SINAPI, regional, market)
  getReferencePrices(filters?: { categoryId?: number; state?: string; city?: string; itemType?: string }): Promise<ReferencePrice[]>;
  getReferencePricesByKeywords(keywords: string[], state?: string): Promise<ReferencePrice[]>;
  createReferencePrice(data: InsertReferencePrice): Promise<ReferencePrice>;
  updateReferencePrice(id: number, data: Partial<InsertReferencePrice>): Promise<ReferencePrice | undefined>;
  deleteReferencePrice(id: number): Promise<void>;
  
  // Material Suppliers
  getMaterialSuppliers(filters?: { city?: string; state?: string }): Promise<MaterialSupplier[]>;
  createMaterialSupplier(data: InsertMaterialSupplier): Promise<MaterialSupplier>;
  updateMaterialSupplier(id: number, data: Partial<InsertMaterialSupplier>): Promise<MaterialSupplier | undefined>;
  deleteMaterialSupplier(id: number): Promise<void>;
  
  // Helper: Get full symptom data for AI
  getFullSymptomData(categoryId?: number): Promise<{
    symptoms: Symptom[];
    questions: SymptomQuestion[];
    diagnoses: SymptomDiagnosis[];
  }>;
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
      .where(eq(serviceRequests.status, "fee_paid"))
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

  async getAvailableProviders(city?: string, categoryId?: number): Promise<(UserProfile & { latitude?: string | null; longitude?: string | null })[]> {
    const results = await db.select({
      profile: userProfiles,
      latitude: users.latitude,
      longitude: users.longitude,
    })
      .from(userProfiles)
      .leftJoin(users, eq(userProfiles.userId, users.id))
      .where(
        and(
          eq(userProfiles.role, "provider"),
          eq(userProfiles.isAvailable, true)
        )
      )
      .orderBy(desc(userProfiles.rating));
    
    // Flatten the results to include latitude/longitude
    const providers = results.map(r => ({
      ...r.profile,
      latitude: r.latitude,
      longitude: r.longitude,
    }));
    
    // Filter by city if provided
    if (city) {
      return providers.filter(p => p.city?.toLowerCase() === city.toLowerCase());
    }
    
    return providers;
  }

  async updateProviderRating(userId: string, newRating: number, totalRatings: number): Promise<UserProfile | undefined> {
    const [updated] = await db.update(userProfiles)
      .set({ 
        rating: newRating.toFixed(1),
        totalRatings 
      })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated;
  }

  // ==================== NOVO FLUXO DE INTELIGÊNCIA INTEGRAL ====================

  // AI Diagnosis
  async createAiDiagnosis(data: InsertAiDiagnosis): Promise<AiDiagnosis> {
    const [diagnosis] = await db.insert(aiDiagnoses).values(data).returning();
    return diagnosis;
  }

  async getAiDiagnosisByServiceId(serviceRequestId: number): Promise<AiDiagnosis | undefined> {
    const [diagnosis] = await db.select().from(aiDiagnoses)
      .where(eq(aiDiagnoses.serviceRequestId, serviceRequestId));
    return diagnosis;
  }

  // Provider Diagnosis
  async createProviderDiagnosis(data: InsertProviderDiagnosis): Promise<ProviderDiagnosis> {
    const [diagnosis] = await db.insert(providerDiagnoses).values(data).returning();
    return diagnosis;
  }

  async getProviderDiagnosisByServiceId(serviceRequestId: number): Promise<ProviderDiagnosis | undefined> {
    const [diagnosis] = await db.select().from(providerDiagnoses)
      .where(eq(providerDiagnoses.serviceRequestId, serviceRequestId));
    return diagnosis;
  }

  // Digital Acceptance
  async createDigitalAcceptance(data: InsertDigitalAcceptance): Promise<DigitalAcceptance> {
    const [acceptance] = await db.insert(digitalAcceptances).values(data).returning();
    return acceptance;
  }

  async getDigitalAcceptanceByServiceId(serviceRequestId: number): Promise<DigitalAcceptance | undefined> {
    const [acceptance] = await db.select().from(digitalAcceptances)
      .where(eq(digitalAcceptances.serviceRequestId, serviceRequestId));
    return acceptance;
  }

  // Service Execution Logs
  async createServiceExecutionLog(data: InsertServiceExecutionLog): Promise<ServiceExecutionLog> {
    const [log] = await db.insert(serviceExecutionLogs).values(data).returning();
    return log;
  }

  async getServiceExecutionLog(serviceRequestId: number): Promise<ServiceExecutionLog | undefined> {
    const [log] = await db.select().from(serviceExecutionLogs)
      .where(eq(serviceExecutionLogs.serviceRequestId, serviceRequestId));
    return log;
  }

  async updateServiceExecutionLog(serviceRequestId: number, data: Partial<InsertServiceExecutionLog>): Promise<ServiceExecutionLog | undefined> {
    const [updated] = await db.update(serviceExecutionLogs)
      .set(data)
      .where(eq(serviceExecutionLogs.serviceRequestId, serviceRequestId))
      .returning();
    return updated;
  }

  // Payment Escrows
  async createPaymentEscrow(data: InsertPaymentEscrow): Promise<PaymentEscrow> {
    const [escrow] = await db.insert(paymentEscrows).values(data).returning();
    return escrow;
  }

  async getPaymentEscrowByServiceId(serviceRequestId: number): Promise<PaymentEscrow | undefined> {
    const [escrow] = await db.select().from(paymentEscrows)
      .where(eq(paymentEscrows.serviceRequestId, serviceRequestId));
    return escrow;
  }

  async updatePaymentEscrowStatus(id: number, status: string): Promise<PaymentEscrow | undefined> {
    const [updated] = await db.update(paymentEscrows)
      .set({ status: status as any })
      .where(eq(paymentEscrows.id, id))
      .returning();
    return updated;
  }

  async releasePaymentEscrow(id: number): Promise<PaymentEscrow | undefined> {
    const [updated] = await db.update(paymentEscrows)
      .set({ status: "released" as any, releasedAt: new Date() })
      .where(eq(paymentEscrows.id, id))
      .returning();
    return updated;
  }

  // Antifraud
  async createAntifraudFlag(data: InsertAntifraudFlag): Promise<AntifraudFlag> {
    const [flag] = await db.insert(antifraudFlags).values(data).returning();
    return flag;
  }

  async getAntifraudFlagsByServiceId(serviceRequestId: number): Promise<AntifraudFlag[]> {
    return db.select().from(antifraudFlags)
      .where(eq(antifraudFlags.serviceRequestId, serviceRequestId))
      .orderBy(desc(antifraudFlags.createdAt));
  }

  async resolveAntifraudFlag(id: number, resolvedBy: string): Promise<AntifraudFlag | undefined> {
    const [updated] = await db.update(antifraudFlags)
      .set({ resolved: true, resolvedBy, resolvedAt: new Date() })
      .where(eq(antifraudFlags.id, id))
      .returning();
    return updated;
  }

  async getPendingAntifraudFlags(): Promise<AntifraudFlag[]> {
    return db.select().from(antifraudFlags)
      .where(eq(antifraudFlags.resolved, false))
      .orderBy(desc(antifraudFlags.createdAt));
  }
  
  // ==================== FORNECEDORES E MATERIAIS ====================
  
  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    return db.select().from(suppliers)
      .where(eq(suppliers.isActive, true))
      .orderBy(suppliers.name);
  }
  
  async getSupplierById(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }
  
  async getSuppliersByCity(city: string): Promise<Supplier[]> {
    return db.select().from(suppliers)
      .where(and(eq(suppliers.city, city), eq(suppliers.isActive, true)))
      .orderBy(suppliers.name);
  }
  
  async createSupplier(data: InsertSupplier): Promise<Supplier> {
    const [supplier] = await db.insert(suppliers).values(data).returning();
    return supplier;
  }
  
  async updateSupplier(id: number, data: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [updated] = await db.update(suppliers)
      .set(data)
      .where(eq(suppliers.id, id))
      .returning();
    return updated;
  }
  
  // Materials
  async getMaterials(): Promise<Material[]> {
    return db.select().from(materials)
      .where(eq(materials.isActive, true))
      .orderBy(materials.name);
  }
  
  async getMaterialById(id: number): Promise<Material | undefined> {
    const [material] = await db.select().from(materials).where(eq(materials.id, id));
    return material;
  }
  
  async getMaterialsBySupplierId(supplierId: number): Promise<Material[]> {
    return db.select().from(materials)
      .where(and(eq(materials.supplierId, supplierId), eq(materials.isActive, true)))
      .orderBy(materials.name);
  }
  
  async getMaterialsByCategory(category: string): Promise<Material[]> {
    return db.select().from(materials)
      .where(and(eq(materials.category, category), eq(materials.isActive, true)))
      .orderBy(materials.name);
  }
  
  async createMaterial(data: InsertMaterial): Promise<Material> {
    const [material] = await db.insert(materials).values(data).returning();
    return material;
  }
  
  async updateMaterial(id: number, data: Partial<InsertMaterial>): Promise<Material | undefined> {
    const [updated] = await db.update(materials)
      .set(data)
      .where(eq(materials.id, id))
      .returning();
    return updated;
  }
  
  // Material Orders
  async createMaterialOrder(data: InsertMaterialOrder): Promise<MaterialOrder> {
    const [order] = await db.insert(materialOrders).values(data).returning();
    return order;
  }
  
  async getMaterialOrderByServiceId(serviceRequestId: number): Promise<MaterialOrder | undefined> {
    const [order] = await db.select().from(materialOrders)
      .where(eq(materialOrders.serviceRequestId, serviceRequestId));
    return order;
  }
  
  async getMaterialOrdersBySupplierId(supplierId: number): Promise<MaterialOrder[]> {
    return db.select().from(materialOrders)
      .where(eq(materialOrders.supplierId, supplierId))
      .orderBy(desc(materialOrders.createdAt));
  }
  
  async updateMaterialOrderStatus(id: number, status: string): Promise<MaterialOrder | undefined> {
    const now = new Date();
    const updateData: any = { status };
    if (status === "ordered") updateData.orderedAt = now;
    if (status === "delivered") updateData.deliveredAt = now;
    
    const [updated] = await db.update(materialOrders)
      .set(updateData)
      .where(eq(materialOrders.id, id))
      .returning();
    return updated;
  }
  
  // ==================== BANCO DE SINTOMAS PARA DIAGNÓSTICO ====================
  
  // Symptoms
  async getSymptoms(): Promise<Symptom[]> {
    return db.select().from(symptoms).where(eq(symptoms.isActive, true)).orderBy(symptoms.name);
  }
  
  async getSymptomById(id: number): Promise<Symptom | undefined> {
    const [symptom] = await db.select().from(symptoms).where(eq(symptoms.id, id));
    return symptom;
  }
  
  async getSymptomsByCategoryId(categoryId: number): Promise<Symptom[]> {
    return db.select().from(symptoms)
      .where(and(eq(symptoms.categoryId, categoryId), eq(symptoms.isActive, true)))
      .orderBy(symptoms.name);
  }
  
  async getSymptomWithDetails(id: number): Promise<{ name: string; description: string | null; questions: SymptomQuestion[]; diagnoses: SymptomDiagnosis[] } | null> {
    const symptom = await this.getSymptomById(id);
    if (!symptom) return null;
    
    const [questions, diagnoses] = await Promise.all([
      this.getSymptomQuestions(id),
      this.getSymptomDiagnoses(id),
    ]);
    
    return {
      name: symptom.name,
      description: symptom.description,
      questions,
      diagnoses,
    };
  }
  
  async createSymptom(data: InsertSymptom): Promise<Symptom> {
    const [symptom] = await db.insert(symptoms).values(data).returning();
    return symptom;
  }
  
  async updateSymptom(id: number, data: Partial<InsertSymptom>): Promise<Symptom | undefined> {
    const [updated] = await db.update(symptoms)
      .set(data)
      .where(eq(symptoms.id, id))
      .returning();
    return updated;
  }
  
  async deleteSymptom(id: number): Promise<void> {
    await db.update(symptoms).set({ isActive: false }).where(eq(symptoms.id, id));
  }
  
  // Symptom Questions
  async getSymptomQuestions(symptomId: number): Promise<SymptomQuestion[]> {
    return db.select().from(symptomQuestions)
      .where(eq(symptomQuestions.symptomId, symptomId))
      .orderBy(symptomQuestions.questionOrder);
  }
  
  async createSymptomQuestion(data: InsertSymptomQuestion): Promise<SymptomQuestion> {
    const [question] = await db.insert(symptomQuestions).values(data).returning();
    return question;
  }
  
  async updateSymptomQuestion(id: number, data: Partial<InsertSymptomQuestion>): Promise<SymptomQuestion | undefined> {
    const [updated] = await db.update(symptomQuestions)
      .set(data)
      .where(eq(symptomQuestions.id, id))
      .returning();
    return updated;
  }
  
  async deleteSymptomQuestion(id: number): Promise<void> {
    await db.delete(symptomQuestions).where(eq(symptomQuestions.id, id));
  }
  
  // Symptom Diagnoses
  async getSymptomDiagnoses(symptomId: number): Promise<SymptomDiagnosis[]> {
    return db.select().from(symptomDiagnoses)
      .where(and(eq(symptomDiagnoses.symptomId, symptomId), eq(symptomDiagnoses.isActive, true)));
  }
  
  async createSymptomDiagnosis(data: InsertSymptomDiagnosis): Promise<SymptomDiagnosis> {
    const [diagnosis] = await db.insert(symptomDiagnoses).values(data).returning();
    return diagnosis;
  }
  
  async updateSymptomDiagnosis(id: number, data: Partial<InsertSymptomDiagnosis>): Promise<SymptomDiagnosis | undefined> {
    const [updated] = await db.update(symptomDiagnoses)
      .set(data)
      .where(eq(symptomDiagnoses.id, id))
      .returning();
    return updated;
  }
  
  async deleteSymptomDiagnosis(id: number): Promise<void> {
    await db.update(symptomDiagnoses).set({ isActive: false }).where(eq(symptomDiagnoses.id, id));
  }
  
  // Local Knowledge
  async getLocalKnowledge(): Promise<LocalKnowledge[]> {
    return db.select().from(localKnowledge).where(eq(localKnowledge.isActive, true));
  }
  
  async getLocalKnowledgeByCity(city: string): Promise<LocalKnowledge[]> {
    return db.select().from(localKnowledge)
      .where(and(
        or(eq(localKnowledge.city, city), sql`${localKnowledge.city} IS NULL`),
        eq(localKnowledge.isActive, true)
      ));
  }
  
  async createLocalKnowledge(data: InsertLocalKnowledge): Promise<LocalKnowledge> {
    const [knowledge] = await db.insert(localKnowledge).values(data).returning();
    return knowledge;
  }
  
  async updateLocalKnowledge(id: number, data: Partial<InsertLocalKnowledge>): Promise<LocalKnowledge | undefined> {
    const [updated] = await db.update(localKnowledge)
      .set(data)
      .where(eq(localKnowledge.id, id))
      .returning();
    return updated;
  }
  
  async deleteLocalKnowledge(id: number): Promise<void> {
    await db.update(localKnowledge).set({ isActive: false }).where(eq(localKnowledge.id, id));
  }
  
  // Helper: Get full symptom data for AI
  async getFullSymptomData(categoryId?: number): Promise<{
    symptoms: Symptom[];
    questions: SymptomQuestion[];
    diagnoses: SymptomDiagnosis[];
  }> {
    const allSymptoms = categoryId 
      ? await this.getSymptomsByCategoryId(categoryId)
      : await this.getSymptoms();
    
    const symptomIds = allSymptoms.map(s => s.id);
    
    const allQuestions = symptomIds.length > 0
      ? await db.select().from(symptomQuestions)
          .where(sql`${symptomQuestions.symptomId} IN (${sql.join(symptomIds.map(id => sql`${id}`), sql`, `)})`)
          .orderBy(symptomQuestions.questionOrder)
      : [];
    
    const allDiagnoses = symptomIds.length > 0
      ? await db.select().from(symptomDiagnoses)
          .where(and(
            sql`${symptomDiagnoses.symptomId} IN (${sql.join(symptomIds.map(id => sql`${id}`), sql`, `)})`,
            eq(symptomDiagnoses.isActive, true)
          ))
      : [];
    
    return {
      symptoms: allSymptoms,
      questions: allQuestions,
      diagnoses: allDiagnoses,
    };
  }
  
  // Reference Prices
  async getReferencePrices(filters?: { categoryId?: number; state?: string; city?: string; itemType?: string }): Promise<ReferencePrice[]> {
    const conditions = [eq(referencePrices.isActive, true)];
    
    if (filters?.categoryId) {
      conditions.push(eq(referencePrices.categoryId, filters.categoryId));
    }
    if (filters?.state) {
      conditions.push(or(eq(referencePrices.state, filters.state), sql`${referencePrices.state} IS NULL`)!);
    }
    if (filters?.city) {
      conditions.push(or(eq(referencePrices.city, filters.city), sql`${referencePrices.city} IS NULL`)!);
    }
    if (filters?.itemType) {
      conditions.push(eq(referencePrices.itemType, filters.itemType));
    }
    
    return db.select().from(referencePrices)
      .where(and(...conditions))
      .orderBy(referencePrices.name);
  }
  
  async getReferencePricesByKeywords(keywords: string[], state?: string): Promise<ReferencePrice[]> {
    const keywordConditions = keywords.map(kw => 
      sql`LOWER(${referencePrices.name}) LIKE LOWER(${'%' + kw + '%'}) OR LOWER(${referencePrices.keywords}) LIKE LOWER(${'%' + kw + '%'})`
    );
    
    const conditions = [
      eq(referencePrices.isActive, true),
      or(...keywordConditions)!
    ];
    
    if (state) {
      conditions.push(or(eq(referencePrices.state, state), sql`${referencePrices.state} IS NULL`)!);
    }
    
    return db.select().from(referencePrices)
      .where(and(...conditions))
      .limit(20);
  }
  
  async createReferencePrice(data: InsertReferencePrice): Promise<ReferencePrice> {
    const [price] = await db.insert(referencePrices).values(data).returning();
    return price;
  }
  
  async updateReferencePrice(id: number, data: Partial<InsertReferencePrice>): Promise<ReferencePrice | undefined> {
    const [updated] = await db.update(referencePrices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(referencePrices.id, id))
      .returning();
    return updated;
  }
  
  async deleteReferencePrice(id: number): Promise<void> {
    await db.update(referencePrices).set({ isActive: false }).where(eq(referencePrices.id, id));
  }
  
  // Material Suppliers
  async getMaterialSuppliers(filters?: { city?: string; state?: string }): Promise<MaterialSupplier[]> {
    const conditions = [eq(materialSuppliers.isActive, true)];
    
    if (filters?.city) {
      conditions.push(eq(materialSuppliers.city, filters.city));
    }
    if (filters?.state) {
      conditions.push(eq(materialSuppliers.state, filters.state));
    }
    
    return db.select().from(materialSuppliers)
      .where(and(...conditions))
      .orderBy(desc(materialSuppliers.rating));
  }
  
  async createMaterialSupplier(data: InsertMaterialSupplier): Promise<MaterialSupplier> {
    const [supplier] = await db.insert(materialSuppliers).values(data).returning();
    return supplier;
  }
  
  async updateMaterialSupplier(id: number, data: Partial<InsertMaterialSupplier>): Promise<MaterialSupplier | undefined> {
    const [updated] = await db.update(materialSuppliers)
      .set(data)
      .where(eq(materialSuppliers.id, id))
      .returning();
    return updated;
  }
  
  async deleteMaterialSupplier(id: number): Promise<void> {
    await db.update(materialSuppliers).set({ isActive: false }).where(eq(materialSuppliers.id, id));
  }

  // ==================== NOTIFICAÇÕES ====================
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(data).returning();
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const [updated] = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // ==================== CHAMADAS TWILIO ====================
  async getTwilioCallsByService(serviceId: number): Promise<TwilioCall[]> {
    return await db.select().from(twilioCalls)
      .where(eq(twilioCalls.serviceRequestId, serviceId))
      .orderBy(desc(twilioCalls.createdAt));
  }

  async getTwilioCallById(id: number): Promise<TwilioCall | undefined> {
    const [call] = await db.select().from(twilioCalls)
      .where(eq(twilioCalls.id, id));
    return call;
  }

  async getTwilioCallBySid(sid: string): Promise<TwilioCall | undefined> {
    const [call] = await db.select().from(twilioCalls)
      .where(eq(twilioCalls.twilioCallSid, sid));
    return call;
  }

  async createTwilioCall(data: InsertTwilioCall): Promise<TwilioCall> {
    const [call] = await db.insert(twilioCalls).values(data).returning();
    return call;
  }

  async updateTwilioCall(id: number, data: Partial<InsertTwilioCall>): Promise<TwilioCall | undefined> {
    const [updated] = await db.update(twilioCalls)
      .set(data)
      .where(eq(twilioCalls.id, id))
      .returning();
    return updated;
  }

  // ==================== PUSH SUBSCRIPTIONS ====================
  async getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]> {
    return await db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined> {
    const [sub] = await db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
    return sub;
  }

  async createPushSubscription(data: InsertPushSubscription): Promise<PushSubscription> {
    const [subscription] = await db.insert(pushSubscriptions).values(data).returning();
    return subscription;
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }

  async deletePushSubscriptionsByUser(userId: string): Promise<void> {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }
}

export const storage = new DatabaseStorage();
