import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ZorbaLogoIcon } from "@/components/common/ZorbaLogo";
import {
  ShieldAlert,
  LogOut,
  Wrench,
  MessageSquare,
  Mail,
  Users,
  Truck,
  HardDrive,
  Lock,
  ArrowRight,
} from "lucide-react";

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
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  // Handle case where user is signed in but not authorized as admin
  const isUnauthorized = user && !isAdmin;

  const erpFeatures = [
    {
      icon: Wrench,
      title: "Service Call & Job Card Management",
      desc: "Complete hardware service lifecycle tracking from device intake, inspection, parts replacement, to testing and delivery.",
    },
    {
      icon: MessageSquare,
      title: "WhatsApp Customer Notifications",
      desc: "Instant automated WhatsApp messages for intake confirmation, diagnostic estimates, readiness alerts, and job card receipts.",
    },
    {
      icon: Mail,
      title: "Direct Customer Email Updates",
      desc: "Dispatches branded HTML service receipts and status updates directly to customers via authorized staff Gmail accounts.",
    },
    {
      icon: Users,
      title: "Customer & Client CRM Directory",
      desc: "Unified customer master database with duplicate phone prevention, service history lookup, and GST billing profiles.",
    },
    {
      icon: Truck,
      title: "Service Center & Courier Logistics",
      desc: "Vendor RMA tracking, courier docket logging (Trackon/Reliance), and authorized service center warranty handovers.",
    },
    {
      icon: HardDrive,
      title: "Cloud Backup & System Administration",
      desc: "Role-based access control, master data management, and secure Google Drive data synchronization.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ZorbaLogoIcon className="h-8 w-8 drop-shadow-md" />
          <div className="flex items-center gap-2">
            <span className="font-extrabold font-display tracking-tight text-white text-base">
              ZORBA INFOTECH
            </span>
            <span className="text-slate-600 dark:text-slate-600 font-normal">|</span>
            <span className="text-xs text-slate-400 font-medium">
              ERP Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold">
          <Link
            to="/"
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
          >
            Store Website <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 md:py-14 flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-14">
        {/* Left Column: ERP Platform Purpose & Feature Highlights */}
        <div className="flex-1 max-w-2xl space-y-6 text-left">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black font-display tracking-tight text-white leading-tight">
              Zorba Infotech <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400">
                Service & Operations ERP
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-xl">
              Internal business management and customer service portal for Zorba Infotech. Built for managing multi-brand hardware repairs, technician workflows, customer notifications, and distribution operations.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            {erpFeatures.map((f, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition-colors space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20 shrink-0">
                    <f.icon className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-white leading-tight">{f.title}</h3>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Google Sign-In Card */}
        <div className="w-full max-w-md shrink-0">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl text-center space-y-6 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

            <div className="space-y-2">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3 shadow-inner">
                <ZorbaLogoIcon className="h-10 w-10 drop-shadow-md" />
              </div>
              <h2 className="text-xl font-bold font-display text-white">Staff Authentication</h2>
              <p className="text-xs text-slate-400">
                Sign in with your authorized Google workspace account
              </p>
            </div>

            {isUnauthorized ? (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs text-rose-300 text-left space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-sm text-rose-200">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>Access Denied</span>
                </div>
                <p className="leading-relaxed">
                  Your Google account (<span className="font-semibold text-white">{user?.email}</span>) is not registered as an authorized Zorba administrator.
                </p>
                <p className="text-[11px] text-slate-400 pt-0.5">
                  Please contact the administrator to grant access to your email address.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut()}
                  className="w-full mt-2 gap-2 text-xs border-rose-500/40 text-rose-300 hover:bg-rose-500/20 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out & Switch Account
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {error && (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 text-xs text-rose-300 text-left leading-relaxed">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleGoogleSignIn}
                  disabled={signingIn}
                  className="w-full h-12 gap-3 font-bold text-sm bg-white hover:bg-slate-100 text-slate-900 rounded-xl shadow-lg shadow-white/5 transition-all cursor-pointer"
                  size="lg"
                >
                  {signingIn ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
                  ) : (
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                  <span>{signingIn ? "Authenticating…" : "Sign in with Google"}</span>
                </Button>

                <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                  <Lock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>Authorized Personnel Only &bull; 256-bit Encrypted</span>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-center gap-3">
              <Link to="/privacy-policy" className="hover:text-slate-300 underline underline-offset-2">
                Privacy Policy
              </Link>
              <span>&bull;</span>
              <Link to="/terms-of-service" className="hover:text-slate-300 underline underline-offset-2">
                Terms of Service
              </Link>
              <span>&bull;</span>
              <Link to="/contact" className="hover:text-slate-300 underline underline-offset-2">
                Help & Support
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Notice */}
      <footer className="border-t border-slate-800/80 bg-slate-950 px-6 py-4 text-center text-xs text-slate-400">
        <p>
          &copy; {new Date().getFullYear()} Zorba Infotech. All rights reserved. | Neemuch, Madhya Pradesh, India.
        </p>
      </footer>
    </div>
  );
}
