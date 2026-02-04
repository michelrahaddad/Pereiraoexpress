import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, ArrowLeft, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function RateProvider() {
  const [, params] = useRoute("/cliente/avaliar/:serviceId");
  const serviceId = params?.serviceId;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: service } = useQuery<any>({
    queryKey: ["/api/services", serviceId],
    enabled: !!serviceId,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/reviews", {
        serviceRequestId: parseInt(serviceId!),
        rating,
        comment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setSubmitted(true);
      toast({
        title: "Avaliacao enviada!",
        description: "Obrigado por avaliar o profissional.",
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Nao foi possivel enviar a avaliacao.",
        variant: "destructive",
      });
    },
  });

  const getRatingLabel = (r: number) => {
    if (r >= 9) return "Excelente!";
    if (r >= 7) return "Muito Bom";
    if (r >= 5) return "Bom";
    if (r >= 3) return "Regular";
    if (r >= 1) return "Ruim";
    return "Selecione uma nota";
  };

  if (submitted) {
    return (
      <div className="container max-w-lg mx-auto px-4 py-16">
        <Card className="text-center">
          <CardContent className="py-12">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Obrigado!</h2>
            <p className="text-muted-foreground mb-6">
              Sua avaliacao ajuda a melhorar nossos servicos.
            </p>
            <Button onClick={() => navigate("/cliente")} data-testid="button-go-home">
              Voltar ao Inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-lg mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate("/cliente")}
        className="mb-4"
        data-testid="button-back"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-center">Avalie o Profissional</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Como foi sua experiencia com o servico?
            </p>
            
            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRating(r)}
                  onMouseEnter={() => setHoveredRating(r)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                  data-testid={`button-star-${r}`}
                >
                  <Star
                    className={`h-6 w-6 transition-colors ${
                      r <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            
            <p className="text-lg font-semibold">
              {rating > 0 ? `${rating}/10 - ${getRatingLabel(rating)}` : getRatingLabel(0)}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Comentario (opcional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Conte como foi sua experiencia..."
              rows={4}
              data-testid="input-comment"
            />
          </div>

          <Button
            className="w-full h-12"
            disabled={rating === 0 || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
            data-testid="button-submit-review"
          >
            {submitMutation.isPending ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                Enviando...
              </span>
            ) : (
              "Enviar Avaliacao"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
