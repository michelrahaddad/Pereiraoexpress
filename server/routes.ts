import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupLocalAuth, isLocalAuthenticated } from "./auth/localAuth";
import { GoogleGenAI } from "@google/genai";
import { db } from "./db";
import { users, userProfiles } from "@shared/schema";
import { sql, eq, desc } from "drizzle-orm";
import { serviceRequests, serviceCategories } from "@shared/schema";
import { z } from "zod";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

// Helper para ler configurações do admin com fallback
async function getAdminSetting(key: string, defaultValue: string): Promise<string> {
  try {
    const settings = await storage.getSystemSettings();
    const setting = settings.find(s => s.key === key);
    return setting?.value || defaultValue;
  } catch {
    return defaultValue;
  }
}

async function getAdminSettingNumber(key: string, defaultValue: number): Promise<number> {
  const val = await getAdminSetting(key, String(defaultValue));
  const num = parseFloat(val);
  return isNaN(num) ? defaultValue : num;
}

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
      { name: "Chaveiro", icon: "key", description: "Abertura de portas, troca de fechaduras, cópias de chaves", basePrice: 8000 },
      { name: "Portões", icon: "door-open", description: "Instalação, manutenção e reparo de portões automáticos", basePrice: 12000 },
    ];
    for (const cat of categories) {
      await storage.createCategory(cat);
    }
  }
}

