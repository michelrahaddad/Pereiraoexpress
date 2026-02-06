import { Express, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { db } from "../db";
import { users, userProfiles } from "@shared/schema";
import { passwordResetTokens } from "@shared/models/auth";
import { eq, and, gt } from "drizzle-orm";
import { registerUserSchema, loginSchema } from "@shared/models/auth";
import session from "express-session";
import connectPg from "connect-pg-simple";
import OpenAI from "openai";
import { geocodeCity, geocodeCep } from "../geocoding";

const geminiClient = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "dummy-key",
  baseURL: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
});

interface DocumentVerificationResult {
  isValid: boolean;
  documentType: string | null;
  confidence: number;
  reason: string;
}

async function verifyDocumentWithAI(imageBase64: string): Promise<DocumentVerificationResult> {
  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    
    const response = await geminiClient.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analise esta imagem e determine se é um documento de identidade brasileiro válido (RG, CNH, CTPS, Passaporte, ou outro documento oficial com foto).

RESPONDA APENAS em JSON válido, sem markdown:
{
  "isValid": true/false,
  "documentType": "RG" | "CNH" | "CTPS" | "Passaporte" | "Outro" | null,
  "confidence": 0-100,
  "reason": "explicação curta"
}

CRITÉRIOS PARA DOCUMENTO VÁLIDO:
- Deve parecer um documento oficial brasileiro
- Deve ter elementos típicos (foto, dados pessoais, brasão/emblema)
- Imagem deve estar legível
- Não aceite fotos de pessoas, selfies, ou imagens aleatórias

Se não for um documento válido, explique o motivo em "reason".`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`
              }
            }
          ]
        }
      ],
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content || "";
    const cleanJson = content.replace(/```json\n?|\n?```/g, "").trim();
    const result = JSON.parse(cleanJson);
    
    return {
      isValid: result.isValid === true && result.confidence >= 70,
      documentType: result.documentType,
      confidence: result.confidence,
      reason: result.reason
    };
  } catch (error) {
    console.error("Document verification error:", error);
    return {
      isValid: false,
      documentType: null,
      confidence: 0,
      reason: "Erro ao verificar documento. Tente novamente."
    };
  }
}

const JWT_SECRET = process.env.SESSION_SECRET || "peireirao-express-secret-key";
const JWT_EXPIRES_IN = "15m";
const REFRESH_TOKEN_EXPIRES_IN = "7d";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const loginAttempts = new Map<string, { count: number; lockedUntil?: number }>();

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
      sameSite: "strict",
    },
  });
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Muitas tentativas de login. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Muitos cadastros. Tente novamente em 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: "Muitas solicitações de recuperação. Tente novamente em 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});

function generateTokens(userId: string, role: string) {
  const accessToken = jwt.sign(
    { sub: userId, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  
  const refreshToken = jwt.sign(
    { sub: userId, type: "refresh" },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
  
  return { accessToken, refreshToken };
}

function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push("Senha deve ter no mínimo 8 caracteres");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Senha deve ter pelo menos uma letra maiúscula");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Senha deve ter pelo menos uma letra minúscula");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Senha deve ter pelo menos um número");
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Senha deve ter pelo menos um caractere especial (!@#$%^&*...)");
  }
  
  return { valid: errors.length === 0, errors };
}

function formatCPF(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

function validateCPF(cpf: string): boolean {
  cpf = formatCPF(cpf);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (digit !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit > 9) digit = 0;
  if (digit !== parseInt(cpf.charAt(10))) return false;
  
  return true;
}

function checkAccountLockout(email: string): { locked: boolean; remainingTime?: number } {
  const attempts = loginAttempts.get(email);
  if (!attempts) return { locked: false };
  
  if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
    return { 
      locked: true, 
      remainingTime: Math.ceil((attempts.lockedUntil - Date.now()) / 1000 / 60) 
    };
  }
  
  if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
    loginAttempts.delete(email);
  }
  
  return { locked: false };
}

function recordLoginAttempt(email: string, success: boolean) {
  if (success) {
    loginAttempts.delete(email);
    return;
  }
  
  const attempts = loginAttempts.get(email) || { count: 0 };
  attempts.count++;
  
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  
  loginAttempts.set(email, attempts);
}

export const isLocalAuthenticated: RequestHandler = async (req: any, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (req.session?.userId) {
    req.user = { claims: { sub: req.session.userId } };
    return next();
  }
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não fornecido" });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = { claims: { sub: decoded.sub }, role: decoded.role };
    next();
  } catch (error) {
    if ((error as any).name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Token inválido" });
  }
};

