

"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { MatchesScreen } from '@/app/screens/MatchesScreen';
import { CompetitionsScreen } from '@/app/screens/CompetitionsScreen';
import { AllCompetitionsScreen } from '@/app/screens/AllCompetitionsScreen';
import { NewsScreen } from '@/app/screens/NewsScreen';
import { SettingsScreen } from '@/app/screens/SettingsScreen';
import { CompetitionDetailScreen } from '@/app/screens/CompetitionDetailScreen';
import { TeamDetailScreen } from '@/app/screens/TeamDetailScreen';
import { PlayerDetailScreen } from '@/app/screens/PlayerDetailScreen';
import { AdminFavoriteTeamScreen } from '@/app/screens/AdminFavoriteTeamScreen';
import { ProfileScreen } from '@/app/screens/ProfileScreen';
import { SeasonPredictionsScreen } from '@/app/screens/SeasonPredictionsScreen';
import { SeasonTeamSelectionScreen } from '@/app/screens/SeasonTeamSelectionScreen';
import { SeasonPlayerSelectionScreen } from '@/app/screens/SeasonPlayerSelectionScreen';
import { AddEditNewsScreen } from '@/app/screens/AddEditNewsScreen';
import { ManagePinnedMatchScreen } from '@/app/screens/ManagePinnedMatchScreen';
import MatchDetailScreen from '@/app/screens/MatchDetailScreen';
import { NotificationSettingsScreen } from '@/app/screens/NotificationSettingsScreen';
import { GeneralSettingsScreen } from '@/app/screens/GeneralSettingsScreen';
import PrivacyPolicyScreen from '@/app/screens/PrivacyPolicyScreen';
import TermsOfServiceScreen from '@/app/screens/TermsOfServiceScreen';
import { GoProScreen } from '@/app/screens/GoProScreen';
import type { ScreenKey } from './page';

import { useAd, SplashScreenAd } from '@/components/AdProvider';
import { useAuth, useFirestore, useAdmin } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User as UserIcon, Loader2 } from 'lucide-react';
import { signOut } from '@/lib/firebase-client';
import { cn } from '@/lib/utils';
import { ManageTopScorersScreen } from '@/app/screens/ManageTopScorersScreen';
import { IraqScreen } from '@/app/screens/IraqScreen';
import { PredictionsScreen } from '@/app/screens/PredictionsScreen';
import { doc, getDoc, setDoc, getDocs, collection, onSnapshot, writeBatch } from 'firebase/firestore';
import type { Favorites } from '@/lib/types';
import { getLocalFavorites, setLocalFavorites } from '@/lib/local-favorites';
import { errorEmitter, FirestorePermissionError } from '@/firebase';

const screenConfig: Record<string, { component: React.ComponentType<any>;}> = {
  Matches: { component: MatchesScreen },
  Competitions: { component: CompetitionsScreen },
  AllCompetitions: { component: AllCompetitionsScreen },
  News: { component: NewsScreen },
  Settings: { component: SettingsScreen },
  CompetitionDetails: { component: CompetitionDetailScreen },
  TeamDetails: { component: TeamDetailScreen },
  PlayerDetails: { component: PlayerDetailScreen },
  AdminFavoriteTeamDetails: { component: AdminFavoriteTeamScreen },
  Profile: { component: ProfileScreen },
  SeasonPredictions: { component: SeasonPredictionsScreen },
  SeasonTeamSelection: { component: SeasonTeamSelectionScreen },
  SeasonPlayerSelection: { component: SeasonPlayerSelectionScreen },
  AddEditNews: { component: AddEditNewsScreen },
  ManagePinnedMatch: { component: ManagePinnedMatchScreen },
  MatchDetails: { component: MatchDetailScreen },
  NotificationSettings: { component: NotificationSettingsScreen },
  GeneralSettings: { component: GeneralSettingsScreen },
  PrivacyPolicy: { component: PrivacyPolicyScreen },
  TermsOfService: { component: TermsOfServiceScreen },
  GoPro: { component: GoProScreen },
  ManageTopScorers: { component: ManageTopScorersScreen },
  MyCountry: { component: IraqScreen },
  Predictions: { component: PredictionsScreen },
};