// Função para popular materiais de construção com preços médios de mercado brasileiro
// Preços baseados em referências de mercado (SINAPI, lojas de materiais) - valores em centavos
// costPrice = preço base de mercado, salePrice = costPrice * 1.3 (margem 30%)
async function seedConstructionMaterials() {
  const existing = await storage.getMaterials();
  if (existing.length === 0) {
    // Preços médios de mercado brasileiro em centavos (2024/2025)
    const materials = [
      // PINTURA - Preços médios Brasil
      { name: "Tinta Acrílica Premium 18L - Suvinil", category: "pintura", unit: "lata", costPrice: 38900 },
      { name: "Tinta Acrílica Standard 18L - Coral", category: "pintura", unit: "lata", costPrice: 24900 },
      { name: "Tinta Acrílica 3.6L - Suvinil", category: "pintura", unit: "lata", costPrice: 9900 },
      { name: "Tinta Látex PVA 18L", category: "pintura", unit: "lata", costPrice: 18900 },
      { name: "Massa Corrida PVA 25kg - Quartzolit", category: "pintura", unit: "balde", costPrice: 5490 },
      { name: "Massa Acrílica 25kg - Quartzolit", category: "pintura", unit: "balde", costPrice: 7990 },
      { name: "Selador Acrílico 18L", category: "pintura", unit: "lata", costPrice: 16900 },
      { name: "Rolo de Lã 23cm - Atlas", category: "pintura", unit: "un", costPrice: 2990 },
      { name: "Rolo de Espuma 23cm", category: "pintura", unit: "un", costPrice: 1290 },
      { name: "Bandeja para Pintura", category: "pintura", unit: "un", costPrice: 1490 },
      { name: "Lixa d'água 220", category: "pintura", unit: "un", costPrice: 290 },
      { name: "Lixa d'água 400", category: "pintura", unit: "un", costPrice: 320 },
      { name: "Lixa para Massa 80", category: "pintura", unit: "un", costPrice: 250 },
      { name: "Fita Crepe 50mm x 50m - 3M", category: "pintura", unit: "rolo", costPrice: 1890 },
      { name: "Thinner 5L", category: "pintura", unit: "lata", costPrice: 5490 },
      { name: "Textura Acrílica 25kg", category: "pintura", unit: "balde", costPrice: 9990 },
      { name: "Grafiato 25kg", category: "pintura", unit: "balde", costPrice: 8990 },
      { name: "Pincel 2 polegadas", category: "pintura", unit: "un", costPrice: 890 },
      { name: "Pincel 3 polegadas", category: "pintura", unit: "un", costPrice: 1290 },
      { name: "Espátula 10cm", category: "pintura", unit: "un", costPrice: 1590 },
      { name: "Desempenadeira de Aço", category: "pintura", unit: "un", costPrice: 3990 },
      { name: "Lona Plástica 4x5m", category: "pintura", unit: "un", costPrice: 1990 },
      
      // ELÉTRICA - Preços médios Brasil
      { name: "Fio Flexível 2.5mm² 100m - Prysmian", category: "eletrica", unit: "rolo", costPrice: 19900 },
      { name: "Fio Flexível 4mm² 100m", category: "eletrica", unit: "rolo", costPrice: 31900 },
      { name: "Fio Flexível 6mm² 100m", category: "eletrica", unit: "rolo", costPrice: 47900 },
      { name: "Fio Flexível 10mm² 100m", category: "eletrica", unit: "rolo", costPrice: 79900 },
      { name: "Cabo PP 2x2.5mm² (m)", category: "eletrica", unit: "m", costPrice: 690 },
      { name: "Tomada 10A - Tramontina", category: "eletrica", unit: "un", costPrice: 1490 },
      { name: "Tomada 20A - Tramontina", category: "eletrica", unit: "un", costPrice: 2190 },
      { name: "Interruptor Simples - Tramontina", category: "eletrica", unit: "un", costPrice: 1290 },
      { name: "Interruptor Duplo - Tramontina", category: "eletrica", unit: "un", costPrice: 1890 },
      { name: "Interruptor Triplo", category: "eletrica", unit: "un", costPrice: 2490 },
      { name: "Disjuntor Monopolar 10A - Siemens", category: "eletrica", unit: "un", costPrice: 1590 },
      { name: "Disjuntor Monopolar 20A - Siemens", category: "eletrica", unit: "un", costPrice: 1690 },
      { name: "Disjuntor Bipolar 32A - Siemens", category: "eletrica", unit: "un", costPrice: 3990 },
      { name: "Disjuntor Tripolar 40A", category: "eletrica", unit: "un", costPrice: 6990 },
      { name: "DR Bipolar 40A 30mA", category: "eletrica", unit: "un", costPrice: 12900 },
      { name: "Quadro de Distribuição 8 Disjuntores", category: "eletrica", unit: "un", costPrice: 5990 },
      { name: "Quadro de Distribuição 12 Disjuntores", category: "eletrica", unit: "un", costPrice: 8990 },
      { name: "Caixa de Luz 4x2 - Tigre", category: "eletrica", unit: "un", costPrice: 190 },
      { name: "Caixa de Luz 4x4 - Tigre", category: "eletrica", unit: "un", costPrice: 290 },
      { name: "Caixa Octogonal", category: "eletrica", unit: "un", costPrice: 250 },
      { name: "Eletroduto Corrugado 3/4 25m - Tigre", category: "eletrica", unit: "rolo", costPrice: 3990 },
      { name: "Eletroduto Corrugado 1 25m", category: "eletrica", unit: "rolo", costPrice: 5490 },
      { name: "Lâmpada LED 9W - Philips", category: "eletrica", unit: "un", costPrice: 990 },
      { name: "Lâmpada LED 12W", category: "eletrica", unit: "un", costPrice: 1290 },
      { name: "Lâmpada LED 15W", category: "eletrica", unit: "un", costPrice: 1490 },
      { name: "Luminária Plafon LED 18W", category: "eletrica", unit: "un", costPrice: 4990 },
      { name: "Spot de Embutir LED", category: "eletrica", unit: "un", costPrice: 2990 },
      { name: "Ventilador de Teto - Ventisol", category: "eletrica", unit: "un", costPrice: 27900 },
      { name: "Fita Isolante 20m", category: "eletrica", unit: "rolo", costPrice: 590 },
      { name: "Conector Wago 3 Vias", category: "eletrica", unit: "un", costPrice: 290 },
      
      // HIDRÁULICA - Preços médios Brasil
      { name: "Tubo PVC Soldável 25mm 6m - Tigre", category: "hidraulica", unit: "barra", costPrice: 2190 },
      { name: "Tubo PVC Soldável 32mm 6m", category: "hidraulica", unit: "barra", costPrice: 2990 },
      { name: "Tubo PVC Soldável 50mm 6m", category: "hidraulica", unit: "barra", costPrice: 5290 },
      { name: "Tubo PVC Esgoto 50mm 6m", category: "hidraulica", unit: "barra", costPrice: 3990 },
      { name: "Tubo PVC Esgoto 100mm 6m - Tigre", category: "hidraulica", unit: "barra", costPrice: 7490 },
      { name: "Joelho 90° PVC 25mm", category: "hidraulica", unit: "un", costPrice: 190 },
      { name: "Joelho 90° PVC 32mm", category: "hidraulica", unit: "un", costPrice: 250 },
      { name: "Joelho 90° PVC 50mm", category: "hidraulica", unit: "un", costPrice: 390 },
      { name: "Tê PVC 25mm", category: "hidraulica", unit: "un", costPrice: 250 },
      { name: "Tê PVC 32mm", category: "hidraulica", unit: "un", costPrice: 350 },
      { name: "Luva PVC 25mm", category: "hidraulica", unit: "un", costPrice: 150 },
      { name: "Cap PVC 25mm", category: "hidraulica", unit: "un", costPrice: 120 },
      { name: "Registro de Gaveta 3/4 - Deca", category: "hidraulica", unit: "un", costPrice: 3990 },
      { name: "Registro de Pressão 3/4 - Deca", category: "hidraulica", unit: "un", costPrice: 5290 },
      { name: "Registro Base Deca 3/4", category: "hidraulica", unit: "un", costPrice: 4990 },
      { name: "Torneira para Pia de Cozinha - Deca", category: "hidraulica", unit: "un", costPrice: 7990 },
      { name: "Torneira para Lavatório - Deca", category: "hidraulica", unit: "un", costPrice: 9990 },
      { name: "Torneira de Jardim", category: "hidraulica", unit: "un", costPrice: 2990 },
      { name: "Misturador para Pia", category: "hidraulica", unit: "un", costPrice: 15900 },
      { name: "Sifão Sanfonado Universal - Tigre", category: "hidraulica", unit: "un", costPrice: 1890 },
      { name: "Caixa Sifonada 150x150mm - Tigre", category: "hidraulica", unit: "un", costPrice: 2990 },
      { name: "Ralo Linear 50cm", category: "hidraulica", unit: "un", costPrice: 8990 },
      { name: "Caixa d'água 500L - Fortlev", category: "hidraulica", unit: "un", costPrice: 39900 },
      { name: "Caixa d'água 1000L - Fortlev", category: "hidraulica", unit: "un", costPrice: 62900 },
      { name: "Válvula de Descarga - Hydra", category: "hidraulica", unit: "un", costPrice: 17900 },
      { name: "Boia para Caixa d'água - Tigre", category: "hidraulica", unit: "un", costPrice: 2990 },
      { name: "Vaso Sanitário com Caixa Acoplada - Deca", category: "hidraulica", unit: "un", costPrice: 49900 },
      { name: "Cuba de Apoio", category: "hidraulica", unit: "un", costPrice: 12900 },
      { name: "Chuveiro Elétrico - Lorenzetti", category: "hidraulica", unit: "un", costPrice: 9990 },
      { name: "Ducha Higiênica", category: "hidraulica", unit: "un", costPrice: 7990 },
      { name: "Cola para PVC 175g - Tigre", category: "hidraulica", unit: "un", costPrice: 1790 },
      { name: "Fita Veda Rosca 18mm x 50m", category: "hidraulica", unit: "rolo", costPrice: 590 },
      { name: "Mangueira Flexível 40cm", category: "hidraulica", unit: "un", costPrice: 1290 },
      { name: "Mangueira de Jardim 30m", category: "hidraulica", unit: "un", costPrice: 8990 },
      
      // ALVENARIA - Preços médios Brasil
      { name: "Cimento CP II 50kg - Votoran", category: "alvenaria", unit: "saco", costPrice: 3990 },
      { name: "Cimento CP V 50kg", category: "alvenaria", unit: "saco", costPrice: 4490 },
      { name: "Argamassa AC-I 20kg - Quartzolit", category: "alvenaria", unit: "saco", costPrice: 1990 },
      { name: "Argamassa AC-II 20kg - Quartzolit", category: "alvenaria", unit: "saco", costPrice: 2990 },
      { name: "Argamassa AC-III 20kg - Quartzolit", category: "alvenaria", unit: "saco", costPrice: 5290 },
      { name: "Rejunte Flexível 1kg - Quartzolit", category: "alvenaria", unit: "saco", costPrice: 1490 },
      { name: "Rejunte Acrílico 1kg", category: "alvenaria", unit: "saco", costPrice: 1990 },
      { name: "Areia Média m³", category: "alvenaria", unit: "m³", costPrice: 13500 },
      { name: "Areia Fina m³", category: "alvenaria", unit: "m³", costPrice: 14500 },
      { name: "Brita 1 m³", category: "alvenaria", unit: "m³", costPrice: 16500 },
      { name: "Brita 0 m³", category: "alvenaria", unit: "m³", costPrice: 17500 },
      { name: "Tijolo 6 Furos (milheiro)", category: "alvenaria", unit: "mil", costPrice: 95000 },
      { name: "Tijolo Maciço (milheiro)", category: "alvenaria", unit: "mil", costPrice: 120000 },
      { name: "Bloco de Concreto 14x19x39", category: "alvenaria", unit: "un", costPrice: 390 },
      { name: "Bloco de Concreto 19x19x39", category: "alvenaria", unit: "un", costPrice: 490 },
      { name: "Impermeabilizante 18L - Vedacit", category: "alvenaria", unit: "lata", costPrice: 28900 },
      { name: "Manta Asfáltica 3mm 10m - Viapol", category: "alvenaria", unit: "rolo", costPrice: 21900 },
      { name: "Manta Asfáltica 4mm 10m", category: "alvenaria", unit: "rolo", costPrice: 27900 },
      { name: "Bianco 3.6L", category: "alvenaria", unit: "galão", costPrice: 4990 },
      { name: "Cal Hidratada 20kg", category: "alvenaria", unit: "saco", costPrice: 1990 },
      
      // FERRAMENTAS - Preços médios Brasil
      { name: "Martelo 27mm - Tramontina", category: "ferramentas", unit: "un", costPrice: 5290 },
      { name: "Martelo de Borracha", category: "ferramentas", unit: "un", costPrice: 2990 },
      { name: "Chave de Fenda 1/4x4 - Tramontina", category: "ferramentas", unit: "un", costPrice: 1490 },
      { name: "Chave Phillips 1/4x4 - Tramontina", category: "ferramentas", unit: "un", costPrice: 1490 },
      { name: "Jogo Chaves de Fenda 6pçs", category: "ferramentas", unit: "jg", costPrice: 4990 },
      { name: "Alicate Universal 8 - Tramontina", category: "ferramentas", unit: "un", costPrice: 3990 },
      { name: "Alicate de Corte 6", category: "ferramentas", unit: "un", costPrice: 2990 },
      { name: "Alicate de Bico", category: "ferramentas", unit: "un", costPrice: 3490 },
      { name: "Trena 5m - Stanley", category: "ferramentas", unit: "un", costPrice: 1890 },
      { name: "Trena 8m", category: "ferramentas", unit: "un", costPrice: 2490 },
      { name: "Nível de Bolha 30cm - Stanley", category: "ferramentas", unit: "un", costPrice: 2990 },
      { name: "Nível de Bolha 60cm", category: "ferramentas", unit: "un", costPrice: 4490 },
      { name: "Serra Tico-Tico 500W - Bosch", category: "ferramentas", unit: "un", costPrice: 29900 },
      { name: "Furadeira de Impacto 550W - Bosch", category: "ferramentas", unit: "un", costPrice: 39900 },
      { name: "Parafusadeira a Bateria 12V", category: "ferramentas", unit: "un", costPrice: 24900 },
      { name: "Esmerilhadeira 4.5 720W", category: "ferramentas", unit: "un", costPrice: 22900 },
      { name: "Serrote 20 polegadas", category: "ferramentas", unit: "un", costPrice: 3990 },
      { name: "Esquadro Metálico 30cm", category: "ferramentas", unit: "un", costPrice: 2990 },
      
      // ACABAMENTO - Preços médios Brasil
      { name: "Porcelanato 60x60cm Polido (m²)", category: "acabamento", unit: "m²", costPrice: 8990 },
      { name: "Porcelanato 60x60cm Acetinado (m²)", category: "acabamento", unit: "m²", costPrice: 7490 },
      { name: "Piso Cerâmico 45x45cm (m²) - Eliane", category: "acabamento", unit: "m²", costPrice: 3990 },
      { name: "Piso Laminado (m²)", category: "acabamento", unit: "m²", costPrice: 4990 },
      { name: "Piso Vinílico (m²)", category: "acabamento", unit: "m²", costPrice: 5990 },
      { name: "Rodapé MDF 10cm (m)", category: "acabamento", unit: "m", costPrice: 1790 },
      { name: "Rodapé Poliestireno 7cm (m)", category: "acabamento", unit: "m", costPrice: 990 },
      { name: "Porta de Madeira 80x210cm", category: "acabamento", unit: "un", costPrice: 39900 },
      { name: "Porta de Madeira 70x210cm", category: "acabamento", unit: "un", costPrice: 34900 },
      { name: "Kit Porta Pronta com Batente", category: "acabamento", unit: "un", costPrice: 59900 },
      { name: "Fechadura Interna - Pado", category: "acabamento", unit: "un", costPrice: 7990 },
      { name: "Fechadura Externa", category: "acabamento", unit: "un", costPrice: 12900 },
      { name: "Dobradiça 3.5 Cromada - Pado", category: "acabamento", unit: "un", costPrice: 1490 },
      { name: "Puxador de Porta 30cm", category: "acabamento", unit: "un", costPrice: 4990 },
      
      // MADEIRA - Preços médios Brasil
      { name: "Compensado 15mm 2.20x1.60m", category: "madeira", unit: "chapa", costPrice: 17900 },
      { name: "Compensado 18mm 2.20x1.60m", category: "madeira", unit: "chapa", costPrice: 21900 },
      { name: "MDF 15mm 2.75x1.85m - Duratex", category: "madeira", unit: "chapa", costPrice: 21900 },
      { name: "MDF 18mm 2.75x1.85m", category: "madeira", unit: "chapa", costPrice: 25900 },
      { name: "OSB 15mm 2.44x1.22m", category: "madeira", unit: "chapa", costPrice: 8990 },
      { name: "Sarrafo 5x2.5cm 3m", category: "madeira", unit: "un", costPrice: 990 },
      { name: "Caibro 5x6cm 3m", category: "madeira", unit: "un", costPrice: 1990 },
      { name: "Caibro 6x8cm 3m", category: "madeira", unit: "un", costPrice: 2990 },
      { name: "Viga 6x12cm 3m", category: "madeira", unit: "un", costPrice: 5990 },
      { name: "Ripa 2x5cm 3m", category: "madeira", unit: "un", costPrice: 590 },
      { name: "Parafuso Chipboard 4x40mm (100un) - Ciser", category: "madeira", unit: "cx", costPrice: 1790 },
      { name: "Parafuso Chipboard 5x50mm (100un)", category: "madeira", unit: "cx", costPrice: 2490 },
      { name: "Prego 17x27 1kg", category: "madeira", unit: "kg", costPrice: 1990 },
      { name: "Cola Branca PVA 1kg", category: "madeira", unit: "un", costPrice: 1990 },
      
      // AR CONDICIONADO - Preços médios Brasil
      { name: "Suporte para Condensadora 500mm", category: "ar_condicionado", unit: "un", costPrice: 9990 },
      { name: "Suporte para Condensadora 600mm", category: "ar_condicionado", unit: "un", costPrice: 12900 },
      { name: "Tubo de Cobre 1/4 (m)", category: "ar_condicionado", unit: "m", costPrice: 2990 },
      { name: "Tubo de Cobre 3/8 (m)", category: "ar_condicionado", unit: "m", costPrice: 3990 },
      { name: "Tubo de Cobre 1/2 (m)", category: "ar_condicionado", unit: "m", costPrice: 5290 },
      { name: "Tubo de Cobre 5/8 (m)", category: "ar_condicionado", unit: "m", costPrice: 6990 },
      { name: "Isolamento Térmico Armaflex (m)", category: "ar_condicionado", unit: "m", costPrice: 990 },
      { name: "Dreno Corrugado 16mm (m)", category: "ar_condicionado", unit: "m", costPrice: 390 },
      { name: "Gás R410A (kg)", category: "ar_condicionado", unit: "kg", costPrice: 14900 },
      { name: "Gás R22 (kg)", category: "ar_condicionado", unit: "kg", costPrice: 9990 },
      { name: "Gás R32 (kg)", category: "ar_condicionado", unit: "kg", costPrice: 12900 },
      { name: "Cabo PP 3x1.5mm² (m)", category: "ar_condicionado", unit: "m", costPrice: 590 },
      { name: "Disjuntor Bipolar 20A", category: "ar_condicionado", unit: "un", costPrice: 3490 },
      { name: "Filtro de Ar Condicionado", category: "ar_condicionado", unit: "un", costPrice: 2990 },
      { name: "Higienizador de AC 300ml", category: "ar_condicionado", unit: "un", costPrice: 2990 },
      
      // LIMPEZA - Preços médios Brasil
      { name: "Detergente Neutro 5L - Ypê", category: "limpeza", unit: "galão", costPrice: 2990 },
      { name: "Desengordurante 5L - Veja", category: "limpeza", unit: "galão", costPrice: 3990 },
      { name: "Água Sanitária 5L - Qboa", category: "limpeza", unit: "galão", costPrice: 1790 },
      { name: "Limpa Vidros 5L - Veja", category: "limpeza", unit: "galão", costPrice: 2990 },
      { name: "Removedor de Cera 5L - Start", category: "limpeza", unit: "galão", costPrice: 5290 },
      { name: "Cera Líquida 5L - Bravo", category: "limpeza", unit: "galão", costPrice: 3990 },
      { name: "Multiuso 5L", category: "limpeza", unit: "galão", costPrice: 2490 },
      { name: "Álcool 70% 5L", category: "limpeza", unit: "galão", costPrice: 2990 },
      { name: "Luva de Látex (par)", category: "limpeza", unit: "par", costPrice: 590 },
      { name: "Pano Multiuso (rolo 50un)", category: "limpeza", unit: "rolo", costPrice: 1990 },
      { name: "Esponja Dupla Face (pack 3un)", category: "limpeza", unit: "pack", costPrice: 590 },
      { name: "Rodo 40cm", category: "limpeza", unit: "un", costPrice: 1990 },
      { name: "Vassoura de Piaçava", category: "limpeza", unit: "un", costPrice: 1490 },
      { name: "Balde 10L", category: "limpeza", unit: "un", costPrice: 990 },
    ];
    
    // Criar fornecedor padrão do sistema para os materiais
    let systemSupplierId = 1;
    try {
      const suppliers = await storage.getMaterialSuppliers();
      if (suppliers.length === 0) {
        const supplier = await storage.createMaterialSupplier({
          name: "Fornecedor Padrão do Sistema",
          city: "Brasil",
          state: "BR",
          phone: "00000000000",
          address: "Sistema Pereirão Express",
          isActive: true,
        });
        systemSupplierId = supplier.id;
      } else {
        systemSupplierId = suppliers[0].id;
      }
    } catch (e) {
      console.log("Usando supplierId padrão:", systemSupplierId);
    }
    
    for (const mat of materials) {
      await storage.createMaterial({
        name: mat.name,
        description: `${mat.category} - ${mat.unit}`,
        category: mat.category,
        unit: mat.unit,
        costPrice: mat.costPrice,
        salePrice: Math.round(mat.costPrice * 1.3), // Margem de 30% sobre o custo
        supplierId: systemSupplierId,
        stockQuantity: 999,
        isActive: true,
      });
    }
    console.log(`${materials.length} materiais de construção populados com preços médios do Brasil`);
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  setupLocalAuth(app);
  registerObjectStorageRoutes(app);
  
  await seedCategories();
  await seedConstructionMaterials();

  // Endpoint para buscar materiais com autocomplete
  app.get("/api/materials/search", async (req, res) => {
    try {
      const query = (req.query.q as string || "").toLowerCase().trim();
      const category = req.query.category as string;
      
      let materials = await storage.getMaterials();
      
      // Filtrar por categoria se especificada
      if (category) {
        materials = materials.filter(m => m.category === category);
      }
      
      // Filtrar por termo de busca
      if (query) {
        materials = materials.filter(m => 
          m.name.toLowerCase().includes(query) ||
          (m.description && m.description.toLowerCase().includes(query)) ||
          (m.category && m.category.toLowerCase().includes(query))
        );
      }
      
      // Limitar a 20 resultados para performance
      const results = materials.slice(0, 20).map(m => ({
        id: m.id,
        name: m.name,
        category: m.category,
        unit: m.unit,
        costPrice: m.costPrice,
        salePrice: m.salePrice,
        priceFormatted: `R$ ${(m.salePrice / 100).toFixed(2).replace('.', ',')}`,
      }));
      
      res.json(results);
    } catch (error) {
      console.error("Error searching materials:", error);
      res.status(500).json({ error: "Failed to search materials" });
    }
  });

  // Endpoint para obter todos os materiais
  app.get("/api/materials", async (req, res) => {
    try {
      const materials = await storage.getMaterials();
      res.json(materials.map(m => ({
        id: m.id,
        name: m.name,
        category: m.category,
        unit: m.unit,
        costPrice: m.costPrice,
        salePrice: m.salePrice,
        priceFormatted: `R$ ${(m.salePrice / 100).toFixed(2).replace('.', ',')}`,
      })));
    } catch (error) {
      console.error("Error fetching materials:", error);
      res.status(500).json({ error: "Failed to fetch materials" });
    }
  });

  app.get("/api/settings/pricing", async (req, res) => {
    try {
      const diagnosisPrice = await getAdminSettingNumber("ai_diagnosis_price", 1000);
      const serviceFee = await getAdminSettingNumber("service_fee_percent", 10);
      const expressMultiplier = await getAdminSettingNumber("express_multiplier", 1.5);
      const urgentMultiplier = await getAdminSettingNumber("urgent_multiplier", 2.0);
      res.json({ diagnosisPrice, serviceFee, expressMultiplier, urgentMultiplier });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pricing" });
    }
  });

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
      
      // Enriquecer cada serviço com faixa de preço do diagnóstico IA
      const enrichedServices = await Promise.all(services.map(async (service) => {
        const aiDiagnosis = await storage.getAiDiagnosisByServiceId(service.id);
        return {
          ...service,
          priceRangeMin: aiDiagnosis?.priceRangeMin || null,
          priceRangeMax: aiDiagnosis?.priceRangeMax || null,
        };
      }));
      
      res.json(enrichedServices);
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
      
      // Include AI diagnosis if available
      const aiDiagnosis = await storage.getAiDiagnosisByServiceId(id);
      
      res.json({
        service,
        aiDiagnosis
      });
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

  app.get("/api/provider/available", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get provider profile to check specialties
      const profile = await storage.getUserProfile(userId);
      const providerSpecialties = (profile?.specialties || "").toLowerCase();
      
      // Get all available services
      const allServices = await storage.getAvailableServices();
      
      // Filter services based on provider's specialties
      const filteredServices = allServices.filter(service => {
        // If service is assigned to this provider, always show it
        if (service.providerId === userId) return true;
        
        // Only show services in categories matching provider's specialties
        const categoryId = service.categoryId;
        
        // Category to specialty mapping
        // 1=Encanamento, 2=Elétrica, 3=Pintura, 4=Marcenaria, 5=Ar Condicionado, 6=Limpeza, 7=Passadeira
        if (categoryId === 1 && (providerSpecialties.includes("encanamento") || providerSpecialties.includes("hidráulica") || providerSpecialties.includes("encanador"))) return true;
        if (categoryId === 2 && (providerSpecialties.includes("elétrica") || providerSpecialties.includes("eletricista"))) return true;
        if (categoryId === 3 && (providerSpecialties.includes("pintura") || providerSpecialties.includes("pintor"))) return true;
        if (categoryId === 4 && (providerSpecialties.includes("marcenaria") || providerSpecialties.includes("marceneiro"))) return true;
        if (categoryId === 5 && (providerSpecialties.includes("ar condicionado") || providerSpecialties.includes("ac") || providerSpecialties.includes("climatização"))) return true;
        if (categoryId === 6 && (providerSpecialties.includes("limpeza") || providerSpecialties.includes("diarista") || providerSpecialties.includes("empregada") || providerSpecialties.includes("faxina"))) return true;
        if (categoryId === 7 && (providerSpecialties.includes("passadeira") || providerSpecialties.includes("passar"))) return true;
        
        return false;
      });
      
      res.json(filteredServices);
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
        
        // Buscar preços de referência relevantes usando palavras do texto
        const textKeywords = fullText.split(/\s+/).filter(w => w.length > 3);
        const referencePriceData = await storage.getReferencePricesByKeywords(textKeywords);
        if (referencePriceData.length > 0) {
          knowledgeBaseContext += `\n\nPREÇOS DE REFERÊNCIA (SINAPI/Mercado Regional):\n`;
          for (const rp of referencePriceData.slice(0, 10)) {
            const priceMin = rp.priceMin / 100;
            const priceMax = rp.priceMax ? rp.priceMax / 100 : priceMin * 1.5;
            const priceAvg = rp.priceAvg ? rp.priceAvg / 100 : (priceMin + priceMax) / 2;
            knowledgeBaseContext += `- ${rp.name} (${rp.unit}): R$ ${priceMin.toFixed(2)} - R$ ${priceMax.toFixed(2)} (média: R$ ${priceAvg.toFixed(2)})`;
            if (rp.laborPercent) {
              knowledgeBaseContext += ` [${rp.laborPercent}% mão de obra]`;
            }
            if (rp.source === "sinapi") {
              knowledgeBaseContext += ` [SINAPI]`;
            }
            knowledgeBaseContext += `\n`;
          }
          knowledgeBaseContext += `\nUSE estes preços como referência para suas estimativas. Ajuste conforme complexidade do problema.`;
        }
      } catch (err) {
        console.error("Error fetching knowledge base:", err);
      }

      // Carregar treinamento da IA do banco de dados
      let trainingContext = "";
      let maxQuestions = 3;
      try {
        const allTrainingConfigs = await storage.getAiTrainingConfigs();
        const activeConfigs = allTrainingConfigs.filter(c => c.isActive);
        const allCategories = await storage.getCategories();

        if (activeConfigs.length > 0) {
          const specificConfig = categoryId ? activeConfigs.find(c => c.categoryId === categoryId) : null;
          const configsToUse = specificConfig ? [specificConfig] : activeConfigs;

          for (const cfg of configsToUse) {
            if (specificConfig && cfg.systemPromptOverride) {
              trainingContext = cfg.systemPromptOverride;
              maxQuestions = cfg.engineMaxQuestions || 3;
              break;
            }

            maxQuestions = cfg.engineMaxQuestions || 3;
            const catName = allCategories.find((c: any) => c.id === cfg.categoryId)?.name || `Categoria ${cfg.categoryId}`;

            // Perguntas condicionais
            const cqs = safeJsonParse(cfg.conditionalQuestions);
            if (cqs.length > 0) {
              trainingContext += `\n\nPERGUNTAS CONDICIONAIS PARA ${catName.toUpperCase()}:`;
              for (const cq of cqs) {
                if (cq.keywords && cq.keywords.length > 0) {
                  trainingContext += `\n**Se o cliente mencionar "${cq.keywords.join('", "')}":**`;
                  for (const q of (cq.questions || [])) {
                    trainingContext += `\n- ${q}`;
                  }
                }
              }
            }

            // Regras de precificação
            const prices = safeJsonParse(cfg.pricingRules);
            if (prices.length > 0) {
              trainingContext += `\n\nPRECIFICAÇÃO ${catName.toUpperCase()}:`;
              for (const p of prices) {
                if (p.basePrice > 0) {
                  trainingContext += `\n- ${p.item}: R$ ${(p.basePrice).toFixed(2)}`;
                } else if (p.multiplier && p.multiplier !== 1.0) {
                  trainingContext += `\n- ${p.item}: ${p.multiplier}x`;
                }
                if (p.note) trainingContext += ` (${p.note})`;
              }
            }

            // Dicas de diagnóstico
            const tips = safeJsonParse(cfg.diagnosisTips);
            if (tips.length > 0) {
              trainingContext += `\n\nDICAS TÉCNICAS ${catName.toUpperCase()}:`;
              for (const tip of tips) {
                trainingContext += `\n- ${tip}`;
              }
            }

            // Exemplos de conversa
            const examples = safeJsonParse(cfg.exampleConversations);
            if (examples.length > 0) {
              trainingContext += `\n\nEXEMPLOS DE CONVERSA ${catName.toUpperCase()}:`;
              for (const ex of examples) {
                trainingContext += `\nCliente: "${ex.userMessage}" → IA: "${ex.aiResponse}"`;
              }
            }
          }

          // Regras globais (unificar de todas as configs ativas)
          let allRules: string[] = [];
          let allForbidden: string[] = [];
          let allVocab: string[] = [];
          for (const cfg of configsToUse) {
            allRules = allRules.concat(safeJsonParse(cfg.rules));
            allForbidden = allForbidden.concat(safeJsonParse(cfg.forbiddenTopics));
            allVocab = allVocab.concat(safeJsonParse(cfg.vocabulary));
          }

          if (allRules.length > 0) {
            trainingContext += `\n\nREGRAS DO TREINAMENTO:`;
            for (const r of [...new Set(allRules)]) {
              trainingContext += `\n- ${r}`;
            }
          }

          if (allForbidden.length > 0) {
            trainingContext += `\n\nPROIBIDO:`;
            for (const f of [...new Set(allForbidden)]) {
              trainingContext += `\n- ${f}`;
            }
          }

          if (allVocab.length > 0) {
            trainingContext += `\n\nVOCABULÁRIO:`;
            for (const v of [...new Set(allVocab)]) {
              trainingContext += `\n- ${v}`;
            }
          }
        }
      } catch (err) {
        console.error("Error loading AI training configs:", err);
      }

      const systemPrompt = `Você é o assistente do Pereirão Express. Seu trabalho é entender o problema do cliente em MÁXIMO ${maxQuestions} PERGUNTAS rápidas e simples.${knowledgeBaseContext}${trainingContext}

REGRAS OBRIGATÓRIAS:
- TODA resposta deve ser uma PERGUNTA (nunca afirmações)
- Máximo ${maxQuestions} perguntas curtas e diretas
- Respostas CURTAS (máximo 2 frases)
- Português brasileiro simples
- Faça UMA pergunta por vez
- Seja direto e amigável
- Use "você" (não "senhor/senhora")
- Responda sobre reparos E serviços domésticos (incluindo empregada doméstica, faxineira, diarista)
- Se a pergunta não for sobre serviços domésticos ou reparos, diga educadamente que só pode ajudar com esses serviços
- NUNCA faça afirmações como "É um problema elétrico" - sempre pergunte para confirmar

FLUXO DE PERGUNTAS (exatamente ${maxQuestions} perguntas + 1 opcional para foto):
1. Qual o problema exatamente? (ou pergunta de esclarecimento)
2. [Pergunta condicional baseada no tipo de problema - ver treinamento acima]
3. Onde fica na sua casa? / Há quanto tempo está assim?
4. (OPCIONAL - só quando foto ajuda) "Pode enviar uma foto? Ajuda no diagnóstico!"

QUANDO PEDIR FOTO:
- Vazamentos visíveis, manchas de água, mofo
- Problemas elétricos com sinais visuais (tomada queimada, fios expostos)
- Rachaduras, danos estruturais, infiltrações

QUANDO NÃO PEDIR FOTO:
- Problemas de som (barulho, chiado)
- Entupimentos simples
- Problemas elétricos sem sinais visuais (disjuntor caindo)
- Cheiro de gás/queimado

SOBRE MATERIAIS:
- "providerMaterials": ferramentas e equipamentos que o PRESTADOR traz
- "clientMaterials": peças ou materiais que o CLIENTE precisa comprar
- Se não houver materiais para o cliente, deixe "clientMaterials" vazio []

REGRA FINAL: Após coletar informações suficientes (${maxQuestions} perguntas), faça uma PERGUNTA DE CONFIRMAÇÃO antes do diagnóstico.
Exemplo: "Entendi! Então você tem [resumo do problema]. Posso preparar o orçamento para você?"

Quando o cliente CONFIRMAR (responder sim/pode/ok/claro), adicione o diagnóstico:
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
      const { city, categoryId, serviceId, lat, lon } = req.query;
      const clientLat = lat !== undefined ? parseFloat(lat as string) : null;
      const clientLon = lon !== undefined ? parseFloat(lon as string) : null;
      
      // Get category name for filtering by specialty
      let categoryName: string | null = null;
      if (serviceId) {
        const service = await storage.getServiceById(parseInt(serviceId as string));
        if (service) {
          const category = await storage.getCategoryById(service.categoryId);
          categoryName = category?.name || null;
        }
      } else if (categoryId) {
        const category = await storage.getCategoryById(parseInt(categoryId as string));
        categoryName = category?.name || null;
      }
      
      // Get available providers, optionally filtered by city
      let providers = await storage.getAvailableProviders(city as string);
      
      // Filter providers by specialty (category name)
      if (categoryName) {
        providers = providers.filter(provider => {
          const specialties = (provider.specialties || "").toLowerCase();
          const categoryLower = categoryName!.toLowerCase();
          // Check if specialties contain the category name or related keywords
          return specialties.includes(categoryLower) || 
                 (categoryLower === "passadeira" && specialties.includes("passar")) ||
                 (categoryLower === "limpeza" && (specialties.includes("limpeza") || specialties.includes("diarista") || specialties.includes("faxina"))) ||
                 (categoryLower === "encanamento" && (specialties.includes("encanamento") || specialties.includes("encanador") || specialties.includes("hidráulica"))) ||
                 (categoryLower === "elétrica" && (specialties.includes("elétrica") || specialties.includes("eletricista"))) ||
                 (categoryLower === "pintura" && (specialties.includes("pintura") || specialties.includes("pintor"))) ||
                 (categoryLower === "marcenaria" && (specialties.includes("marcenaria") || specialties.includes("marceneiro"))) ||
                 (categoryLower === "ar condicionado" && (specialties.includes("ar condicionado") || specialties.includes("ac") || specialties.includes("climatização")));
        });
      }
      
      // Filter by distance if client location provided (30km radius)
      let filteredProviders: any[] = providers;
      if (clientLat !== null && clientLon !== null && !isNaN(clientLat) && !isNaN(clientLon)) {
        const { filterProvidersByDistance } = await import("@shared/geolocation");
        filteredProviders = filterProvidersByDistance(providers, clientLat, clientLon, 30);
      }
      
      // Get AI diagnosis price range if serviceId provided
      let priceRangeMin = 0;
      let priceRangeMax = 0;
      if (serviceId) {
        const aiDiagnosis = await storage.getAiDiagnosisByServiceId(parseInt(serviceId as string));
        if (aiDiagnosis) {
          priceRangeMin = aiDiagnosis.priceRangeMin || 0;
          priceRangeMax = aiDiagnosis.priceRangeMax || 0;
        }
        // Fallback to category base price if no AI diagnosis
        if (priceRangeMin === 0) {
          const service = await storage.getServiceById(parseInt(serviceId as string));
          if (service) {
            const category = await storage.getCategoryById(service.categoryId);
            priceRangeMin = category?.basePrice || 0;
            priceRangeMax = priceRangeMin * 2;
          }
        }
      } else if (categoryId) {
        const category = await storage.getCategoryById(parseInt(categoryId as string));
        priceRangeMin = category?.basePrice || 0;
        priceRangeMax = priceRangeMin * 2;
      }
      
      // Calculate adjusted price for each provider based on rating within AI price range
      const { getRatingLevel } = await import("@shared/priceMultiplier");
      
      const providersWithPricing = filteredProviders.map(provider => {
        const rating = parseFloat(provider.rating || "10");
        const totalRatings = provider.totalRatings || 0;
        const ratingLevel = getRatingLevel(rating, totalRatings);
        
        // Calculate price based on rating level within AI's price range
        // Premium (9-10): 90-100% of max, Experiente (8-8.9): 70-85%, Regular (5.1-7.9): 40-65%, Iniciante (0-5): min
        let adjustedPrice = priceRangeMin;
        const priceRange = priceRangeMax - priceRangeMin;
        
        // Calculate price range based on rating
        // Each level gets a R$100 range (10000 centavos), positioned by their rating
        let priceMin = priceRangeMin;
        let priceMax = priceRangeMin + 10000; // R$100 range
        
        if (totalRatings === 0) {
          // New provider: starts at minimum with R$100 range
          priceMin = priceRangeMin;
          priceMax = priceRangeMin + 10000;
        } else if (ratingLevel === "Premium") {
          // Premium (9-10): Higher range based on exact rating
          // Nota 10: 550-650, Nota 9: 505-605 (relative to min)
          const ratingFactor = (rating - 9) / 1; // 0 to 1 for rating 9-10
          const baseOffset = Math.round(priceRange * 0.35); // 35% above min
          const ratingBonus = Math.round(priceRange * 0.15 * ratingFactor); // up to 15% more
          priceMin = priceRangeMin + baseOffset + ratingBonus;
          priceMax = priceMin + 10000;
        } else if (ratingLevel === "Experiente") {
          // Experiente (8-8.9): Medium-high range
          const ratingFactor = (rating - 8) / 0.9;
          const baseOffset = Math.round(priceRange * 0.25);
          const ratingBonus = Math.round(priceRange * 0.08 * ratingFactor);
          priceMin = priceRangeMin + baseOffset + ratingBonus;
          priceMax = priceMin + 10000;
        } else if (ratingLevel === "Regular") {
          // Regular (5.1-7.9): Medium range
          const ratingFactor = (rating - 5.1) / 2.8;
          const baseOffset = Math.round(priceRange * 0.10);
          const ratingBonus = Math.round(priceRange * 0.12 * ratingFactor);
          priceMin = priceRangeMin + baseOffset + ratingBonus;
          priceMax = priceMin + 10000;
        } else {
          // Iniciante (0-5): Lower range based on rating
          // Nota 3.8: ~307-407, Nota 1: closer to min
          const ratingFactor = rating / 5;
          const baseOffset = Math.round(priceRange * 0.02 * ratingFactor);
          priceMin = priceRangeMin + baseOffset;
          priceMax = priceMin + 10000;
        }
        
        // Ensure max doesn't exceed AI's max estimate
        if (priceMax > priceRangeMax + 10000) {
          priceMax = priceRangeMax + 10000;
        }
        
        return {
          ...provider,
          adjustedPrice: priceMin, // Keep for backward compatibility
          priceMin,
          priceMax,
          ratingLevel,
          basePrice: priceRangeMin,
          distance: provider.distance ? Math.round(provider.distance * 10) / 10 : null,
        };
      });
      
      // Sort: by rating/ranking first, then by distance as secondary
      providersWithPricing.sort((a, b) => {
        const aHasRatings = (a.totalRatings || 0) > 0;
        const bHasRatings = (b.totalRatings || 0) > 0;
        
        // Rated providers come first
        if (aHasRatings && !bHasRatings) return -1;
        if (!aHasRatings && bHasRatings) return 1;
        
        // Among rated providers, sort by rating descending
        if (aHasRatings && bHasRatings) {
          const ratingDiff = parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
          if (ratingDiff !== 0) return ratingDiff;
        }
        
        // Secondary: sort by distance if available
        if (a.distance !== null && b.distance !== null) {
          return a.distance - b.distance;
        }
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
        
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
      // Serviços domésticos podem ser selecionados diretamente (status ai_diagnosed)
      // Serviços de reparo precisam ter a taxa paga primeiro (status fee_paid)
      const validStatuses = ["fee_paid", "selecting_provider", "ai_diagnosed"];
      if (!validStatuses.includes(service.status)) {
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
      
      // Buscar dados do cliente para a notificação
      const [client] = await db.select().from(users).where(eq(users.id, clientId)).limit(1);
      const clientName = client?.firstName || "Cliente";
      
      // Criar notificação para o prestador
      await storage.createNotification({
        userId: providerId,
        type: "service_request",
        title: "Novo serviço para você!",
        message: `${clientName} selecionou você para um serviço de ${category?.name || 'manutenção'}. Valor: R$ ${(adjustedPrice / 100).toFixed(2)}`,
        data: JSON.stringify({ 
          serviceId, 
          clientId, 
          categoryId: service.categoryId,
          estimatedPrice: adjustedPrice 
        })
      });
      
      // Tentar fazer chamada Twilio se configurado
      const twilioConfigured = process.env.TWILIO_ACCOUNT_SID && 
                               process.env.TWILIO_AUTH_TOKEN && 
                               process.env.TWILIO_PHONE_NUMBER;
      
      let callInitiated = false;
      if (twilioConfigured && provider.phone) {
        try {
          await storage.createTwilioCall({
            serviceRequestId: serviceId,
            providerId,
            providerPhone: provider.phone,
            status: "pending"
          });
          callInitiated = true;
        } catch (callError) {
          console.error("Error initiating Twilio call:", callError);
        }
      }
      
      // Enviar push notification para o prestador
      let pushSent = false;
      const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
      const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
      
      if (vapidPublicKey && vapidPrivateKey) {
        try {
          const subscriptions = await storage.getPushSubscriptionsByUser(providerId);
          
          if (subscriptions.length > 0) {
            const webpush = await import('web-push');
            webpush.setVapidDetails(
              'mailto:contato@pereirao.com.br',
              vapidPublicKey,
              vapidPrivateKey
            );
            
            const payload = JSON.stringify({
              title: "Novo serviço para você!",
              body: `${clientName} precisa de ${category?.name || 'serviço'}. Valor: R$ ${(adjustedPrice / 100).toFixed(2)}`,
              url: `/prestador?serviceId=${serviceId}`,
              serviceId,
              actions: [
                { action: 'accept', title: 'Aceitar' },
                { action: 'reject', title: 'Recusar' }
              ]
            });
            
            for (const sub of subscriptions) {
              try {
                await webpush.sendNotification({
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth }
                }, payload);
                pushSent = true;
              } catch (pushError: any) {
                if (pushError.statusCode === 410) {
                  await storage.deletePushSubscription(sub.endpoint);
                }
              }
            }
          }
        } catch (pushError) {
          console.error("Error sending push notification:", pushError);
        }
      }
      
      res.json({ 
        ...updatedService, 
        notificationSent: true,
        callInitiated,
        pushSent,
        twilioConfigured: !!twilioConfigured
      });
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
      const results = await db.select({
        profile: userProfiles,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        cpf: users.cpf,
        age: users.age,
      })
        .from(userProfiles)
        .leftJoin(users, eq(userProfiles.userId, users.id))
        .orderBy(desc(userProfiles.createdAt));
      
      const enriched = results.map(r => ({
        ...r.profile,
        email: r.email,
        firstName: r.firstName,
        lastName: r.lastName,
        cpf: r.cpf,
        age: r.age,
      }));
      res.json(enriched);
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

  // Edit user data from admin panel
  app.patch("/api/admin/users/:userId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { firstName, lastName, email, phone, city, cpf, age, specialties, role } = req.body;

      const userUpdates: any = {};
      if (firstName !== undefined) userUpdates.firstName = firstName;
      if (lastName !== undefined) userUpdates.lastName = lastName;
      if (email !== undefined) userUpdates.email = email;
      if (cpf !== undefined) userUpdates.cpf = cpf;
      if (age !== undefined) userUpdates.age = age ? parseInt(age) : null;
      if (phone !== undefined) userUpdates.phone = phone;
      if (city !== undefined) userUpdates.city = city;

      if (Object.keys(userUpdates).length > 0) {
        await db.update(users).set(userUpdates).where(eq(users.id, userId));
      }

      const profileUpdates: any = {};
      if (phone !== undefined) profileUpdates.phone = phone;
      if (city !== undefined) profileUpdates.city = city;
      if (specialties !== undefined) profileUpdates.specialties = specialties;
      if (role !== undefined) profileUpdates.role = role;

      if (Object.keys(profileUpdates).length > 0) {
        await storage.updateUserProfile(userId, profileUpdates);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: error.message || "Erro ao atualizar usuário" });
    }
  });

  // Create user from admin panel
  app.post("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { firstName, lastName, email, phone, city, role, password, cpf, age, specialties } = req.body;
      
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
        cpf: cpf || undefined,
        phone: phone || undefined,
        age: age ? parseInt(age) : undefined,
        city: city || undefined,
      });

      // Create profile
      await storage.createUserProfile({
        userId,
        role: role || "client",
        phone,
        city,
        specialties: specialties || undefined,
        documentStatus: role === "provider" ? "pending" : undefined,
      });

      res.status(201).json({ success: true, userId });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: error.message || "Failed to create user" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/admin/users/:userId", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      if (req.user.id === userId) {
        return res.status(400).json({ error: "Você não pode excluir a si mesmo" });
      }

      const profile = await storage.getUserProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      await storage.deleteUserAndProfile(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: error.message || "Erro ao excluir usuário" });
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

      // Mapear tipo de serviço para categoria correta
      const getCategoryFromServiceType = async (answers: any[]): Promise<number> => {
        const serviceTypeAnswer = answers?.find((a: any) => 
          a.question?.includes("tipo") || a.question?.includes("problema")
        )?.answer || "";
        
        // Categorias: 1=Encanamento, 2=Elétrica, 3=Pintura, 4=Marcenaria, 5=Ar Condicionado, 6=Limpeza, 7=Passadeira
        if (serviceTypeAnswer.includes("Empregada") || serviceTypeAnswer.includes("Doméstica") || serviceTypeAnswer.includes("Limpeza") || serviceTypeAnswer.includes("Faxina")) {
          return 6; // Limpeza
        }
        if (serviceTypeAnswer.includes("Passadeira") || serviceTypeAnswer.includes("Passar roupa")) {
          return 7; // Passadeira
        }
        if (serviceTypeAnswer.includes("Elétrica") || serviceTypeAnswer.includes("eletricista")) {
          return 2; // Elétrica
        }
        if (serviceTypeAnswer.includes("Hidráulica") || serviceTypeAnswer.includes("Encanamento") || serviceTypeAnswer.includes("encanador")) {
          return 1; // Encanamento
        }
        if (serviceTypeAnswer.includes("Pintura") || serviceTypeAnswer.includes("pintor")) {
          return 3; // Pintura
        }
        if (serviceTypeAnswer.includes("Marcenaria") || serviceTypeAnswer.includes("marceneiro")) {
          return 4; // Marcenaria
        }
        if (serviceTypeAnswer.includes("Ar condicionado") || serviceTypeAnswer.includes("ar-condicionado") || serviceTypeAnswer.includes("climatização")) {
          return 5; // Ar Condicionado
        }
        return categoryId || 1; // Default para Encanamento
      };

      // Verificar se é serviço doméstico (cálculo direto, sem IA)
      const isDomesticService = guidedAnswers?.some((a: any) => 
        a.answer?.includes("Empregada") || 
        a.answer?.includes("Passadeira") ||
        a.question?.includes("tamanho")
      );

      if (isDomesticService) {
        // Determinar categoria correta
        const resolvedCategoryId = await getCategoryFromServiceType(guidedAnswers);
        
        // Cálculo direto para serviços domésticos (RÁPIDO - sem IA)
        const houseSize = guidedAnswers?.find((a: any) => a.question?.includes("tamanho"))?.answer || "";
        const serviceType = guidedAnswers?.find((a: any) => a.question?.includes("tipo"))?.answer || "";
        const frequency = guidedAnswers?.find((a: any) => a.question?.includes("frequência"))?.answer || "";

        // Ler preços base do admin (em centavos)
        const priceSmall = await getAdminSettingNumber("domestic_price_small", 15000);
        const priceMedium = await getAdminSettingNumber("domestic_price_medium", 20000);
        const priceLarge = await getAdminSettingNumber("domestic_price_large", 30000);
        const priceCommercial = await getAdminSettingNumber("domestic_price_commercial", 25000);
        const extraPassing = await getAdminSettingNumber("domestic_extra_passing", 5000);
        const extraCooking = await getAdminSettingNumber("domestic_extra_cooking", 8000);

        // Preço base por tamanho (do admin)
        let basePrice = priceSmall;
        if (houseSize.includes("3-4")) basePrice = priceMedium;
        else if (houseSize.includes("5+") || houseSize.includes("grande")) basePrice = priceLarge;
        else if (houseSize.includes("Comercial") || houseSize.includes("Escritório")) basePrice = priceCommercial;

        // Multiplicadores por tipo de serviço (do admin)
        const multHeavy = await getAdminSettingNumber("domestic_mult_heavy", 1.8);
        const multComplete = await getAdminSettingNumber("domestic_mult_complete", 1.5);
        let serviceMultiplier = 1.0;
        if (serviceType.includes("pesada") || serviceType.includes("pós-obra")) serviceMultiplier = multHeavy;
        else if (serviceType.includes("completo")) serviceMultiplier = multComplete;
        else if (serviceType.includes("Passar")) basePrice += extraPassing;
        else if (serviceType.includes("Cozinhar")) basePrice += extraCooking;

        // Multiplicadores por frequência (do admin)
        const freqDaily = await getAdminSettingNumber("domestic_freq_daily", 0.80);
        const freqWeekly = await getAdminSettingNumber("domestic_freq_weekly", 0.85);
        const freqBiweekly = await getAdminSettingNumber("domestic_freq_biweekly", 0.90);
        const freqMonthly = await getAdminSettingNumber("domestic_freq_monthly", 0.95);
        let frequencyMultiplier = 1.0;
        if (frequency.includes("Diária")) frequencyMultiplier = freqDaily;
        else if (frequency.includes("Semanal")) frequencyMultiplier = freqWeekly;
        else if (frequency.includes("Quinzenal")) frequencyMultiplier = freqBiweekly;
        else if (frequency.includes("Mensal")) frequencyMultiplier = freqMonthly;

        // Taxa da plataforma doméstica (do admin)
        const domesticPlatformFee = await getAdminSettingNumber("domestic_platform_fee", 15);
        const finalPrice = Math.round(basePrice * serviceMultiplier * frequencyMultiplier);
        const diagnosisFee = Math.round(finalPrice * (domesticPlatformFee / 100));

        // Criar serviço com categoria correta
        const service = await storage.createService({
          clientId: userId,
          title: title || "Serviço Doméstico",
          description,
          categoryId: resolvedCategoryId,
          status: "pending",
          slaPriority: "standard",
        });

        // Criar diagnóstico (sem chamar IA)
        const aiDiagnosis = await storage.createAiDiagnosis({
          serviceRequestId: service.id,
          inputDescription: description,
          guidedAnswers: JSON.stringify(guidedAnswers),
          mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
          classification: "Serviço Doméstico",
          urgencyLevel: "baixa",
          estimatedDuration: frequency.includes("Diária") ? "4-8 horas" : "3-6 horas",
          materialsSuggested: JSON.stringify(["Produtos de limpeza", "Equipamentos básicos"]),
          priceRangeMin: finalPrice,
          priceRangeMax: Math.round(finalPrice * 1.2),
          diagnosisFee,
          aiResponse: `Serviço de ${serviceType.toLowerCase() || "limpeza"} para ${houseSize.toLowerCase()}. Frequência: ${frequency.toLowerCase()}.`,
        });

        await storage.updateService(service.id, { status: "ai_diagnosed" });

        return res.json({
          service,
          aiDiagnosis,
          diagnosisFee,
        });
      }

      // Determinar categoria correta para outros tipos de serviço
      const resolvedCategoryId = await getCategoryFromServiceType(guidedAnswers);
      
      // Criar serviço inicial (para outros tipos de serviço)
      const service = await storage.createService({
        clientId: userId,
        title: title || "Novo Serviço",
        description,
        categoryId: resolvedCategoryId,
        status: "pending",
        slaPriority: "standard",
      });

      // Preparar prompt para IA (apenas para reparos)
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

      // Calcular taxa de diagnóstico (valor fixo do admin, padrão R$10 = 1000 centavos)
      const diagnosisPrice = await getAdminSettingNumber("ai_diagnosis_price", 1000);
      const diagnosisFee = diagnosisPrice;

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
      const serviceFeePercent = await getAdminSettingNumber("service_fee_percent", 10);
      const platformFee = Math.round((laborCost + materialsCost) * (serviceFeePercent / 100));
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

  // Pagar e contratar serviço doméstico (sem orçamento presencial)
  app.post("/api/service/:id/pay-domestic", isAuthenticated, async (req: any, res) => {
    try {
      const clientId = req.user.claims.sub;
      const serviceId = parseInt(req.params.id);
      const { method, totalAmount } = req.body;

      const service = await storage.getServiceById(serviceId);
      if (!service || service.clientId !== clientId) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Registrar pagamento
      const payment = await storage.createPayment({
        userId: clientId,
        serviceRequestId: serviceId,
        amount: totalAmount,
        method: method || "pix",
        status: "completed",
        description: `Serviço doméstico: ${service.title}`,
      });

      // Criar diagnóstico do prestador (para serviços domésticos, é automático)
      const aiDiagnosis = await storage.getAiDiagnosisByServiceId(serviceId);
      const laborCost = aiDiagnosis?.priceRangeMin || totalAmount;
      
      await storage.createProviderDiagnosis({
        serviceRequestId: serviceId,
        providerId: clientId,
        findings: "Serviço doméstico - execução direta",
        laborCost,
        materialsCost: 0,
        materialsList: "[]",
        estimatedDuration: aiDiagnosis?.estimatedDuration || "4 horas",
        notes: "Serviço contratado online",
      });

      // Criar aceite digital
      const domesticFeePercent = await getAdminSettingNumber("domestic_platform_fee", 15);
      const platformFee = Math.round(laborCost * (domesticFeePercent / 100));
      await storage.createDigitalAcceptance({
        serviceRequestId: serviceId,
        clientId,
        totalPrice: totalAmount,
        laborCost,
        materialsCost: 0,
        platformFee,
      });

      // Atualizar status do serviço para aceito
      await storage.updateService(serviceId, { 
        status: "accepted",
        scheduledDate: new Date(),
      });

      // Criar escrow
      await storage.createPaymentEscrow({
        serviceRequestId: serviceId,
        paymentId: payment.id,
        holdAmount: totalAmount,
        status: "holding",
      });

      // Notificar (em produção, encontraria e atribuiria uma prestadora disponível)
      res.json({ 
        message: "Pagamento processado! Uma profissional será atribuída.",
        paymentId: payment.id,
      });
    } catch (error) {
      console.error("Error processing domestic service payment:", error);
      res.status(500).json({ error: "Failed to process payment" });
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
      
      // Buscar dados do prestador se existir
      let provider = null;
      if (service.providerId) {
        const providerProfile = await storage.getUserProfile(service.providerId);
        const [providerUser] = await db.select().from(users).where(eq(users.id, service.providerId)).limit(1);
        if (providerProfile && providerUser) {
          provider = {
            id: providerProfile.userId,
            firstName: providerUser.firstName,
            lastName: providerUser.lastName,
            phone: providerProfile.phone,
            rating: providerProfile.rating,
            totalRatings: providerProfile.totalRatings,
            specialties: providerProfile.specialties,
          };
        }
      }

      res.json({
        service,
        aiDiagnosis,
        providerDiagnosis,
        acceptance,
        executionLog,
        escrow,
        provider,
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

  // ==================== TREINAMENTO DA IA ====================

  app.get("/api/admin/ai-training", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const configs = await storage.getAiTrainingConfigs();
      res.json(configs);
    } catch (error) {
      console.error("Error fetching AI training configs:", error);
      res.status(500).json({ error: "Failed to fetch AI training configs" });
    }
  });

  app.get("/api/admin/ai-training/:categoryId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId as string);
      const config = await storage.getAiTrainingConfigByCategory(categoryId);
      res.json(config || null);
    } catch (error) {
      console.error("Error fetching AI training config:", error);
      res.status(500).json({ error: "Failed to fetch AI training config" });
    }
  });

  app.put("/api/admin/ai-training/:categoryId", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId as string);
      if (isNaN(categoryId)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }
      const allowedFields = [
        "rules", "engineModel", "engineTemperature", "engineMaxTokens", "engineMaxQuestions",
        "tone", "greeting", "vocabulary", "conditionalQuestions", "exampleConversations",
        "forbiddenTopics", "pricingRules", "diagnosisTips", "isActive", "systemPromptOverride"
      ];
      const sanitized: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          sanitized[field] = req.body[field];
        }
      }
      const config = await storage.upsertAiTrainingConfig(categoryId, sanitized);
      res.json(config);
    } catch (error) {
      console.error("Error saving AI training config:", error);
      res.status(500).json({ error: "Failed to save AI training config" });
    }
  });

  app.delete("/api/admin/ai-training/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteAiTrainingConfig(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting AI training config:", error);
      res.status(500).json({ error: "Failed to delete AI training config" });
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

  // ==================== PREÇOS DE REFERÊNCIA (SINAPI/REGIONAL) ====================

  // Admin: Listar preços de referência
  app.get("/api/admin/reference-prices", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { categoryId, state, city, itemType } = req.query;
      const prices = await storage.getReferencePrices({
        categoryId: categoryId ? parseInt(categoryId as string) : undefined,
        state: state as string | undefined,
        city: city as string | undefined,
        itemType: itemType as string | undefined,
      });
      res.json(prices);
    } catch (error) {
      console.error("Error fetching reference prices:", error);
      res.status(500).json({ error: "Failed to fetch reference prices" });
    }
  });

  // Admin: Criar preço de referência
  app.post("/api/admin/reference-prices", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const price = await storage.createReferencePrice(req.body);
      res.json(price);
    } catch (error) {
      console.error("Error creating reference price:", error);
      res.status(500).json({ error: "Failed to create reference price" });
    }
  });

  // Admin: Atualizar preço de referência
  app.put("/api/admin/reference-prices/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const price = await storage.updateReferencePrice(id, req.body);
      res.json(price);
    } catch (error) {
      console.error("Error updating reference price:", error);
      res.status(500).json({ error: "Failed to update reference price" });
    }
  });

  // Admin: Deletar preço de referência
  app.delete("/api/admin/reference-prices/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteReferencePrice(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting reference price:", error);
      res.status(500).json({ error: "Failed to delete reference price" });
    }
  });

  // ==================== FORNECEDORES DE MATERIAIS ====================

  // Admin: Listar fornecedores de materiais
  app.get("/api/admin/material-suppliers", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { city, state } = req.query;
      const suppliers = await storage.getMaterialSuppliers({
        city: city as string | undefined,
        state: state as string | undefined,
      });
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching material suppliers:", error);
      res.status(500).json({ error: "Failed to fetch material suppliers" });
    }
  });

  // Admin: Criar fornecedor de materiais
  app.post("/api/admin/material-suppliers", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const supplier = await storage.createMaterialSupplier(req.body);
      res.json(supplier);
    } catch (error) {
      console.error("Error creating material supplier:", error);
      res.status(500).json({ error: "Failed to create material supplier" });
    }
  });

  // Admin: Atualizar fornecedor de materiais
  app.put("/api/admin/material-suppliers/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const supplier = await storage.updateMaterialSupplier(id, req.body);
      res.json(supplier);
    } catch (error) {
      console.error("Error updating material supplier:", error);
      res.status(500).json({ error: "Failed to update material supplier" });
    }
  });

  // Admin: Deletar fornecedor de materiais
  app.delete("/api/admin/material-suppliers/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      await storage.deleteMaterialSupplier(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting material supplier:", error);
      res.status(500).json({ error: "Failed to delete material supplier" });
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
  app.get("/api/user/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getUserProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Profile not found" });
      }
      res.json(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.patch("/api/user/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, phone, address, city } = req.body;
      
      const userUpdates: any = {};
      if (firstName !== undefined) userUpdates.firstName = firstName;
      if (lastName !== undefined) userUpdates.lastName = lastName;
      if (city !== undefined) userUpdates.city = city;
      if (phone !== undefined) userUpdates.phone = phone;
      
      if (city) {
        try {
          const { geocodeCity } = await import("./geocoding");
          const geoResult = await geocodeCity(city);
          if (geoResult) {
            userUpdates.latitude = geoResult.latitude.toFixed(7);
            userUpdates.longitude = geoResult.longitude.toFixed(7);
          }
        } catch (geoErr) {
          console.error("Geocoding on settings update failed (non-blocking):", geoErr);
        }
      }
      
      if (Object.keys(userUpdates).length > 0) {
        await db.update(users)
          .set(userUpdates)
          .where(eq(users.id, userId));
      }
      
      // Update userProfiles table (phone, address, city)
      const profileUpdates: any = {};
      if (phone !== undefined) profileUpdates.phone = phone;
      if (address !== undefined) profileUpdates.address = address;
      if (city !== undefined) profileUpdates.city = city;
      
      if (Object.keys(profileUpdates).length > 0) {
        await storage.updateUserProfile(userId, profileUpdates);
      }
      
      // Return updated user data
      const [updatedUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const updatedProfile = await storage.getUserProfile(userId);
      
      res.json({ 
        success: true, 
        user: updatedUser,
        profile: updatedProfile
      });
    } catch (error) {
      console.error("Error updating user settings:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

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

  app.get("/api/geocode/cep/:cep", async (req, res) => {
    try {
      const { geocodeCep } = await import("./geocoding");
      const result = await geocodeCep(req.params.cep);
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: "CEP não encontrado ou sem coordenadas" });
      }
    } catch (error) {
      console.error("Geocode CEP error:", error);
      res.status(500).json({ error: "Erro ao geocodificar CEP" });
    }
  });

  app.get("/api/geocode/city", async (req, res) => {
    try {
      const { city, state } = req.query;
      if (!city) {
        return res.status(400).json({ error: "Parâmetro city é obrigatório" });
      }
      const { geocodeCity } = await import("./geocoding");
      const result = await geocodeCity(city as string, state as string | undefined);
      if (result) {
        res.json(result);
      } else {
        res.status(404).json({ error: "Cidade não encontrada" });
      }
    } catch (error) {
      console.error("Geocode city error:", error);
      res.status(500).json({ error: "Erro ao geocodificar cidade" });
    }
  });

  // Update user location (latitude/longitude)
  app.patch("/api/user/location", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { latitude, longitude } = req.body;
      
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      await db.update(users)
        .set({ 
          latitude: latitude.toString(),
          longitude: longitude.toString()
        })
        .where(eq(users.id, userId));

      res.json({ success: true, latitude, longitude });
    } catch (error) {
      console.error("Error updating user location:", error);
      res.status(500).json({ error: "Failed to update location" });
    }
  });

  // ==================== NOTIFICAÇÕES ====================
  
  // Listar notificações do usuário
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notificationsList = await storage.getNotificationsByUser(userId);
      res.json(notificationsList);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Erro ao buscar notificações" });
    }
  });

  // Listar notificações não lidas
  app.get("/api/notifications/unread", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const unread = await storage.getUnreadNotifications(userId);
      res.json({ count: unread.length, notifications: unread });
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      res.status(500).json({ error: "Erro ao buscar notificações não lidas" });
    }
  });

  // Marcar notificação como lida
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const idParam = req.params.id;
      const id = parseInt(Array.isArray(idParam) ? idParam[0] : idParam);
      const updated = await storage.markNotificationAsRead(id);
      if (!updated) {
        return res.status(404).json({ error: "Notificação não encontrada" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Erro ao marcar notificação" });
    }
  });

  // Marcar todas como lidas
  app.patch("/api/notifications/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Erro ao marcar notificações" });
    }
  });

  // ==================== TWILIO (SECRETÁRIA DIGITAL IA) ====================
  
  // Iniciar chamada para prestador
  app.post("/api/twilio/call", isAuthenticated, async (req: any, res) => {
    try {
      const { serviceRequestId, providerId } = req.body;
      
      // Verificar se Twilio está configurado
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const phoneNumber = process.env.TWILIO_PHONE_NUMBER;
      
      if (!accountSid || !authToken || !phoneNumber) {
        return res.status(503).json({ 
          error: "Sistema de chamadas não configurado",
          message: "O serviço de chamadas está em implementação. O prestador receberá notificação no app.",
          twilioConfigured: false
        });
      }
      
      // Buscar dados do prestador
      const provider = await db.select().from(users).where(eq(users.id, providerId)).limit(1);
      if (!provider.length || !provider[0].phone) {
        return res.status(400).json({ error: "Telefone do prestador não cadastrado" });
      }
      
      // Buscar dados do serviço
      const service = await storage.getServiceById(serviceRequestId);
      if (!service) {
        return res.status(404).json({ error: "Serviço não encontrado" });
      }
      
      // Registrar chamada pendente
      const call = await storage.createTwilioCall({
        serviceRequestId,
        providerId,
        providerPhone: provider[0].phone,
        status: "pending"
      });
      
      // Aqui faria a chamada real via Twilio SDK
      // const twilio = require('twilio')(accountSid, authToken);
      // const twilioCall = await twilio.calls.create({ ... });
      
      res.json({
        success: true,
        callId: call.id,
        message: "Chamada iniciada - Aguardando resposta do prestador"
      });
    } catch (error) {
      console.error("Error initiating Twilio call:", error);
      res.status(500).json({ error: "Erro ao iniciar chamada" });
    }
  });

  // Webhook Twilio - Recebe status da chamada
  app.post("/api/twilio/webhook/status", async (req, res) => {
    try {
      const { CallSid, CallStatus, CallDuration } = req.body;
      
      const call = await storage.getTwilioCallBySid(CallSid);
      if (call) {
        let status: any = "pending";
        if (CallStatus === "completed") status = "completed";
        else if (CallStatus === "no-answer") status = "no_answer";
        else if (CallStatus === "busy") status = "busy";
        else if (CallStatus === "failed") status = "failed";
        else if (CallStatus === "in-progress") status = "in_progress";
        else if (CallStatus === "ringing") status = "calling";
        
        await storage.updateTwilioCall(call.id, {
          status,
          duration: CallDuration ? parseInt(CallDuration) : undefined,
          completedAt: CallStatus === "completed" ? new Date() : undefined
        });
      }
      
      res.status(200).send("OK");
    } catch (error) {
      console.error("Error processing Twilio webhook:", error);
      res.status(500).send("Error");
    }
  });

  // Webhook Twilio - TwiML para secretária digital IA
  app.post("/api/twilio/webhook/voice", async (req, res) => {
    try {
      const { CallSid } = req.body;
      
      const call = await storage.getTwilioCallBySid(CallSid);
      if (!call) {
        res.type("text/xml");
        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
          <Response><Say language="pt-BR">Desculpe, ocorreu um erro.</Say><Hangup/></Response>`);
      }
      
      // Buscar dados do serviço
      const service = await storage.getServiceById(call.serviceRequestId);
      const category = service?.categoryId ? await storage.getCategoryById(service.categoryId) : null;
      
      // Gerar saudação com Gemini
      const prompt = `Você é a secretária digital do Pereirão Express. Acabou de ligar para um prestador de serviços.
        
Dados do serviço:
- Categoria: ${category?.name || 'Serviço geral'}
- Descrição: ${service?.description || 'Serviço residencial'}
- Prioridade: ${service?.slaPriority || 'standard'}
- Valor estimado: R$ ${service?.estimatedPrice ? (Number(service.estimatedPrice) / 100).toFixed(2) : 'A combinar'}

Crie uma saudação breve e profissional em português brasileiro para o prestador. 
Pergunte se ele pode aceitar o serviço.
Máximo 3 frases.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      
      const greeting = response.text || "Olá! Aqui é a secretária digital do Pereirão Express. Temos um novo serviço para você. Pode aceitar?";
      
      // Atualizar com resposta da IA
      await storage.updateTwilioCall(call.id, {
        aiResponse: greeting,
        status: "in_progress"
      });
      
      // Retornar TwiML
      res.type("text/xml");
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say language="pt-BR" voice="Polly.Camila">${greeting}</Say>
          <Gather input="speech dtmf" timeout="10" numDigits="1" action="/api/twilio/webhook/gather">
            <Say language="pt-BR" voice="Polly.Camila">Pressione 1 para aceitar ou 2 para recusar.</Say>
          </Gather>
          <Say language="pt-BR" voice="Polly.Camila">Não recebi resposta. Até logo!</Say>
        </Response>`);
    } catch (error) {
      console.error("Error processing Twilio voice webhook:", error);
      res.type("text/xml");
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response><Say language="pt-BR">Desculpe, ocorreu um erro no sistema.</Say><Hangup/></Response>`);
    }
  });

  // Webhook Twilio - Processar resposta do prestador
  app.post("/api/twilio/webhook/gather", async (req, res) => {
    try {
      const { CallSid, Digits, SpeechResult } = req.body;
      
      const call = await storage.getTwilioCallBySid(CallSid);
      if (!call) {
        res.type("text/xml");
        return res.send(`<?xml version="1.0" encoding="UTF-8"?>
          <Response><Say language="pt-BR">Erro no sistema.</Say><Hangup/></Response>`);
      }
      
      let accepted = false;
      let responseText = "";
      
      // Verificar resposta por DTMF (tecla)
      if (Digits === "1") {
        accepted = true;
        responseText = "Pressinou 1 - Aceito";
      } else if (Digits === "2") {
        accepted = false;
        responseText = "Pressionou 2 - Recusado";
      } else if (SpeechResult) {
        // Usar Gemini para interpretar resposta de voz
        const interpretPrompt = `O prestador respondeu: "${SpeechResult}"
        
Analise se ele ACEITOU ou RECUSOU o serviço.
Responda apenas: "ACEITO" ou "RECUSADO"`;

        const interpretation = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: interpretPrompt
        });
        
        const answer = (interpretation.text || "").toUpperCase().trim();
        accepted = answer.includes("ACEITO");
        responseText = SpeechResult;
      }
      
      // Atualizar chamada com resposta
      await storage.updateTwilioCall(call.id, {
        status: accepted ? "accepted" : "rejected",
        providerResponse: responseText,
        completedAt: new Date()
      });
      
      // Atualizar serviço se aceito
      if (accepted) {
        await storage.updateService(call.serviceRequestId, {
          providerId: call.providerId,
          status: "provider_assigned"
        });
        
        // Criar notificação para o cliente
        const service = await storage.getServiceById(call.serviceRequestId);
        if (service) {
          await storage.createNotification({
            userId: service.clientId,
            type: "service_accepted",
            title: "Prestador confirmou!",
            message: "O profissional aceitou seu serviço e entrará em contato em breve.",
            data: JSON.stringify({ serviceId: call.serviceRequestId })
          });
        }
      }
      
      // Resposta final
      const finalMessage = accepted 
        ? "Perfeito! O serviço foi confirmado. O cliente será notificado. Obrigada!"
        : "Tudo bem, entendemos. Obrigada pelo seu tempo!";
      
      res.type("text/xml");
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say language="pt-BR" voice="Polly.Camila">${finalMessage}</Say>
          <Hangup/>
        </Response>`);
    } catch (error) {
      console.error("Error processing Twilio gather:", error);
      res.type("text/xml");
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response><Say language="pt-BR">Ocorreu um erro. Até logo!</Say><Hangup/></Response>`);
    }
  });

  // Status das chamadas de um serviço
  app.get("/api/twilio/calls/:serviceId", isAuthenticated, async (req: any, res) => {
    try {
      const serviceIdParam = req.params.serviceId;
      const serviceId = parseInt(Array.isArray(serviceIdParam) ? serviceIdParam[0] : serviceIdParam);
      const calls = await storage.getTwilioCallsByService(serviceId);
      res.json(calls);
    } catch (error) {
      console.error("Error fetching Twilio calls:", error);
      res.status(500).json({ error: "Erro ao buscar chamadas" });
    }
  });

  // ==================== PUSH NOTIFICATIONS ====================
  
  // Obter VAPID public key
  app.get("/api/push/vapid-public-key", (req, res) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return res.status(503).json({ 
        error: "Push notifications não configurado",
        configured: false
      });
    }
    res.json({ publicKey, configured: true });
  });

  // Registrar subscription de push
  app.post("/api/push/subscribe", isAuthenticated, async (req: any, res) => {
    try {
      const subscribeSchema = z.object({
        endpoint: z.string().url(),
        keys: z.object({
          p256dh: z.string().min(1),
          auth: z.string().min(1)
        })
      });
      
      const validation = subscribeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Dados de subscription inválidos" });
      }
      
      const userId = req.user.claims.sub;
      const { endpoint, keys } = validation.data;
      
      // Verificar se já existe
      const existing = await storage.getPushSubscriptionByEndpoint(endpoint);
      if (existing) {
        return res.json({ success: true, message: "Já registrado" });
      }
      
      await storage.createPushSubscription({
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: req.headers['user-agent'] || null
      });
      
      res.json({ success: true, message: "Notificações ativadas!" });
    } catch (error) {
      console.error("Error subscribing to push:", error);
      res.status(500).json({ error: "Erro ao ativar notificações" });
    }
  });

  // Remover subscription (usando POST para compatibilidade)
  app.post("/api/push/unsubscribe", isAuthenticated, async (req: any, res) => {
    try {
      const unsubscribeSchema = z.object({
        endpoint: z.string().url()
      });
      
      const validation = unsubscribeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: "Endpoint inválido" });
      }
      
      await storage.deletePushSubscription(validation.data.endpoint);
      res.json({ success: true, message: "Notificações desativadas" });
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      res.status(500).json({ error: "Erro ao desativar notificações" });
    }
  });

  // Enviar push notification (interno)
  app.post("/api/push/send", isAuthenticated, async (req: any, res) => {
    try {
      const { userId, title, body, url, serviceId, actions } = req.body;
      
      const publicKey = process.env.VAPID_PUBLIC_KEY;
      const privateKey = process.env.VAPID_PRIVATE_KEY;
      
      if (!publicKey || !privateKey) {
        return res.status(503).json({ error: "Push notifications não configurado" });
      }
      
      // Buscar subscriptions do usuário
      const subscriptions = await storage.getPushSubscriptionsByUser(userId);
      
      if (subscriptions.length === 0) {
        return res.json({ success: false, message: "Usuário não tem notificações ativadas" });
      }
      
      // Importar web-push dinamicamente
      const webpush = await import('web-push');
      webpush.setVapidDetails(
        'mailto:contato@pereirao.com.br',
        publicKey,
        privateKey
      );
      
      const payload = JSON.stringify({
        title,
        body,
        url,
        serviceId,
        actions,
        tag: `service-${serviceId || Date.now()}`
      });
      
      let sent = 0;
      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification({
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          }, payload);
          sent++;
        } catch (pushError: any) {
          console.error("Error sending push to endpoint:", pushError.message);
          // Se a subscription expirou, remover
          if (pushError.statusCode === 410) {
            await storage.deletePushSubscription(sub.endpoint);
          }
        }
      }
      
      res.json({ success: true, sent, total: subscriptions.length });
    } catch (error) {
      console.error("Error sending push notification:", error);
      res.status(500).json({ error: "Erro ao enviar notificação" });
    }
  });

  return httpServer;
}
