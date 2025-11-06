
"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { MatchesScreen } from './screens/MatchesScreen';
import { CompetitionsScreen } from './screens/CompetitionsScreen';
import { AllCompetitionsScreen } from './screens/AllCompetitionsScreen';
import { NewsScreen } from './screens/NewsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { CompetitionDetailScreen } from './screens/CompetitionDetailScreen';
import { TeamDetailScreen } from './screens/TeamDetailScreen';
import { PlayerDetailScreen } from './screens/PlayerDetailScreen';
import { AdminFavoriteTeamScreen } from './screens/AdminFavoriteTeamScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SeasonPredictionsScreen } from './screens/SeasonPredictionsScreen';
import { SeasonTeamSelectionScreen } from './screens/SeasonTeamSelectionScreen';
import { SeasonPlayerSelectionScreen } from './screens/SeasonPlayerSelectionScreen';
import { AddEditNewsScreen } from './screens/AddEditNewsScreen';
import { ManagePinnedMatchScreen } from './screens/ManagePinnedMatchScreen';
import MatchDetailScreen from './screens/MatchDetailScreen';
import { NotificationSettingsScreen } from './screens/NotificationSettingsScreen';
import { GeneralSettingsScreen } from './screens/GeneralSettingsScreen';
import PrivacyPolicyScreen from './privacy-policy/page';
import TermsOfServiceScreen from './terms-of-service/page';
import { GoProScreen } from './screens/GoProScreen';
import type { ScreenKey } from './page';

import { useAd, SplashScreenAd } from '@/components/AdProvider';
import { useAuth, useFirestore } from '@/firebase';
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
import { ManageTopScorersScreen } from './screens/ManageTopScorersScreen';
import { IraqScreen } from './screens/IraqScreen';
import { PredictionsScreen } from './screens/PredictionsScreen';
import { doc, onSnapshot, getDocs, collection } from 'firebase/firestore';
import type { Favorites } from '@/lib/types';
import { getLocalFavorites, setLocalFavorites, GUEST_MODE_KEY } from '@/lib/local-favorites';
import { OnboardingHints } from '@/components/OnboardingHints';

