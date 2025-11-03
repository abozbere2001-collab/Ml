
"use client";

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { FirebaseProvider } from './provider';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

// Static Firebase config, moved from the deleted config.ts file
const staticFirebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDKQK4mfCGlSCwJS7oOdMhJa0SIJAv3nXM",
  authDomain: "nabd-d71ab.firebaseapp.com",
  projectId: "nabd-d71ab",
  storageBucket: "nabd-d71ab.firebasestorage.app",
  messagingSenderId: "529236633123",
  appId: "1:529236633123:web:7d4945daae4d51038e3396",
  measurementId: "G-X5SY2K798F"
};


// This is a re-implementation of the context provider to simplify initialization
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const services = useMemo(() => {
    
    // Create a dynamic config that always uses the current window's hostname for auth.
    // This is the core fix for the `auth/unauthorized-domain` issue in ephemeral environments.
    const getDynamicConfig = (): FirebaseOptions => {
        const dynamicConfig = { ...staticFirebaseConfig };
        if (typeof window !== 'undefined') {
            dynamicConfig.authDomain = window.location.hostname;
        }
        return dynamicConfig;
    }

    const app = getApps().length ? getApp() : initializeApp(getDynamicConfig());
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    
    return { firebaseApp: app, auth, firestore };
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={services.firebaseApp}
      auth={services.auth}
      firestore={services.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
