import { useAuth } from "@/hooks/use-auth";
import Landing from "./landing";
import ClientDashboard from "./client";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { Header } from "@/components/header";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingSkeleton />
      </div>
    );
  }

  if (isAuthenticated) {
    return <ClientDashboard />;
  }

  return <Landing />;
}
