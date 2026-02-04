import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const userRoleEnum = pgEnum("user_role", ["client", "provider", "admin"]);
export const serviceStatusEnum = pgEnum("service_status", [
  "pending",           // Aguardando diagnóstico IA
  "ai_diagnosed",      // IA gerou diagnóstico, aguardando pagamento taxa
  "fee_paid",          // Taxa de diagnóstico paga, aguardando prestador
  "provider_assigned", // Prestador designado, aguardando visita
  "provider_diagnosed",// Prestador fez diagnóstico final
  "quote_sent",        // Orçamento enviado ao cliente
  "accepted",          // Cliente aceitou e pagou
  "in_progress",       // Serviço em execução
  "awaiting_confirmation", // Aguardando confirmação do cliente
  "completed",         // Serviço concluído
  "cancelled"          // Cancelado
]);
export const slaPriorityEnum = pgEnum("sla_priority", ["standard", "express", "urgent"]);
export const escrowStatusEnum = pgEnum("escrow_status", ["holding", "released", "refunded", "disputed"]);
export const antifraudSeverityEnum = pgEnum("antifraud_severity", ["low", "medium", "high", "critical"]);

export const documentStatusEnum = pgEnum("document_status", ["pending", "approved", "rejected"]);

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  role: userRoleEnum("role").notNull().default("client"),
  phone: varchar("phone"),
  address: text("address"),
  city: varchar("city"),
  bio: text("bio"),
  specialties: text("specialties"),
  rating: integer("rating").default(0),
  totalServices: integer("total_services").default(0),
  isAvailable: boolean("is_available").default(true),
  documentUrl: text("document_url"),
  documentStatus: documentStatusEnum("document_status").default("pending"),
  documentNotes: text("document_notes"),
  termsAccepted: boolean("terms_accepted").default(false),
  termsAcceptedAt: timestamp("terms_accepted_at"),
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

// System settings for admin control
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payment method enum
export const paymentMethodEnum = pgEnum("payment_method", ["pix", "credit_card", "debit_card"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "processing", "completed", "failed", "refunded"]);

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  serviceRequestId: integer("service_request_id"),
  amount: integer("amount").notNull(), // in cents
  method: paymentMethodEnum("method").notNull(),
  status: paymentStatusEnum("status").notNull().default("pending"),
  description: text("description"),
  pixCode: text("pix_code"),
  stripePaymentId: text("stripe_payment_id"), // For future Stripe integration
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
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

// ==================== NOVO FLUXO DE INTELIGÊNCIA INTEGRAL ====================

// Diagnóstico inicial da IA
export const aiDiagnoses = pgTable("ai_diagnoses", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  inputDescription: text("input_description").notNull(),
  guidedAnswers: text("guided_answers"), // JSON das respostas guiadas
  mediaUrls: text("media_urls"), // JSON array de URLs de fotos/vídeos
  classification: varchar("classification"), // Tipo de serviço classificado
  urgencyLevel: varchar("urgency_level"), // baixa, média, alta, urgente
  estimatedDuration: varchar("estimated_duration"), // Ex: "2-4 horas"
  materialsSuggested: text("materials_suggested"), // JSON array de materiais prováveis
  priceRangeMin: integer("price_range_min"), // em centavos
  priceRangeMax: integer("price_range_max"), // em centavos
  diagnosisFee: integer("diagnosis_fee"), // Taxa cobrada pelo diagnóstico
  aiResponse: text("ai_response"), // Resposta completa da IA
  createdAt: timestamp("created_at").defaultNow(),
});

// Diagnóstico final do prestador
export const providerDiagnoses = pgTable("provider_diagnoses", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  providerId: varchar("provider_id").notNull(),
  findings: text("findings").notNull(), // Descrição técnica do problema
  laborCost: integer("labor_cost").notNull(), // Custo mão de obra em centavos
  materialsCost: integer("materials_cost").default(0), // Custo materiais em centavos
  materialsList: text("materials_list"), // JSON array de materiais necessários
  estimatedDuration: varchar("estimated_duration"), // Tempo estimado de execução
  mediaUrls: text("media_urls"), // JSON array de fotos do problema real
  notes: text("notes"), // Observações adicionais
  createdAt: timestamp("created_at").defaultNow(),
});

