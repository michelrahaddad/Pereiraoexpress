import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Brain,
  Save,
  Loader2,
  Settings,
  MessageSquare,
  ShieldAlert,
  DollarSign,
  Lightbulb,
  BookOpen,
  Cpu,
  Languages,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  HelpCircle,
} from "lucide-react";
import type { ServiceCategory } from "@shared/schema";

interface AiTrainingConfig {
  id: number;
  categoryId: number;
  rules: string | null;
  engineModel: string | null;
  engineTemperature: string | null;
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
  createdAt: string | null;
  updatedAt: string | null;
}

interface ConditionalQuestion {
  keywords: string[];
  questions: string[];
}

interface ExampleConversation {
  userMessage: string;
  aiResponse: string;
}

interface PricingRule {
  item: string;
  basePrice: number;
  multiplier?: number;
  note?: string;
}

function safeParseJson<T>(val: string | null, fallback: T): T {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

export function AiTrainingManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ["/api/categories"],
  });

  const { data: allConfigs = [] } = useQuery<AiTrainingConfig[]>({
    queryKey: ["/api/admin/ai-training"],
  });

  const { data: currentConfig, isLoading: configLoading } = useQuery<AiTrainingConfig | null>({
    queryKey: ["/api/admin/ai-training", selectedCategoryId],
    enabled: !!selectedCategoryId,
  });

  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const configuredCategoryIds = allConfigs.map(c => c.categoryId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Treinamento da IA por Categoria
          </CardTitle>
          <CardDescription>
            Configure regras, motor, linguagem, perguntas condicionais, exemplos e precificação para cada categoria de serviço
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((cat) => {
              const hasConfig = configuredCategoryIds.includes(cat.id);
              return (
                <Button
                  key={cat.id}
                  variant={selectedCategoryId === cat.id ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  data-testid={`btn-category-${cat.id}`}
                >
                  {cat.name}
                  {hasConfig && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                  )}
                </Button>
              );
            })}
          </div>

          {selectedCategoryId && (
            <CategoryTrainingEditor
              key={selectedCategoryId}
              categoryId={selectedCategoryId}
              categoryName={categories.find(c => c.id === selectedCategoryId)?.name || ""}
              config={currentConfig}
              isLoading={configLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface EditorProps {
  categoryId: number;
  categoryName: string;
  config: AiTrainingConfig | null | undefined;
  isLoading: boolean;
}

function CategoryTrainingEditor({ categoryId, categoryName, config, isLoading }: EditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [rules, setRules] = useState<string[]>([]);
  const [engineModel, setEngineModel] = useState("gemini-2.5-flash");
  const [engineTemperature, setEngineTemperature] = useState("0.70");
  const [engineMaxTokens, setEngineMaxTokens] = useState(2048);
  const [engineMaxQuestions, setEngineMaxQuestions] = useState(3);
  const [tone, setTone] = useState("friendly");
  const [greeting, setGreeting] = useState("");
  const [vocabulary, setVocabulary] = useState<string[]>([]);
  const [conditionalQuestions, setConditionalQuestions] = useState<ConditionalQuestion[]>([]);
  const [exampleConversations, setExampleConversations] = useState<ExampleConversation[]>([]);
  const [forbiddenTopics, setForbiddenTopics] = useState<string[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [diagnosisTips, setDiagnosisTips] = useState<string[]>([]);
  const [systemPromptOverride, setSystemPromptOverride] = useState("");

  useEffect(() => {
    if (config) {
      setRules(safeParseJson(config.rules, []));
      setEngineModel(config.engineModel || "gemini-2.5-flash");
      setEngineTemperature(config.engineTemperature || "0.70");
      setEngineMaxTokens(config.engineMaxTokens || 2048);
      setEngineMaxQuestions(config.engineMaxQuestions || 3);
      setTone(config.tone || "friendly");
      setGreeting(config.greeting || "");
      setVocabulary(safeParseJson(config.vocabulary, []));
      setConditionalQuestions(safeParseJson(config.conditionalQuestions, []));
      setExampleConversations(safeParseJson(config.exampleConversations, []));
      setForbiddenTopics(safeParseJson(config.forbiddenTopics, []));
      setPricingRules(safeParseJson(config.pricingRules, []));
      setDiagnosisTips(safeParseJson(config.diagnosisTips, []));
      setSystemPromptOverride(config.systemPromptOverride || "");
    } else if (!isLoading) {
      setRules([]);
      setEngineModel("gemini-2.5-flash");
      setEngineTemperature("0.70");
      setEngineMaxTokens(2048);
      setEngineMaxQuestions(3);
      setTone("friendly");
      setGreeting("");
      setVocabulary([]);
      setConditionalQuestions([]);
      setExampleConversations([]);
      setForbiddenTopics([]);
      setPricingRules([]);
      setDiagnosisTips([]);
      setSystemPromptOverride("");
    }
  }, [config, isLoading]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PUT", `/api/admin/ai-training/${categoryId}`, {
        rules: JSON.stringify(rules),
        engineModel,
        engineTemperature,
        engineMaxTokens,
        engineMaxQuestions,
        tone,
        greeting,
        vocabulary: JSON.stringify(vocabulary),
        conditionalQuestions: JSON.stringify(conditionalQuestions),
        exampleConversations: JSON.stringify(exampleConversations),
        forbiddenTopics: JSON.stringify(forbiddenTopics),
        pricingRules: JSON.stringify(pricingRules),
        diagnosisTips: JSON.stringify(diagnosisTips),
        systemPromptOverride: systemPromptOverride || null,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-training"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-training", categoryId] });
      toast({ title: "Treinamento salvo!", description: `Configuração de ${categoryName} atualizada.` });
    },
    onError: () => {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{categoryName}</h3>
          {config ? (
            <Badge variant="default" className="bg-green-600">Configurado</Badge>
          ) : (
            <Badge variant="outline">Novo</Badge>
          )}
        </div>
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
          data-testid="btn-save-training"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Treinamento
        </Button>
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="rules" className="gap-1.5 text-xs" data-testid="tab-train-rules">
            <ShieldAlert className="h-3.5 w-3.5" />
            Regras
          </TabsTrigger>
          <TabsTrigger value="engine" className="gap-1.5 text-xs" data-testid="tab-train-engine">
            <Cpu className="h-3.5 w-3.5" />
            Motor
          </TabsTrigger>
          <TabsTrigger value="language" className="gap-1.5 text-xs" data-testid="tab-train-language">
            <Languages className="h-3.5 w-3.5" />
            Linguagem
          </TabsTrigger>
          <TabsTrigger value="questions" className="gap-1.5 text-xs" data-testid="tab-train-questions">
            <HelpCircle className="h-3.5 w-3.5" />
            Perguntas
          </TabsTrigger>
          <TabsTrigger value="examples" className="gap-1.5 text-xs" data-testid="tab-train-examples">
            <MessageSquare className="h-3.5 w-3.5" />
            Exemplos
          </TabsTrigger>
          <TabsTrigger value="forbidden" className="gap-1.5 text-xs" data-testid="tab-train-forbidden">
            <AlertTriangle className="h-3.5 w-3.5" />
            Proibidos
          </TabsTrigger>
          <TabsTrigger value="pricing" className="gap-1.5 text-xs" data-testid="tab-train-pricing">
            <DollarSign className="h-3.5 w-3.5" />
            Precios
          </TabsTrigger>
          <TabsTrigger value="tips" className="gap-1.5 text-xs" data-testid="tab-train-tips">
            <Lightbulb className="h-3.5 w-3.5" />
            Dicas
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-1.5 text-xs" data-testid="tab-train-advanced">
            <Settings className="h-3.5 w-3.5" />
            Avancado
          </TabsTrigger>
        </TabsList>

        {/* REGRAS */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" />
                Regras de Comportamento
              </CardTitle>
              <CardDescription>
                Regras que a IA deve seguir ao atender esta categoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StringListEditor
                items={rules}
                onChange={setRules}
                placeholder="Ex: Sempre perguntar sobre o disjuntor em problemas elétricos"
                label="Nova regra"
                testIdPrefix="rule"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* MOTOR */}
        <TabsContent value="engine" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                Configuracao do Motor IA
              </CardTitle>
              <CardDescription>
                Modelo, temperatura, limites de tokens e perguntas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Modelo</Label>
                  <Select value={engineModel} onValueChange={setEngineModel}>
                    <SelectTrigger data-testid="select-engine-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (rapido)</SelectItem>
                      <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (avancado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Temperatura ({engineTemperature})</Label>
                  <Input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={engineTemperature}
                    onChange={(e) => setEngineTemperature(e.target.value)}
                    data-testid="input-temperature"
                  />
                  <p className="text-xs text-muted-foreground">
                    0 = preciso e previsivel | 1 = criativo e variado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Max Tokens</Label>
                  <Input
                    type="number"
                    value={engineMaxTokens}
                    onChange={(e) => setEngineMaxTokens(parseInt(e.target.value) || 2048)}
                    data-testid="input-max-tokens"
                  />
                  <p className="text-xs text-muted-foreground">Limite de tamanho da resposta</p>
                </div>

                <div className="space-y-2">
                  <Label>Max Perguntas antes do diagnostico</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={engineMaxQuestions}
                    onChange={(e) => setEngineMaxQuestions(parseInt(e.target.value) || 3)}
                    data-testid="input-max-questions"
                  />
                  <p className="text-xs text-muted-foreground">Quantas perguntas a IA faz antes de dar o diagnostico</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LINGUAGEM */}
        <TabsContent value="language" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Linguagem e Tom
              </CardTitle>
              <CardDescription>
                Como a IA deve se comunicar com o cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tom da conversa</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger data-testid="select-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Amigavel e direto</SelectItem>
                    <SelectItem value="professional">Profissional e tecnico</SelectItem>
                    <SelectItem value="casual">Casual e descontraido</SelectItem>
                    <SelectItem value="empathetic">Empatico e acolhedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Saudacao inicial</Label>
                <Textarea
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  placeholder="Ex: Oi! Me conta o que está acontecendo com a parte elétrica da sua casa?"
                  rows={2}
                  data-testid="input-greeting"
                />
                <p className="text-xs text-muted-foreground">Primeira mensagem da IA quando o cliente comecar a conversa nesta categoria</p>
              </div>

              <div className="space-y-2">
                <Label>Vocabulario especifico</Label>
                <StringListEditor
                  items={vocabulary}
                  onChange={setVocabulary}
                  placeholder="Ex: Use 'disjuntor' ao invés de 'chave geral'"
                  label="Termo/instrucao"
                  testIdPrefix="vocab"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERGUNTAS CONDICIONAIS */}
        <TabsContent value="questions" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Perguntas Condicionais
              </CardTitle>
              <CardDescription>
                Quando o cliente mencionar certas palavras, a IA faz perguntas especificas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConditionalQuestionsEditor
                items={conditionalQuestions}
                onChange={setConditionalQuestions}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* EXEMPLOS */}
        <TabsContent value="examples" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Exemplos de Conversa
              </CardTitle>
              <CardDescription>
                Pares de mensagem/resposta para a IA aprender o estilo correto
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExampleConversationsEditor
                items={exampleConversations}
                onChange={setExampleConversations}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TOPICOS PROIBIDOS */}
        <TabsContent value="forbidden" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Topicos Proibidos
              </CardTitle>
              <CardDescription>
                Coisas que a IA NAO deve dizer ou fazer nesta categoria
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StringListEditor
                items={forbiddenTopics}
                onChange={setForbiddenTopics}
                placeholder="Ex: Nunca sugerir que o cliente mexa na fiação sozinho"
                label="Topico proibido"
                testIdPrefix="forbidden"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRECIFICACAO */}
        <TabsContent value="pricing" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Regras de Precificacao
              </CardTitle>
              <CardDescription>
                Tabela de precos base para a IA calcular estimativas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PricingRulesEditor
                items={pricingRules}
                onChange={setPricingRules}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* DICAS */}
        <TabsContent value="tips" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Dicas de Diagnostico
              </CardTitle>
              <CardDescription>
                Dicas tecnicas para a IA fazer diagnosticos melhores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StringListEditor
                items={diagnosisTips}
                onChange={setDiagnosisTips}
                placeholder="Ex: Vazamento com água suja geralmente indica problema no esgoto"
                label="Dica"
                testIdPrefix="tip"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* AVANCADO */}
        <TabsContent value="advanced" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Prompt Personalizado (Avancado)
              </CardTitle>
              <CardDescription>
                Substitui o prompt padrao da IA para esta categoria. Use com cuidado!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={systemPromptOverride}
                onChange={(e) => setSystemPromptOverride(e.target.value)}
                placeholder="Deixe vazio para usar o prompt padrão do sistema. Só preencha se quiser um prompt completamente diferente para esta categoria."
                rows={10}
                className="font-mono text-sm"
                data-testid="input-system-prompt"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Se preenchido, substitui todas as regras acima para esta categoria
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end pt-4 border-t">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
          data-testid="btn-save-training-bottom"
        >
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Treinamento de {categoryName}
        </Button>
      </div>
    </div>
  );
}

