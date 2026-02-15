export enum UserRole {
  CLIENT = "client",
  PROVIDER = "provider",
  ADMIN = "admin",
}

export enum ServiceStatus {
  PENDING = "pending",
  AI_DIAGNOSED = "ai_diagnosed",
  FEE_PAID = "fee_paid",
  SELECTING_PROVIDER = "selecting_provider",
  PROVIDER_ASSIGNED = "provider_assigned",
  PROVIDER_DIAGNOSED = "provider_diagnosed",
  QUOTE_SENT = "quote_sent",
  ACCEPTED = "accepted",
  IN_PROGRESS = "in_progress",
  AWAITING_CONFIRMATION = "awaiting_confirmation",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum SlaPriority {
  STANDARD = "standard",
  EXPRESS = "express",
  URGENT = "urgent",
}

export enum PaymentMethod {
  PIX = "pix",
  CREDIT_CARD = "credit_card",
  DEBIT_CARD = "debit_card",
}

export enum PaymentStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  REFUNDED = "refunded",
}

export enum EscrowStatus {
  HOLDING = "holding",
  RELEASED = "released",
  REFUNDED = "refunded",
  DISPUTED = "disputed",
}

export enum NotificationType {
  SERVICE_REQUEST = "service_request",
  SERVICE_ACCEPTED = "service_accepted",
  SERVICE_REJECTED = "service_rejected",
  SERVICE_COMPLETED = "service_completed",
  PAYMENT_RECEIVED = "payment_received",
  NEW_MESSAGE = "new_message",
  CALL_REQUESTED = "call_requested",
}

export enum DocumentStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum AntifraudSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum TwilioCallStatus {
  PENDING = "pending",
  CALLING = "calling",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  NO_ANSWER = "no_answer",
  BUSY = "busy",
  FAILED = "failed",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export enum WithdrawalStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  REJECTED = "rejected",
}

export enum MaterialCategory {
  PINTURA = "pintura",
  ELETRICA = "eletrica",
  HIDRAULICA = "hidraulica",
  ALVENARIA = "alvenaria",
  FERRAMENTAS = "ferramentas",
  ACABAMENTO = "acabamento",
  MADEIRA = "madeira",
  AR_CONDICIONADO = "ar_condicionado",
  LIMPEZA = "limpeza",
}

export enum GuidedQuestionType {
  REPAIR = "repair",
  DOMESTIC = "domestic",
}

export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  password: string | null;
  cpf: string | null;
  phone: string | null;
  age: number | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  pixKeyType: string | null;
  pixKey: string | null;
  bankName: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
}

export interface UserProfile {
  id: string;
  userId: string;
  role: UserRole;
  phone: string | null;
  address: string | null;
  bio: string | null;
  specialties: string | null;
  rating: number | null;
  totalServices: number | null;
  isAvailable: boolean | null;
  createdAt: Date | null;
  city: string | null;
  documentUrl: string | null;
  documentStatus: DocumentStatus | null;
  documentNotes: string | null;
  termsAccepted: boolean | null;
  termsAcceptedAt: Date | null;
  totalRatings: number | null;
}

