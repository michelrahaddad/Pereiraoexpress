import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { 
  Send, 
  Image as ImageIcon, 
  Sparkles, 
  User,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Zap,
  AlertTriangle,
  X,
  Mic,
  MicOff
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

interface DiagnosisResult {
  title: string;
  category: string;
  diagnosis: string;
  materials: string[];
  estimatedPrices: {
    standard: number;
    express: number;
    urgent: number;
  };
}

export default function NewService() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Olá! Sou o assistente do Pereirão Express. Descreva o problema que você está enfrentando. Pode enviar fotos também para um diagnóstico mais preciso!"
    }
  ]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [selectedSLA, setSelectedSLA] = useState<"standard" | "express" | "urgent" | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const createServiceMutation = useMutation({
    mutationFn: async (data: { diagnosis: DiagnosisResult; sla: string }) => {
      const response = await apiRequest("POST", "/api/services", {
        title: data.diagnosis.title,
        description: messages.filter(m => m.role === "user").map(m => m.content).join("\n"),
        categoryId: 1,
        diagnosis: data.diagnosis.diagnosis,
        materials: JSON.stringify(data.diagnosis.materials),
        slaPriority: data.sla,
        estimatedPrice: data.diagnosis.estimatedPrices[data.sla as keyof typeof data.diagnosis.estimatedPrices],
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Serviço criado!",
        description: "Já estamos buscando um profissional para você.",
      });
      setLocation("/client");
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível criar o serviço. Tente novamente.",
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

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-6 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Acesso necessário</h1>
          <p className="text-muted-foreground mb-6">Faça login para solicitar um serviço</p>
          <Button asChild className="rounded-xl">
            <a href="/api/login">Fazer login</a>
          </Button>
        </div>
      </div>
    );
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
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
              if (data.diagnosis) {
                setDiagnosis(data.diagnosis);
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
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
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

  const confirmService = () => {
    if (!diagnosis || !selectedSLA) return;
    createServiceMutation.mutate({ diagnosis, sla: selectedSLA });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
          <div>
            <h1 className="font-semibold">Novo serviço</h1>
            <p className="text-sm text-muted-foreground">Descreva seu problema para a IA</p>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
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
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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

          {diagnosis && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Diagnóstico pronto!</CardTitle>
                </div>
                <CardDescription>{diagnosis.diagnosis}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {diagnosis.materials.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Materiais necessários:</p>
                    <div className="flex flex-wrap gap-2">
                      {diagnosis.materials.map((material, i) => (
                        <Badge key={i} variant="secondary">{material}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium mb-3">Escolha o prazo de atendimento:</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Card 
                      className={`cursor-pointer transition-all ${selectedSLA === "standard" ? "ring-2 ring-primary" : "hover-elevate"}`}
                      onClick={() => setSelectedSLA("standard")}
                      data-testid="card-sla-standard"
                    >
                      <CardContent className="p-4 text-center">
                        <Clock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                        <p className="font-medium">Standard</p>
                        <p className="text-xs text-muted-foreground mb-2">Até 48h</p>
                        <p className="text-lg font-bold text-primary">
                          R$ {(diagnosis.estimatedPrices.standard / 100).toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className={`cursor-pointer transition-all ${selectedSLA === "express" ? "ring-2 ring-accent" : "hover-elevate"}`}
                      onClick={() => setSelectedSLA("express")}
                      data-testid="card-sla-express"
                    >
                      <CardContent className="p-4 text-center">
                        <Zap className="h-6 w-6 mx-auto mb-2 text-accent-foreground" />
                        <p className="font-medium">Express</p>
                        <p className="text-xs text-muted-foreground mb-2">Até 12h</p>
                        <p className="text-lg font-bold text-accent-foreground">
                          R$ {(diagnosis.estimatedPrices.express / 100).toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card 
                      className={`cursor-pointer transition-all ${selectedSLA === "urgent" ? "ring-2 ring-destructive" : "hover-elevate"}`}
                      onClick={() => setSelectedSLA("urgent")}
                      data-testid="card-sla-urgent"
                    >
                      <CardContent className="p-4 text-center">
                        <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-destructive" />
                        <p className="font-medium">Urgente</p>
                        <p className="text-xs text-muted-foreground mb-2">Até 2h</p>
                        <p className="text-lg font-bold text-destructive">
                          R$ {(diagnosis.estimatedPrices.urgent / 100).toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  disabled={!selectedSLA || createServiceMutation.isPending}
                  onClick={confirmService}
                  data-testid="button-confirm-service"
                >
                  {createServiceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Confirmar e buscar profissional
                </Button>
              </CardContent>
            </Card>
          )}
        </ScrollArea>

        <div className="border-t p-4">
          {selectedImage && (
            <div className="relative inline-block mb-3">
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
      </main>
    </div>
  );
}
