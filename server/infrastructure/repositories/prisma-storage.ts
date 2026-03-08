import { prisma } from '../prisma/client';
import { IStorage } from '../../storage';
import {
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
  type AiTrainingConfig, type InsertAiTrainingConfig,
  type GuidedQuestion, type InsertGuidedQuestion,
  type ProviderWithdrawal, type InsertProviderWithdrawal,
  type ProviderAvailability, type InsertProviderAvailability,
} from "@shared/schema";

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function mapRowToCamel<T>(row: Record<string, any>): T {
  const result: Record<string, any> = {};
  for (const key of Object.keys(row)) {
    const camelKey = snakeToCamel(key);
    let value = row[key];
    if (value !== null && typeof value === 'object' && typeof value.toNumber === 'function') {
      value = value.toString();
    }
    result[camelKey] = value;
  }
  return result as T;
}

function mapRowsToCamel<T>(rows: Record<string, any>[]): T[] {
  return rows.map(r => mapRowToCamel<T>(r));
}

function mapDataToSnake(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    result[camelToSnake(key)] = data[key];
  }
  return result;
}

export class PrismaStorage implements IStorage {
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const row = await prisma.user_profiles.findFirst({ where: { user_id: userId } });
    return row ? mapRowToCamel<UserProfile>(row) : undefined;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const row = await prisma.user_profiles.create({ data: mapDataToSnake(profile) as any });
    return mapRowToCamel<UserProfile>(row);
  }

  async updateUserProfile(userId: string, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const existing = await prisma.user_profiles.findFirst({ where: { user_id: userId } });
    if (!existing) return undefined;
    const row = await prisma.user_profiles.update({
      where: { id: existing.id },
      data: mapDataToSnake(data) as any,
    });
    return mapRowToCamel<UserProfile>(row);
  }

  async getCategories(): Promise<ServiceCategory[]> {
    const rows = await prisma.service_categories.findMany({ orderBy: { name: 'asc' } });
    return mapRowsToCamel<ServiceCategory>(rows);
  }

  async getCategoryById(id: number): Promise<ServiceCategory | undefined> {
    const row = await prisma.service_categories.findUnique({ where: { id } });
    return row ? mapRowToCamel<ServiceCategory>(row) : undefined;
  }

  async createCategory(category: InsertServiceCategory): Promise<ServiceCategory> {
    const row = await prisma.service_categories.create({ data: mapDataToSnake(category) as any });
    return mapRowToCamel<ServiceCategory>(row);
  }

  async getServicesByClient(clientId: string): Promise<ServiceRequest[]> {
    const rows = await prisma.service_requests.findMany({
      where: { client_id: clientId },
      orderBy: { created_at: 'desc' },
    });
    return mapRowsToCamel<ServiceRequest>(rows);
  }

  async getServiceById(id: number): Promise<ServiceRequest | undefined> {
    const row = await prisma.service_requests.findUnique({ where: { id } });
    return row ? mapRowToCamel<ServiceRequest>(row) : undefined;
  }

  async getAvailableServices(): Promise<ServiceRequest[]> {
    const rows = await prisma.service_requests.findMany({
      where: { status: 'fee_paid' },
      orderBy: { created_at: 'desc' },
    });
    return mapRowsToCamel<ServiceRequest>(rows);
  }

  async getServicesByProvider(providerId: string): Promise<ServiceRequest[]> {
    const rows = await prisma.service_requests.findMany({
      where: { provider_id: providerId },
      orderBy: { created_at: 'desc' },
    });
    return mapRowsToCamel<ServiceRequest>(rows);
  }

  async getAllServices(): Promise<ServiceRequest[]> {
    const rows = await prisma.service_requests.findMany({ orderBy: { created_at: 'desc' } });
    return mapRowsToCamel<ServiceRequest>(rows);
  }

  async createService(service: InsertServiceRequest): Promise<ServiceRequest> {
    const row = await prisma.service_requests.create({ data: mapDataToSnake(service) as any });
    return mapRowToCamel<ServiceRequest>(row);
  }

  async updateService(id: number, data: Partial<InsertServiceRequest>): Promise<ServiceRequest | undefined> {
    try {
      const row = await prisma.service_requests.update({
        where: { id },
        data: { ...mapDataToSnake(data), updated_at: new Date() } as any,
      });
      return mapRowToCamel<ServiceRequest>(row);
    } catch {
      return undefined;
    }
  }

  async getMessagesByService(serviceRequestId: number): Promise<ServiceChatMessage[]> {
    const rows = await prisma.service_chat_messages.findMany({
      where: { service_request_id: serviceRequestId },
      orderBy: { created_at: 'asc' },
    });
    return mapRowsToCamel<ServiceChatMessage>(rows);
  }

  async createServiceMessage(message: InsertServiceChatMessage): Promise<ServiceChatMessage> {
    const row = await prisma.service_chat_messages.create({ data: mapDataToSnake(message) as any });
    return mapRowToCamel<ServiceChatMessage>(row);
  }

  async getReviewsByProvider(providerId: string): Promise<Review[]> {
    const rows = await prisma.reviews.findMany({
      where: { provider_id: providerId },
      orderBy: { created_at: 'desc' },
    });
    return mapRowsToCamel<Review>(rows);
  }

  async createReview(review: InsertReview): Promise<Review> {
    const row = await prisma.reviews.create({ data: mapDataToSnake(review) as any });
    return mapRowToCamel<Review>(row);
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const row = await prisma.conversations.findUnique({ where: { id } });
    return row ? mapRowToCamel<Conversation>(row) : undefined;
  }

  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    const rows = await prisma.conversations.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return mapRowsToCamel<Conversation>(rows);
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    const row = await prisma.conversations.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<Conversation>(row);
  }

  async deleteConversation(id: number): Promise<void> {
    await prisma.messages.deleteMany({ where: { conversation_id: id } });
    await prisma.conversations.delete({ where: { id } });
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    const rows = await prisma.messages.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'asc' },
    });
    return mapRowsToCamel<Message>(rows);
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const row = await prisma.messages.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<Message>(row);
  }

  async getSystemSettings(): Promise<SystemSetting[]> {
    const rows = await prisma.system_settings.findMany();
    return mapRowsToCamel<SystemSetting>(rows);
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const row = await prisma.system_settings.findUnique({ where: { key } });
    return row ? mapRowToCamel<SystemSetting>(row) : undefined;
  }

  async upsertSystemSetting(data: InsertSystemSetting): Promise<SystemSetting> {
    const existing = await prisma.system_settings.findUnique({ where: { key: data.key } });
    if (existing) {
      const row = await prisma.system_settings.update({
        where: { key: data.key },
        data: { value: data.value, description: data.description ?? existing.description, updated_at: new Date() },
      });
      return mapRowToCamel<SystemSetting>(row);
    }
    const row = await prisma.system_settings.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<SystemSetting>(row);
  }

  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    const rows = await prisma.payments.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return mapRowsToCamel<Payment>(rows);
  }

  async getPaymentById(id: number): Promise<Payment | undefined> {
    const row = await prisma.payments.findUnique({ where: { id } });
    return row ? mapRowToCamel<Payment>(row) : undefined;
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const row = await prisma.payments.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<Payment>(row);
  }

  async updatePaymentStatus(id: number, status: string): Promise<Payment | undefined> {
    try {
      const row = await prisma.payments.update({
        where: { id },
        data: {
          status: status as any,
          completed_at: status === "completed" ? new Date() : null,
        },
      });
      return mapRowToCamel<Payment>(row);
    } catch {
      return undefined;
    }
  }

  async getAllPayments(): Promise<Payment[]> {
    const rows = await prisma.payments.findMany({ orderBy: { created_at: 'desc' } });
    return mapRowsToCamel<Payment>(rows);
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    const rows = await prisma.user_profiles.findMany({ orderBy: { created_at: 'desc' } });
    return mapRowsToCamel<UserProfile>(rows);
  }

  async getAvailableProviders(city?: string, categoryId?: number): Promise<(UserProfile & { latitude?: string | null; longitude?: string | null; firstName?: string | null; lastName?: string | null })[]> {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT up.*, u.latitude, u.longitude, u.first_name, u.last_name
      FROM user_profiles up
      LEFT JOIN users u ON up.user_id = u.id
      WHERE up.role = 'provider' AND up.is_available = true
      ORDER BY up.rating DESC
    `;

    const providers = rows.map((r: any) => {
      const mapped = mapRowToCamel<UserProfile & { latitude?: string | null; longitude?: string | null; firstName?: string | null; lastName?: string | null }>(r);
      if (mapped.latitude !== null && mapped.latitude !== undefined) {
        mapped.latitude = mapped.latitude.toString();
      }
      if (mapped.longitude !== null && mapped.longitude !== undefined) {
        mapped.longitude = mapped.longitude.toString();
      }
      return mapped;
    });

    if (city) {
      return providers.filter((p: any) => p.city?.toLowerCase() === city.toLowerCase());
    }

    return providers;
  }

  async updateProviderRating(userId: string, newRating: number, totalRatings: number): Promise<UserProfile | undefined> {
    const existing = await prisma.user_profiles.findFirst({ where: { user_id: userId } });
    if (!existing) return undefined;
    const row = await prisma.user_profiles.update({
      where: { id: existing.id },
      data: { rating: newRating.toFixed(1), total_ratings: totalRatings },
    });
    return mapRowToCamel<UserProfile>(row);
  }

  async createAiDiagnosis(data: InsertAiDiagnosis): Promise<AiDiagnosis> {
    const row = await prisma.ai_diagnoses.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<AiDiagnosis>(row);
  }

  async getAiDiagnosisByServiceId(serviceRequestId: number): Promise<AiDiagnosis | undefined> {
    const row = await prisma.ai_diagnoses.findFirst({ where: { service_request_id: serviceRequestId } });
    return row ? mapRowToCamel<AiDiagnosis>(row) : undefined;
  }

  async createProviderDiagnosis(data: InsertProviderDiagnosis): Promise<ProviderDiagnosis> {
    const row = await prisma.provider_diagnoses.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<ProviderDiagnosis>(row);
  }

  async getProviderDiagnosisByServiceId(serviceRequestId: number): Promise<ProviderDiagnosis | undefined> {
    const row = await prisma.provider_diagnoses.findFirst({ where: { service_request_id: serviceRequestId } });
    return row ? mapRowToCamel<ProviderDiagnosis>(row) : undefined;
  }

  async createDigitalAcceptance(data: InsertDigitalAcceptance): Promise<DigitalAcceptance> {
    const row = await prisma.digital_acceptances.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<DigitalAcceptance>(row);
  }

  async getDigitalAcceptanceByServiceId(serviceRequestId: number): Promise<DigitalAcceptance | undefined> {
    const row = await prisma.digital_acceptances.findFirst({ where: { service_request_id: serviceRequestId } });
    return row ? mapRowToCamel<DigitalAcceptance>(row) : undefined;
  }

  async createServiceExecutionLog(data: InsertServiceExecutionLog): Promise<ServiceExecutionLog> {
    const row = await prisma.service_execution_logs.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<ServiceExecutionLog>(row);
  }

  async getServiceExecutionLog(serviceRequestId: number): Promise<ServiceExecutionLog | undefined> {
    const row = await prisma.service_execution_logs.findFirst({ where: { service_request_id: serviceRequestId } });
    return row ? mapRowToCamel<ServiceExecutionLog>(row) : undefined;
  }

  async updateServiceExecutionLog(serviceRequestId: number, data: Partial<InsertServiceExecutionLog>): Promise<ServiceExecutionLog | undefined> {
    const existing = await prisma.service_execution_logs.findFirst({ where: { service_request_id: serviceRequestId } });
    if (!existing) return undefined;
    const row = await prisma.service_execution_logs.update({
      where: { id: existing.id },
      data: mapDataToSnake(data) as any,
    });
    return mapRowToCamel<ServiceExecutionLog>(row);
  }

  async createPaymentEscrow(data: InsertPaymentEscrow): Promise<PaymentEscrow> {
    const row = await prisma.payment_escrows.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<PaymentEscrow>(row);
  }

  async getPaymentEscrowByServiceId(serviceRequestId: number): Promise<PaymentEscrow | undefined> {
    const row = await prisma.payment_escrows.findFirst({ where: { service_request_id: serviceRequestId } });
    return row ? mapRowToCamel<PaymentEscrow>(row) : undefined;
  }

  async updatePaymentEscrowStatus(id: number, status: string): Promise<PaymentEscrow | undefined> {
    try {
      const row = await prisma.payment_escrows.update({
        where: { id },
        data: { status: status as any },
      });
      return mapRowToCamel<PaymentEscrow>(row);
    } catch {
      return undefined;
    }
  }

  async releasePaymentEscrow(id: number): Promise<PaymentEscrow | undefined> {
    try {
      const row = await prisma.payment_escrows.update({
        where: { id },
        data: { status: 'released' as any, released_at: new Date() },
      });
      return mapRowToCamel<PaymentEscrow>(row);
    } catch {
      return undefined;
    }
  }

  async createAntifraudFlag(data: InsertAntifraudFlag): Promise<AntifraudFlag> {
    const row = await prisma.antifraud_flags.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<AntifraudFlag>(row);
  }

  async getAntifraudFlagsByServiceId(serviceRequestId: number): Promise<AntifraudFlag[]> {
    const rows = await prisma.antifraud_flags.findMany({
      where: { service_request_id: serviceRequestId },
      orderBy: { created_at: 'desc' },
    });
    return mapRowsToCamel<AntifraudFlag>(rows);
  }

  async resolveAntifraudFlag(id: number, resolvedBy: string): Promise<AntifraudFlag | undefined> {
    try {
      const row = await prisma.antifraud_flags.update({
        where: { id },
        data: { resolved: true, resolved_by: resolvedBy, resolved_at: new Date() },
      });
      return mapRowToCamel<AntifraudFlag>(row);
    } catch {
      return undefined;
    }
  }

  async getPendingAntifraudFlags(): Promise<AntifraudFlag[]> {
    const rows = await prisma.antifraud_flags.findMany({
      where: { resolved: false },
      orderBy: { created_at: 'desc' },
    });
    return mapRowsToCamel<AntifraudFlag>(rows);
  }

  async getSuppliers(): Promise<Supplier[]> {
    const rows = await prisma.suppliers.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
    return mapRowsToCamel<Supplier>(rows);
  }

  async getSupplierById(id: number): Promise<Supplier | undefined> {
    const row = await prisma.suppliers.findUnique({ where: { id } });
    return row ? mapRowToCamel<Supplier>(row) : undefined;
  }

  async getSuppliersByCity(city: string): Promise<Supplier[]> {
    const rows = await prisma.suppliers.findMany({
      where: { city, is_active: true },
      orderBy: { name: 'asc' },
    });
    return mapRowsToCamel<Supplier>(rows);
  }

  async createSupplier(data: InsertSupplier): Promise<Supplier> {
    const row = await prisma.suppliers.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<Supplier>(row);
  }

  async updateSupplier(id: number, data: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    try {
      const row = await prisma.suppliers.update({
        where: { id },
        data: mapDataToSnake(data) as any,
      });
      return mapRowToCamel<Supplier>(row);
    } catch {
      return undefined;
    }
  }

  async getMaterials(): Promise<Material[]> {
    const rows = await prisma.materials.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
    return mapRowsToCamel<Material>(rows);
  }

  async getMaterialById(id: number): Promise<Material | undefined> {
    const row = await prisma.materials.findUnique({ where: { id } });
    return row ? mapRowToCamel<Material>(row) : undefined;
  }

  async getMaterialsBySupplierId(supplierId: number): Promise<Material[]> {
    const rows = await prisma.materials.findMany({
      where: { supplier_id: supplierId, is_active: true },
      orderBy: { name: 'asc' },
    });
    return mapRowsToCamel<Material>(rows);
  }

  async getMaterialsByCategory(category: string): Promise<Material[]> {
    const rows = await prisma.materials.findMany({
      where: { category, is_active: true },
      orderBy: { name: 'asc' },
    });
    return mapRowsToCamel<Material>(rows);
  }

  async createMaterial(data: InsertMaterial): Promise<Material> {
    const row = await prisma.materials.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<Material>(row);
  }

  async updateMaterial(id: number, data: Partial<InsertMaterial>): Promise<Material | undefined> {
    try {
      const row = await prisma.materials.update({
        where: { id },
        data: mapDataToSnake(data) as any,
      });
      return mapRowToCamel<Material>(row);
    } catch {
      return undefined;
    }
  }

  async createMaterialOrder(data: InsertMaterialOrder): Promise<MaterialOrder> {
    const row = await prisma.material_orders.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<MaterialOrder>(row);
  }

  async getMaterialOrderByServiceId(serviceRequestId: number): Promise<MaterialOrder | undefined> {
    const row = await prisma.material_orders.findFirst({ where: { service_request_id: serviceRequestId } });
    return row ? mapRowToCamel<MaterialOrder>(row) : undefined;
  }

  async getMaterialOrdersBySupplierId(supplierId: number): Promise<MaterialOrder[]> {
    const rows = await prisma.material_orders.findMany({
      where: { supplier_id: supplierId },
      orderBy: { created_at: 'desc' },
    });
    return mapRowsToCamel<MaterialOrder>(rows);
  }

  async updateMaterialOrderStatus(id: number, status: string): Promise<MaterialOrder | undefined> {
    try {
      const now = new Date();
      const updateData: any = { status };
      if (status === "ordered") updateData.ordered_at = now;
      if (status === "delivered") updateData.delivered_at = now;

      const row = await prisma.material_orders.update({
        where: { id },
        data: updateData,
      });
      return mapRowToCamel<MaterialOrder>(row);
    } catch {
      return undefined;
    }
  }

  async getSymptoms(): Promise<Symptom[]> {
    const rows = await prisma.symptoms.findMany({
      where: { is_active: true },
      orderBy: { name: 'asc' },
    });
    return mapRowsToCamel<Symptom>(rows);
  }

  async getSymptomById(id: number): Promise<Symptom | undefined> {
    const row = await prisma.symptoms.findUnique({ where: { id } });
    return row ? mapRowToCamel<Symptom>(row) : undefined;
  }

  async getSymptomsByCategoryId(categoryId: number): Promise<Symptom[]> {
    const rows = await prisma.symptoms.findMany({
      where: { category_id: categoryId, is_active: true },
      orderBy: { name: 'asc' },
    });
    return mapRowsToCamel<Symptom>(rows);
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
    const row = await prisma.symptoms.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<Symptom>(row);
  }

  async updateSymptom(id: number, data: Partial<InsertSymptom>): Promise<Symptom | undefined> {
    try {
      const row = await prisma.symptoms.update({
        where: { id },
        data: mapDataToSnake(data) as any,
      });
      return mapRowToCamel<Symptom>(row);
    } catch {
      return undefined;
    }
  }

  async deleteSymptom(id: number): Promise<void> {
    await prisma.symptoms.update({ where: { id }, data: { is_active: false } });
  }

  async getSymptomQuestions(symptomId: number): Promise<SymptomQuestion[]> {
    const rows = await prisma.symptom_questions.findMany({
      where: { symptom_id: symptomId },
      orderBy: { question_order: 'asc' },
    });
    return mapRowsToCamel<SymptomQuestion>(rows);
  }

  async createSymptomQuestion(data: InsertSymptomQuestion): Promise<SymptomQuestion> {
    const row = await prisma.symptom_questions.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<SymptomQuestion>(row);
  }

  async updateSymptomQuestion(id: number, data: Partial<InsertSymptomQuestion>): Promise<SymptomQuestion | undefined> {
    try {
      const row = await prisma.symptom_questions.update({
        where: { id },
        data: mapDataToSnake(data) as any,
      });
      return mapRowToCamel<SymptomQuestion>(row);
    } catch {
      return undefined;
    }
  }

  async deleteSymptomQuestion(id: number): Promise<void> {
    await prisma.symptom_questions.delete({ where: { id } });
  }

  async getSymptomDiagnoses(symptomId: number): Promise<SymptomDiagnosis[]> {
    const rows = await prisma.symptom_diagnoses.findMany({
      where: { symptom_id: symptomId, is_active: true },
    });
    return mapRowsToCamel<SymptomDiagnosis>(rows);
  }

  async createSymptomDiagnosis(data: InsertSymptomDiagnosis): Promise<SymptomDiagnosis> {
    const row = await prisma.symptom_diagnoses.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<SymptomDiagnosis>(row);
  }

  async updateSymptomDiagnosis(id: number, data: Partial<InsertSymptomDiagnosis>): Promise<SymptomDiagnosis | undefined> {
    try {
      const row = await prisma.symptom_diagnoses.update({
        where: { id },
        data: mapDataToSnake(data) as any,
      });
      return mapRowToCamel<SymptomDiagnosis>(row);
    } catch {
      return undefined;
    }
  }

  async deleteSymptomDiagnosis(id: number): Promise<void> {
    await prisma.symptom_diagnoses.update({ where: { id }, data: { is_active: false } });
  }

  async getLocalKnowledge(): Promise<LocalKnowledge[]> {
    const rows = await prisma.local_knowledge.findMany({ where: { is_active: true } });
    return mapRowsToCamel<LocalKnowledge>(rows);
  }

  async getLocalKnowledgeByCity(city: string): Promise<LocalKnowledge[]> {
    const rows = await prisma.local_knowledge.findMany({
      where: {
        is_active: true,
        OR: [
          { city },
          { city: null },
        ],
      },
    });
    return mapRowsToCamel<LocalKnowledge>(rows);
  }

  async createLocalKnowledge(data: InsertLocalKnowledge): Promise<LocalKnowledge> {
    const row = await prisma.local_knowledge.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<LocalKnowledge>(row);
  }

  async updateLocalKnowledge(id: number, data: Partial<InsertLocalKnowledge>): Promise<LocalKnowledge | undefined> {
    try {
      const row = await prisma.local_knowledge.update({
        where: { id },
        data: mapDataToSnake(data) as any,
      });
      return mapRowToCamel<LocalKnowledge>(row);
    } catch {
      return undefined;
    }
  }

  async deleteLocalKnowledge(id: number): Promise<void> {
    await prisma.local_knowledge.update({ where: { id }, data: { is_active: false } });
  }

  async getFullSymptomData(categoryId?: number): Promise<{
    symptoms: Symptom[];
    questions: SymptomQuestion[];
    diagnoses: SymptomDiagnosis[];
  }> {
    const allSymptoms = categoryId
      ? await this.getSymptomsByCategoryId(categoryId)
      : await this.getSymptoms();

    const symptomIds = allSymptoms.map(s => s.id);

    if (symptomIds.length === 0) {
      return { symptoms: allSymptoms, questions: [], diagnoses: [] };
    }

    const [questionRows, diagnosisRows] = await Promise.all([
      prisma.symptom_questions.findMany({
        where: { symptom_id: { in: symptomIds } },
        orderBy: { question_order: 'asc' },
      }),
      prisma.symptom_diagnoses.findMany({
        where: { symptom_id: { in: symptomIds }, is_active: true },
      }),
    ]);

    return {
      symptoms: allSymptoms,
      questions: mapRowsToCamel<SymptomQuestion>(questionRows),
      diagnoses: mapRowsToCamel<SymptomDiagnosis>(diagnosisRows),
    };
  }

  async getReferencePrices(filters?: { categoryId?: number; state?: string; city?: string; itemType?: string }): Promise<ReferencePrice[]> {
    const where: any = { is_active: true };

    if (filters?.categoryId) {
      where.category_id = filters.categoryId;
    }
    if (filters?.state) {
      where.OR = [{ state: filters.state }, { state: null }];
    }
    if (filters?.city) {
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: [{ city: filters.city }, { city: null }] },
        ];
        delete where.OR;
      } else {
        where.OR = [{ city: filters.city }, { city: null }];
      }
    }
    if (filters?.itemType) {
      where.item_type = filters.itemType;
    }

    const rows = await prisma.reference_prices.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    return mapRowsToCamel<ReferencePrice>(rows);
  }

  async getReferencePricesByKeywords(keywords: string[], state?: string): Promise<ReferencePrice[]> {
    const keywordPatterns = keywords.map(kw => `%${kw}%`);
    const keywordOrClauses = keywordPatterns.map((_p, i) => `(LOWER(name) LIKE LOWER($${i + 1}) OR LOWER(keywords) LIKE LOWER($${i + 1}))`).join(' OR ');
    
    let query = `SELECT * FROM reference_prices WHERE is_active = true`;
    const params: any[] = [...keywordPatterns];
    
    if (keywordOrClauses) {
      query += ` AND (${keywordOrClauses})`;
    }
    
    if (state) {
      params.push(state);
      query += ` AND (state = $${params.length} OR state IS NULL)`;
    }
    
    query += ` LIMIT 20`;

    const rows = await prisma.$queryRawUnsafe<any[]>(query, ...params);
    return mapRowsToCamel<ReferencePrice>(rows);
  }

  async getReferencePricesByCategoryId(categoryId: number): Promise<ReferencePrice[]> {
    const rows = await prisma.reference_prices.findMany({
      where: { is_active: true, category_id: categoryId },
      orderBy: { name: 'asc' },
      take: 30,
    });
    return mapRowsToCamel<ReferencePrice>(rows);
  }

  async createReferencePrice(data: InsertReferencePrice): Promise<ReferencePrice> {
    const row = await prisma.reference_prices.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<ReferencePrice>(row);
  }

  async updateReferencePrice(id: number, data: Partial<InsertReferencePrice>): Promise<ReferencePrice | undefined> {
    try {
      const row = await prisma.reference_prices.update({
        where: { id },
        data: { ...mapDataToSnake(data), updated_at: new Date() } as any,
      });
      return mapRowToCamel<ReferencePrice>(row);
    } catch {
      return undefined;
    }
  }

  async deleteReferencePrice(id: number): Promise<void> {
    await prisma.reference_prices.update({ where: { id }, data: { is_active: false } });
  }

  async getMaterialSuppliers(filters?: { city?: string; state?: string }): Promise<MaterialSupplier[]> {
    const where: any = { is_active: true };
    if (filters?.city) where.city = filters.city;
    if (filters?.state) where.state = filters.state;

    const rows = await prisma.material_suppliers.findMany({
      where,
      orderBy: { rating: 'desc' },
    });
    return mapRowsToCamel<MaterialSupplier>(rows);
  }

  async createMaterialSupplier(data: InsertMaterialSupplier): Promise<MaterialSupplier> {
    const row = await prisma.material_suppliers.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<MaterialSupplier>(row);
  }

  async updateMaterialSupplier(id: number, data: Partial<InsertMaterialSupplier>): Promise<MaterialSupplier | undefined> {
    try {
      const row = await prisma.material_suppliers.update({
        where: { id },
        data: mapDataToSnake(data) as any,
      });
      return mapRowToCamel<MaterialSupplier>(row);
    } catch {
      return undefined;
    }
  }

  async deleteMaterialSupplier(id: number): Promise<void> {
    await prisma.material_suppliers.update({ where: { id }, data: { is_active: false } });
  }

  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    const rows = await prisma.notifications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return mapRowsToCamel<Notification>(rows);
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    const rows = await prisma.notifications.findMany({
      where: { user_id: userId, is_read: false },
      orderBy: { created_at: 'desc' },
    });
    return mapRowsToCamel<Notification>(rows);
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const row = await prisma.notifications.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<Notification>(row);
  }

  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    try {
      const row = await prisma.notifications.update({
        where: { id },
        data: { is_read: true },
      });
      return mapRowToCamel<Notification>(row);
    } catch {
      return undefined;
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await prisma.notifications.updateMany({
      where: { user_id: userId },
      data: { is_read: true },
    });
  }

  async getTwilioCallsByService(serviceId: number): Promise<TwilioCall[]> {
    const rows = await prisma.twilio_calls.findMany({
      where: { service_request_id: serviceId },
      orderBy: { created_at: 'desc' },
    });
    return mapRowsToCamel<TwilioCall>(rows);
  }

  async getTwilioCallById(id: number): Promise<TwilioCall | undefined> {
    const row = await prisma.twilio_calls.findUnique({ where: { id } });
    return row ? mapRowToCamel<TwilioCall>(row) : undefined;
  }

  async getTwilioCallBySid(sid: string): Promise<TwilioCall | undefined> {
    const row = await prisma.twilio_calls.findFirst({ where: { twilio_call_sid: sid } });
    return row ? mapRowToCamel<TwilioCall>(row) : undefined;
  }

  async createTwilioCall(data: InsertTwilioCall): Promise<TwilioCall> {
    const row = await prisma.twilio_calls.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<TwilioCall>(row);
  }

  async updateTwilioCall(id: number, data: Partial<InsertTwilioCall>): Promise<TwilioCall | undefined> {
    try {
      const row = await prisma.twilio_calls.update({
        where: { id },
        data: mapDataToSnake(data) as any,
      });
      return mapRowToCamel<TwilioCall>(row);
    } catch {
      return undefined;
    }
  }

  async getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]> {
    const rows = await prisma.push_subscriptions.findMany({ where: { user_id: userId } });
    return mapRowsToCamel<PushSubscription>(rows);
  }

  async getPushSubscriptionByEndpoint(endpoint: string): Promise<PushSubscription | undefined> {
    const row = await prisma.push_subscriptions.findFirst({ where: { endpoint } });
    return row ? mapRowToCamel<PushSubscription>(row) : undefined;
  }

  async createPushSubscription(data: InsertPushSubscription): Promise<PushSubscription> {
    const row = await prisma.push_subscriptions.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<PushSubscription>(row);
  }

  async deletePushSubscription(endpoint: string): Promise<void> {
    await prisma.push_subscriptions.deleteMany({ where: { endpoint } });
  }

  async deletePushSubscriptionsByUser(userId: string): Promise<void> {
    await prisma.push_subscriptions.deleteMany({ where: { user_id: userId } });
  }

  async getAiTrainingConfigs(): Promise<AiTrainingConfig[]> {
    const rows = await prisma.ai_training_configs.findMany({ orderBy: { category_id: 'asc' } });
    return mapRowsToCamel<AiTrainingConfig>(rows);
  }

  async getAiTrainingConfigByCategory(categoryId: number): Promise<AiTrainingConfig | undefined> {
    const row = await prisma.ai_training_configs.findFirst({ where: { category_id: categoryId } });
    return row ? mapRowToCamel<AiTrainingConfig>(row) : undefined;
  }

  async upsertAiTrainingConfig(categoryId: number, data: Partial<InsertAiTrainingConfig>): Promise<AiTrainingConfig> {
    const existing = await prisma.ai_training_configs.findFirst({ where: { category_id: categoryId } });
    if (existing) {
      const row = await prisma.ai_training_configs.update({
        where: { id: existing.id },
        data: { ...mapDataToSnake(data), updated_at: new Date() } as any,
      });
      return mapRowToCamel<AiTrainingConfig>(row);
    }
    const row = await prisma.ai_training_configs.create({
      data: { ...mapDataToSnake(data), category_id: categoryId } as any,
    });
    return mapRowToCamel<AiTrainingConfig>(row);
  }

  async deleteAiTrainingConfig(id: number): Promise<void> {
    await prisma.ai_training_configs.delete({ where: { id } });
  }

  async deleteUserAndProfile(userId: string): Promise<void> {
    await prisma.notifications.deleteMany({ where: { user_id: userId } });
    await prisma.push_subscriptions.deleteMany({ where: { user_id: userId } });
    await prisma.conversations.deleteMany({ where: { user_id: userId } });
    await prisma.user_profiles.deleteMany({ where: { user_id: userId } });
    await prisma.users.delete({ where: { id: userId } });
  }

  async getGuidedQuestions(): Promise<GuidedQuestion[]> {
    const rows = await prisma.guided_questions.findMany({
      orderBy: [{ question_type: 'asc' }, { sort_order: 'asc' }],
    });
    return mapRowsToCamel<GuidedQuestion>(rows);
  }

  async getGuidedQuestionsByType(questionType: string): Promise<GuidedQuestion[]> {
    const rows = await prisma.guided_questions.findMany({
      where: { question_type: questionType as any, is_active: true },
      orderBy: { sort_order: 'asc' },
    });
    return mapRowsToCamel<GuidedQuestion>(rows);
  }

  async createGuidedQuestion(data: InsertGuidedQuestion): Promise<GuidedQuestion> {
    const row = await prisma.guided_questions.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<GuidedQuestion>(row);
  }

  async updateGuidedQuestion(id: number, data: Partial<InsertGuidedQuestion>): Promise<GuidedQuestion | undefined> {
    try {
      const row = await prisma.guided_questions.update({
        where: { id },
        data: mapDataToSnake(data) as any,
      });
      return mapRowToCamel<GuidedQuestion>(row);
    } catch {
      return undefined;
    }
  }

  async deleteGuidedQuestion(id: number): Promise<void> {
    await prisma.guided_questions.delete({ where: { id } });
  }

  async getWithdrawalsByProvider(providerId: string): Promise<ProviderWithdrawal[]> {
    const rows = await prisma.provider_withdrawals.findMany({
      where: { provider_id: providerId },
      orderBy: { created_at: 'desc' },
    });
    return mapRowsToCamel<ProviderWithdrawal>(rows);
  }

  async createWithdrawal(data: InsertProviderWithdrawal): Promise<ProviderWithdrawal> {
    const row = await prisma.provider_withdrawals.create({ data: mapDataToSnake(data) as any });
    return mapRowToCamel<ProviderWithdrawal>(row);
  }

  async updateWithdrawalStatus(id: number, status: string, notes?: string): Promise<ProviderWithdrawal | undefined> {
    try {
      const updateData: any = { status, processed_at: new Date() };
      if (notes) updateData.notes = notes;
      const row = await prisma.provider_withdrawals.update({
        where: { id },
        data: updateData,
      });
      return mapRowToCamel<ProviderWithdrawal>(row);
    } catch {
      return undefined;
    }
  }

  async getAllWithdrawals(): Promise<ProviderWithdrawal[]> {
    const rows = await prisma.provider_withdrawals.findMany({ orderBy: { created_at: 'desc' } });
    return mapRowsToCamel<ProviderWithdrawal>(rows);
  }

  async getProviderAvailability(userId: string): Promise<ProviderAvailability[]> {
    const rows = await prisma.provider_availability.findMany({
      where: { user_id: userId },
      orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
    });
    return mapRowsToCamel<ProviderAvailability>(rows);
  }

  async setProviderAvailability(userId: string, slots: InsertProviderAvailability[]): Promise<ProviderAvailability[]> {
    await prisma.provider_availability.deleteMany({ where: { user_id: userId } });
    if (slots.length > 0) {
      await prisma.provider_availability.createMany({
        data: slots.map(s => ({
          user_id: userId,
          day_of_week: s.dayOfWeek,
          start_time: s.startTime,
          end_time: s.endTime,
          is_active: s.isActive !== undefined ? s.isActive : true,
        })),
      });
    }
    return this.getProviderAvailability(userId);
  }

  async getProvidersWithAvailability(userIds: string[]): Promise<Record<string, ProviderAvailability[]>> {
    if (userIds.length === 0) return {};
    const rows = await prisma.provider_availability.findMany({
      where: { user_id: { in: userIds }, is_active: true },
      orderBy: [{ day_of_week: 'asc' }, { start_time: 'asc' }],
    });
    const mapped = mapRowsToCamel<ProviderAvailability>(rows);
    const result: Record<string, ProviderAvailability[]> = {};
    for (const slot of mapped) {
      if (!result[slot.userId]) result[slot.userId] = [];
      result[slot.userId].push(slot);
    }
    return result;
  }
}

export const prismaStorage = new PrismaStorage();
