
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

// Internal state for user authentication
interface UserAuthState {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  isProUser: boolean;
  isAdmin: boolean;
  profile: UserProfile | null;
}

// Combined state for the Firebase context
export interface FirebaseContextState extends UserAuthState {
  areServicesAvailable: boolean; // True if core services (app, firestore, auth instance) are provided
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null; // The Auth service instance
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser extends UserAuthState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// Return type for useUser() - specific to user auth state
export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
  isProUser: boolean;
  isAdmin: boolean;
  profile: UserProfile | null;
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
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({
    user: null,
    isUserLoading: true, // Start loading until first auth event
    userError: null,
    isProUser: false,
    isAdmin: false,
    profile: null,
  });

  useEffect(() => {
    if (!auth || !firestore) {
      setUserAuthState({ user: null, isUserLoading: false, userError: new Error("Auth or Firestore service not provided."), isProUser: false, isAdmin: false, profile: null });
      return;
    }

    setUserAuthState(prev => ({ ...prev, isUserLoading: true }));

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          const profileDocRef = doc(firestore, 'users', firebaseUser.uid);
          const adminDocRef = doc(firestore, 'admins', firebaseUser.uid);

          Promise.all([getDoc(profileDocRef), getDoc(adminDocRef)])
            .then(([profileSnap, adminSnap]) => {
              const profileData = profileSnap.exists() ? (profileSnap.data() as UserProfile) : null;
              setUserAuthState({
                user: firebaseUser,
                isUserLoading: false,
                userError: null,
                isProUser: profileData?.isProUser ?? false,
                isAdmin: adminSnap.exists(),
                profile: profileData,
              });
            })
            .catch(error => {
              console.error("Error fetching user profile or admin status:", error);
              setUserAuthState({
                user: firebaseUser,
                isUserLoading: false,
                userError: error,
                isProUser: false,
                isAdmin: false,
                profile: null,
              });
            });
        } else {
          // No user, reset state
          setUserAuthState({ user: null, isUserLoading: false, userError: null, isProUser: false, isAdmin: false, profile: null });
        }
      },
      (error) => {
        console.error("FirebaseProvider: onAuthStateChanged error:", error);
        setUserAuthState({ user: null, isUserLoading: false, userError: error, isProUser: false, isAdmin: false, profile: null });
      }
    );
    return () => unsubscribe();
  }, [auth, firestore]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      ...userAuthState,
    };
  }, [firebaseApp, firestore, auth, userAuthState]);

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
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
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
        // Manually update local state to reflect change immediately
        // This is a bit of a hack, the provider should ideally refetch
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
  return firebaseApp;
};

type MemoFirebase <T> = T & {__memo?: boolean};

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T | (MemoFirebase<T>) {
  const memoized = useMemo(factory, deps);
  
  if(typeof memoized !== 'object' || memoized === null) return memoized;
  (memoized as MemoFirebase<T>).__memo = true;
  
  return memoized;
}

export const useUser = (): UserHookResult => {
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
