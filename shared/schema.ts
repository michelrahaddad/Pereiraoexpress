import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, pgEnum, serial, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const userRoleEnum = pgEnum("user_role", ["client", "provider", "admin"]);
export const serviceStatusEnum = pgEnum("service_status", [
  "pending",           // Aguardando diagnóstico IA
  "ai_diagnosed",      // IA gerou diagnóstico, aguardando pagamento taxa
  "fee_paid",          // Taxa de diagnóstico paga, aguardando seleção profissional
  "selecting_provider",// Cliente selecionando profissional
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
  rating: decimal("rating", { precision: 3, scale: 1 }).default("10.0"), // Nota 0-10, inicia com 10
  totalRatings: integer("total_ratings").default(0), // Total de avaliações recebidas
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

// ==================== FORNECEDORES E MATERIAIS ====================

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  cnpj: varchar("cnpj"),
  phone: varchar("phone"),
  email: varchar("email"),
  address: text("address"),
  city: varchar("city"),
  categories: text("categories"), // JSON array de categorias atendidas
  deliveryTimeHours: integer("delivery_time_hours").default(24),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const materials = pgTable("materials", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category"), // elétrico, hidráulico, pintura, etc
  unit: varchar("unit").default("un"), // un, m, kg, etc
  costPrice: integer("cost_price").notNull(), // preço de custo em centavos
  salePrice: integer("sale_price").notNull(), // preço de venda com margem em centavos
  stockQuantity: integer("stock_quantity").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const materialOrders = pgTable("material_orders", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  supplierId: integer("supplier_id").notNull(),
  items: text("items").notNull(), // JSON array [{materialId, quantity, unitPrice, totalPrice}]
  totalCost: integer("total_cost").notNull(), // custo total em centavos
  totalSale: integer("total_sale").notNull(), // preço de venda total em centavos
  platformMargin: integer("platform_margin").default(0), // margem da plataforma em centavos
  status: varchar("status").default("pending"), // pending, ordered, delivered, cancelled
  orderedAt: timestamp("ordered_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
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

// ==========================================
// BANCO DE SINTOMAS PARA DIAGNÓSTICO INTELIGENTE
// ==========================================

// Sintomas por categoria de serviço
export const symptoms = pgTable("symptoms", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(), // Referência à categoria de serviço
  name: varchar("name").notNull(), // Ex: "Vazamento", "Curto-circuito"
  description: text("description"), // Descrição detalhada do sintoma
  keywords: text("keywords"), // Palavras-chave para matching (JSON array)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Perguntas específicas para cada sintoma
export const symptomQuestions = pgTable("symptom_questions", {
  id: serial("id").primaryKey(),
  symptomId: integer("symptom_id").notNull(), // Referência ao sintoma
  question: text("question").notNull(), // Ex: "A água está limpa ou suja?"
  questionOrder: integer("question_order").default(1), // Ordem da pergunta
  expectedResponses: text("expected_responses"), // Respostas esperadas (JSON array)
  triggerKeywords: text("trigger_keywords"), // Palavras que ativam esta pergunta (JSON array) Ex: ["vazamento", "vazando", "goteira"]
  triggerCondition: text("trigger_condition"), // Condição baseada em resposta anterior (JSON) Ex: {"questionId": 1, "answer": "sim"}
  isRequired: boolean("is_required").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Diagnósticos possíveis para cada sintoma
export const symptomDiagnoses = pgTable("symptom_diagnoses", {
  id: serial("id").primaryKey(),
  symptomId: integer("symptom_id").notNull(), // Referência ao sintoma
  title: varchar("title").notNull(), // Ex: "Cano furado"
  description: text("description").notNull(), // Explicação do problema
  solution: text("solution"), // Solução recomendada
  providerMaterials: text("provider_materials"), // Materiais do prestador (JSON array)
  clientMaterials: text("client_materials"), // Materiais que cliente compra (JSON array)
  estimatedPriceMin: integer("estimated_price_min"), // Preço mínimo em centavos
  estimatedPriceMax: integer("estimated_price_max"), // Preço máximo em centavos
  urgencyLevel: varchar("urgency_level").default("normal"), // normal, urgente, emergência
  matchConditions: text("match_conditions"), // Condições para match (JSON - respostas que levam a esse diagnóstico)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Conhecimento local por cidade/região
export const localKnowledge = pgTable("local_knowledge", {
  id: serial("id").primaryKey(),
  city: varchar("city"), // Cidade específica ou null para global
  categoryId: integer("category_id"), // Categoria de serviço
  title: varchar("title").notNull(), // Ex: "Casas antigas em Pereira Barreto"
  knowledge: text("knowledge").notNull(), // Conhecimento específico
  commonIssues: text("common_issues"), // Problemas comuns na região (JSON array)
  materialsTips: text("materials_tips"), // Dicas de materiais locais
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabela de Preços de Referência (SINAPI, regional, mercado)
export const referencePrices = pgTable("reference_prices", {
  id: serial("id").primaryKey(),
  code: varchar("code"), // Código SINAPI ou interno
  source: varchar("source").notNull(), // "sinapi", "regional", "mercado", "manual"
  categoryId: integer("category_id"), // Categoria de serviço relacionada
  state: varchar("state", { length: 2 }), // UF (SP, MG, etc) ou null para nacional
  city: varchar("city"), // Cidade específica ou null para estadual/nacional
  itemType: varchar("item_type").notNull(), // "service", "material", "labor"
  name: varchar("name").notNull(), // Nome do item
  description: text("description"), // Descrição detalhada
  unit: varchar("unit").notNull(), // Unidade (m², h, un, kg, etc)
  priceMin: integer("price_min").notNull(), // Preço mínimo em centavos
  priceMax: integer("price_max"), // Preço máximo em centavos (opcional)
  priceAvg: integer("price_avg"), // Preço médio em centavos
  laborPercent: integer("labor_percent"), // % de mão de obra no preço
  keywords: text("keywords"), // Palavras-chave para matching (JSON array)
  referenceDate: timestamp("reference_date"), // Data de referência do preço
  isDesonerated: boolean("is_desonerated").default(false), // Preço desonerado (sem INSS)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Fornecedores de materiais por região
export const materialSuppliers = pgTable("material_suppliers", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // Nome da loja/fornecedor
  city: varchar("city").notNull(), // Cidade
  state: varchar("state", { length: 2 }).notNull(), // UF
  address: text("address"), // Endereço completo
  phone: varchar("phone"), // Telefone
  whatsapp: varchar("whatsapp"), // WhatsApp
  website: varchar("website"), // Site
  specialties: text("specialties"), // Especialidades (JSON array: elétrica, hidráulica, etc)
  deliveryAvailable: boolean("delivery_available").default(false),
  priceLevel: varchar("price_level"), // "economico", "medio", "premium"
  rating: decimal("rating", { precision: 3, scale: 1 }), // Avaliação 0-10
  notes: text("notes"), // Observações
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// ==========================================
// TREINAMENTO DA IA POR CATEGORIA
// ==========================================

export const aiTrainingConfigs = pgTable("ai_training_configs", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  
  rules: text("rules"),
  engineModel: varchar("engine_model").default("gemini-2.5-flash"),
  engineTemperature: decimal("engine_temperature", { precision: 3, scale: 2 }).default("0.70"),
  engineMaxTokens: integer("engine_max_tokens").default(2048),
  engineMaxQuestions: integer("engine_max_questions").default(3),
  
  tone: varchar("tone").default("friendly"),
  greeting: text("greeting"),
  vocabulary: text("vocabulary"),
  
  conditionalQuestions: text("conditional_questions"),
  exampleConversations: text("example_conversations"),
  forbiddenTopics: text("forbidden_topics"),
  pricingRules: text("pricing_rules"),
  diagnosisTips: text("diagnosis_tips"),
  
  systemPromptOverride: text("system_prompt_override"),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAiTrainingConfigSchema = createInsertSchema(aiTrainingConfigs).omit({ id: true, createdAt: true, updatedAt: true });
export type AiTrainingConfig = typeof aiTrainingConfigs.$inferSelect;
export type InsertAiTrainingConfig = z.infer<typeof insertAiTrainingConfigSchema>;

// Insert schemas para sintomas
export const insertSymptomSchema = createInsertSchema(symptoms).omit({ id: true, createdAt: true });
export const insertSymptomQuestionSchema = createInsertSchema(symptomQuestions).omit({ id: true, createdAt: true });
export const insertSymptomDiagnosisSchema = createInsertSchema(symptomDiagnoses).omit({ id: true, createdAt: true });
export const insertLocalKnowledgeSchema = createInsertSchema(localKnowledge).omit({ id: true, createdAt: true });
export const insertReferencePriceSchema = createInsertSchema(referencePrices).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMaterialSupplierSchema = createInsertSchema(materialSuppliers).omit({ id: true, createdAt: true });

export type InsertSymptom = z.infer<typeof insertSymptomSchema>;
export type InsertSymptomQuestion = z.infer<typeof insertSymptomQuestionSchema>;
export type InsertSymptomDiagnosis = z.infer<typeof insertSymptomDiagnosisSchema>;
export type InsertLocalKnowledge = z.infer<typeof insertLocalKnowledgeSchema>;
export type InsertReferencePrice = z.infer<typeof insertReferencePriceSchema>;
export type InsertMaterialSupplier = z.infer<typeof insertMaterialSupplierSchema>;

export type ReferencePrice = typeof referencePrices.$inferSelect;
export type MaterialSupplier = typeof materialSuppliers.$inferSelect;

export type Symptom = typeof symptoms.$inferSelect;
export type SymptomQuestion = typeof symptomQuestions.$inferSelect;
export type SymptomDiagnosis = typeof symptomDiagnoses.$inferSelect;
export type LocalKnowledge = typeof localKnowledge.$inferSelect;

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, createdAt: true });
export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({ id: true, createdAt: true });
export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceChatMessageSchema = createInsertSchema(serviceChatMessages).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({ id: true, updatedAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, completedAt: true });

// Fornecedores e materiais
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export const insertMaterialSchema = createInsertSchema(materials).omit({ id: true, createdAt: true });
export const insertMaterialOrderSchema = createInsertSchema(materialOrders).omit({ id: true, createdAt: true });

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
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InsertMaterial = z.infer<typeof insertMaterialSchema>;
export type InsertMaterialOrder = z.infer<typeof insertMaterialOrderSchema>;
export type InsertAiDiagnosis = z.infer<typeof insertAiDiagnosisSchema>;
export type InsertProviderDiagnosis = z.infer<typeof insertProviderDiagnosisSchema>;
export type InsertDigitalAcceptance = z.infer<typeof insertDigitalAcceptanceSchema>;
export type InsertServiceExecutionLog = z.infer<typeof insertServiceExecutionLogSchema>;
export type InsertPaymentEscrow = z.infer<typeof insertPaymentEscrowSchema>;
export type InsertAntifraudFlag = z.infer<typeof insertAntifraudFlagSchema>;

export type UserProfile = typeof userProfiles.$inferSelect;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type MaterialOrder = typeof materialOrders.$inferSelect;
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

// Notificações
export const notificationTypeEnum = pgEnum("notification_type", [
  "service_request",    // Novo serviço solicitado
  "service_accepted",   // Prestador aceitou
  "service_rejected",   // Prestador recusou
  "service_completed",  // Serviço concluído
  "payment_received",   // Pagamento recebido
  "new_message",        // Nova mensagem
  "call_requested"      // Chamada solicitada
]);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  type: notificationTypeEnum("type").notNull(),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  data: text("data"), // JSON com dados extras (serviceId, etc)
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Chamadas Twilio (Secretária Digital IA)
export const twilioCallStatusEnum = pgEnum("twilio_call_status", [
  "pending",      // Aguardando ligação
  "calling",      // Ligando
  "in_progress",  // Em andamento
  "completed",    // Completada
  "no_answer",    // Não atendeu
  "busy",         // Ocupado
  "failed",       // Falhou
  "accepted",     // Prestador aceitou
  "rejected"      // Prestador recusou
]);

export const twilioCalls = pgTable("twilio_calls", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  providerId: varchar("provider_id").notNull(),
  providerPhone: varchar("provider_phone").notNull(),
  twilioCallSid: varchar("twilio_call_sid"),
  status: twilioCallStatusEnum("status").default("pending"),
  transcript: text("transcript"), // Transcrição da conversa
  aiResponse: text("ai_response"), // Resposta da IA
  providerResponse: text("provider_response"), // Resposta do prestador
  duration: integer("duration"), // Duração em segundos
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertTwilioCallSchema = createInsertSchema(twilioCalls).omit({ id: true, createdAt: true });
export type InsertTwilioCall = z.infer<typeof insertTwilioCallSchema>;
export type TwilioCall = typeof twilioCalls.$inferSelect;

// Push Notifications Subscriptions
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({ id: true, createdAt: true });
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// Materiais de Construção - Banco de dados com preços médios de mercado
export const materialCategoryEnum = pgEnum("material_category", [
  "pintura",
  "eletrica", 
  "hidraulica",
  "alvenaria",
  "ferramentas",
  "acabamento",
  "madeira",
  "ar_condicionado",
  "limpeza"
]);

export const constructionMaterials = pgTable("construction_materials", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: materialCategoryEnum("category").notNull(),
  unit: varchar("unit", { length: 50 }).notNull(), // un, m, m², kg, L, etc.
  basePrice: integer("base_price").notNull(), // Preço base em centavos
  marketPrice: integer("market_price").notNull(), // Preço de mercado (base * 1.3) em centavos
  brand: varchar("brand", { length: 100 }),
  sku: varchar("sku", { length: 50 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertConstructionMaterialSchema = createInsertSchema(constructionMaterials).omit({ id: true, createdAt: true });
export type InsertConstructionMaterial = z.infer<typeof insertConstructionMaterialSchema>;
export type ConstructionMaterial = typeof constructionMaterials.$inferSelect;

// Materiais usados em um serviço
export const serviceMaterials = pgTable("service_materials", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull(),
  materialId: integer("material_id").notNull(),
  materialName: varchar("material_name", { length: 255 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: integer("unit_price").notNull(), // Preço unitário em centavos
  totalPrice: integer("total_price").notNull(), // Preço total em centavos
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertServiceMaterialSchema = createInsertSchema(serviceMaterials).omit({ id: true, createdAt: true });
export type InsertServiceMaterial = z.infer<typeof insertServiceMaterialSchema>;
export type ServiceMaterial = typeof serviceMaterials.$inferSelect;
