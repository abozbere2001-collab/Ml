
"use client";

import React, { useState, useEffect, useMemo, type ReactNode } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { FirebaseProvider } from './provider';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDKQK4mfCGlSCwJS7oOdMhJa0SIJAv3nXM",
  authDomain: "nabd-d71ab.firebaseapp.com",
  projectId: "nabd-d71ab",
  storageBucket: "nabd-d71ab.appspot.com",
  messagingSenderId: "529236633123",
  appId: "1:529236633123:web:7d4945daae4d51038e3396",
  measurementId: "G-X5SY2K798F"
};

interface FirebaseServices {
    firebaseApp: FirebaseApp;
    auth: Auth;
    firestore: Firestore;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [services, setServices] = useState<FirebaseServices | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This effect runs only on the client side.
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    
    setServices({ firebaseApp: app, auth, firestore });
    setLoading(false);

  }, []); // Empty dependency array ensures this runs only once on mount.

  // Render nothing until Firebase is fully initialized on the client.
  if (loading || !services) {
    return null; 
  }

  // Once initialized, provide the Firebase services to the rest of the app.
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