export function setupLocalAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/auth/register", registerLimiter, async (req, res) => {
    try {
      const { email, password, firstName, lastName, cpf, phone, age, city, cep, role, documentUrl, termsAccepted } = req.body;
      
      const passwordCheck = validatePasswordStrength(password);
      if (!passwordCheck.valid) {
        return res.status(400).json({ error: "Senha fraca", details: passwordCheck.errors });
      }
      
      if (!validateCPF(cpf)) {
        return res.status(400).json({ error: "CPF inválido" });
      }
      
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Email já cadastrado" });
      }
      
      const existingCPF = await db.select().from(users).where(eq(users.cpf, formatCPF(cpf))).limit(1);
      if (existingCPF.length > 0) {
        return res.status(400).json({ error: "CPF já cadastrado" });
      }
      
      // Verify document for providers using AI
      let documentVerification: DocumentVerificationResult | null = null;
      if (role === "provider") {
        if (!documentUrl) {
          return res.status(400).json({ error: "Prestadores devem enviar um documento de identificação" });
        }
        if (!termsAccepted) {
          return res.status(400).json({ error: "Você deve aceitar os termos de uso" });
        }
        
        documentVerification = await verifyDocumentWithAI(documentUrl);
        
        if (!documentVerification.isValid) {
          return res.status(400).json({ 
            error: "Documento não reconhecido", 
            details: documentVerification.reason,
            code: "INVALID_DOCUMENT"
          });
        }
      }
      
      const hashedPassword = await bcrypt.hash(password, 12);
      
      let latitude: string | undefined;
      let longitude: string | undefined;
      try {
        let geoResult = cep ? await geocodeCep(cep) : null;
        if (!geoResult) {
          geoResult = await geocodeCity(city);
        }
        if (geoResult) {
          latitude = geoResult.latitude.toFixed(7);
          longitude = geoResult.longitude.toFixed(7);
        }
      } catch (geoErr) {
        console.error("Geocoding during registration failed (non-blocking):", geoErr);
      }
      
      const [newUser] = await db.insert(users).values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        cpf: formatCPF(cpf),
        phone: phone.replace(/\D/g, ""),
        age,
        city,
        ...(latitude && longitude ? { latitude, longitude } : {}),
      }).returning();
      
      const userRole = role === "provider" ? "provider" : "client";
      const profileData: any = {
        userId: newUser.id,
        role: userRole,
        phone: phone.replace(/\D/g, ""),
        city,
      };
      
      if (userRole === "provider" && documentVerification) {
        profileData.documentUrl = documentUrl;
        profileData.documentStatus = "approved"; // AI verified the document
        profileData.documentNotes = `Verificado automaticamente por IA: ${documentVerification.documentType} (${documentVerification.confidence}% confiança)`;
        profileData.termsAccepted = termsAccepted || false;
        profileData.termsAcceptedAt = termsAccepted ? new Date() : null;
      }
      
      await db.insert(userProfiles).values(profileData);
      
      const tokens = generateTokens(newUser.id, userRole);
      
      (req.session as any).userId = newUser.id;
      (req.session as any).role = userRole;
      
      res.status(201).json({
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: userRole,
        },
        ...tokens,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Erro ao criar conta" });
    }
  });

  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const lockout = checkAccountLockout(email);
      if (lockout.locked) {
        return res.status(429).json({ 
          error: `Conta bloqueada. Tente novamente em ${lockout.remainingTime} minutos.` 
        });
      }
      
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      if (!user || !user.password) {
        recordLoginAttempt(email, false);
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }
      
      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        recordLoginAttempt(email, false);
        const attempts = loginAttempts.get(email);
        const remaining = MAX_LOGIN_ATTEMPTS - (attempts?.count || 0);
        return res.status(401).json({ 
          error: "Email ou senha incorretos",
          attemptsRemaining: remaining > 0 ? remaining : 0
        });
      }
      
      recordLoginAttempt(email, true);
      
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.id)).limit(1);
      const userRole = profile?.role || "client";
      
      const tokens = generateTokens(user.id, userRole);
      
      (req.session as any).userId = user.id;
      (req.session as any).role = userRole;
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: userRole,
          city: user.city,
        },
        ...tokens,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Erro ao fazer login" });
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token não fornecido" });
      }
      
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
      
      if (decoded.type !== "refresh") {
        return res.status(401).json({ error: "Token inválido" });
      }
      
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, decoded.sub)).limit(1);
      const tokens = generateTokens(decoded.sub, profile?.role || "client");
      
      res.json(tokens);
    } catch (error) {
      console.error("Token refresh error:", error);
      res.status(401).json({ error: "Refresh token inválido ou expirado" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Erro ao fazer logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logout realizado com sucesso" });
    });
  });

  app.post("/api/auth/forgot-password", passwordResetLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      
      res.json({ message: "Se o email existir, você receberá instruções para recuperar sua senha." });
      
      if (!user) return;
      
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });
      
      console.log(`Password reset token for ${email}: ${token}`);
      // TODO: Send email with reset link when email service is configured
      
    } catch (error) {
      console.error("Password reset request error:", error);
      res.json({ message: "Se o email existir, você receberá instruções para recuperar sua senha." });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;
      
      const passwordCheck = validatePasswordStrength(password);
      if (!passwordCheck.valid) {
        return res.status(400).json({ error: "Senha fraca", details: passwordCheck.errors });
      }
      
      const [resetToken] = await db.select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.token, token),
            gt(passwordResetTokens.expiresAt, new Date())
          )
        )
        .limit(1);
      
      if (!resetToken || resetToken.usedAt) {
        return res.status(400).json({ error: "Token inválido ou expirado" });
      }
      
      const hashedPassword = await bcrypt.hash(password, 12);
      
      await db.update(users)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(eq(users.id, resetToken.userId));
      
      await db.update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, resetToken.id));
      
      res.json({ message: "Senha alterada com sucesso" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Erro ao redefinir senha" });
    }
  });

  app.get("/api/auth/me", isLocalAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const [user] = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        city: users.city,
        cpf: users.cpf,
        age: users.age,
        profileImageUrl: users.profileImageUrl,
      }).from(users).where(eq(users.id, userId)).limit(1);
      
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      
      const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
      
      res.json({
        ...user,
        role: profile?.role || "client",
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Erro ao buscar usuário" });
    }
  });

  // Legacy endpoint for existing pages that check /api/auth/user
  app.get("/api/auth/user", (req: any, res) => {
    if (req.session?.userId) {
      return res.json({ 
        id: req.session.userId, 
        role: req.session.role || "client" 
      });
    }
    res.status(401).json({ error: "Não autenticado" });
  });
}