const HINTS_DISMISSED_KEY = 'goalstack_hints_dismissed_v1';

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

    const handleSignOut = async () => {
        await signOut();
    };
    
    const navigateToProfile = () => {
        if ((window as any).appNavigate) {
            (window as any).appNavigate('Profile');
        }
    };
    
    const navigateToLogin = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem(GUEST_MODE_KEY);
            window.location.reload();
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
  const [favorites, setFavorites] = useState<Partial<Favorites>>({});
  const [customNames, setCustomNames] = useState<{ [key: string]: Map<number | string, string> } | null>(null);
  const [showHints, setShowHints] = useState<boolean>(false);
  
  useEffect(() => {
      // Defer reading from localStorage until the client has mounted
      const hintsDismissed = localStorage.getItem(HINTS_DISMISSED_KEY) === 'true';
      setShowHints(!hintsDismissed);
  }, []);
  
  const handleHintsDismissed = () => {
      if (typeof window !== 'undefined') {
          localStorage.setItem(HINTS_DISMISSED_KEY, 'true');
      }
      setShowHints(false);
  };
  
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

  const fetchCustomNames = useCallback(async () => {
    if (!db) {
        setCustomNames({ leagues: new Map(), teams: new Map(), countries: new Map(), continents: new Map(), players: new Map(), coaches: new Map() });
        return;
    }
    try {
        const [leaguesSnap, countriesSnap, continentsSnap, teamsSnap, playersSnap, coachesSnap] = await Promise.all([
            getDocs(collection(db, 'leagueCustomizations')),
            getDocs(collection(db, 'countryCustomizations')),
            getDocs(collection(db, 'continentCustomizations')),
            getDocs(collection(db, 'teamCustomizations')),
            getDocs(collection(db, 'playerCustomizations')),
            getDocs(collection(db, 'coachCustomizations')),
        ]);

        const newNames = {
            leagues: new Map<number | string, string>(),
            countries: new Map<number | string, string>(),
            continents: new Map<number | string, string>(),
            teams: new Map<number | string, string>(),
            players: new Map<number | string, string>(),
            coaches: new Map<number | string, string>()
        };
        leaguesSnap.forEach(doc => newNames.leagues.set(Number(doc.id), doc.data().customName));
        countriesSnap.forEach(doc => newNames.countries.set(doc.id, doc.data().customName));
        continentsSnap.forEach(doc => newNames.continents.set(doc.id, doc.data().customName));
        teamsSnap.forEach(doc => newNames.teams.set(Number(doc.id), doc.data().customName));
        playersSnap.forEach(doc => newNames.players.set(Number(doc.id), doc.data().customName));
        coachesSnap.forEach(doc => newNames.coaches.set(Number(doc.id), doc.data().customName));
        
        setCustomNames(newNames);

    } catch (error) {
        console.warn("Failed to fetch custom names, using empty maps.", error);
        setCustomNames({ leagues: new Map(), teams: new Map(), countries: new Map(), continents: new Map(), players: new Map(), coaches: new Map() });
    }
  }, [db]);
  
  useEffect(() => {
    fetchCustomNames();
  }, [fetchCustomNames]);
  
 const handleSetFavorites = useCallback((updater: React.SetStateAction<Partial<Favorites>>) => {
    setFavorites(currentFavorites => {
        const newFavorites = typeof updater === 'function' ? updater(currentFavorites) : updater;

        if (!user || user.isAnonymous) {
            setLocalFavorites(newFavorites);
        } else if (db) {
            const favDocRef = doc(db, 'users', user.uid, 'favorites', 'data');
            try {
                fetch(`/api/favorites`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.uid, favorites: newFavorites }),
                });
            } catch(e) {
                console.error("Favorites API call failed:", e);
            }
        }
        
        return newFavorites;
    });
}, [user, db]);


  useEffect(() => {
    let favsUnsub: (() => void) | null = null;
    const localFavsListener = () => {
        setFavorites(getLocalFavorites());
    };

    const cleanup = () => {
      if (favsUnsub) {
        favsUnsub();
        favsUnsub = null;
      }
      window.removeEventListener('localFavoritesChanged', localFavsListener);
    };

    cleanup();

    if (user && db && !user.isAnonymous) {
      const favDocRef = doc(db, 'users', user.uid, 'favorites', 'data');
      favsUnsub = onSnapshot(
        favDocRef,
        (doc) => {
          setFavorites(doc.exists() ? (doc.data() as Favorites) : {});
        },
        (error) => {
          console.error("Error listening to remote favorites:", error);
          setFavorites({});
        }
      );
    } else {
      setFavorites(getLocalFavorites());
      window.addEventListener('localFavoritesChanged', localFavsListener);
    }

    return () => cleanup();
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
          if (mainTabs.includes(screen)) {
              return {
                  ...prevState,
                  activeTab: screen,
                  stacks: {
                      ...prevState.stacks,
                      [screen]: [{ key: `${screen}-0`, screen: screen, props }]
                  }
              };
          }
          
          const newItem = { key: newKey, screen, props };
          const currentStack = prevState.stacks[prevState.activeTab] || [];
          return {
              ...prevState,
              stacks: {
                  ...prevState.stacks,
                  [prevState.activeTab]: [...currentStack, newItem]
              }
          };
      });
  }, []);
  
  useEffect(() => {
      if (typeof window !== 'undefined') {
          (window as any).appNavigate = navigate;
      }
  }, [navigate]);
  
  const isDataReady = customNames !== null;

  if (!isDataReady) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  if (showSplashAd) {
    return <SplashScreenAd />;
  }
  
  const activeStack = navigationState.stacks[navigationState.activeTab] || [];
  const CurrentScreen = activeStack.length > 0 ? screenConfig[activeStack[activeStack.length - 1].screen]?.component : null;
  const currentScreenProps = activeStack.length > 0 ? activeStack[activeStack.length - 1].props : {};

  const baseScreenProps = {
    navigate,
    goBack,
    customNames,
    favorites,
    setFavorites: handleSetFavorites,
    onCustomNameChange: fetchCustomNames,
    canGoBack: activeStack.length > 1,
  };
  
  const screenProps = {
    ...baseScreenProps,
    ...currentScreenProps,
    isVisible: true,
  };


  return (
    <main className="h-screen w-screen bg-background flex flex-col">
      {showHints && <OnboardingHints onDismiss={handleHintsDismissed} activeTab={navigationState.activeTab} />}
      
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
