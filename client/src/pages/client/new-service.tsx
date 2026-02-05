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
  Shield,
  Users
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

const GUIDED_QUESTIONS_REPAIR = [
  {
    id: "problem_type",
    question: "Qual tipo de problema você está enfrentando?",
    options: ["Elétrica", "Hidráulica", "Pintura", "Reforma", "Ar condicionado", "Empregada Doméstica", "Passadeira", "Outro"]
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

const GUIDED_QUESTIONS_DOMESTIC = [
  {
    id: "house_size",
    question: "Qual o tamanho da sua casa?",
    options: ["Apartamento pequeno (1-2 quartos)", "Casa média (3-4 quartos)", "Casa grande (5+ quartos)", "Escritório/Comercial"]
  },
  {
    id: "service_type",
    question: "Qual tipo de serviço você precisa?",
    options: ["Limpeza geral", "Limpeza pesada/pós-obra", "Passar roupa", "Cozinhar", "Serviço completo (limpeza + passar + cozinhar)"]
  },
  {
    id: "frequency",
    question: "Com que frequência você precisa?",
    options: ["Só uma vez (avulso)", "Mensal", "Quinzenal", "Semanal", "Diária fixa"]
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
  
  const [step, setStep] = useState<"payment" | "guided" | "chat" | "diagnosis" | "complete">("payment");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [guidedAnswers, setGuidedAnswers] = useState<GuidedAnswer[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [isDomesticService, setIsDomesticService] = useState(false);
  
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
  
  const DIAGNOSIS_FEE = 1000; // R$ 10,00 fixo

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
      return { ...response, serviceId: data.serviceId };
    },
    onSuccess: (data: any) => {
      setFeePaid(true);
      toast({
        title: "Taxa paga!",
        description: "Redirecionando para seleção de profissionais...",
      });
      setTimeout(() => {
        setLocation(`/cliente/selecionar-profissional/${data.serviceId}`);
      }, 1500);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível processar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const [showDomesticPaymentModal, setShowDomesticPaymentModal] = useState(false);

  const payDomesticServiceMutation = useMutation({
    mutationFn: async (data: { serviceId: number; method: string; totalAmount: number }) => {
      const response = await apiRequest("POST", `/api/service/${data.serviceId}/pay-domestic`, {
        method: data.method,
        totalAmount: data.totalAmount,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Pagamento confirmado!",
        description: "Uma profissional será atribuída em breve.",
      });
      setShowDomesticPaymentModal(false);
      setLocation("/client");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível processar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleDomesticPaymentComplete = (paymentId: number) => {
    if (aiDiagnosis) {
      const totalAmount = Math.round(aiDiagnosis.aiDiagnosis.priceRangeMin * 1.10);
      payDomesticServiceMutation.mutate({
        serviceId: aiDiagnosis.service.id,
        method: "pix",
        totalAmount,
      });
    }
  };

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
    const lastMessage = messages[messages.length - 1];
    const lastAiMessage = messages.filter(m => m.role === "assistant").pop();
    
    // Só considerar diagnóstico se a última mensagem for da IA (concluindo conversa)
    // e o usuário já respondeu pelo menos 4 vezes
    if (!lastMessage || lastMessage.role !== "assistant" || userMessageCount < 4) {
      return;
    }
    
    // Verificar se a IA finalizou a coleta (não está fazendo pergunta)
    const aiContent = lastAiMessage?.content?.trim() || "";
    const aiIsAskingQuestion = aiContent.endsWith("?") || aiContent.includes("?");
    
    // Se a IA não está fazendo pergunta, significa que ela finalizou a coleta
    const shouldGenerateDiagnosis = !aiIsAskingQuestion;
    
    if (shouldGenerateDiagnosis && !isStreaming && !createAIDiagnosisMutation.isPending && step === "chat") {
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

  // Seleciona as perguntas baseado no tipo de serviço
  const currentQuestions = isDomesticService ? GUIDED_QUESTIONS_DOMESTIC : GUIDED_QUESTIONS_REPAIR;

  const handleGuidedAnswer = (answer: string) => {
    // Se está na primeira pergunta e selecionou serviço doméstico, muda para fluxo doméstico
    const domesticServices = ["Empregada Doméstica", "Passadeira"];
    if (currentQuestion === 0 && !isDomesticService && domesticServices.includes(answer)) {
      setIsDomesticService(true);
      setGuidedAnswers([{ question: "Tipo de serviço", answer }]);
      setCurrentQuestion(0); // Reinicia para as perguntas de serviço doméstico
      return;
    }

    const questions = isDomesticService ? GUIDED_QUESTIONS_DOMESTIC : GUIDED_QUESTIONS_REPAIR;
    const question = questions[currentQuestion];
    setGuidedAnswers(prev => [...prev, { question: question.question, answer }]);
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Para serviço doméstico, gerar diagnóstico automaticamente após responder as 3 perguntas
      if (isDomesticService) {
        generateDomesticDiagnosis([...guidedAnswers, { question: question.question, answer }]);
      } else {
        setStep("chat");
      }
    }
  };

  // Gera diagnóstico automático para serviço doméstico
  const generateDomesticDiagnosis = (answers: GuidedAnswer[]) => {
    const houseSize = answers.find(a => a.question.includes("tamanho"))?.answer || "";
    const serviceType = answers.find(a => a.question.includes("tipo"))?.answer || "";
    const frequency = answers.find(a => a.question.includes("frequência"))?.answer || "";

    // Descrição para a IA
    const description = `Serviço de empregada doméstica. Tamanho da casa: ${houseSize}. Tipo de serviço: ${serviceType}. Frequência: ${frequency}.`;
    const title = `Empregada Doméstica - ${serviceType}`;

    createAIDiagnosisMutation.mutate({
      description,
      guidedAnswers: answers,
      mediaUrls: [],
      title,
    });
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
    setFeePaid(true);
    setStep("guided");
    toast({
      title: "Taxa paga com sucesso!",
      description: "Agora vamos entender seu problema.",
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const progressValue = step === "payment"
    ? 5
    : step === "guided" 
    ? 10 + ((currentQuestion + 1) / currentQuestions.length) * 25
    : step === "chat" 
    ? 50 
    : step === "diagnosis"
    ? 80
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
            <h1 className="font-semibold">Pedir serviço</h1>
            <p className="text-sm text-muted-foreground">
              {step === "guided" && "Responda algumas perguntas rápidas"}
              {step === "chat" && "Descreva mais detalhes do problema"}
              {step === "diagnosis" && "Análise do diagnóstico"}
              {step === "payment" && "Taxa de diagnóstico"}
            </p>
          </div>
        </div>

        <div className="px-4 pt-3">
          <Progress value={progressValue} className="h-2" />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>Taxa</span>
            <span>Perguntas</span>
            <span>Chat IA</span>
            <span>Diagnóstico</span>
          </div>
        </div>

        {step === "payment" && (
          <div className="flex-1 p-4 flex flex-col items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <CreditCard className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">Taxa de Diagnóstico IA</CardTitle>
                <CardDescription>
                  Pague a taxa para acessar nosso assistente inteligente que vai analisar seu problema e encontrar os melhores profissionais.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">R$ 10,00</p>
                  <p className="text-sm text-muted-foreground mt-1">Taxa única por diagnóstico</p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Análise inteligente do seu problema</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Orçamento estimado em minutos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Conexão com profissionais qualificados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span>Pagamento seguro</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full rounded-xl h-12 text-lg" 
                  onClick={() => setShowPaymentModal(true)}
                  data-testid="button-pay-diagnosis-fee"
                >
                  Pagar e começar
                </Button>
              </CardFooter>
            </Card>
            
            <PaymentModal
              open={showPaymentModal}
              onOpenChange={setShowPaymentModal}
              amount={DIAGNOSIS_FEE}
              description="Taxa de diagnóstico IA"
              onPaymentComplete={handleFeePaymentComplete}
            />
          </div>
        )}

        {step === "guided" && (
          <div className="flex-1 p-4 flex flex-col">
            {createAIDiagnosisMutation.isPending ? (
              <Card className="flex-1 flex flex-col items-center justify-center">
                <CardContent className="text-center py-12">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Gerando orçamento...</h3>
                  <p className="text-muted-foreground">
                    Estamos calculando o melhor preço para você!
                  </p>
                </CardContent>
              </Card>
            ) : (
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-5 w-5" />
                  <span className="text-sm font-medium">Passo {currentQuestion + 1} de {currentQuestions.length}</span>
                </div>
                <CardTitle className="text-xl mt-2">
                  {currentQuestions[currentQuestion].question}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="grid gap-3">
                  {currentQuestions[currentQuestion].options.map((option) => (
                    <Button
                      key={option}
                      variant="outline"
                      className="justify-start h-auto py-4 px-4 text-left"
                      onClick={() => handleGuidedAnswer(option)}
                      disabled={createAIDiagnosisMutation.isPending}
                      data-testid={`button-option-${option.toLowerCase().replace(/\s/g, '-')}`}
                    >
                      {option}
                    </Button>
                  ))}
                </div>

                {currentQuestion === currentQuestions.length - 1 && !isDomesticService && (
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
            )}
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
                    <CardTitle>{isDomesticService ? "Orçamento" : "Diagnóstico IA"}</CardTitle>
                  </div>
                  <CardDescription>
                    {isDomesticService ? "Valor calculado para o serviço" : "Análise automática do seu problema"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isDomesticService && (
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
                  )}

                  <div>
                    <p className="text-sm font-medium mb-2">{isDomesticService ? "Detalhes:" : "Análise:"}</p>
                    <p className="text-sm text-muted-foreground">{aiDiagnosis.aiDiagnosis.aiResponse}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Tempo estimado</p>
                      <p className="font-medium">{aiDiagnosis.aiDiagnosis.estimatedDuration}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">{isDomesticService ? "Valor" : "Faixa de preço"}</p>
                      <p className="font-medium text-primary">
                        {isDomesticService 
                          ? `R$ ${(aiDiagnosis.aiDiagnosis.priceRangeMin / 100).toFixed(2)}`
                          : `R$ ${(aiDiagnosis.aiDiagnosis.priceRangeMin / 100).toFixed(0)} - R$ ${(aiDiagnosis.aiDiagnosis.priceRangeMax / 100).toFixed(0)}`
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isDomesticService ? (
                <Card className="border-primary bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Orçamento calculado!</p>
                        <p className="text-sm text-muted-foreground">
                          Escolha uma profissional para realizar o serviço
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          Profissionais verificadas
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          Ordenadas por avaliação
                        </p>
                        <p className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          Pagamento após seleção
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => setLocation(`/cliente/selecionar-profissional/${aiDiagnosis.service.id}?domestic=true`)}
                      data-testid="button-select-domestic-provider"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Ver profissionais disponíveis
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <Card className="border-primary bg-primary/5">
                  <CardContent className="pt-6">
                    <div className="text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Taxa de diagnóstico paga!</p>
                        <p className="text-sm text-muted-foreground">
                          Agora você pode escolher um profissional para fazer o orçamento presencial
                        </p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => {
                        if (aiDiagnosis) {
                          setLocation(`/cliente/selecionar-profissional/${aiDiagnosis.service.id}`);
                        }
                      }}
                      data-testid="button-select-provider"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Ver profissionais disponíveis
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
          </ScrollArea>
        )}

        {aiDiagnosis && isDomesticService && (
          <PaymentModal
            open={showDomesticPaymentModal}
            onOpenChange={setShowDomesticPaymentModal}
            amount={Math.round(aiDiagnosis.aiDiagnosis.priceRangeMin * 1.10)}
            description={`Serviço: ${aiDiagnosis.service.title}`}
            onPaymentComplete={handleDomesticPaymentComplete}
          />
        )}
      </main>
    </div>
  );
}
