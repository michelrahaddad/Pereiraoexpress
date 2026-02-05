import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export function PushNotificationToggle() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setIsSupported(false);
      return;
    }
    
    setPermission(Notification.permission);
    checkSubscription();
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error("Error checking subscription:", error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async () => {
    setIsLoading(true);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== "granted") {
        toast({
          title: "Permissão negada",
          description: "Você precisa permitir notificações nas configurações do navegador.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const vapidResponse = await fetch("/api/push/vapid-public-key");
      const vapidData = await vapidResponse.json();
      
      if (!vapidData.configured) {
        toast({
          title: "Notificações indisponíveis",
          description: "O sistema de notificações push ainda não foi configurado.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      const subscriptionJSON = subscription.toJSON();
      
      await apiRequest("POST", "/api/push/subscribe", {
        endpoint: subscriptionJSON.endpoint,
        keys: subscriptionJSON.keys,
      });

      setIsSubscribed(true);
      toast({
        title: "Notificações ativadas!",
        description: "Você receberá alertas mesmo quando sair do app.",
      });
    } catch (error) {
      console.error("Error subscribing to push:", error);
      toast({
        title: "Erro ao ativar",
        description: "Não foi possível ativar as notificações.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await apiRequest("POST", "/api/push/unsubscribe", {
          endpoint: subscription.endpoint,
        });
        await subscription.unsubscribe();
      }
      
      setIsSubscribed(false);
      toast({
        title: "Notificações desativadas",
        description: "Você não receberá mais alertas push.",
      });
    } catch (error) {
      console.error("Error unsubscribing:", error);
      toast({
        title: "Erro",
        description: "Não foi possível desativar as notificações.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  if (!isSupported) {
    return null;
  }

  if (permission === "denied") {
    return (
      <Button
        variant="ghost"
        size="icon"
        disabled
        className="rounded-xl"
        title="Notificações bloqueadas"
        data-testid="button-push-blocked"
      >
        <BellOff className="h-5 w-5" data-testid="icon-push-blocked" />
      </Button>
    );
  }

  return (
    <Button
      variant={isSubscribed ? "default" : "ghost"}
      size="icon"
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isLoading}
      className="rounded-xl"
      title={isSubscribed ? "Desativar notificações push" : "Ativar notificações push"}
      data-testid="button-push-toggle"
    >
      {isLoading ? (
        <div 
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" 
          data-testid="spinner-push-loading"
        />
      ) : isSubscribed ? (
        <BellRing className="h-5 w-5" data-testid="icon-push-active" />
      ) : (
        <Bell className="h-5 w-5 opacity-60" data-testid="icon-push-inactive" />
      )}
    </Button>
  );
}