export interface ServiceRequest {
  id: number;
  clientId: string;
  providerId: string | null;
  categoryId: number;
  title: string;
  description: string;
  status: ServiceStatus;
  slaPriority: SlaPriority | null;
  estimatedPrice: number | null;
  finalPrice: number | null;
  diagnosis: string | null;
  materials: string | null;
  address: string | null;
  scheduledDate: Date | null;
  completedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ServiceCategory {
  id: number;
  name: string;
  icon: string;
  description: string | null;
  basePrice: number | null;
  createdAt: Date | null;
}

export interface ServiceChatMessage {
  id: number;
  serviceRequestId: number;
  senderId: string | null;
  senderType: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date | null;
}

export interface AiDiagnosis {
  id: number;
  serviceRequestId: number;
  inputDescription: string;
  guidedAnswers: string | null;
  mediaUrls: string | null;
  classification: string | null;
  urgencyLevel: string | null;
  estimatedDuration: string | null;
  materialsSuggested: string | null;
  priceRangeMin: number | null;
  priceRangeMax: number | null;
  diagnosisFee: number | null;
  aiResponse: string | null;
  createdAt: Date | null;
}

export interface ProviderDiagnosis {
  id: number;
  serviceRequestId: number;
  providerId: string;
  findings: string;
  laborCost: number;
  materialsCost: number | null;
  materialsList: string | null;
  estimatedDuration: string | null;
  mediaUrls: string | null;
  notes: string | null;
  createdAt: Date | null;
}

export interface DigitalAcceptance {
  id: number;
  serviceRequestId: number;
  clientId: string;
  aiDiagnosisId: number | null;
  providerDiagnosisId: number | null;
  totalPrice: number;
  laborCost: number;
  materialsCost: number | null;
  platformFee: number | null;
  estimatedDuration: string | null;
  termsVersion: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  acceptedAt: Date | null;
}

export interface ServiceExecutionLog {
  id: number;
  serviceRequestId: number;
  providerId: string;
  startedAt: Date | null;
  completedAt: Date | null;
  startLatitude: string | null;
  startLongitude: string | null;
  endLatitude: string | null;
  endLongitude: string | null;
  beforePhotos: string | null;
  afterPhotos: string | null;
  notes: string | null;
  durationMinutes: number | null;
  createdAt: Date | null;
}

export interface Payment {
  id: number;
  userId: string;
  serviceRequestId: number | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  description: string | null;
  pixCode: string | null;
  stripePaymentId: string | null;
  createdAt: Date | null;
  completedAt: Date | null;
}

export interface PaymentEscrow {
  id: number;
  serviceRequestId: number;
  paymentId: number;
  holdAmount: number;
  platformShare: number | null;
  providerShare: number | null;
  supplierShare: number | null;
  status: EscrowStatus;
  releaseAt: Date | null;
  releasedAt: Date | null;
  createdAt: Date | null;
}

export interface ProviderWithdrawal {
  id: number;
  providerId: string;
  amount: number;
  pixKeyType: string;
  pixKey: string;
  bankName: string | null;
  bankAgency: string | null;
  bankAccount: string | null;
  status: WithdrawalStatus;
  processedAt: Date | null;
  notes: string | null;
  createdAt: Date | null;
}

export interface Notification {
  id: number;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: string | null;
  isRead: boolean | null;
  createdAt: Date | null;
}

export interface PushSubscription {
  id: number;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
  createdAt: Date | null;
}

export interface Review {
  id: number;
  serviceRequestId: number;
  clientId: string;
  providerId: string;
  rating: number;
  comment: string | null;
  createdAt: Date | null;
}

export interface Conversation {
  id: number;
  title: string;
  userId: string | null;
  createdAt: Date;
}

export interface Message {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  imageUrl: string | null;
  createdAt: Date;
}

export interface Symptom {
  id: number;
  categoryId: number;
  name: string;
  description: string | null;
  keywords: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
}

export interface SymptomQuestion {
  id: number;
  symptomId: number;
  question: string;
  questionOrder: number | null;
  expectedResponses: string | null;
  isRequired: boolean | null;
  createdAt: Date | null;
  triggerKeywords: string | null;
  triggerCondition: string | null;
}

export interface SymptomDiagnosis {
  id: number;
  symptomId: number;
  title: string;
  description: string;
  solution: string | null;
  providerMaterials: string | null;
  clientMaterials: string | null;
  estimatedPriceMin: number | null;
  estimatedPriceMax: number | null;
  urgencyLevel: string | null;
  matchConditions: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
}

export interface LocalKnowledge {
  id: number;
  city: string | null;
  categoryId: number | null;
  title: string;
  knowledge: string;
  commonIssues: string | null;
  materialsTips: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
}

export interface AiTrainingConfig {
  id: number;
  categoryId: number;
  rules: string | null;
  engineModel: string | null;
  engineTemperature: number | null;
  engineMaxTokens: number | null;
  engineMaxQuestions: number | null;
  tone: string | null;
  greeting: string | null;
  vocabulary: string | null;
  conditionalQuestions: string | null;
  exampleConversations: string | null;
  forbiddenTopics: string | null;
  pricingRules: string | null;
  diagnosisTips: string | null;
  systemPromptOverride: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface GuidedQuestion {
  id: number;
  categoryId: number | null;
  questionType: GuidedQuestionType;
  questionKey: string;
  questionText: string;
  options: string;
  sortOrder: number;
  isActive: boolean | null;
  createdAt: Date | null;
}

export interface SystemSetting {
  id: number;
  key: string;
  value: string;
  description: string | null;
  updatedAt: Date | null;
}

export interface Session {
  sid: string;
  sess: unknown;
  expire: Date;
}

export interface AntifraudFlag {
  id: number;
  serviceRequestId: number;
  userId: string | null;
  reason: string;
  severity: AntifraudSeverity;
  details: string | null;
  resolved: boolean | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date | null;
}

export interface TwilioCall {
  id: number;
  serviceRequestId: number;
  providerId: string;
  providerPhone: string;
  twilioCallSid: string | null;
  status: TwilioCallStatus | null;
  transcript: string | null;
  aiResponse: string | null;
  providerResponse: string | null;
  duration: number | null;
  createdAt: Date | null;
  completedAt: Date | null;
}

export interface MaterialSupplier {
  id: number;
  name: string;
  city: string;
  state: string;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  specialties: string | null;
  deliveryAvailable: boolean | null;
  priceLevel: string | null;
  rating: number | null;
  notes: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
}

export interface Material {
  id: number;
  supplierId: number;
  name: string;
  description: string | null;
  category: string | null;
  unit: string | null;
  costPrice: number;
  salePrice: number;
  stockQuantity: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
}

export interface ConstructionMaterial {
  id: number;
  name: string;
  description: string | null;
  category: MaterialCategory;
  unit: string;
  basePrice: number;
  marketPrice: number;
  brand: string | null;
  sku: string | null;
  isActive: boolean | null;
  createdAt: Date | null;
}

export interface MaterialOrder {
  id: number;
  serviceRequestId: number;
  supplierId: number;
  items: string;
  totalCost: number;
  totalSale: number;
  platformMargin: number | null;
  status: string | null;
  orderedAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date | null;
}

export interface ServiceMaterial {
  id: number;
  serviceRequestId: number;
  materialId: number;
  materialName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date | null;
}

export interface Supplier {
  id: number;
  name: string;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  categories: string | null;
  deliveryTimeHours: number | null;
  isActive: boolean | null;
  createdAt: Date | null;
}

export interface ReferencePrice {
  id: number;
  code: string | null;
  source: string;
  categoryId: number | null;
  state: string | null;
  city: string | null;
  itemType: string;
  name: string;
  description: string | null;
  unit: string;
  priceMin: number;
  priceMax: number | null;
  priceAvg: number | null;
  laborPercent: number | null;
  keywords: string | null;
  referenceDate: Date | null;
  isDesonerated: boolean | null;
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date | null;
}
