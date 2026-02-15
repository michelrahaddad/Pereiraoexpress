import type {
  User,
  UserProfile,
  ServiceRequest,
  ServiceCategory,
  ServiceChatMessage,
  AiDiagnosis,
  ProviderDiagnosis,
  DigitalAcceptance,
  ServiceExecutionLog,
  Payment,
  PaymentEscrow,
  ProviderWithdrawal,
  Notification,
  PushSubscription,
  Review,
  Conversation,
  Message,
  Symptom,
  SymptomQuestion,
  SymptomDiagnosis,
  LocalKnowledge,
  AiTrainingConfig,
  GuidedQuestion,
  SystemSetting,
  AntifraudFlag,
  TwilioCall,
  MaterialSupplier,
  Material,
  MaterialOrder,
  Supplier,
  ReferencePrice,
  PasswordResetToken,
  GuidedQuestionType,
} from "../entities";

export interface IUserRepository {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(data: Partial<User>): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(data: Partial<UserProfile>): Promise<UserProfile>;
  updateUserProfile(userId: string, data: Partial<UserProfile>): Promise<UserProfile | undefined>;
  getUsersByRole(role: string): Promise<UserProfile[]>;
  getUsersByCity(city: string): Promise<UserProfile[]>;
  getAllUsers(): Promise<UserProfile[]>;
  searchUsers(query: string): Promise<User[]>;
  getUsersByIds(ids: string[]): Promise<User[]>;
}

export interface IServiceRepository {
  create(data: Partial<ServiceRequest>): Promise<ServiceRequest>;
  getById(id: number): Promise<ServiceRequest | undefined>;
  getByClientId(clientId: string): Promise<ServiceRequest[]>;
  getByProviderId(providerId: string): Promise<ServiceRequest[]>;
  update(id: number, data: Partial<ServiceRequest>): Promise<ServiceRequest | undefined>;
  getAll(): Promise<ServiceRequest[]>;
  getByStatus(status: string): Promise<ServiceRequest[]>;
}

export interface ICategoryRepository {
  getAll(): Promise<ServiceCategory[]>;
  getById(id: number): Promise<ServiceCategory | undefined>;
  create(data: Partial<ServiceCategory>): Promise<ServiceCategory>;
}

export interface IAiDiagnosisRepository {
  create(data: Partial<AiDiagnosis>): Promise<AiDiagnosis>;
  getByServiceId(serviceRequestId: number): Promise<AiDiagnosis | undefined>;
}

export interface IProviderDiagnosisRepository {
  create(data: Partial<ProviderDiagnosis>): Promise<ProviderDiagnosis>;
  getByServiceId(serviceRequestId: number): Promise<ProviderDiagnosis | undefined>;
}

export interface IDigitalAcceptanceRepository {
  create(data: Partial<DigitalAcceptance>): Promise<DigitalAcceptance>;
  getByServiceId(serviceRequestId: number): Promise<DigitalAcceptance | undefined>;
}

export interface IExecutionLogRepository {
  create(data: Partial<ServiceExecutionLog>): Promise<ServiceExecutionLog>;
  getByServiceId(serviceRequestId: number): Promise<ServiceExecutionLog | undefined>;
  update(serviceRequestId: number, data: Partial<ServiceExecutionLog>): Promise<ServiceExecutionLog | undefined>;
}

export interface IPaymentRepository {
  create(data: Partial<Payment>): Promise<Payment>;
  getById(id: number): Promise<Payment | undefined>;
  getByServiceId(serviceRequestId: number): Promise<Payment[]>;
  getByUserId(userId: string): Promise<Payment[]>;
  update(id: number, data: Partial<Payment>): Promise<Payment | undefined>;
}

export interface IEscrowRepository {
  create(data: Partial<PaymentEscrow>): Promise<PaymentEscrow>;
  getByServiceId(serviceRequestId: number): Promise<PaymentEscrow | undefined>;
  getByPaymentId(paymentId: number): Promise<PaymentEscrow | undefined>;
  update(id: number, data: Partial<PaymentEscrow>): Promise<PaymentEscrow | undefined>;
}

export interface IWithdrawalRepository {
  create(data: Partial<ProviderWithdrawal>): Promise<ProviderWithdrawal>;
  getByProviderId(providerId: string): Promise<ProviderWithdrawal[]>;
  update(id: number, data: Partial<ProviderWithdrawal>): Promise<ProviderWithdrawal | undefined>;
  getAll(): Promise<ProviderWithdrawal[]>;
}

export interface INotificationRepository {
  create(data: Partial<Notification>): Promise<Notification>;
  getByUser(userId: string): Promise<Notification[]>;
  getUnread(userId: string): Promise<Notification[]>;
  markAsRead(id: number): Promise<Notification | undefined>;
  markAllAsRead(userId: string): Promise<void>;
}

export interface IPushSubscriptionRepository {
  create(data: Partial<PushSubscription>): Promise<PushSubscription>;
  getByEndpoint(endpoint: string): Promise<PushSubscription | undefined>;
  getByUser(userId: string): Promise<PushSubscription[]>;
  delete(id: number): Promise<void>;
}

export interface IReviewRepository {
  create(data: Partial<Review>): Promise<Review>;
  getByServiceId(serviceRequestId: number): Promise<Review | undefined>;
  getByProviderId(providerId: string): Promise<Review[]>;
}

export interface IConversationRepository {
  create(data: Partial<Conversation>): Promise<Conversation>;
  getById(id: number): Promise<Conversation | undefined>;
  getByUserId(userId: string): Promise<Conversation[]>;
}