// ===== SUBCOMPONENTS =====

function StringListEditor({
  items,
  onChange,
  placeholder,
  label,
  testIdPrefix,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  label: string;
  testIdPrefix: string;
}) {
  const [newItem, setNewItem] = useState("");

  const addItem = () => {
    if (!newItem.trim()) return;
    onChange([...items, newItem.trim()]);
    setNewItem("");
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-start">
          <Badge variant="outline" className="mt-1.5 shrink-0 text-xs">{index + 1}</Badge>
          <Textarea
            value={item}
            onChange={(e) => updateItem(index, e.target.value)}
            rows={1}
            className="flex-1 text-sm min-h-[36px] resize-y"
            data-testid={`${testIdPrefix}-item-${index}`}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeItem(index)}
            data-testid={`${testIdPrefix}-remove-${index}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addItem())}
          data-testid={`${testIdPrefix}-new-input`}
        />
        <Button variant="outline" onClick={addItem} className="gap-1 shrink-0" data-testid={`${testIdPrefix}-add-btn`}>
          <Plus className="h-4 w-4" />
          {label}
        </Button>
      </div>
    </div>
  );
}

function ConditionalQuestionsEditor({
  items,
  onChange,
}: {
  items: ConditionalQuestion[];
  onChange: (items: ConditionalQuestion[]) => void;
}) {
  const addGroup = () => {
    onChange([...items, { keywords: [], questions: [] }]);
  };

  const removeGroup = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateKeywords = (index: number, val: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], keywords: val.split(",").map(k => k.trim()).filter(Boolean) };
    onChange(updated);
  };

  const updateQuestions = (index: number, qIndex: number, val: string) => {
    const updated = [...items];
    const qs = [...updated[index].questions];
    qs[qIndex] = val;
    updated[index] = { ...updated[index], questions: qs };
    onChange(updated);
  };

  const addQuestion = (index: number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], questions: [...updated[index].questions, ""] };
    onChange(updated);
  };

  const removeQuestion = (groupIndex: number, qIndex: number) => {
    const updated = [...items];
    updated[groupIndex] = {
      ...updated[groupIndex],
      questions: updated[groupIndex].questions.filter((_, i) => i !== qIndex),
    };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {items.map((group, gIndex) => (
        <Card key={gIndex} className="bg-muted/30">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">Grupo {gIndex + 1}</Label>
              <Button variant="ghost" size="icon" onClick={() => removeGroup(gIndex)} data-testid={`cq-remove-group-${gIndex}`}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Palavras-chave (separadas por virgula)</Label>
              <Input
                value={group.keywords.join(", ")}
                onChange={(e) => updateKeywords(gIndex, e.target.value)}
                placeholder="Ex: vazamento, vazando, goteira, água"
                data-testid={`cq-keywords-${gIndex}`}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Perguntas que a IA deve fazer</Label>
              {group.questions.map((q, qIndex) => (
                <div key={qIndex} className="flex gap-2">
                  <Input
                    value={q}
                    onChange={(e) => updateQuestions(gIndex, qIndex, e.target.value)}
                    placeholder="Ex: A água sai com força ou só goteja?"
                    className="flex-1"
                    data-testid={`cq-question-${gIndex}-${qIndex}`}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeQuestion(gIndex, qIndex)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addQuestion(gIndex)} className="gap-1" data-testid={`cq-add-question-${gIndex}`}>
                <Plus className="h-3.5 w-3.5" />
                Pergunta
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" onClick={addGroup} className="gap-1 w-full" data-testid="cq-add-group">
        <Plus className="h-4 w-4" />
        Adicionar grupo de perguntas
      </Button>
    </div>
  );
}

function ExampleConversationsEditor({
  items,
  onChange,
}: {
  items: ExampleConversation[];
  onChange: (items: ExampleConversation[]) => void;
}) {
  const addExample = () => {
    onChange([...items, { userMessage: "", aiResponse: "" }]);
  };

  const removeExample = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateExample = (index: number, field: "userMessage" | "aiResponse", val: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {items.map((ex, index) => (
        <Card key={index} className="bg-muted/30">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">Exemplo {index + 1}</Label>
              <Button variant="ghost" size="icon" onClick={() => removeExample(index)} data-testid={`ex-remove-${index}`}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Cliente diz:</Label>
              <Textarea
                value={ex.userMessage}
                onChange={(e) => updateExample(index, "userMessage", e.target.value)}
                placeholder="Ex: Minha torneira tá pingando"
                rows={1}
                className="min-h-[36px] resize-y"
                data-testid={`ex-user-${index}`}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">IA responde:</Label>
              <Textarea
                value={ex.aiResponse}
                onChange={(e) => updateExample(index, "aiResponse", e.target.value)}
                placeholder="Ex: Entendi! É torneira de banheiro ou cozinha? Ela pinga o tempo todo ou só quando fecha?"
                rows={2}
                className="min-h-[36px] resize-y"
                data-testid={`ex-ai-${index}`}
              />
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" onClick={addExample} className="gap-1 w-full" data-testid="ex-add">
        <Plus className="h-4 w-4" />
        Adicionar exemplo de conversa
      </Button>
    </div>
  );
}

function PricingRulesEditor({
  items,
  onChange,
}: {
  items: PricingRule[];
  onChange: (items: PricingRule[]) => void;
}) {
  const addRule = () => {
    onChange([...items, { item: "", basePrice: 0, note: "" }]);
  };

  const removeRule = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, field: keyof PricingRule, val: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <div className="grid grid-cols-[1fr_100px_100px_1fr_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
          <span>Item/Servico</span>
          <span>Preco Base (R$)</span>
          <span>Multiplicador</span>
          <span>Observacao</span>
          <span></span>
        </div>
      )}
      {items.map((rule, index) => (
        <div key={index} className="grid grid-cols-[1fr_100px_100px_1fr_40px] gap-2 items-start">
          <Input
            value={rule.item}
            onChange={(e) => updateRule(index, "item", e.target.value)}
            placeholder="Ex: Troca de torneira"
            data-testid={`price-item-${index}`}
          />
          <Input
            type="number"
            value={rule.basePrice || ""}
            onChange={(e) => updateRule(index, "basePrice", parseFloat(e.target.value) || 0)}
            placeholder="150"
            data-testid={`price-value-${index}`}
          />
          <Input
            value={rule.multiplier || ""}
            onChange={(e) => updateRule(index, "multiplier", parseFloat(e.target.value) || 1)}
            placeholder="1.0"
            data-testid={`price-mult-${index}`}
          />
          <Input
            value={rule.note || ""}
            onChange={(e) => updateRule(index, "note", e.target.value)}
            placeholder="Ex: Inclui material"
            data-testid={`price-note-${index}`}
          />
          <Button variant="ghost" size="icon" onClick={() => removeRule(index)} data-testid={`price-remove-${index}`}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
      <Button variant="outline" onClick={addRule} className="gap-1 w-full" data-testid="price-add">
        <Plus className="h-4 w-4" />
        Adicionar regra de preco
      </Button>
    </div>
  );
}
