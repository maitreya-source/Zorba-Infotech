import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ZorbaLogoIcon } from "@/components/common/ZorbaLogo";
import { ShieldAlert, LogOut } from "lucide-react";

export default function AdminLogin() {
  const { user, isAdmin, loading, signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate("/admin/service-calls", { replace: true });
    }
  }, [user, isAdmin, loading, navigate]);

  const handleGoogleSignIn = async () => {
    setError("");
    setSigningIn(true);
    try {
      await signIn();
    } catch (err: any) {
      console.error("Firebase Google Sign-In error:", err);
      const code = err?.code;
      if (code === "auth/unauthorized-domain") {
        setError(
          `Unauthorized Domain (${window.location.hostname}). Please add "${window.location.hostname}" to Firebase Console -> Authentication -> Settings -> Authorized domains.`
        );
      } else if (code === "auth/operation-not-allowed") {
        setError(
          "Google Sign-In is not enabled in Firebase Console. Enable Google under Authentication -> Sign-in method."
        );
      } else if (code === "auth/popup-closed-by-user") {
        setError("Sign-in popup was closed before completing authentication. Please try again.");
      } else if (code === "auth/invalid-api-key") {
        setError("Invalid Firebase API Key. Please check VITE_FIREBASE_API_KEY in your .env file.");
      } else {
        setError(err?.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Handle case where user is signed in but not authorized as admin
  const isUnauthorized = user && !isAdmin;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-8 shadow-lg text-center space-y-4">
        <ZorbaLogoIcon className="mx-auto h-16 w-16 mb-2 drop-shadow-md" />
        <div>
          <h1 className="text-xl font-bold font-display">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Zorba Infotech — sign in to continue</p>
        </div>

        {isUnauthorized ? (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-xs text-destructive text-left space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Access Denied</span>
            </div>
            <p className="leading-relaxed">
              Your Google account (<span className="font-semibold text-foreground">{user?.email}</span>) is not authorized to access the Zorba Admin Panel.
            </p>
            <p className="text-[11px] text-muted-foreground pt-0.5">
              Please contact your system administrator to request access.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut()}
              className="w-full mt-2 gap-2 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out & Switch Account
            </Button>
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 text-xs text-destructive text-left leading-relaxed">
                {error}
              </div>
            )}

            <div className="pt-2">
              <Button
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="w-full gap-2 font-semibold"
                size="lg"
              >
                {signingIn ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                {signingIn ? "Signing in…" : "Sign in with Google"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