export interface IMessageRepository {
  create(data: Partial<Message>): Promise<Message>;
  getByConversationId(conversationId: number): Promise<Message[]>;
}

export interface IChatMessageRepository {
  create(data: Partial<ServiceChatMessage>): Promise<ServiceChatMessage>;
  getByServiceId(serviceRequestId: number): Promise<ServiceChatMessage[]>;
}

export interface ISymptomRepository {
  getAll(): Promise<Symptom[]>;
  getById(id: number): Promise<Symptom | undefined>;
  getByCategoryId(categoryId: number): Promise<Symptom[]>;
  create(data: Partial<Symptom>): Promise<Symptom>;
  update(id: number, data: Partial<Symptom>): Promise<Symptom | undefined>;
  delete(id: number): Promise<void>;
  getQuestions(symptomId: number): Promise<SymptomQuestion[]>;
  createQuestion(data: Partial<SymptomQuestion>): Promise<SymptomQuestion>;
  updateQuestion(id: number, data: Partial<SymptomQuestion>): Promise<SymptomQuestion | undefined>;
  deleteQuestion(id: number): Promise<void>;
  getDiagnoses(symptomId: number): Promise<SymptomDiagnosis[]>;
  createDiagnosis(data: Partial<SymptomDiagnosis>): Promise<SymptomDiagnosis>;
  updateDiagnosis(id: number, data: Partial<SymptomDiagnosis>): Promise<SymptomDiagnosis | undefined>;
  deleteDiagnosis(id: number): Promise<void>;
  getFullData(categoryId?: number): Promise<{
    symptoms: Symptom[];
    questions: SymptomQuestion[];
    diagnoses: SymptomDiagnosis[];
  }>;
}

export interface ILocalKnowledgeRepository {
  getAll(): Promise<LocalKnowledge[]>;
  create(data: Partial<LocalKnowledge>): Promise<LocalKnowledge>;
  update(id: number, data: Partial<LocalKnowledge>): Promise<LocalKnowledge | undefined>;
  delete(id: number): Promise<void>;
}

export interface IAiTrainingRepository {
  getAll(): Promise<AiTrainingConfig[]>;
  getByCategory(categoryId: number): Promise<AiTrainingConfig | undefined>;
  upsert(categoryId: number, data: Partial<AiTrainingConfig>): Promise<AiTrainingConfig>;
  delete(id: number): Promise<void>;
}

export interface IGuidedQuestionRepository {
  getAll(): Promise<GuidedQuestion[]>;
  getByType(type: GuidedQuestionType): Promise<GuidedQuestion[]>;
  create(data: Partial<GuidedQuestion>): Promise<GuidedQuestion>;
  update(id: number, data: Partial<GuidedQuestion>): Promise<GuidedQuestion | undefined>;
  delete(id: number): Promise<void>;
}

export interface ISettingsRepository {
  get(key: string): Promise<SystemSetting | undefined>;
  set(data: Partial<SystemSetting>): Promise<SystemSetting>;
  getAll(): Promise<SystemSetting[]>;
  getPricing(): Promise<SystemSetting[]>;
}

export interface IAntifraudRepository {
  getPending(): Promise<AntifraudFlag[]>;
  resolve(id: number, resolvedBy: string): Promise<AntifraudFlag | undefined>;
}

export interface ITwilioCallRepository {
  create(data: Partial<TwilioCall>): Promise<TwilioCall>;
  getBySid(sid: string): Promise<TwilioCall | undefined>;
  getByService(serviceRequestId: number): Promise<TwilioCall[]>;
  update(id: number, data: Partial<TwilioCall>): Promise<TwilioCall | undefined>;
}

export interface IMaterialSupplierRepository {
  getAll(filters?: { city?: string; state?: string }): Promise<MaterialSupplier[]>;
  create(data: Partial<MaterialSupplier>): Promise<MaterialSupplier>;
  update(id: number, data: Partial<MaterialSupplier>): Promise<MaterialSupplier | undefined>;
  delete(id: number): Promise<void>;
}

export interface IMaterialRepository {
  getAll(): Promise<Material[]>;
  getById(id: number): Promise<Material | undefined>;
  getByCategory(category: string): Promise<Material[]>;
  getBySupplierId(supplierId: number): Promise<Material[]>;
  create(data: Partial<Material>): Promise<Material>;
  update(id: number, data: Partial<Material>): Promise<Material | undefined>;
}

export interface ISupplierRepository {
  getAll(): Promise<Supplier[]>;
  getById(id: number): Promise<Supplier | undefined>;
  getByCity(city: string): Promise<Supplier[]>;
  create(data: Partial<Supplier>): Promise<Supplier>;
  update(id: number, data: Partial<Supplier>): Promise<Supplier | undefined>;
}

export interface IMaterialOrderRepository {
  create(data: Partial<MaterialOrder>): Promise<MaterialOrder>;
  getByServiceId(serviceRequestId: number): Promise<MaterialOrder | undefined>;
  updateStatus(id: number, status: string): Promise<MaterialOrder | undefined>;
}

export interface IReferencePriceRepository {
  getAll(filters?: { categoryId?: number; state?: string; city?: string; itemType?: string }): Promise<ReferencePrice[]>;
  create(data: Partial<ReferencePrice>): Promise<ReferencePrice>;
  update(id: number, data: Partial<ReferencePrice>): Promise<ReferencePrice | undefined>;
  delete(id: number): Promise<void>;
}

export interface IPasswordResetTokenRepository {
  create(data: Partial<PasswordResetToken>): Promise<PasswordResetToken>;
  getByToken(token: string): Promise<PasswordResetToken | undefined>;
  markUsed(id: string): Promise<PasswordResetToken | undefined>;
}
