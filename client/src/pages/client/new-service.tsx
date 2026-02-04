import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { PaymentModal } from "@/components/payment-modal";
import { Progress } from "@/components/ui/progress";
import { 
  Send, 
  Image as ImageIcon, 
  Sparkles, 
  User,
  Loader2,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap,
  AlertTriangle,
  X,
  Mic,
  MicOff,
  FileText,
  CreditCard,
  Shield
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

interface GuidedAnswer {
  question: string;
  answer: string;
}

interface AIDiagnosisResult {
  id: number;
  classification: string;
  urgencyLevel: string;
  estimatedDuration: string;
  materialsSuggested: string[];
  priceRangeMin: number;
  priceRangeMax: number;
  diagnosisFee: number;
  aiResponse: string;
}

interface ServiceWithDiagnosis {
  service: { id: number; title: string };
  aiDiagnosis: AIDiagnosisResult;
  diagnosisFee: number;
}

const GUIDED_QUESTIONS = [
  {
    id: "problem_type",
    question: "Qual tipo de problema você está enfrentando?",
    options: ["Elétrica", "Hidráulica", "Pintura", "Reforma", "Ar condicionado", "Passadeira", "Outro"]
  },
  {
    id: "urgency",
    question: "Qual a urgência do problema?",
    options: ["Não é urgente", "Preciso resolver esta semana", "Preciso resolver hoje", "É emergência!"]
  },
  {
    id: "location",
    question: "Onde está o problema?",
    options: ["Sala", "Quarto", "Cozinha", "Banheiro", "Área externa", "Outro"]
  }
];

function cleanMessageContent(content: string): string {
  return content.replace(/###DIAGNOSIS###[\s\S]*?###END_DIAGNOSIS###/g, '').trim();
}

export default function NewService() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState<"guided" | "chat" | "diagnosis" | "payment">("guided");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [guidedAnswers, setGuidedAnswers] = useState<GuidedAnswer[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Agora me conte mais detalhes sobre o problema. Quanto mais informações, melhor será meu diagnóstico!"
    }
  ]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [aiDiagnosis, setAiDiagnosis] = useState<ServiceWithDiagnosis | null>(null);
  const [selectedSLA, setSelectedSLA] = useState<"standard" | "express" | "urgent" | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<"fee" | "service">("fee");
  const [feePaid, setFeePaid] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const createAIDiagnosisMutation = useMutation({
    mutationFn: async (data: { 
      description: string; 
      guidedAnswers: GuidedAnswer[]; 
      mediaUrls: string[];
      title: string;
    }): Promise<ServiceWithDiagnosis> => {
      const response = await apiRequest("POST", "/api/diagnosis/ai", data);
      return response.json();
    },
    onSuccess: (data) => {
      setAiDiagnosis(data);
      setStep("diagnosis");
      toast({
        title: "Diagnóstico IA concluído!",
        description: "Analise o resultado e pague a taxa para continuar.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível gerar o diagnóstico. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const payDiagnosisFeeMutation = useMutation({
    mutationFn: async (data: { serviceId: number; method: string }) => {
      const response = await apiRequest("POST", `/api/diagnosis/pay-fee/${data.serviceId}`, {
        method: data.method
      });
      return response;
    },
    onSuccess: () => {
      setFeePaid(true);
      toast({
        title: "Taxa paga!",
        description: "Agora estamos buscando profissionais na sua região.",
      });
      setTimeout(() => {
        setLocation("/client");
      }, 2000);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível processar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const userMessageCount = messages.filter(m => m.role === "user").length;
    if (userMessageCount >= 3 && !isStreaming && !createAIDiagnosisMutation.isPending && step === "chat") {
      const description = messages
        .filter(m => m.role === "user")
        .map(m => m.content)
        .join("\n");
      
      const contextSummary = guidedAnswers.map(a => `${a.question}: ${a.answer}`).join(". ");
      const title = `${guidedAnswers[0]?.answer || "Serviço"} - ${guidedAnswers[2]?.answer || "Geral"}`;

      createAIDiagnosisMutation.mutate({
        description: `${contextSummary}\n\nDetalhes: ${description}`,
        guidedAnswers,
        mediaUrls: selectedPhotos,
        title,
      });
    }
  }, [messages, isStreaming]);

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-6 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso necessário</h1>
          <p className="text-muted-foreground mb-6">Faça login para solicitar um serviço</p>
          <Button asChild className="rounded-xl">
            <a href="/login/cliente">Fazer login</a>
          </Button>
        </div>
      </div>
    );
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (step === "guided") {
            setSelectedPhotos(prev => [...prev, reader.result as string]);
          } else {
            setSelectedImage(reader.result as string);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleGuidedAnswer = (answer: string) => {
    const question = GUIDED_QUESTIONS[currentQuestion];
    setGuidedAnswers(prev => [...prev, { question: question.question, answer }]);
    
    if (currentQuestion < GUIDED_QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      setStep("chat");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() && !selectedImage) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      imageUrl: selectedImage || undefined,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setSelectedImage(null);
    setIsStreaming(true);

    try {
      const response = await fetch("/api/ai/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          imageBase64: selectedImage,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
          guidedContext: guidedAnswers,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      };
      setMessages(prev => [...prev, assistantMessage]);

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                assistantMessage.content += data.content;
                setMessages(prev => 
                  prev.map(m => m.id === assistantMessage.id ? { ...m, content: assistantMessage.content } : m)
                );
              }
              if (data.done) {
                setIsStreaming(false);
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
      setIsStreaming(false);
    }
  };

  const handleGenerateDiagnosis = () => {
    const description = messages
      .filter(m => m.role === "user")
      .map(m => m.content)
      .join("\n");
    
    const contextSummary = guidedAnswers.map(a => `${a.question}: ${a.answer}`).join(". ");
    const title = `${guidedAnswers[0]?.answer || "Serviço"} - ${guidedAnswers[2]?.answer || "Geral"}`;

    createAIDiagnosisMutation.mutate({
      description: `${contextSummary}\n\nDetalhes: ${description}`,
      guidedAnswers,
      mediaUrls: selectedPhotos,
      title,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startVoiceRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: "Não suportado",
        description: "Seu navegador não suporta reconhecimento de voz. Tente usar Chrome ou Edge.",
        variant: "destructive",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setInput(prev => {
          const needsSpace = prev.length > 0 && !prev.endsWith(" ");
          return prev + (needsSpace ? " " : "") + finalTranscript.trim();
        });
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      if (event.error === "not-allowed") {
        toast({
          title: "Permissão negada",
          description: "Permita o acesso ao microfone para usar o reconhecimento de voz.",
          variant: "destructive",
        });
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleVoiceRecording = () => {
    if (isRecording) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  const handlePayFee = () => {
    setPaymentType("fee");
    setShowPaymentModal(true);
  };

  const handleFeePaymentComplete = (paymentId: number) => {
    setShowPaymentModal(false);
    if (aiDiagnosis) {
      payDiagnosisFeeMutation.mutate({
        serviceId: aiDiagnosis.service.id,
        method: "pix"
      });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progressValue = step === "guided" 
    ? ((currentQuestion + 1) / GUIDED_QUESTIONS.length) * 33
    : step === "chat" 
    ? 66 
    : step === "diagnosis"
    ? 85
    : 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-3 p-4 border-b">
          <Button variant="ghost" size="icon" asChild>
            <a href="/client">
              <ArrowLeft className="h-5 w-5" />
            </a>
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">Novo serviço</h1>
            <p className="text-sm text-muted-foreground">
              {step === "guided" && "Responda algumas perguntas rápidas"}
              {step === "chat" && "Descreva mais detalhes do problema"}
              {step === "diagnosis" && "Análise do diagnóstico"}
              {step === "payment" && "Pagamento"}
            </p>
          </div>
        </div>

        <div className="px-4 pt-3">
          <Progress value={progressValue} className="h-2" />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>Perguntas</span>
            <span>Chat</span>
            <span>Diagnóstico</span>
          </div>
        </div>

        {step === "guided" && (
          <div className="flex-1 p-4 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-medium">Passo {currentQuestion + 1} de {GUIDED_QUESTIONS.length}</span>
                </div>
                <CardTitle className="text-xl mt-2">
                  {GUIDED_QUESTIONS[currentQuestion].question}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="grid gap-3">
                  {GUIDED_QUESTIONS[currentQuestion].options.map((option) => (
                    <Button
                      key={option}
                      variant="outline"
                      className="justify-start h-auto py-4 px-4 text-left"
                      onClick={() => handleGuidedAnswer(option)}
                      data-testid={`button-option-${option.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      {option}
                    </Button>
                  ))}
                </div>

                {currentQuestion === GUIDED_QUESTIONS.length - 1 && (
                  <div className="mt-6">
                    <p className="text-sm font-medium mb-3">Adicione fotos do problema (opcional)</p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full"
                      data-testid="button-add-photos"
                    >
                      <ImageIcon className="h-5 w-5 mr-2" />
                      Adicionar fotos
                    </Button>
                    {selectedPhotos.length > 0 && (
                      <div className="flex gap-2 mt-3 flex-wrap">
                        {selectedPhotos.map((photo, i) => (
                          <div key={i} className="relative">
                            <img src={photo} alt={`Foto ${i+1}`} className="h-16 w-16 object-cover rounded-lg" />
                            <button 
                              onClick={() => setSelectedPhotos(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {step === "chat" && (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-3">
                    <p className="text-sm font-medium mb-2">Suas respostas:</p>
                    <div className="flex flex-wrap gap-2">
                      {guidedAnswers.map((a, i) => (
                        <Badge key={i} variant="secondary">{a.answer}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                      message.role === "user" ? "bg-primary" : "bg-muted"
                    }`}>
                      {message.role === "user" ? (
                        <User className="h-4 w-4 text-primary-foreground" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className={`flex flex-col gap-2 max-w-[80%] ${message.role === "user" ? "items-end" : ""}`}>
                      {message.imageUrl && (
                        <img 
                          src={message.imageUrl} 
                          alt="Uploaded" 
                          className="max-w-[200px] rounded-lg"
                        />
                      )}
                      <div className={`rounded-lg px-4 py-2 ${
                        message.role === "user" 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted"
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{cleanMessageContent(message.content)}</p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isStreaming && (
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t p-4 space-y-3">
              {createAIDiagnosisMutation.isPending && (
                <div className="flex items-center justify-center gap-2 py-2 text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">Gerando diagnóstico...</span>
                </div>
              )}

              {selectedImage && (
                <div className="relative inline-block">
                  <img src={selectedImage} alt="Preview" className="h-20 rounded-lg" />
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isStreaming}
                  data-testid="button-upload-image"
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>
                
                <Button
                  variant={isRecording ? "destructive" : "outline"}
                  size="icon"
                  onClick={toggleVoiceRecording}
                  disabled={isStreaming}
                  data-testid="button-voice-record"
                  title={isRecording ? "Parar gravação" : "Gravar áudio"}
                >
                  {isRecording ? (
                    <MicOff className="h-5 w-5 animate-pulse" />
                  ) : (
                    <Mic className="h-5 w-5" />
                  )}
                </Button>
                
                <Textarea
                  placeholder="Descreva o problema..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  disabled={isStreaming}
                  className="min-h-[44px] max-h-32 resize-none"
                  rows={1}
                  data-testid="input-message"
                />
                
                <Button
                  onClick={sendMessage}
                  disabled={isStreaming || (!input.trim() && !selectedImage)}
                  data-testid="button-send"
                >
                  {isStreaming ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "diagnosis" && aiDiagnosis && (
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <CardTitle>Diagnóstico IA</CardTitle>
                  </div>
                  <CardDescription>
                    Análise automática do seu problema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Classificação</p>
                      <p className="font-medium">{aiDiagnosis.aiDiagnosis.classification}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Urgência</p>
                      <Badge variant={
                        aiDiagnosis.aiDiagnosis.urgencyLevel === "urgente" ? "destructive" :
                        aiDiagnosis.aiDiagnosis.urgencyLevel === "alta" ? "default" : "secondary"
                      }>
                        {aiDiagnosis.aiDiagnosis.urgencyLevel}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Análise:</p>
                    <p className="text-sm text-muted-foreground">{aiDiagnosis.aiDiagnosis.aiResponse}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Tempo estimado</p>
                      <p className="font-medium">{aiDiagnosis.aiDiagnosis.estimatedDuration}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Faixa de preço</p>
                      <p className="font-medium">
                        R$ {(aiDiagnosis.aiDiagnosis.priceRangeMin / 100).toFixed(0)} - R$ {(aiDiagnosis.aiDiagnosis.priceRangeMax / 100).toFixed(0)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <CardTitle>Taxa de Diagnóstico</CardTitle>
                  </div>
                  <CardDescription>
                    Pague a taxa para buscarmos profissionais qualificados na sua região
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-2xl font-bold text-primary">
                        R$ {(aiDiagnosis.diagnosisFee / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        15% do valor mínimo estimado
                      </p>
                    </div>
                    <Shield className="h-10 w-10 text-primary/30" />
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground mb-4">
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Acesso a profissionais verificados
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Orçamento detalhado presencial
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Garantia de atendimento
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handlePayFee}
                    disabled={feePaid || payDiagnosisFeeMutation.isPending}
                    data-testid="button-pay-fee"
                  >
                    {payDiagnosisFeeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : feePaid ? (
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    {feePaid ? "Taxa paga! Buscando profissionais..." : "Pagar taxa e continuar"}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {aiDiagnosis && (
              <PaymentModal
                open={showPaymentModal}
                onOpenChange={setShowPaymentModal}
                amount={aiDiagnosis.diagnosisFee}
                description="Taxa de diagnóstico IA"
                onPaymentComplete={handleFeePaymentComplete}
              />
            )}
          </ScrollArea>
        )}
      </main>
    </div>
  );
}
