import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Moon, Sun, LogOut, User, History, Sparkles, FolderKanban, Menu, LayoutGrid, Image as ImageIcon, Tag } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { getAvatarImage } from "@/config/avatars";

export function Navbar() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [location] = useLocation();

  const logoSrc = theme === "dark" ? "/logo-dark.png" : "/logo-light.png";

  return (
    <>
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
        <div className="w-full flex h-14 sm:h-16 items-center px-3 sm:px-4 md:px-6 mx-auto max-w-full">
        <Link href="/">
          <div className="mr-4 sm:mr-8 flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity shrink-0">
            <img 
              src={logoSrc} 
              alt="SPAVIX Logo" 
              className="h-10 sm:h-12 w-auto"
            />
          </div>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 text-xs lg:text-sm font-medium">
          <Link href="/dashboard">
            <span className={`transition-colors hover:text-foreground/80 cursor-pointer flex items-center gap-1.5 ${location === '/dashboard' ? 'text-foreground font-semibold' : 'text-foreground/60'}`}>
              <LayoutGrid className="w-4 h-4" />
              Dashboard
            </span>
          </Link>
          <Link href="/projects">
            <span className={`transition-colors hover:text-foreground/80 cursor-pointer flex items-center gap-1.5 ${location === '/projects' ? 'text-foreground font-semibold' : 'text-foreground/60'}`}>
              <FolderKanban className="w-4 h-4" />
              Projects
            </span>
          </Link>
          <Link href="/gallery">
            <span className={`transition-colors hover:text-foreground/80 cursor-pointer flex items-center gap-1.5 ${location === '/gallery' ? 'text-foreground font-semibold' : 'text-foreground/60'}`}>
              <ImageIcon className="w-4 h-4" />
              Gallery
            </span>
          </Link>
          <Link href="/pricing">
            <span className={`transition-colors hover:text-foreground/80 cursor-pointer flex items-center gap-1.5 ${location === '/pricing' ? 'text-foreground font-semibold' : 'text-foreground/60'}`}>
              <Tag className="w-4 h-4" />
              Pricing
            </span>
          </Link>
        </nav>

        <div className="ml-auto flex items-center space-x-2 md:space-x-4">
          <ThemeToggle />
          
          <div className="hidden md:block">
            <UserMenu />
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <SheetHeader className="text-left pb-6">
                  <SheetTitle className="font-heading flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    SPAVIX
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center gap-3 p-2 border rounded-xl bg-muted/30">
                     <Avatar className="h-10 w-10 overflow-hidden">
                        <img
                          src={
                            !user?.profilePicture 
                              ? getAvatarImage("avatar-1")
                              : user.profilePicture.startsWith("http")
                              ? user.profilePicture
                              : getAvatarImage(user.profilePicture)
                          }
                          alt="User avatar"
                          className="w-full h-full object-cover"
                        />
                     </Avatar>
                     <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{user?.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{user?.email || "User"}</p>
                     </div>
                  </div>

                  <nav className="flex flex-col space-y-1">
                    <MobileNavLink href="/dashboard" isActive={location === '/dashboard'}>Dashboard</MobileNavLink>
                    <MobileNavLink href="/projects" isActive={location === '/projects'}>Projects</MobileNavLink>
                    <MobileNavLink href="/gallery" isActive={location === '/gallery'}>Gallery</MobileNavLink>
                    <MobileNavLink href="/pricing" isActive={location === '/pricing'}>Pricing</MobileNavLink>
                    <div className="my-2 border-t" />
                    <MobileNavLink href="/profile" isActive={location === '/profile'}>Profile</MobileNavLink>
                    <MobileNavLink href="/history" isActive={location === '/history'}>History</MobileNavLink>
                    <MobileLogoutButton />
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
    </>
  );
}

function MobileNavLink({ href, children, isActive }: { href: string; children: React.ReactNode; isActive?: boolean }) {
  return (
    <Link href={href}>
      <span className={`flex items-center px-2 py-3 text-sm font-medium transition-colors hover:bg-accent rounded-lg cursor-pointer ${isActive ? 'text-foreground font-semibold bg-accent/30' : 'text-foreground/60'}`}>
        {children}
      </span>
    </Link>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  const handleLogout = () => {
    logout();
    setShowLogoutDialog(false);
  };

  const getAvatarUrl = () => {
    if (!user?.profilePicture) return getAvatarImage("avatar-1");
    // Check if it's a Google picture URL (starts with http)
    if (user.profilePicture.startsWith("http")) {
      return user.profilePicture;
    }
    // Otherwise it's an avatar ID
    return getAvatarImage(user.profilePicture);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
            <Avatar className="h-9 w-9 border border-border overflow-hidden">
              <img
                src={getAvatarUrl()}
                alt="User avatar"
                className="w-full h-full object-cover"
              />
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <div className="px-2 py-1.5 text-sm font-medium">{user?.username}</div>
          <Link href="/profile">
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
          </Link>
          <Link href="/history">
            <DropdownMenuItem className="cursor-pointer">
              <History className="mr-2 h-4 w-4" />
              <span>Transformation History</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuItem 
            className="text-destructive focus:text-destructive cursor-pointer" 
            onSelect={(e) => {
              e.preventDefault();
              setShowLogoutDialog(true);
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out? You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MobileLogoutButton() {
  const { logout } = useAuth();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  
  const handleLogout = () => {
    logout();
    setShowLogoutDialog(false);
  };
  
  return (
    <>
      <Button 
        variant="ghost" 
        className="justify-start text-destructive hover:text-destructive hover:bg-destructive/10 w-full"
        onClick={() => setShowLogoutDialog(true)}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Log out
      </Button>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out? You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-destructive hover:bg-destructive/90">
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="h-9 w-9"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
