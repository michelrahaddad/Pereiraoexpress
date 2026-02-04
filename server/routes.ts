import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupLocalAuth, isLocalAuthenticated } from "./auth/localAuth";
import { GoogleGenAI } from "@google/genai";
import { db } from "./db";
import { users, userProfiles } from "@shared/schema";
import { sql, eq } from "drizzle-orm";
import { serviceRequests, serviceCategories } from "@shared/schema";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

// Schemas de validação
const aiDiagnoseSchema = z.object({
  message: z.string().optional(),
  imageBase64: z.string().nullable().optional(),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).optional(),
  categoryId: z.number().optional(),
});

const isAuthenticated = isLocalAuthenticated;

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

async function seedCategories() {
  const existing = await storage.getCategories();
  if (existing.length === 0) {
    const categories = [
      { name: "Encanamento", icon: "droplet", description: "Vazamentos, entupimentos, instalações hidráulicas", basePrice: 15000 },
      { name: "Elétrica", icon: "zap", description: "Instalações elétricas, curtos-circuitos, tomadas", basePrice: 12000 },
      { name: "Pintura", icon: "paintbrush", description: "Pintura interna e externa, texturas", basePrice: 20000 },
      { name: "Marcenaria", icon: "hammer", description: "Móveis, portas, janelas, reparos em madeira", basePrice: 18000 },
      { name: "Ar Condicionado", icon: "wind", description: "Instalação, manutenção e limpeza de AC", basePrice: 25000 },
      { name: "Limpeza", icon: "sparkles", description: "Limpeza residencial e comercial", basePrice: 10000 },
      { name: "Passadeira", icon: "shirt", description: "Serviço de passar roupas", basePrice: 8000 },
    ];
    for (const cat of categories) {
      await storage.createCategory(cat);
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupLocalAuth(app);
  registerObjectStorageRoutes(app);
  
  await seedCategories();

  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  app.get("/api/service", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const services = await storage.getServicesByClient(userId);
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.post("/api/service", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { title, description, categoryId, diagnosis, materials, slaPriority, estimatedPrice, address } = req.body;
      
      const service = await storage.createService({
        clientId: userId,
        title,
        description,
        categoryId: categoryId || 1,
        diagnosis,
        materials,
        slaPriority: slaPriority || "standard",
        estimatedPrice,
        address,
        status: "pending",
      });
      
      res.status(201).json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(500).json({ error: "Failed to create service" });
    }
  });

  app.get("/api/service/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const service = await storage.getServiceById(id);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error fetching service:", error);
      res.status(500).json({ error: "Failed to fetch service" });
    }
  });

  app.patch("/api/service/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      const updateData: any = { status };
      if (status === "completed") {
        updateData.completedAt = new Date();
      }
      
      const service = await storage.updateService(id, updateData);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ error: "Failed to update service" });
    }
  });

  app.get("/api/provider/available", isAuthenticated, async (req, res) => {
    try {
      const services = await storage.getAvailableServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching available services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.get("/api/provider/my-services", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const services = await storage.getServicesByProvider(userId);
      res.json(services);
    } catch (error) {
      console.error("Error fetching provider services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.post("/api/provider/accept/:id", isAuthenticated, async (req: any, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const providerId = req.user.claims.sub;
      
      const service = await storage.updateService(serviceId, {
        providerId,
        status: "accepted",
      });
      
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      res.json(service);
    } catch (error) {
      console.error("Error accepting service:", error);
      res.status(500).json({ error: "Failed to accept service" });
    }
  });

  app.get("/api/provider/earnings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const services = await storage.getServicesByProvider(userId);
      
      const completed = services.filter(s => s.status === "completed");
      const total = completed.reduce((sum, s) => sum + (s.finalPrice || s.estimatedPrice || 0), 0);
      
      const thisMonth = completed
        .filter(s => {
          const date = new Date(s.completedAt || s.createdAt!);
          const now = new Date();
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        })
        .reduce((sum, s) => sum + (s.finalPrice || s.estimatedPrice || 0), 0);
      
      res.json({
        total,
        thisMonth,
        completed: completed.length,
      });
    } catch (error) {
      console.error("Error fetching earnings:", error);
      res.status(500).json({ error: "Failed to fetch earnings" });
    }
  });

  // Provider profile with rating
  app.get("/api/provider/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getUserProfile(userId);
      
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      
      res.json({
        rating: profile.rating || "0",
        totalRatings: profile.totalRatings || 0,
        city: profile.city,
        specialties: profile.specialties,
      });
    } catch (error) {
      console.error("Error fetching provider profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Provider reviews
  app.get("/api/provider/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const reviews = await storage.getReviewsByProvider(userId);
      
      // Get client names for each review
      const reviewsWithClients = await Promise.all(
        reviews.map(async (review) => {
          const clientProfile = await storage.getUserProfile(review.clientId);
          return {
            id: review.id,
            rating: review.rating,
            comment: review.comment,
            createdAt: review.createdAt,
            clientName: clientProfile?.userId?.slice(-4) || "Cliente",
          };
        })
      );
      
      res.json(reviewsWithClients);
    } catch (error) {
      console.error("Error fetching provider reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, async (req, res) => {
    try {
      const [usersResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
      const allServices = await storage.getAllServices();
      
      const completed = allServices.filter(s => s.status === "completed");
      const pending = allServices.filter(s => ["pending", "diagnosed", "waiting_provider"].includes(s.status));
      
      const totalRevenue = completed.reduce((sum, s) => sum + (s.finalPrice || s.estimatedPrice || 0), 0);
      
      const now = new Date();
      const monthlyCompleted = completed.filter(s => {
        const date = new Date(s.completedAt || s.createdAt!);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      });
      const monthlyRevenue = monthlyCompleted.reduce((sum, s) => sum + (s.finalPrice || s.estimatedPrice || 0), 0);
      
      res.json({
        totalUsers: Number(usersResult.count),
        totalProviders: Math.floor(Number(usersResult.count) * 0.3),
        totalServices: allServices.length,
        completedServices: completed.length,
        pendingServices: pending.length,
        totalRevenue,
        monthlyRevenue,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/admin/services", isAuthenticated, async (req, res) => {
    try {
      const services = await storage.getAllServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching all services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.post("/api/ai/diagnose", isAuthenticated, async (req: any, res) => {
    try {
      // Validar entrada
      const validationResult = aiDiagnoseSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Dados inválidos", 
          details: validationResult.error.flatten() 
        });
      }
      
      const { message, imageBase64, conversationHistory, categoryId } = validationResult.data;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // Função para normalizar texto (remover acentos e converter para minúsculo)
      const normalizeText = (text: string): string => {
        return text
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      };

      // Função para parsing seguro de JSON
      const safeJsonParse = (str: string | null): string[] => {
        if (!str) return [];
        try {
          const parsed = JSON.parse(str);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };

      // Limite de caracteres para o contexto de conhecimento
      const MAX_CONTEXT_LENGTH = 2000;

      // Buscar sintomas do banco de conhecimento baseados na mensagem e categoria
      let knowledgeBaseContext = "";
      try {
        const allSymptoms = await storage.getSymptoms();
        
        // Normalizar texto completo para busca
        const messageLower = normalizeText(message || "");
        const historyText = normalizeText(
          conversationHistory?.map((m: any) => m.content).join(" ") || ""
        );
        const fullText = `${messageLower} ${historyText}`;

        // Buscar sintomas relevantes com tratamento seguro
        const relevantSymptoms = allSymptoms.filter((s) => {
          try {
            if (categoryId && s.categoryId !== categoryId) return false;
            
            const keywords = safeJsonParse(s.keywords);
            if (keywords.length === 0) return false;
            
            return keywords.some((kw) => {
              const normalizedKw = normalizeText(kw);
              return fullText.includes(normalizedKw);
            });
          } catch {
            return false;
          }
        });

        if (relevantSymptoms.length > 0) {
          const symptomDetails = await Promise.all(
            relevantSymptoms.slice(0, 3).map(async (s) => {
              try {
                return await storage.getSymptomWithDetails(s.id);
              } catch {
                return null;
              }
            })
          );

          const validDetails = symptomDetails.filter((d): d is NonNullable<typeof d> => d !== null);
          if (validDetails.length > 0) {
            let contextBuilder = `\n\nBASE DE CONHECIMENTO (use para guiar o diagnóstico):\n`;
            
            for (const detail of validDetails) {
              if (contextBuilder.length >= MAX_CONTEXT_LENGTH) break;
              
              let symptomContext = `\nSINTOMA: ${detail.name}\n`;
              if (detail.description) {
                symptomContext += `Descrição: ${detail.description}\n`;
              }
              
              if (detail.questions && detail.questions.length > 0) {
                symptomContext += `Perguntas sugeridas:\n`;
                for (const q of detail.questions.slice(0, 3)) {
                  symptomContext += `- ${q.question}\n`;
                }
              }
              
              if (detail.diagnoses && detail.diagnoses.length > 0) {
                symptomContext += `Diagnósticos possíveis:\n`;
                for (const d of detail.diagnoses.slice(0, 3)) {
                  symptomContext += `- ${d.title}: ${d.description}`;
                  if (d.estimatedPriceMin && d.estimatedPriceMax) {
                    symptomContext += ` (R$ ${d.estimatedPriceMin / 100} - R$ ${d.estimatedPriceMax / 100})`;
                  }
                  if (d.urgencyLevel && d.urgencyLevel !== "normal") {
                    symptomContext += ` [${d.urgencyLevel.toUpperCase()}]`;
                  }
                  symptomContext += `\n`;
                  
                  const providerMats = safeJsonParse(d.providerMaterials);
                  if (providerMats.length > 0) {
                    symptomContext += `  Materiais do prestador: ${providerMats.join(", ")}\n`;
                  }
                  
                  const clientMats = safeJsonParse(d.clientMaterials);
                  if (clientMats.length > 0) {
                    symptomContext += `  Materiais do cliente: ${clientMats.join(", ")}\n`;
                  }
                }
              }
              
              if (contextBuilder.length + symptomContext.length <= MAX_CONTEXT_LENGTH) {
                contextBuilder += symptomContext;
              }
            }
            
            knowledgeBaseContext = contextBuilder;
          }
        }
      } catch (err) {
        console.error("Error fetching knowledge base:", err);
      }

      const systemPrompt = `Você é o assistente do Pereirão Express. Seu trabalho é entender o problema do cliente em MÁXIMO 3 PERGUNTAS rápidas e simples.${knowledgeBaseContext}

REGRAS OBRIGATÓRIAS:
- Máximo 3 perguntas curtas e diretas
- Respostas CURTAS (máximo 2 frases)
- Português brasileiro simples
- Faça UMA pergunta por vez
- Seja direto e amigável
- Use "você" (não "senhor/senhora")
- SÓ responda sobre reparos e prestação de serviços domésticos
- Se a pergunta não for sobre serviços domésticos, diga educadamente que só pode ajudar com serviços de reparo

PERGUNTAS CONDICIONAIS (ajuste baseado no problema):
**Se o cliente mencionar "vazamento", "vazando", "goteira", "água":**
- Pergunte sobre PRESSÃO da água: "A água sai com força ou só goteja?"
- Pergunte sobre COR da água: "A água está limpa/transparente ou suja/amarelada?"
- Pergunte se é água limpa ou esgoto: "É água da torneira ou do vaso/ralo?"

**Se o cliente mencionar "elétrica", "tomada", "luz", "choque", "disjuntor":**
- Pergunte sobre o DISJUNTOR: "O disjuntor está desarmando/caindo?"
- Pergunte sobre CHEIRO: "Você sente cheiro de queimado?"
- Pergunte se afeta outros pontos: "Outras tomadas ou luzes da casa funcionam?"

**Se o cliente mencionar "entupimento", "entupido", "não desce":**
- Pergunte onde: "É pia, vaso, ralo ou outro?"
- Pergunte se volta: "A água volta quando você usa?"
- Pergunte há quanto tempo: "Começou hoje ou já faz dias?"

**Se o cliente mencionar "portão", "controle", "motor":**
- Pergunte o tipo: "É portão de garagem, social ou basculante?"
- Pergunte o problema: "Não abre, não fecha, faz barulho ou é o controle?"
- Pergunte se é elétrico: "O motor liga/faz algum barulho?"

FLUXO BASE (adapte conforme o problema):
1. Qual o problema exatamente?
2. [Pergunta condicional baseada no tipo de problema]
3. Onde fica na sua casa? / Há quanto tempo está assim?
4. (SOMENTE se necessário para diagnóstico) Pode enviar uma foto?

IMPORTANTE: Após as 3 perguntas, peça foto APENAS se realmente ajudar no diagnóstico. Nem todo problema precisa de foto.

CATEGORIAS DE SERVIÇOS:
- Técnico de Portões e Controles
- Encanador
- Eletricista
- Chaveiro
- Pedreiro (reformas e reparos simples)
- Assentador de Pisos
- Gesseiro
- Calheiro
- Empregada Doméstica

SOBRE MATERIAIS:
- "providerMaterials": ferramentas e equipamentos que o PRESTADOR traz (máquina desentupidora, furadeira, escada, EPI, etc)
- "clientMaterials": peças ou materiais que o CLIENTE precisa comprar (torneira nova, tinta, lâmpada, tomada, etc)
- Se não houver materiais para o cliente, deixe "clientMaterials" vazio []

Quando entender o problema, responda normalmente E adicione o diagnóstico:
###DIAGNOSIS###
{
  "title": "Título curto",
  "category": "Categoria",
  "diagnosis": "Explicação simples do problema e solução",
  "providerMaterials": ["equipamento1", "ferramenta2"],
  "clientMaterials": [],
  "estimatedPrices": {
    "standard": 15000,
    "express": 22500,
    "urgent": 30000
  }
}
###END_DIAGNOSIS###

Preços em centavos. Express = 1.5x, Urgente = 2x do Standard.`;

      const chatMessages: any[] = [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Ok, vou ser direto e objetivo nas minhas respostas." }] },
      ];

      if (conversationHistory) {
        for (const msg of conversationHistory) {
          chatMessages.push({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
          });
        }
      }

      const userParts: any[] = [];
      if (message) {
        userParts.push({ text: message });
      }
      if (imageBase64) {
        const base64Data = imageBase64.split(",")[1] || imageBase64;
        userParts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data,
          },
        });
        userParts.push({ text: `ANÁLISE DE IMAGEM DETALHADA:

Analise esta foto do problema e forneça uma avaliação técnica detalhada. Examine cuidadosamente:

**IDENTIFICAÇÃO DO PROBLEMA:**
- Tipo de instalação/equipamento visível (encanamento, elétrica, estrutura, etc)
- Problema principal detectado na imagem

**SINAIS VISUAIS A IDENTIFICAR:**
- Manchas de água ou umidade (cor, extensão, padrão)
- Ferrugem ou oxidação (localização, intensidade)
- Rachaduras ou fissuras (tamanho, direção, profundidade aparente)
- Desgaste ou deterioração (peças gastas, pintura descascando)
- Mofo ou bolor (cor, área afetada)
- Danos estruturais (afundamentos, desníveis)
- Instalações improvisadas ou "gambiarras"
- Peças soltas, quebradas ou faltando

**ESTIMATIVA DE GRAVIDADE:**
Classifique de 1 a 5:
1 = Cosmético (estético, não urgente)
2 = Leve (funcionando, mas precisa atenção em breve)
3 = Moderado (problema ativo, resolver em dias)
4 = Grave (risco de piora, resolver urgente)
5 = Crítico (risco de segurança, parar uso imediato)

**AÇÃO RECOMENDADA:**
Com base na gravidade visual, indique a urgência do reparo.

Após analisar a imagem, também adicione os dados estruturados:
###IMAGE_ANALYSIS###
{
  "problemType": "tipo do problema identificado",
  "visualSigns": ["sinal1", "sinal2", "sinal3"],
  "severity": 1-5,
  "severityLabel": "cosmético|leve|moderado|grave|crítico",
  "affectedArea": "descrição da área afetada",
  "urgencyRecommendation": "imediato|urgente|programar|monitorar",
  "additionalObservations": "observações extras importantes"
}
###END_IMAGE_ANALYSIS###

Baseie seu diagnóstico no que você vê na imagem combinado com a descrição do cliente.` });
      }

      chatMessages.push({ role: "user", parts: userParts });

      const stream = await ai.models.generateContentStream({
        model: "gemini-2.5-flash",
        contents: chatMessages,
      });

      let fullResponse = "";

      for await (const chunk of stream) {
        const content = chunk.text || "";
        if (content) {
          fullResponse += content;
          
          const cleanContent = content.replace(/###DIAGNOSIS###[\s\S]*?###END_DIAGNOSIS###/g, "").trim();
          if (cleanContent) {
            res.write(`data: ${JSON.stringify({ content: cleanContent })}\n\n`);
          }
        }
      }

      // Parse análise de imagem estruturada
      const imageAnalysisMatch = fullResponse.match(/###IMAGE_ANALYSIS###([\s\S]*?)###END_IMAGE_ANALYSIS###/);
      if (imageAnalysisMatch) {
        try {
          const imageAnalysis = JSON.parse(imageAnalysisMatch[1].trim());
          res.write(`data: ${JSON.stringify({ imageAnalysis })}\n\n`);
        } catch (e) {
          console.error("Failed to parse image analysis:", e);
        }
      }

      // Parse diagnóstico estruturado
      const diagnosisMatch = fullResponse.match(/###DIAGNOSIS###([\s\S]*?)###END_DIAGNOSIS###/);
      if (diagnosisMatch) {
        try {
          const diagnosis = JSON.parse(diagnosisMatch[1].trim());
          res.write(`data: ${JSON.stringify({ diagnosis })}\n\n`);
        } catch (e) {
          console.error("Failed to parse diagnosis:", e);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error in AI diagnosis:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Erro ao processar diagnóstico" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process diagnosis" });
      }
    }
  });

  // Provider selection routes - Client selects provider after fee payment
  app.get("/api/providers/available", isAuthenticated, async (req: any, res) => {
    try {
      const { city, categoryId, serviceId } = req.query;
      
      // Get available providers, optionally filtered by city
      const providers = await storage.getAvailableProviders(city as string);
      
      // Get base price from service if serviceId provided
      let basePrice = 0;
      if (serviceId) {
        const service = await storage.getServiceById(parseInt(serviceId as string));
        if (service) {
          const category = await storage.getCategoryById(service.categoryId);
          basePrice = category?.basePrice || 0;
        }
      } else if (categoryId) {
        const category = await storage.getCategoryById(parseInt(categoryId as string));
        basePrice = category?.basePrice || 0;
      }
      
      // Calculate adjusted price for each provider based on rating
      const { getAdjustedPrice, getRatingLevel } = await import("@shared/priceMultiplier");
      
      const providersWithPricing = providers.map(provider => {
        const rating = parseFloat(provider.rating || "10");
        const totalRatings = provider.totalRatings || 0;
        return {
          ...provider,
          adjustedPrice: getAdjustedPrice(basePrice, rating, totalRatings),
          ratingLevel: getRatingLevel(rating, totalRatings),
          basePrice,
        };
      });
      
      // Sort: rated providers first (by rating desc), then new providers
      providersWithPricing.sort((a, b) => {
        const aHasRatings = (a.totalRatings || 0) > 0;
        const bHasRatings = (b.totalRatings || 0) > 0;
        
        // Rated providers come first
        if (aHasRatings && !bHasRatings) return -1;
        if (!aHasRatings && bHasRatings) return 1;
        
        // Among rated providers, sort by rating descending
        if (aHasRatings && bHasRatings) {
          return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
        }
        
        return 0;
      });
      
      res.json(providersWithPricing);
    } catch (error) {
      console.error("Error fetching available providers:", error);
      res.status(500).json({ error: "Failed to fetch providers" });
    }
  });

  app.post("/api/services/:id/select-provider", isAuthenticated, async (req: any, res) => {
    try {
      const serviceId = parseInt(req.params.id);
      const { providerId } = req.body;
      const clientId = req.user.claims.sub;
      
      const service = await storage.getServiceById(serviceId);
      
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      if (service.clientId !== clientId) {
        return res.status(403).json({ error: "Not authorized" });
      }
      
      // Verify service is in the correct status for provider selection
      if (service.status !== "fee_paid" && service.status !== "selecting_provider") {
        return res.status(400).json({ error: "Service is not ready for provider selection" });
      }
      
      // Get provider to calculate adjusted price
      const provider = await storage.getUserProfile(providerId);
      if (!provider || provider.role !== "provider") {
        return res.status(400).json({ error: "Invalid provider" });
      }
      
      // Calculate adjusted price
      const category = await storage.getCategoryById(service.categoryId);
      const { getAdjustedPrice } = await import("@shared/priceMultiplier");
      const adjustedPrice = getAdjustedPrice(
        category?.basePrice || 0, 
        parseFloat(provider.rating || "10"),
        provider.totalRatings || 0
      );
      
      // Update service with selected provider
      const updatedService = await storage.updateService(serviceId, {
        providerId,
        status: "provider_assigned",
        estimatedPrice: adjustedPrice,
      });
      
      res.json(updatedService);
    } catch (error) {
      console.error("Error selecting provider:", error);
      res.status(500).json({ error: "Failed to select provider" });
    }
  });

  // Payment routes
  app.post("/api/payments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount, method, description, serviceRequestId } = req.body;
      
      // Generate simulated PIX code
      const pixCode = method === "pix" ? `00020126580014br.gov.bcb.pix0136${Date.now()}` : null;
      
      const payment = await storage.createPayment({
        userId,
        amount,
        method,
        description,
        serviceRequestId,
        pixCode,
        status: "pending",
      });

      // Simulate payment processing (in production, this would integrate with Stripe)
      setTimeout(async () => {
        await storage.updatePaymentStatus(payment.id, "completed");
      }, 2000);

      res.json(payment);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  app.get("/api/payments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const payments = await storage.getPaymentsByUser(userId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  // Review routes - Client rates provider after service completion
  app.post("/api/reviews", isAuthenticated, async (req: any, res) => {
    try {
      const clientId = req.user.claims.sub;
      const { serviceRequestId, rating, comment } = req.body;
      
      // Validate rating (0-10 scale)
      if (rating < 0 || rating > 10) {
        return res.status(400).json({ error: "Rating must be between 0 and 10" });
      }
      
      // Get service to verify ownership and completion
      const service = await storage.getServiceById(serviceRequestId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }
      
      if (service.clientId !== clientId) {
        return res.status(403).json({ error: "Not authorized to review this service" });
      }
      
      if (service.status !== "completed" && service.status !== "awaiting_confirmation") {
        return res.status(400).json({ error: "Service must be completed to leave a review" });
      }
      
      if (!service.providerId) {
        return res.status(400).json({ error: "No provider assigned to this service" });
      }
      
      // Create review
      const review = await storage.createReview({
        serviceRequestId,
        clientId,
        providerId: service.providerId,
        rating,
        comment,
      });
      
      // Update provider's rating
      const { calculateNewRating } = await import("@shared/priceMultiplier");
      const provider = await storage.getUserProfile(service.providerId);
      
      if (provider) {
        const currentRating = parseFloat(provider.rating || "10");
        const totalRatings = provider.totalRatings || 0;
        const newRating = calculateNewRating(currentRating, totalRatings, rating);
        
        await storage.updateProviderRating(service.providerId, newRating, totalRatings + 1);
      }
      
      // Mark service as completed if it was awaiting confirmation
      if (service.status === "awaiting_confirmation") {
        await storage.updateService(serviceRequestId, { status: "completed" });
      }
      
      res.json(review);
    } catch (error) {
      console.error("Error creating review:", error);
      res.status(500).json({ error: "Failed to create review" });
    }
  });

  app.get("/api/reviews/provider/:providerId", async (req, res) => {
    try {
      const { providerId } = req.params;
      const reviews = await storage.getReviewsByProvider(providerId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  // Admin routes
  const isAdmin = async (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const userId = req.user.claims.sub;
    const profile = await storage.getUserProfile(userId);
    if (!profile || profile.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }
    next();
  };

  app.get("/api/admin/settings", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/admin/settings", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { key, value, description } = req.body;
      const setting = await storage.upsertSystemSetting({ key, value, description });
      res.json(setting);
    } catch (error) {
      console.error("Error updating setting:", error);
      res.status(500).json({ error: "Failed to update setting" });
    }
  });

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const profiles = await storage.getAllUserProfiles();
      res.json(profiles);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:userId/role", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const profile = await storage.updateUserProfile(userId, { role });
      res.json(profile);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  // Create user from admin panel
  app.post("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { firstName, lastName, email, phone, city, role, password } = req.body;
      
      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ error: "Dados incompletos" });
      }

      // Check if email already exists
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Email já cadastrado" });
      }

      const bcrypt = await import("bcryptjs");
      const hashedPassword = await bcrypt.hash(password, 12);
      
      const userId = crypto.randomUUID();
      
      // Create user
      await db.insert(users).values({
        id: userId,
        email,
        password: hashedPassword,
        firstName,
        lastName,
      });

      // Create profile
      await storage.createUserProfile({
        userId,
        role: role || "client",
        phone,
        city,
        documentStatus: role === "provider" ? "pending" : undefined,
      });

      res.status(201).json({ success: true, userId });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: error.message || "Failed to create user" });
    }
  });

  // Update document status
  app.patch("/api/admin/users/:userId/document", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { status, notes } = req.body;
      
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ error: "Status inválido" });
      }

      const profile = await storage.updateUserProfile(userId, { 
        documentStatus: status,
        documentNotes: notes
      });
      
      res.json(profile);
    } catch (error) {
      console.error("Error updating document status:", error);
      res.status(500).json({ error: "Failed to update document status" });
    }
  });

  app.get("/api/admin/services", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const services = await storage.getAllServices();
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  // Admin: Detailed providers list with stats
  app.get("/api/admin/providers", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const profiles = await storage.getAllUserProfiles();
      const providers = profiles.filter(p => p.role === "provider");
      const allServices = await storage.getAllServices();
      
      const providersWithStats = await Promise.all(
        providers.map(async (provider) => {
          const providerServices = allServices.filter(s => s.providerId === provider.userId);
          const completedServices = providerServices.filter(s => s.status === "completed");
          const reviews = await storage.getReviewsByProvider(provider.userId);
          const totalEarnings = completedServices.reduce((sum, s) => sum + (s.finalPrice || s.estimatedPrice || 0), 0);
          
          return {
            ...provider,
            totalServices: providerServices.length,
            completedServices: completedServices.length,
            pendingServices: providerServices.filter(s => !["completed", "cancelled"].includes(s.status)).length,
            totalEarnings,
            reviewsCount: reviews.length,
            reviews: reviews.slice(0, 3),
          };
        })
      );
      
      res.json(providersWithStats);
    } catch (error) {
      console.error("Error fetching providers:", error);
      res.status(500).json({ error: "Failed to fetch providers" });
    }
  });

  // Admin: Detailed clients list with stats
  app.get("/api/admin/clients", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const profiles = await storage.getAllUserProfiles();
      const clients = profiles.filter(p => p.role === "client");
      const allServices = await storage.getAllServices();
      
      const clientsWithStats = clients.map((client) => {
        const clientServices = allServices.filter(s => s.clientId === client.userId);
        const completedServices = clientServices.filter(s => s.status === "completed");
        const totalSpent = completedServices.reduce((sum, s) => sum + (s.finalPrice || s.estimatedPrice || 0), 0);
        
        return {
          ...client,
          totalServices: clientServices.length,
          completedServices: completedServices.length,
          pendingServices: clientServices.filter(s => !["completed", "cancelled"].includes(s.status)).length,
          totalSpent,
        };
      });
      
      res.json(clientsWithStats);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/admin/payments", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const payments = await storage.getAllPayments();
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.get("/api/admin/stats", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const services = await storage.getAllServices();
      const profiles = await storage.getAllUserProfiles();
      const payments = await storage.getAllPayments();

      const stats = {
        totalServices: services.length,
        completedServices: services.filter(s => s.status === "completed").length,
        pendingServices: services.filter(s => s.status === "pending" || s.status === "ai_diagnosed" || s.status === "fee_paid").length,
        totalUsers: profiles.length,
        totalClients: profiles.filter(p => p.role === "client").length,
        totalProviders: profiles.filter(p => p.role === "provider").length,
        totalRevenue: payments.filter(p => p.status === "completed").reduce((sum, p) => sum + p.amount, 0),
        totalPayments: payments.length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // Check user role endpoint
  app.get("/api/user/role", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getUserProfile(userId);
      res.json({ role: profile?.role || "client" });
    } catch (error) {
      console.error("Error fetching user role:", error);
      res.status(500).json({ error: "Failed to fetch user role" });
    }
  });

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // ==================== NOVO FLUXO DE INTELIGÊNCIA INTEGRAL ====================

  // Criar diagnóstico IA completo e persistir
  app.post("/api/diagnosis/ai", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { 
        description, 
        guidedAnswers, 
        mediaUrls, 
        categoryId,
        title 
      } = req.body;

      // Criar serviço inicial
      const service = await storage.createService({
        clientId: userId,
        title: title || "Novo Serviço",
        description,
        categoryId: categoryId || 1,
        status: "pending",
        slaPriority: "standard",
      });

      // Preparar prompt para IA
      const systemPrompt = `Você é um especialista em diagnóstico de problemas residenciais. Analise a descrição do problema e forneça:

1. Classificação do tipo de serviço
2. Nível de urgência (baixa, média, alta, urgente)
3. Tempo estimado de execução
4. Materiais provavelmente necessários
5. Faixa de preço estimada (mínimo e máximo em centavos)

Responda em JSON com este formato:
{
  "classification": "tipo de serviço",
  "urgencyLevel": "média",
  "estimatedDuration": "2-4 horas",
  "materialsSuggested": ["material1", "material2"],
  "priceRangeMin": 15000,
  "priceRangeMax": 30000,
  "diagnosis": "Explicação detalhada do problema e possível solução"
}

Descrição do problema: ${description}
${guidedAnswers ? `Respostas adicionais: ${JSON.stringify(guidedAnswers)}` : ""}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      });

      let aiResult;
      try {
        const text = response.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        aiResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        aiResult = {
          classification: "Geral",
          urgencyLevel: "média",
          estimatedDuration: "2-4 horas",
          materialsSuggested: [],
          priceRangeMin: 15000,
          priceRangeMax: 30000,
          diagnosis: response.text || "Diagnóstico em análise",
        };
      }

      // Calcular taxa de diagnóstico (15% do preço mínimo)
      const diagnosisFee = Math.round(aiResult.priceRangeMin * 0.15);

      // Criar diagnóstico IA
      const aiDiagnosis = await storage.createAiDiagnosis({
        serviceRequestId: service.id,
        inputDescription: description,
        guidedAnswers: guidedAnswers ? JSON.stringify(guidedAnswers) : null,
        mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
        classification: aiResult.classification,
        urgencyLevel: aiResult.urgencyLevel,
        estimatedDuration: aiResult.estimatedDuration,
        materialsSuggested: JSON.stringify(aiResult.materialsSuggested),
        priceRangeMin: aiResult.priceRangeMin,
        priceRangeMax: aiResult.priceRangeMax,
        diagnosisFee,
        aiResponse: aiResult.diagnosis,
      });

      // Atualizar status do serviço
      await storage.updateService(service.id, { status: "ai_diagnosed" });

      res.json({
        service,
        aiDiagnosis,
        diagnosisFee,
      });
    } catch (error) {
      console.error("Error creating AI diagnosis:", error);
      res.status(500).json({ error: "Failed to create AI diagnosis" });
    }
  });

  // Obter diagnóstico IA de um serviço
  app.get("/api/diagnosis/ai/:serviceId", isAuthenticated, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId as string);
      const diagnosis = await storage.getAiDiagnosisByServiceId(serviceId);
      if (!diagnosis) {
        return res.status(404).json({ error: "Diagnosis not found" });
      }
      res.json(diagnosis);
    } catch (error) {
      console.error("Error fetching AI diagnosis:", error);
      res.status(500).json({ error: "Failed to fetch AI diagnosis" });
    }
  });

  // Pagar taxa de diagnóstico
  app.post("/api/diagnosis/pay-fee/:serviceId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const serviceId = parseInt(req.params.serviceId as string);
      const { method } = req.body;

      const diagnosis = await storage.getAiDiagnosisByServiceId(serviceId);
      if (!diagnosis) {
        return res.status(404).json({ error: "Diagnosis not found" });
      }

      // Criar pagamento da taxa
      const pixCode = method === "pix" ? `00020126580014br.gov.bcb.pix0136${Date.now()}` : null;
      const payment = await storage.createPayment({
        userId,
        amount: diagnosis.diagnosisFee || 0,
        method,
        description: "Taxa de diagnóstico IA",
        serviceRequestId: serviceId,
        pixCode,
        status: "pending",
      });

      // Simular confirmação do pagamento
      setTimeout(async () => {
        await storage.updatePaymentStatus(payment.id, "completed");
        await storage.updateService(serviceId, { status: "fee_paid" });
      }, 2000);

      res.json({ payment, message: "Pagamento em processamento" });
    } catch (error) {
      console.error("Error paying diagnosis fee:", error);
      res.status(500).json({ error: "Failed to process payment" });
    }
  });

  // Prestador: Criar diagnóstico final
  app.post("/api/provider/diagnosis/:serviceId", isAuthenticated, async (req: any, res) => {
    try {
      const providerId = req.user.claims.sub;
      const serviceId = parseInt(req.params.serviceId as string);
      const { findings, laborCost, materialsCost, materialsList, estimatedDuration, mediaUrls, notes } = req.body;

      // Verificar se serviço existe e está no status correto
      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      // Validar que taxa foi paga antes de diagnosticar
      if (service.status !== "fee_paid" && service.status !== "provider_assigned") {
        return res.status(400).json({ error: "Cannot diagnose: diagnosis fee not paid yet" });
      }

      // Criar diagnóstico do prestador
      const providerDiagnosis = await storage.createProviderDiagnosis({
        serviceRequestId: serviceId,
        providerId,
        findings,
        laborCost,
        materialsCost: materialsCost || 0,
        materialsList: materialsList ? JSON.stringify(materialsList) : null,
        estimatedDuration,
        mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
        notes,
      });

      // Atualizar serviço
      await storage.updateService(serviceId, {
        providerId,
        status: "provider_diagnosed",
        estimatedPrice: laborCost + (materialsCost || 0),
      });

      res.json(providerDiagnosis);
    } catch (error) {
      console.error("Error creating provider diagnosis:", error);
      res.status(500).json({ error: "Failed to create diagnosis" });
    }
  });

  // Obter diagnóstico do prestador
  app.get("/api/provider/diagnosis/:serviceId", isAuthenticated, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId as string);
      const diagnosis = await storage.getProviderDiagnosisByServiceId(serviceId);
      if (!diagnosis) {
        return res.status(404).json({ error: "Provider diagnosis not found" });
      }
      res.json(diagnosis);
    } catch (error) {
      console.error("Error fetching provider diagnosis:", error);
      res.status(500).json({ error: "Failed to fetch diagnosis" });
    }
  });

  // Enviar orçamento ao cliente
  app.post("/api/service/:id/quote", isAuthenticated, async (req: any, res) => {
    try {
      const serviceId = parseInt(req.params.id as string);
      
      // Verificar se diagnóstico do prestador foi feito
      const service = await storage.getServiceById(serviceId);
      if (!service || service.status !== "provider_diagnosed") {
        return res.status(400).json({ error: "Cannot send quote: provider diagnosis not complete" });
      }
      
      // Atualizar status para orçamento enviado
      const updatedService = await storage.updateService(serviceId, {
        status: "quote_sent",
      });

      res.json(updatedService);
    } catch (error) {
      console.error("Error sending quote:", error);
      res.status(500).json({ error: "Failed to send quote" });
    }
  });

  // Cliente: Aceitar orçamento (termo digital)
  app.post("/api/service/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const clientId = req.user.claims.sub;
      const serviceId = parseInt(req.params.id);
      const { method } = req.body;

      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      // Validar que orçamento foi enviado antes de aceitar
      if (service.status !== "quote_sent") {
        return res.status(400).json({ error: "Cannot accept service: quote not sent yet" });
      }

      const providerDiagnosis = await storage.getProviderDiagnosisByServiceId(serviceId);
      const aiDiagnosis = await storage.getAiDiagnosisByServiceId(serviceId);

      const laborCost = providerDiagnosis?.laborCost || 0;
      const materialsCost = providerDiagnosis?.materialsCost || 0;
      const platformFee = Math.round((laborCost + materialsCost) * 0.10); // 10% taxa plataforma
      const totalPrice = laborCost + materialsCost + platformFee;

      // Criar aceite digital
      const acceptance = await storage.createDigitalAcceptance({
        serviceRequestId: serviceId,
        clientId,
        aiDiagnosisId: aiDiagnosis?.id,
        providerDiagnosisId: providerDiagnosis?.id,
        totalPrice,
        laborCost,
        materialsCost,
        platformFee,
        estimatedDuration: providerDiagnosis?.estimatedDuration,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });

      // Criar pagamento
      const pixCode = method === "pix" ? `00020126580014br.gov.bcb.pix0136${Date.now()}` : null;
      const payment = await storage.createPayment({
        userId: clientId,
        amount: totalPrice,
        method,
        description: `Serviço: ${service.title}`,
        serviceRequestId: serviceId,
        pixCode,
        status: "pending",
      });

      // Criar escrow
      const escrow = await storage.createPaymentEscrow({
        serviceRequestId: serviceId,
        paymentId: payment.id,
        holdAmount: totalPrice,
        platformShare: platformFee,
        providerShare: laborCost,
        supplierShare: materialsCost,
        status: "holding",
      });

      // Simular pagamento
      setTimeout(async () => {
        await storage.updatePaymentStatus(payment.id, "completed");
        await storage.updateService(serviceId, { 
          status: "accepted",
          finalPrice: totalPrice,
        });
      }, 2000);

      res.json({ acceptance, payment, escrow });
    } catch (error) {
      console.error("Error accepting service:", error);
      res.status(500).json({ error: "Failed to accept service" });
    }
  });

  // Prestador: Iniciar execução do serviço
  app.post("/api/service/:id/start", isAuthenticated, async (req: any, res) => {
    try {
      const providerId = req.user.claims.sub;
      const serviceId = parseInt(req.params.id);
      const { latitude, longitude, beforePhotos } = req.body;

      const service = await storage.getServiceById(serviceId);
      if (!service || service.providerId !== providerId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Criar log de execução
      const executionLog = await storage.createServiceExecutionLog({
        serviceRequestId: serviceId,
        providerId,
        startedAt: new Date(),
        startLatitude: latitude,
        startLongitude: longitude,
        beforePhotos: beforePhotos ? JSON.stringify(beforePhotos) : null,
      });

      // Atualizar status
      await storage.updateService(serviceId, { status: "in_progress" });

      res.json(executionLog);
    } catch (error) {
      console.error("Error starting service:", error);
      res.status(500).json({ error: "Failed to start service" });
    }
  });

  // Prestador: Finalizar execução do serviço
  app.post("/api/service/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const providerId = req.user.claims.sub;
      const serviceId = parseInt(req.params.id);
      const { latitude, longitude, afterPhotos, notes } = req.body;

      const service = await storage.getServiceById(serviceId);
      if (!service || service.providerId !== providerId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Atualizar log de execução
      const executionLog = await storage.getServiceExecutionLog(serviceId);
      if (executionLog) {
        const startTime = executionLog.startedAt ? new Date(executionLog.startedAt).getTime() : Date.now();
        const durationMinutes = Math.round((Date.now() - startTime) / 60000);

        await storage.updateServiceExecutionLog(serviceId, {
          completedAt: new Date(),
          endLatitude: latitude,
          endLongitude: longitude,
          afterPhotos: afterPhotos ? JSON.stringify(afterPhotos) : null,
          notes,
          durationMinutes,
        });

        // Verificar antifraude: tempo mínimo de execução (30 minutos)
        if (durationMinutes < 30) {
          await storage.createAntifraudFlag({
            serviceRequestId: serviceId,
            userId: providerId,
            reason: "tempo_execucao_curto",
            severity: "medium",
            details: `Serviço concluído em ${durationMinutes} minutos (mínimo: 30)`,
          });
        }
      }

      // Atualizar status
      await storage.updateService(serviceId, { status: "awaiting_confirmation" });

      res.json({ message: "Service completed, awaiting client confirmation" });
    } catch (error) {
      console.error("Error completing service:", error);
      res.status(500).json({ error: "Failed to complete service" });
    }
  });

  // Cliente: Confirmar conclusão do serviço
  app.post("/api/service/:id/confirm", isAuthenticated, async (req: any, res) => {
    try {
      const clientId = req.user.claims.sub;
      const serviceId = parseInt(req.params.id);

      const service = await storage.getServiceById(serviceId);
      if (!service || service.clientId !== clientId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Atualizar serviço
      await storage.updateService(serviceId, { 
        status: "completed",
        completedAt: new Date(),
      });

      // Liberar escrow após período de segurança (simulado)
      const escrow = await storage.getPaymentEscrowByServiceId(serviceId);
      if (escrow) {
        // Em produção, aguardar 48h para liberar
        setTimeout(async () => {
          await storage.releasePaymentEscrow(escrow.id);
        }, 5000);
      }

      res.json({ message: "Service confirmed, payment will be released" });
    } catch (error) {
      console.error("Error confirming service:", error);
      res.status(500).json({ error: "Failed to confirm service" });
    }
  });

  // Obter detalhes completos do serviço (diagnósticos, aceite, execução)
  app.get("/api/service/:id/full", isAuthenticated, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.id as string);

      const service = await storage.getServiceById(serviceId);
      if (!service) {
        return res.status(404).json({ error: "Service not found" });
      }

      const aiDiagnosis = await storage.getAiDiagnosisByServiceId(serviceId);
      const providerDiagnosis = await storage.getProviderDiagnosisByServiceId(serviceId);
      const acceptance = await storage.getDigitalAcceptanceByServiceId(serviceId);
      const executionLog = await storage.getServiceExecutionLog(serviceId);
      const escrow = await storage.getPaymentEscrowByServiceId(serviceId);

      res.json({
        service,
        aiDiagnosis,
        providerDiagnosis,
        acceptance,
        executionLog,
        escrow,
      });
    } catch (error) {
      console.error("Error fetching full service:", error);
      res.status(500).json({ error: "Failed to fetch service details" });
    }
  });

  // Admin: Obter flags de antifraude pendentes
  app.get("/api/admin/antifraud", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const flags = await storage.getPendingAntifraudFlags();
      res.json(flags);
    } catch (error) {
      console.error("Error fetching antifraud flags:", error);
      res.status(500).json({ error: "Failed to fetch antifraud flags" });
    }
  });

  // Admin: Resolver flag de antifraude
  app.post("/api/admin/antifraud/:id/resolve", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const flagId = parseInt(req.params.id);
      const adminId = req.user.claims.sub;

      const flag = await storage.resolveAntifraudFlag(flagId, adminId);
      res.json(flag);
    } catch (error) {
      console.error("Error resolving antifraud flag:", error);
      res.status(500).json({ error: "Failed to resolve flag" });
    }
  });

  // ==================== BANCO DE SINTOMAS PARA DIAGNÓSTICO ====================

  // Listar todos os sintomas
  app.get("/api/symptoms", isAuthenticated, async (req, res) => {
    try {
      const allSymptoms = await storage.getSymptoms();
      res.json(allSymptoms);
    } catch (error) {
      console.error("Error fetching symptoms:", error);
      res.status(500).json({ error: "Failed to fetch symptoms" });
    }
  });

  // Listar sintomas por categoria
  app.get("/api/symptoms/category/:categoryId", isAuthenticated, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId as string);
      const categorySymptoms = await storage.getSymptomsByCategoryId(categoryId);
      res.json(categorySymptoms);
    } catch (error) {
      console.error("Error fetching symptoms by category:", error);
      res.status(500).json({ error: "Failed to fetch symptoms" });
    }
  });

  // Obter sintoma com perguntas e diagnósticos
  app.get("/api/symptoms/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const symptom = await storage.getSymptomById(id);
      if (!symptom) {
        return res.status(404).json({ error: "Symptom not found" });
      }
      const questions = await storage.getSymptomQuestions(id);
      const diagnoses = await storage.getSymptomDiagnoses(id);
      res.json({ ...symptom, questions, diagnoses });
    } catch (error) {
      console.error("Error fetching symptom:", error);
      res.status(500).json({ error: "Failed to fetch symptom" });
    }
  });

  // Admin: Criar sintoma
  app.post("/api/admin/symptoms", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const symptom = await storage.createSymptom(req.body);
      res.json(symptom);
    } catch (error) {
      console.error("Error creating symptom:", error);
      res.status(500).json({ error: "Failed to create symptom" });
    }
  });

  // Admin: Atualizar sintoma
  app.put("/api/admin/symptoms/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const symptom = await storage.updateSymptom(id, req.body);
      res.json(symptom);
    } catch (error) {
      console.error("Error updating symptom:", error);
      res.status(500).json({ error: "Failed to update symptom" });
    }
  });

  // Admin: Deletar sintoma (soft delete)
  app.delete("/api/admin/symptoms/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteSymptom(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting symptom:", error);
      res.status(500).json({ error: "Failed to delete symptom" });
    }
  });

  // Admin: Criar pergunta de sintoma
  app.post("/api/admin/symptom-questions", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const question = await storage.createSymptomQuestion(req.body);
      res.json(question);
    } catch (error) {
      console.error("Error creating symptom question:", error);
      res.status(500).json({ error: "Failed to create question" });
    }
  });

  // Admin: Atualizar pergunta de sintoma
  app.put("/api/admin/symptom-questions/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const question = await storage.updateSymptomQuestion(id, req.body);
      res.json(question);
    } catch (error) {
      console.error("Error updating symptom question:", error);
      res.status(500).json({ error: "Failed to update question" });
    }
  });

  // Admin: Deletar pergunta de sintoma
  app.delete("/api/admin/symptom-questions/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteSymptomQuestion(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting symptom question:", error);
      res.status(500).json({ error: "Failed to delete question" });
    }
  });

  // Admin: Criar diagnóstico de sintoma
  app.post("/api/admin/symptom-diagnoses", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const diagnosis = await storage.createSymptomDiagnosis(req.body);
      res.json(diagnosis);
    } catch (error) {
      console.error("Error creating symptom diagnosis:", error);
      res.status(500).json({ error: "Failed to create diagnosis" });
    }
  });

  // Admin: Atualizar diagnóstico de sintoma
  app.put("/api/admin/symptom-diagnoses/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const diagnosis = await storage.updateSymptomDiagnosis(id, req.body);
      res.json(diagnosis);
    } catch (error) {
      console.error("Error updating symptom diagnosis:", error);
      res.status(500).json({ error: "Failed to update diagnosis" });
    }
  });

  // Admin: Deletar diagnóstico de sintoma
  app.delete("/api/admin/symptom-diagnoses/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteSymptomDiagnosis(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting symptom diagnosis:", error);
      res.status(500).json({ error: "Failed to delete diagnosis" });
    }
  });

  // Admin: Listar conhecimento local
  app.get("/api/admin/local-knowledge", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const knowledge = await storage.getLocalKnowledge();
      res.json(knowledge);
    } catch (error) {
      console.error("Error fetching local knowledge:", error);
      res.status(500).json({ error: "Failed to fetch local knowledge" });
    }
  });

  // Admin: Criar conhecimento local
  app.post("/api/admin/local-knowledge", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const knowledge = await storage.createLocalKnowledge(req.body);
      res.json(knowledge);
    } catch (error) {
      console.error("Error creating local knowledge:", error);
      res.status(500).json({ error: "Failed to create local knowledge" });
    }
  });

  // Admin: Atualizar conhecimento local
  app.put("/api/admin/local-knowledge/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const knowledge = await storage.updateLocalKnowledge(id, req.body);
      res.json(knowledge);
    } catch (error) {
      console.error("Error updating local knowledge:", error);
      res.status(500).json({ error: "Failed to update local knowledge" });
    }
  });

  // Admin: Deletar conhecimento local
  app.delete("/api/admin/local-knowledge/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteLocalKnowledge(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting local knowledge:", error);
      res.status(500).json({ error: "Failed to delete local knowledge" });
    }
  });

  // Helper: Obter dados completos de sintomas para IA
  app.get("/api/symptoms/data/full", isAuthenticated, async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const data = await storage.getFullSymptomData(categoryId);
      res.json(data);
    } catch (error) {
      console.error("Error fetching full symptom data:", error);
      res.status(500).json({ error: "Failed to fetch symptom data" });
    }
  });

  // ==================== FORNECEDORES E MATERIAIS ====================

  // Listar fornecedores ativos
  app.get("/api/suppliers", isAuthenticated, async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  // Buscar fornecedores por cidade
  app.get("/api/suppliers/city/:city", isAuthenticated, async (req, res) => {
    try {
      const city = req.params.city as string;
      const suppliers = await storage.getSuppliersByCity(city);
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers by city:", error);
      res.status(500).json({ error: "Failed to fetch suppliers" });
    }
  });

  // Obter fornecedor por ID
  app.get("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const supplier = await storage.getSupplierById(id);
      if (!supplier) {
        return res.status(404).json({ error: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      console.error("Error fetching supplier:", error);
      res.status(500).json({ error: "Failed to fetch supplier" });
    }
  });

  // Admin: Criar fornecedor
  app.post("/api/admin/suppliers", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const supplier = await storage.createSupplier(req.body);
      res.json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ error: "Failed to create supplier" });
    }
  });

  // Admin: Atualizar fornecedor
  app.patch("/api/admin/suppliers/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const supplier = await storage.updateSupplier(id, req.body);
      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ error: "Failed to update supplier" });
    }
  });

  // Listar materiais
  app.get("/api/materials", isAuthenticated, async (req, res) => {
    try {
      const materials = await storage.getMaterials();
      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ error: "Failed to fetch materials" });
    }
  });

  // Buscar materiais por categoria
  app.get("/api/materials/category/:category", isAuthenticated, async (req, res) => {
    try {
      const category = req.params.category as string;
      const materials = await storage.getMaterialsByCategory(category);
      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials by category:", error);
      res.status(500).json({ error: "Failed to fetch materials" });
    }
  });

  // Buscar materiais por fornecedor
  app.get("/api/materials/supplier/:supplierId", isAuthenticated, async (req, res) => {
    try {
      const supplierId = parseInt(req.params.supplierId as string);
      const materials = await storage.getMaterialsBySupplierId(supplierId);
      res.json(materials);
    } catch (error) {
      console.error("Error fetching materials by supplier:", error);
      res.status(500).json({ error: "Failed to fetch materials" });
    }
  });

  // Obter material por ID
  app.get("/api/materials/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const material = await storage.getMaterialById(id);
      if (!material) {
        return res.status(404).json({ error: "Material not found" });
      }
      res.json(material);
    } catch (error) {
      console.error("Error fetching material:", error);
      res.status(500).json({ error: "Failed to fetch material" });
    }
  });

  // Admin: Criar material
  app.post("/api/admin/materials", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const material = await storage.createMaterial(req.body);
      res.json(material);
    } catch (error) {
      console.error("Error creating material:", error);
      res.status(500).json({ error: "Failed to create material" });
    }
  });

  // Admin: Atualizar material
  app.patch("/api/admin/materials/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const material = await storage.updateMaterial(id, req.body);
      res.json(material);
    } catch (error) {
      console.error("Error updating material:", error);
      res.status(500).json({ error: "Failed to update material" });
    }
  });

  // Criar pedido de materiais para um serviço
  app.post("/api/service/:serviceId/materials", isAuthenticated, async (req: any, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId as string);
      const { supplierId, items, totalCost, totalSale, platformMargin } = req.body;

      const order = await storage.createMaterialOrder({
        serviceRequestId: serviceId,
        supplierId,
        items: JSON.stringify(items),
        totalCost,
        totalSale,
        platformMargin,
        status: "pending",
      });

      res.json(order);
    } catch (error) {
      console.error("Error creating material order:", error);
      res.status(500).json({ error: "Failed to create material order" });
    }
  });

  // Obter pedido de materiais de um serviço
  app.get("/api/service/:serviceId/materials", isAuthenticated, async (req, res) => {
    try {
      const serviceId = parseInt(req.params.serviceId as string);
      const order = await storage.getMaterialOrderByServiceId(serviceId);
      res.json(order || null);
    } catch (error) {
      console.error("Error fetching material order:", error);
      res.status(500).json({ error: "Failed to fetch material order" });
    }
  });

  // Admin/Fornecedor: Atualizar status do pedido
  app.patch("/api/admin/material-orders/:id/status", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const { status } = req.body;
      const order = await storage.updateMaterialOrderStatus(id, status);
      res.json(order);
    } catch (error) {
      console.error("Error updating material order status:", error);
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  // Profile photo upload endpoint
  app.patch("/api/user/profile-image", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { profileImageUrl } = req.body;
      
      if (!profileImageUrl) {
        return res.status(400).json({ error: "Profile image URL is required" });
      }

      // Update the user's profile image in the database
      await db.update(users)
        .set({ profileImageUrl })
        .where(eq(users.id, userId));

      res.json({ success: true, profileImageUrl });
    } catch (error) {
      console.error("Error updating profile image:", error);
      res.status(500).json({ error: "Failed to update profile image" });
    }
  });

  return httpServer;
}
