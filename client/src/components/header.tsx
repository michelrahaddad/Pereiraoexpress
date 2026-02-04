import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Menu, User, LogOut, Settings, Wrench, Shield } from "lucide-react";
import logoImg from "@/assets/logo-pereirao.png";

interface HeaderProps {
  onMenuClick?: () => void;
  showMenu?: boolean;
}

export function Header({ onMenuClick, showMenu = false }: HeaderProps) {
  const { user, isAuthenticated, logout } = useAuth();

  const getInitials = () => {
    if (!user) return "U";
    const first = user.firstName?.[0] || "";
    const last = user.lastName?.[0] || "";
    return (first + last).toUpperCase() || user.email?.[0]?.toUpperCase() || "U";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 via-white to-slate-50 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 backdrop-blur-xl">
      <div className="container flex h-20 items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-3">
          {showMenu && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="md:hidden rounded-xl text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10"
              data-testid="button-menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
          <Link href="/" className="flex items-center gap-2">
            <img
              src={logoImg}
              alt="Pereirão Express"
              className="h-28 md:h-32 object-contain"
            />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-xl"
                  data-testid="button-user-menu"
                >
                  <Avatar className="h-10 w-10 rounded-xl">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-xl p-2" align="end">
                <div className="flex items-center justify-start gap-3 p-3">
                  <Avatar className="h-10 w-10 rounded-xl">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-0.5 leading-none">
                    {user?.firstName && (
                      <p className="font-semibold" data-testid="text-user-name">
                        {user.firstName} {user.lastName}
                      </p>
                    )}
                    {user?.email && (
                      <p className="w-[160px] truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                  <Link href="/client" className="flex items-center gap-3 p-2">
                    <User className="h-4 w-4" />
                    Meus Serviços
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                  <Link href="/provider" className="flex items-center gap-3 p-2">
                    <Wrench className="h-4 w-4" />
                    Área do Prestador
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                  <Link href="/admin" className="flex items-center gap-3 p-2">
                    <Shield className="h-4 w-4" />
                    Administração
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
                  <Link href="/settings" className="flex items-center gap-3 p-2">
                    <Settings className="h-4 w-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive cursor-pointer rounded-lg p-2"
                  onClick={() => logout()}
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4 mr-3" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild className="rounded-xl px-6 bg-accent text-accent-foreground hover:bg-accent/90" data-testid="button-login">
              <Link href="/login/cliente">Entrar</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