const mainTabs: ScreenKey[] = ['Matches', 'MyCountry', 'Predictions', 'Competitions', 'News', 'Settings'];

type StackItem = {
  key: string;
  screen: ScreenKey;
  props?: Record<string, any>;
};

export const ProfileButton = () => {
    const { user } = useAuth();
    const { isAdmin } = useAdmin();

    const handleSignOut = async () => {
        await signOut();
    };
    
    const navigateToProfile = () => {
        if ((window as any).appNavigate) {
            (window as any).appNavigate('Profile');
        }
    };
    
    const navigateToLogin = () => {
        if ((window as any).appNavigate) {
            (window as any).appNavigate('Welcome');
        }
    }

    if (!user) {
        return (
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={navigateToLogin}>
                <UserIcon className="h-4 w-4" />
            </Button>
        );
    }
    
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-7 w-7 rounded-full">
                    <Avatar className="h-7 w-7">
                        <AvatarImage src={user.photoURL || ''} alt={user.displayName || ''} />
                        <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                     {isAdmin && <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={navigateToProfile}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>الملف الشخصي</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>تسجيل الخروج</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export function AppContentWrapper() {
  const { user } = useAuth();
  const { db } = useFirestore();
  const [favorites, setFavorites] = useState<Partial<import('@/lib/types').Favorites> | null>(null);
  const [customNames, setCustomNames] = useState<any>(null);

  
  const [navigationState, setNavigationState] = useState<{ activeTab: ScreenKey, stacks: Record<string, StackItem[]> }>({
    activeTab: 'Matches',
    stacks: {
        'Matches': [{ key: 'Matches-0', screen: 'Matches' }],
        'Competitions': [{ key: 'Competitions-0', screen: 'Competitions' }],
        'News': [{ key: 'News-0', screen: 'News' }],
        'MyCountry': [{ key: 'MyCountry-0', screen: 'MyCountry' }],
        'Predictions': [{ key: 'Predictions-0', screen: 'Predictions' }],
        'Settings': [{ key: 'Settings-0', screen: 'Settings' }],
    },
  });

  const { showSplashAd } = useAd();
  const keyCounter = useRef(1);

    const fetchAllCustomNames = useCallback(async () => {
        if (!db) {
            setCustomNames({ leagues: new Map(), teams: new Map(), countries: new Map(), continents: new Map(), players: new Map(), coaches: new Map(), matches: new Map() });
            return;
        }

        const collectionsToFetch = {
            leagues: 'leagueCustomizations',
            teams: 'teamCustomizations',
            players: 'playerCustomizations',
            coaches: 'coachCustomizations',
            countries: 'countryCustomizations',
            continents: 'continentCustomizations',
            matches: 'matchCustomizations',
        };

        const newNames: any = {};
        const promises = Object.entries(collectionsToFetch).map(async ([key, collectionName]) => {
            try {
                const snapshot = await getDocs(collection(db, collectionName));
                const idKey = key === 'countries' || key === 'continents' ? 'string' : 'number';
                
                if (key === 'matches') {
                    newNames[key] = new Map(snapshot.docs.map(doc => [doc.id, doc.data().customStatus]));
                } else {
                    newNames[key] = new Map(snapshot.docs.map(doc => [
                        idKey === 'number' ? Number(doc.id) : doc.id,
                        doc.data().customName
                    ]));
                }
            } catch (error: any) {
                 if (error.code !== 'permission-denied') {
                    console.warn(`Could not fetch ${collectionName}:`, error.message);
                }
                newNames[key] = new Map();
            }
        });

        await Promise.all(promises);
        setCustomNames(newNames);

    }, [db]);


  const handleSetFavorites = useCallback((updater: React.SetStateAction<Partial<Favorites> | null>) => {
    const newFavorites = typeof updater === 'function' ? updater(favorites) : updater;
    setFavorites(newFavorites);

    if (!user) {
        setLocalFavorites(newFavorites || {});
    } else if (db && newFavorites) {
        const favDocRef = doc(db, 'users', user.uid, 'favorites', 'data');
        setDoc(favDocRef, newFavorites, { merge: true }).catch(serverError => {
            const permissionError = new FirestorePermissionError({
                path: favDocRef.path,
                operation: 'write',
                requestResourceData: newFavorites,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
    }
  }, [user, db, favorites]);

  
  useEffect(() => {
    fetchAllCustomNames();
  }, [fetchAllCustomNames]);

  const handleLocalFavoritesChange = useCallback(() => {
      if (!user) {
          setFavorites(getLocalFavorites());
      }
  }, [user]);

  useEffect(() => {
    window.addEventListener('localFavoritesChanged', handleLocalFavoritesChange);
    return () => {
        window.removeEventListener('localFavoritesChanged', handleLocalFavoritesChange);
    }
  }, [handleLocalFavoritesChange]);


  useEffect(() => {
    if (!db) {
      setFavorites(getLocalFavorites());
      return;
    }
  
    if (user) {
        const favDocRef = doc(db, 'users', user.uid, 'favorites', 'data');
        const unsubscribe = onSnapshot(favDocRef, (docSnap) => {
            setFavorites(docSnap.exists() ? docSnap.data() as Favorites : {});
        }, (error) => {
            const permissionError = new FirestorePermissionError({ path: favDocRef.path, operation: 'get' });
            errorEmitter.emit('permission-error', permissionError);
            setFavorites({}); // Fallback to empty on error
        });

        return () => unsubscribe();
    } else {
      setFavorites(getLocalFavorites());
    }
  }, [user, db]);


  const goBack = useCallback(() => {
    setNavigationState(prevState => {
        const currentStack = prevState.stacks[prevState.activeTab];
        if (currentStack.length > 1) {
            return {
                ...prevState,
                stacks: {
                    ...prevState.stacks,
                    [prevState.activeTab]: currentStack.slice(0, -1),
                }
            };
        }
        if (!mainTabs.includes(prevState.activeTab)) {
            return { ...prevState, activeTab: 'Matches' };
        }
        return prevState;
    });
  }, []);

  const navigate = useCallback((screen: ScreenKey, props?: Record<string, any>) => {
      const newKey = `${screen}-${keyCounter.current++}`;
      
      setNavigationState(prevState => {
          const newState = { ...prevState };
          if (mainTabs.includes(screen)) {
              newState.activeTab = screen;
              newState.stacks[screen] = [{ key: `${screen}-0`, screen: screen, props }];
          } else {
              const newItem = { key: newKey, screen, props };
              const currentStack = newState.stacks[newState.activeTab] || [];
              newState.stacks[newState.activeTab] = [...currentStack, newItem];
          }
          
          window.dispatchEvent(new CustomEvent('navigationChange', { detail: { activeTab: newState.activeTab } }));
          return newState;
      });
  }, []);
  
  useEffect(() => {
      if (typeof window !== 'undefined') {
          (window as any).appNavigate = navigate;
      }
  }, [navigate]);

  if (showSplashAd) {
    return <SplashScreenAd />;
  }

  if (favorites === null || customNames === null) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }
  
  const activeStack = navigationState.stacks[navigationState.activeTab] || [];

  const baseScreenProps = {
    navigate,
    goBack,
    favorites,
    setFavorites: handleSetFavorites,
    customNames,
    onCustomNameChange: fetchAllCustomNames,
  };

  return (
    <main className="h-screen w-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col overflow-hidden">
        {mainTabs.map(tabKey => {
            const stack = navigationState.stacks[tabKey];
            const isTabActive = navigationState.activeTab === tabKey;
            
            return (
                <div key={tabKey} className={cn("h-full w-full", isTabActive ? "flex flex-col" : "hidden")}>
                    {stack.map((stackItem, index) => {
                         const isScreenActive = index === stack.length - 1;
                         const Component = screenConfig[stackItem.screen]?.component;
                         if (!Component) return null;
                         
                         return (
                            <div key={stackItem.key} className={cn("h-full w-full", isScreenActive ? "flex flex-col" : "hidden")}>
                                <Component {...baseScreenProps} {...stackItem.props} isVisible={isScreenActive} canGoBack={stack.length > 1} />
                            </div>
                         )
                    })}
                </div>
            )
        })}
      </div>
      
      {mainTabs.includes(navigationState.stacks[navigationState.activeTab]?.slice(-1)[0]?.screen) && 
        <BottomNav activeScreen={navigationState.activeTab} onNavigate={(screen) => navigate(screen)} />
      }
    </main>
  );
}

    

    

    

    

    