import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  type User,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "@/lib/firebase";

const ALLOWED_ADMIN_EMAILS = [
  "maitreya.mul@gmail.com",
  "manishm9730@gmail.com",
  "zorbainfotech@gmail.com",
  "zorbasquad@gmail.com",
  "maitreyam@google.com",
];

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Process redirect result if returning from Google auth redirect
    getRedirectResult(auth).catch((err) => {
      console.warn("getRedirectResult warning:", err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const emailLower = firebaseUser.email?.toLowerCase().trim() || "";
        const isWhitelisted = ALLOWED_ADMIN_EMAILS.includes(emailLower);

        // Authorize if whitelisted or registered in Firestore admins collection
        if (isWhitelisted) {
          setIsAdmin(true);
        } else {
          try {
            const snap = await getDoc(doc(db, "admins", emailLower));
            setIsAdmin(snap.exists());
          } catch {
            setIsAdmin(false);
          }
        }
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (popupErr: any) {
      console.warn("signInWithPopup error:", popupErr);
      if (
        popupErr?.code === "auth/popup-blocked" ||
        popupErr?.code === "auth/cancelled-popup-request"
      ) {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      throw popupErr;
    }
  };

  const signOut = async () => {
    setUser(null);
    setIsAdmin(false);
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
