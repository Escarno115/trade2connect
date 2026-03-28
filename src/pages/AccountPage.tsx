import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Building2, Shield, ChevronRight, FileText } from "lucide-react";

const AccountPage = () => {
  const { user, userRole, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen pb-20 px-6">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-bold">Sign in to your account</h2>
        <p className="text-sm text-muted-foreground mt-1 text-center">Manage your profile and settings</p>
        <div className="flex gap-3 mt-4">
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
          <Button variant="outline" onClick={() => navigate("/auth?role=business")}>Register Business</Button>
        </div>
      </div>
    );
  }

  const menuItems = [
    ...(userRole === "business"
      ? [{ label: "Business Dashboard", icon: Building2, to: "/dashboard" }]
      : []),
    ...(userRole === "admin"
      ? [{ label: "Admin Panel", icon: Shield, to: "/admin" }]
      : []),
  ];

  return (
    <div className="pb-20">
      <div className="px-4 pt-12 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-xl font-bold text-primary-foreground">
            {user.email?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-bold">{user.user_metadata?.full_name || "User"}</h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <span className="text-xs font-medium text-primary capitalize">{userRole}</span>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-2">
        {menuItems.map(({ label, icon: Icon, to }) => (
          <button
            key={to}
            onClick={() => navigate(to)}
            className="w-full flex items-center gap-3 p-4 bg-card rounded-xl border active-scale text-left"
          >
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium">{label}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}

        <button
          onClick={() => navigate("/terms")}
          className="w-full flex items-center gap-3 p-4 bg-card rounded-xl border active-scale text-left"
        >
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium">Terms & Conditions</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
        <button
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
          className="w-full flex items-center gap-3 p-4 bg-card rounded-xl border active-scale text-left text-destructive"
        >
          <LogOut className="h-5 w-5" />
          <span className="flex-1 text-sm font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
};

export default AccountPage;
