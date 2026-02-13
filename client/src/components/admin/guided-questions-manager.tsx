import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  HelpCircle,
  Plus,
  Trash2,
  Save,
  Loader2,
  GripVertical,
  Pencil,
  X,
  Sparkles,
} from "lucide-react";
import type { ServiceCategory } from "@shared/schema";

interface GuidedQuestion {
  id: number;
  categoryId: number | null;
  questionType: string;
  questionKey: string;
  questionText: string;
  options: string[];
  sortOrder: number;
  isActive: boolean | null;
  createdAt: string | null;
}

const CATEGORY_NAMES: Record<number, string> = {
  1: "Encanamento",
  2: "Elétrica",
  3: "Pintura",
  4: "Marcenaria",
  5: "Ar Condicionado",
  6: "Limpeza",
  7: "Passadeira",
  8: "Chaveiro",
  9: "Portões",
};

export function GuidedQuestionsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("repair");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    questionKey: "",
    questionText: "",
    options: [""],
    questionType: "repair",
    categoryId: "",
    sortOrder: 0,
    isActive: true,
  });

  const { data: questions = [], isLoading } = useQuery<GuidedQuestion[]>({
    queryKey: ["/api/admin/guided-questions"],
  });

  const { data: categories = [] } = useQuery<ServiceCategory[]>({
    queryKey: ["/api/categories"],
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/guided-questions/seed"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guided-questions"] });
      toast({ title: "Perguntas padrão criadas com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao criar perguntas padrão", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/guided-questions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guided-questions"] });
      toast({ title: "Pergunta criada com sucesso" });
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao criar pergunta", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PUT", `/api/admin/guided-questions/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guided-questions"] });
      toast({ title: "Pergunta atualizada com sucesso" });
      setEditingId(null);
      resetForm();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar pergunta", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/guided-questions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guided-questions"] });
      toast({ title: "Pergunta removida" });
    },
    onError: () => {
      toast({ title: "Erro ao remover pergunta", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      questionKey: "",
      questionText: "",
      options: [""],
      questionType: activeTab,
      categoryId: "",
      sortOrder: 0,
      isActive: true,
    });
    setShowAddForm(false);
    setEditingId(null);
  };

  const startEdit = (q: GuidedQuestion) => {
    setEditingId(q.id);
    setFormData({
      questionKey: q.questionKey,
      questionText: q.questionText,
      options: q.options.length > 0 ? q.options : [""],
      questionType: q.questionType,
      categoryId: q.categoryId ? String(q.categoryId) : "",
      sortOrder: q.sortOrder,
      isActive: q.isActive !== false,
    });
    setShowAddForm(true);
  };

  const handleSave = () => {
    if (!formData.questionKey || !formData.questionText || formData.options.filter(o => o.trim()).length === 0) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    const payload = {
      questionKey: formData.questionKey,
      questionText: formData.questionText,
      options: formData.options.filter(o => o.trim()),
      questionType: formData.questionType,
      categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
      sortOrder: formData.sortOrder,
      isActive: formData.isActive,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const addOption = () => {
    setFormData(prev => ({ ...prev, options: [...prev.options, ""] }));
  };

  const removeOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const updateOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((o, i) => (i === index ? value : o)),
    }));
  };

  const repairQuestions = questions.filter(q => q.questionType === "repair");
  const domesticQuestions = questions.filter(q => q.questionType === "domestic");

  const currentQuestions = activeTab === "repair" ? repairQuestions : domesticQuestions;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold" data-testid="text-guided-questions-title">Perguntas Guiadas</h2>
          <p className="text-muted-foreground text-sm">
            Gerencie as perguntas que aparecem no fluxo: Taxa &gt; Perguntas &gt; Chat IA &gt; Diagn&oacute;stico
          </p>
        </div>
        {questions.length === 0 && (
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            data-testid="button-seed-questions"
          >
            {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Criar Perguntas Padr&atilde;o
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); resetForm(); }}>
        <TabsList>
          <TabsTrigger value="repair" data-testid="tab-repair">
            Reparos ({repairQuestions.length})
          </TabsTrigger>
          <TabsTrigger value="domestic" data-testid="tab-domestic">
            Dom&eacute;sticos ({domesticQuestions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                resetForm();
                setFormData(prev => ({ ...prev, questionType: activeTab, sortOrder: currentQuestions.length + 1 }));
                setShowAddForm(true);
              }}
              data-testid="button-add-question"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Pergunta
            </Button>
          </div>

          {showAddForm && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">
                  {editingId ? "Editar Pergunta" : "Nova Pergunta"}
                </CardTitle>
                <CardDescription>
                  {activeTab === "repair"
                    ? "Pergunta para o fluxo de reparos"
                    : "Pergunta para o fluxo de servi\u00e7os dom\u00e9sticos"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Chave (identificador)</Label>
                    <Input
                      value={formData.questionKey}
                      onChange={(e) => setFormData(prev => ({ ...prev, questionKey: e.target.value }))}
                      placeholder="ex: problem_type, urgency"
                      data-testid="input-question-key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ordem</Label>
                    <Input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                      data-testid="input-sort-order"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Pergunta</Label>
                  <Input
                    value={formData.questionText}
                    onChange={(e) => setFormData(prev => ({ ...prev, questionText: e.target.value }))}
                    placeholder="Ex: Qual tipo de problema voc\u00ea est\u00e1 enfrentando?"
                    data-testid="input-question-text"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Categoria (opcional)</Label>
                    <Select
                      value={formData.categoryId || "all"}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, categoryId: v === "all" ? "" : v }))}
                    >
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Todas as categorias" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {Object.entries(CATEGORY_NAMES).map(([id, name]) => (
                          <SelectItem key={id} value={id}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(v) => setFormData(prev => ({ ...prev, isActive: v }))}
                      data-testid="switch-active"
                    />
                    <Label>Ativa</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Op&ccedil;&otilde;es de Resposta</Label>
                  <div className="space-y-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Input
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Op\u00e7\u00e3o ${index + 1}`}
                          data-testid={`input-option-${index}`}
                        />
                        {formData.options.length > 1 && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => removeOption(index)}
                            data-testid={`button-remove-option-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={addOption} data-testid="button-add-option">
                    <Plus className="h-3 w-3 mr-1" />
                    Adicionar Op&ccedil;&atilde;o
                  </Button>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={resetForm} data-testid="button-cancel-form">
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-save-question"
                  >
                    {(createMutation.isPending || updateMutation.isPending) ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {editingId ? "Atualizar" : "Salvar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentQuestions.length === 0 && !showAddForm ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma pergunta cadastrada</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Clique em "Criar Perguntas Padr&atilde;o" para gerar as perguntas iniciais, ou adicione manualmente.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {currentQuestions
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((q) => (
                  <Card key={q.id} className={q.isActive === false ? "opacity-60" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <Badge variant="outline" className="shrink-0">
                              #{q.sortOrder}
                            </Badge>
                            <Badge variant="secondary" className="shrink-0">
                              {q.questionKey}
                            </Badge>
                            {q.categoryId && (
                              <Badge className="shrink-0">
                                {CATEGORY_NAMES[q.categoryId] || `Cat ${q.categoryId}`}
                              </Badge>
                            )}
                            {q.isActive === false && (
                              <Badge variant="destructive" className="shrink-0">
                                Inativa
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-sm mt-2" data-testid={`text-question-${q.id}`}>
                            {q.questionText}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {q.options.map((opt, i) => (
                              <Badge key={i} variant="outline" className="text-xs no-default-active-elevate">
                                {opt}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => startEdit(q)}
                            data-testid={`button-edit-question-${q.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Deseja remover esta pergunta?")) {
                                deleteMutation.mutate(q.id);
                              }
                            }}
                            data-testid={`button-delete-question-${q.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
