
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  user: User | null;
  isUserLoading: boolean;
  setProUser: (isPro: boolean) => Promise<void>;
}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

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

  const setProUser = async (isPro: boolean) => {
    if (user && firestore) {
      const userRef = doc(firestore, 'users', user.uid);
      await setDoc(userRef, { isProUser: isPro }, { merge: true });
      // Force a token refresh to get the latest custom claims if any
      if (user) {
        await user.getIdToken(true);
      }
      // Re-set user to trigger re-renders
      setUser({ ...user } as User); 
    }
  };

  const contextValue = useMemo((): FirebaseContextState => ({
    firebaseApp,
    firestore,
    auth,
    user,
    isUserLoading,
    setProUser,
  }), [firebaseApp, firestore, auth, user, isUserLoading]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};


export const useFirebase = (): FirebaseContextState => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }
  return context;
};

export const useAuth = () => {
    const context = useContext(FirebaseContext);
    if (context === undefined) throw new Error('useAuth must be used within a FirebaseProvider.');
    return {
        user: context.user,
        isUserLoading: context.isUserLoading,
        setProUser: context.setProUser,
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
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirestore must be used within a FirebaseProvider.');
  }
  return { db: context.firestore };
};

export const useFirebaseApp = (): FirebaseApp | null => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error("useFirebaseApp must be used within a FirebaseProvider");
  }
  return context.firebaseApp;
};
