import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  QrCode,
  Loader2,
  CheckCircle2,
  Copy,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type PaymentMethod = "pix" | "credit_card" | "debit_card";

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  description: string;
  onPaymentComplete: (paymentId: number) => void;
}

// Simulated PIX code generator
function generatePixCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "00020126580014br.gov.bcb.pix0136";
  for (let i = 0; i < 32; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function PaymentModal({
  open,
  onOpenChange,
  amount,
  description,
  onPaymentComplete,
}: PaymentModalProps) {
  const { toast } = useToast();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  
  // Card form state
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");

  const formatAmount = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  const formatCardNumber = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers.replace(/(\d{4})(?=\d)/g, "$1 ").substring(0, 19);
  };

  const formatExpiry = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length >= 2) {
      return numbers.substring(0, 2) + "/" + numbers.substring(2, 4);
    }
    return numbers;
  };

  const handleSelectPix = () => {
    setMethod("pix");
    setPixCode(generatePixCode());
  };

  const handleCopyPix = () => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      toast({
        title: "Código copiado!",
        description: "Cole no app do seu banco para pagar.",
      });
    }
  };

  const simulatePayment = async () => {
    setIsProcessing(true);
    
    // Simulate API call for payment processing
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          method,
          description,
        }),
      });

      if (!response.ok) throw new Error("Payment failed");

      const payment = await response.json();
      
      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      setPaymentComplete(true);
      
      setTimeout(() => {
        onPaymentComplete(payment.id);
        resetModal();
      }, 1500);
    } catch (error) {
      toast({
        title: "Erro no pagamento",
        description: "Não foi possível processar o pagamento. Tente novamente.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleConfirmPixPayment = () => {
    simulatePayment();
  };

  const handleCardPayment = (type: "credit_card" | "debit_card") => {
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos do cartão.",
        variant: "destructive",
      });
      return;
    }
    setMethod(type);
    simulatePayment();
  };

  const resetModal = () => {
    setMethod(null);
    setPixCode(null);
    setPaymentComplete(false);
    setIsProcessing(false);
    setCardNumber("");
    setCardName("");
    setCardExpiry("");
    setCardCvv("");
  };

  const handleClose = (open: boolean) => {
    if (!isProcessing) {
      if (!open) resetModal();
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {paymentComplete ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Pagamento confirmado!
              </>
            ) : (
              "Pagamento"
            )}
          </DialogTitle>
          <DialogDescription>
            {paymentComplete
              ? "Seu pagamento foi processado com sucesso."
              : `Total: ${formatAmount(amount)}`}
          </DialogDescription>
        </DialogHeader>

        {paymentComplete ? (
          <div className="text-center py-8">
            <div className="h-16 w-16 mx-auto rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-muted-foreground">Redirecionando...</p>
          </div>
        ) : !method ? (
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Escolha a forma de pagamento
            </p>

            <Card
              className="cursor-pointer hover-elevate"
              onClick={handleSelectPix}
              data-testid="card-payment-pix"
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Pix</p>
                  <p className="text-sm text-muted-foreground">
                    Pagamento instantâneo
                  </p>
                </div>
                <Badge variant="secondary">Recomendado</Badge>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover-elevate"
              onClick={() => setMethod("credit_card")}
              data-testid="card-payment-credit"
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Cartão de Crédito</p>
                  <p className="text-sm text-muted-foreground">
                    Parcele em até 12x
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover-elevate"
              onClick={() => setMethod("debit_card")}
              data-testid="card-payment-debit"
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Cartão de Débito</p>
                  <p className="text-sm text-muted-foreground">
                    Débito à vista
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : method === "pix" ? (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <div className="h-40 w-40 mx-auto bg-muted rounded-xl flex items-center justify-center mb-4">
                <QrCode className="h-24 w-24 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Código Pix Copia e Cola
              </p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <code className="flex-1 text-xs break-all">
                  {pixCode?.substring(0, 40)}...
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleCopyPix}
                  data-testid="button-copy-pix"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
              <Clock className="h-4 w-4" />
              <span>Válido por 30 minutos</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setMethod(null)}
                disabled={isProcessing}
              >
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirmPixPayment}
                disabled={isProcessing}
                data-testid="button-confirm-pix"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processando...
                  </>
                ) : (
                  "Já paguei"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="cardNumber">Número do cartão</Label>
                <Input
                  id="cardNumber"
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  data-testid="input-card-number"
                />
              </div>

              <div>
                <Label htmlFor="cardName">Nome no cartão</Label>
                <Input
                  id="cardName"
                  placeholder="NOME COMPLETO"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  data-testid="input-card-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cardExpiry">Validade</Label>
                  <Input
                    id="cardExpiry"
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    maxLength={5}
                    data-testid="input-card-expiry"
                  />
                </div>
                <div>
                  <Label htmlFor="cardCvv">CVV</Label>
                  <Input
                    id="cardCvv"
                    placeholder="123"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").substring(0, 4))}
                    maxLength={4}
                    type="password"
                    data-testid="input-card-cvv"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setMethod(null)}
                disabled={isProcessing}
              >
                Voltar
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleCardPayment(method)}
                disabled={isProcessing}
                data-testid="button-pay-card"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processando...
                  </>
                ) : (
                  `Pagar ${formatAmount(amount)}`
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Pagamento seguro. Seus dados estão protegidos.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