// Aceite digital do cliente
export const digitalAcceptances = pgTable("digital_acceptances", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  clientId: varchar("client_id").notNull(),
  aiDiagnosisId: integer("ai_diagnosis_id"),
  providerDiagnosisId: integer("provider_diagnosis_id"),
  totalPrice: integer("total_price").notNull(), // Valor total aceito em centavos
  laborCost: integer("labor_cost").notNull(),
  materialsCost: integer("materials_cost").default(0),
  platformFee: integer("platform_fee").default(0),
  estimatedDuration: varchar("estimated_duration"),
  termsVersion: varchar("terms_version").default("1.0"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  acceptedAt: timestamp("accepted_at").defaultNow(),
});

// Registro de execução do serviço
export const serviceExecutionLogs = pgTable("service_execution_logs", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  providerId: varchar("provider_id").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  startLatitude: varchar("start_latitude"),
  startLongitude: varchar("start_longitude"),
  endLatitude: varchar("end_latitude"),
  endLongitude: varchar("end_longitude"),
  beforePhotos: text("before_photos"), // JSON array de fotos antes
  afterPhotos: text("after_photos"), // JSON array de fotos depois
  notes: text("notes"),
  durationMinutes: integer("duration_minutes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Escrow de pagamentos (valor retido)
export const paymentEscrows = pgTable("payment_escrows", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  paymentId: integer("payment_id").notNull(),
  holdAmount: integer("hold_amount").notNull(), // Valor retido em centavos
  platformShare: integer("platform_share").default(0), // Parte da plataforma
  providerShare: integer("provider_share").default(0), // Parte do prestador
  supplierShare: integer("supplier_share").default(0), // Parte do fornecedor
  status: escrowStatusEnum("status").notNull().default("holding"),
  releaseAt: timestamp("release_at"), // Data prevista para liberação
  releasedAt: timestamp("released_at"), // Data efetiva da liberação
  createdAt: timestamp("created_at").defaultNow(),
});

// Flags de antifraude
export const antifraudFlags = pgTable("antifraud_flags", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  userId: varchar("user_id"), // Usuário suspeito (se aplicável)
  reason: varchar("reason").notNull(), // Motivo da flag
  severity: antifraudSeverityEnum("severity").notNull().default("low"),
  details: text("details"), // Detalhes/evidências
  resolved: boolean("resolved").default(false),
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, createdAt: true });
export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({ id: true, createdAt: true });
export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceChatMessageSchema = createInsertSchema(serviceChatMessages).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({ id: true, updatedAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, completedAt: true });

// Novo fluxo de inteligência integral
export const insertAiDiagnosisSchema = createInsertSchema(aiDiagnoses).omit({ id: true, createdAt: true });
export const insertProviderDiagnosisSchema = createInsertSchema(providerDiagnoses).omit({ id: true, createdAt: true });
export const insertDigitalAcceptanceSchema = createInsertSchema(digitalAcceptances).omit({ id: true, acceptedAt: true });
export const insertServiceExecutionLogSchema = createInsertSchema(serviceExecutionLogs).omit({ id: true, createdAt: true });
export const insertPaymentEscrowSchema = createInsertSchema(paymentEscrows).omit({ id: true, createdAt: true });
export const insertAntifraudFlagSchema = createInsertSchema(antifraudFlags).omit({ id: true, createdAt: true });

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type InsertServiceChatMessage = z.infer<typeof insertServiceChatMessageSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type InsertAiDiagnosis = z.infer<typeof insertAiDiagnosisSchema>;
export type InsertProviderDiagnosis = z.infer<typeof insertProviderDiagnosisSchema>;
export type InsertDigitalAcceptance = z.infer<typeof insertDigitalAcceptanceSchema>;
export type InsertServiceExecutionLog = z.infer<typeof insertServiceExecutionLogSchema>;
export type InsertPaymentEscrow = z.infer<typeof insertPaymentEscrowSchema>;
export type InsertAntifraudFlag = z.infer<typeof insertAntifraudFlagSchema>;

export type UserProfile = typeof userProfiles.$inferSelect;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type ServiceChatMessage = typeof serviceChatMessages.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type AiDiagnosis = typeof aiDiagnoses.$inferSelect;
export type ProviderDiagnosis = typeof providerDiagnoses.$inferSelect;
export type DigitalAcceptance = typeof digitalAcceptances.$inferSelect;
export type ServiceExecutionLog = typeof serviceExecutionLogs.$inferSelect;
export type PaymentEscrow = typeof paymentEscrows.$inferSelect;
export type AntifraudFlag = typeof antifraudFlags.$inferSelect;
