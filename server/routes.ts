import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { GoogleGenAI } from "@google/genai";
import { db } from "./db";
import { users } from "@shared/schema";
import { sql } from "drizzle-orm";
import { serviceRequests, serviceCategories } from "@shared/schema";

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
  await setupAuth(app);
  registerAuthRoutes(app);
  
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

  app.get("/api/services", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const services = await storage.getServicesByClient(userId);
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  });

  app.post("/api/services", isAuthenticated, async (req: any, res) => {
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
        status: "waiting_provider",
      });
      
      res.status(201).json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(500).json({ error: "Failed to create service" });
    }
  });

  app.get("/api/services/:id", isAuthenticated, async (req, res) => {
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

  app.patch("/api/services/:id/status", isAuthenticated, async (req: any, res) => {
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

  app.get("/api/admin/users", isAuthenticated, async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.post("/api/ai/diagnose", isAuthenticated, async (req: any, res) => {
    try {
      const { message, imageBase64, conversationHistory } = req.body;

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const systemPrompt = `Você é o assistente do Pereirão Express. Seu trabalho é entender o problema do cliente em poucas perguntas.

REGRAS IMPORTANTES:
- Respostas CURTAS (máximo 2 frases)
- Português brasileiro simples e correto
- Faça UMA pergunta por vez
- Seja direto e amigável
- Use "você" (não "senhor/senhora")

FLUXO DE PERGUNTAS:
1. Qual o problema? (se não ficou claro)
2. Onde fica? (cômodo/local da casa)
3. Há quanto tempo está assim?
4. Já tentou resolver antes?
5. Pode mandar uma foto? (se ajudar)

CATEGORIAS: Encanamento, Elétrica, Pintura, Marcenaria, Ar Condicionado, Limpeza

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
        userParts.push({ text: "Analise esta imagem do problema." });
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

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return httpServer;
}
