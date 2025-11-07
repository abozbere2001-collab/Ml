
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { Loader2 } from 'lucide-react';

// 1. Basic context state for auth status
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

// 2. The main provider component
export const FirebaseProvider: React.FC<{
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}> = ({ children, firebaseApp, firestore, auth }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsUserLoading(false);
    });

    return () => unsubscribe();
  }, [auth]);

  const contextValue = useMemo((): FirebaseContextState => ({
    firebaseApp,
    firestore,
    auth,
    user,
    isUserLoading,
  }), [firebaseApp, firestore, auth, user, isUserLoading]);
  
  if (isUserLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

// 3. Simplified Hooks
export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

export const useAuth = () => {
  const context = useFirebase();
  return {
    user: context.user,
    isUserLoading: context.isUserLoading,
    setProUser: (isPro: boolean) => { /* Mock function, does nothing */ }
  };
};

export const useAdmin = () => {
  const { user, firestore, isUserLoading } = useFirebase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    if (isUserLoading || !user || !firestore || user.isAnonymous) {
      setIsAdmin(false);
      setIsCheckingAdmin(false);
      return;
    }
    
    setIsCheckingAdmin(true);
    const adminDocRef = doc(firestore, 'admins', user.uid);
    getDoc(adminDocRef).then(docSnap => {
      setIsAdmin(docSnap.exists());
    }).catch(() => {
      setIsAdmin(false);
    }).finally(() => {
      setIsCheckingAdmin(false);
    });
  }, [user, firestore, isUserLoading]);
  
  const makeAdmin = async () => {
    if (!user || !firestore || isAdmin) return;
    try {
        await setDoc(doc(firestore, 'admins', user.uid), { isAdmin: true });
        setIsAdmin(true);
    } catch(e) {
        console.error("Failed to become admin", e);
    }
  }

  return { isAdmin, isCheckingAdmin, db: firestore, makeAdmin };
};

export const useFirestore = (): { db: Firestore | null } => {
  const context = useFirebase();
  return { db: context.firestore };
};

export const useFirebaseApp = (): FirebaseApp | null => {
  const context = useFirebase();
  return context.firebaseApp;
};
