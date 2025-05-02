import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

import HomePage from "@/pages/home-page";
import ThreadPage from "@/pages/thread-page";
import CreateThreadPage from "@/pages/create-thread-page";
import CollectionsPage from "@/pages/collections-page";
import ProfilePage from "@/pages/profile-page";
import AuthPage from "@/pages/auth-page";
import NotFound from "@/pages/not-found";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <Header />
        <main className="container py-6">{children}</main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      <Route path="/">
        {() => (
          <AppLayout>
            <HomePage />
          </AppLayout>
        )}
      </Route>
      
      <Route path="/thread/:id">
        {({ id }) => (
          <AppLayout>
            <ThreadPage id={parseInt(id)} />
          </AppLayout>
        )}
      </Route>
      
      <ProtectedRoute path="/create" component={() => (
        <AppLayout>
          <CreateThreadPage />
        </AppLayout>
      )} />
      
      <ProtectedRoute path="/collections" component={() => (
        <AppLayout>
          <CollectionsPage />
        </AppLayout>
      )} />
      
      <Route path="/profile/:username">
        {({ username }) => (
          <AppLayout>
            <ProfilePage username={username} />
          </AppLayout>
        )}
      </Route>
      
      <Route>
        <AppLayout>
          <NotFound />
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
