
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import type { UserProfile } from '@/lib/types';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; 
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  isProUser: boolean;
  isAdmin: boolean;
  profile: UserProfile | null;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser extends Omit<FirebaseContextState, 'firebaseApp' | 'firestore' | 'auth'> {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true); // Start loading until first auth event
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isProUser, setIsProUser] = useState(false);


  useEffect(() => {
    if (!auth || !firestore) {
      setIsUserLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
            const adminDocRef = doc(firestore, 'admins', firebaseUser.uid);
            const profileDocRef = doc(firestore, 'users', firebaseUser.uid);
            
            const [adminSnap, profileSnap] = await Promise.all([
                getDoc(adminDocRef),
                getDoc(profileDocRef)
            ]);
            
            setIsAdmin(adminSnap.exists());

            if (profileSnap.exists()) {
                const profileData = profileSnap.data() as UserProfile;
                setProfile(profileData);
                setIsProUser(profileData.isProUser || false);
            } else {
                setProfile(null);
                setIsProUser(false);
            }

        } catch (e) {
            console.error("Error fetching user data", e);
            setProfile(null);
            setIsAdmin(false);
            setIsProUser(false);
        }

      } else {
        // No user, reset all user-related state
        setProfile(null);
        setIsAdmin(false);
        setIsProUser(false);
      }

      setIsUserLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  const contextValue = useMemo((): FirebaseContextState => ({
    firebaseApp,
    firestore,
    auth,
    user,
    isUserLoading,
    profile,
    isAdmin,
    isProUser,
    userError: null, // This can be enhanced later if needed
  }), [firebaseApp, firestore, auth, user, isUserLoading, profile, isAdmin, isProUser]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) throw new Error('useFirebase must be used within a FirebaseProvider.');
  if (!context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available. Check FirebaseProvider props.');
  }
  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    isProUser: context.isProUser,
    isAdmin: context.isAdmin,
    profile: context.profile,
  };
};

export const useAuth = () => {
    const context = useContext(FirebaseContext);
    if (context === undefined) throw new Error('useAuth must be used within a FirebaseProvider.');
    return {
        user: context.user,
        isUserLoading: context.isUserLoading,
        userError: context.userError,
        isProUser: context.isProUser,
        profile: context.profile,
        setProUser: async (isPro: boolean): Promise<void> => {
            if (context.user && context.firestore) {
                const userDocRef = doc(context.firestore, 'users', context.user.uid);
                try {
                    await setDoc(userDocRef, { isProUser: isPro }, { merge: true });
                } catch(error) {
                    errorEmitter.emit('permission-error', new FirestorePermissionError({
                        path: userDocRef.path,
                        operation: 'update',
                        requestResourceData: { isProUser: isPro },
                    }));
                }
            }
        }
    };
};

export const useAdmin = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) throw new Error('useAdmin must be used within a FirebaseProvider.');

  const makeAdmin = useCallback(async () => {
    if (context.user && context.firestore && !context.isAdmin) {
      const adminDocRef = doc(context.firestore, 'admins', context.user.uid);
      try {
        await setDoc(adminDocRef, { grantedAt: new Date() });
      } catch (error) {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: adminDocRef.path,
                operation: 'create',
                requestResourceData: { grantedAt: '...' },
            }));
      }
    }
  }, [context]);

  return {
    isAdmin: context.isAdmin,
    isCheckingAdmin: context.isUserLoading,
    db: context.firestore, // providing db from here for convenience
    makeAdmin,
  };
};

export const useFirestore = (): { db: Firestore | null } => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirestore must be used within a FirebaseProvider.');
  }
  return { db: context.firestore };
};

export const useFirebaseApp = (): FirebaseApp => {
  const { firebaseApp } = useFirebase();
  if (!firebaseApp) throw new Error("Firebase App not available");
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

export const useUser = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) throw new Error('useUser must be used within a FirebaseProvider.');
  return {
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    isProUser: context.isProUser,
    isAdmin: context.isAdmin,
    profile: context.profile,
  };
};
