
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
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { Favorites } from '@/lib/types';
import { getLocalFavorites, setLocalFavorites } from '@/lib/local-favorites';

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
  const [favorites, setFavorites] = useState<Partial<Favorites> | null>(null);
  
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

 const handleSetFavorites = useCallback((updater: React.SetStateAction<Partial<Favorites> | null>) => {
    setFavorites(currentFavorites => {
        const newFavorites = typeof updater === 'function' ? updater(currentFavorites) : updater;

        if (!user || user.isAnonymous) {
            setLocalFavorites(newFavorites || {});
        } else if (db && newFavorites) {
            const favDocRef = doc(db, 'users', user.uid, 'favorites', 'data');
            try {
                // Use the new favorites state directly
                setDoc(favDocRef, newFavorites, { merge: true });
            } catch(e) {
                console.error("Favorites API call failed:", e);
            }
        }
        
        return newFavorites;
    });
}, [user, db]);


  useEffect(() => {
    const fetchRemoteFavorites = async () => {
        if (user && db && !user.isAnonymous) {
            const favDocRef = doc(db, 'users', user.uid, 'favorites', 'data');
            try {
                const docSnap = await getDoc(favDocRef);
                if (docSnap.exists()) {
                    setFavorites(docSnap.data() as Favorites);
                } else {
                    setFavorites({});
                }
            } catch (error) {
                console.error("Error fetching remote favorites:", error);
                setFavorites({}); // Set empty on error
            }
        }
    };
    
    if (user && !user.isAnonymous) {
      fetchRemoteFavorites();
    } else {
      setFavorites(getLocalFavorites());
      // No need for a listener for local storage, we update state directly.
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

  if (showSplashAd) {
    return <SplashScreenAd />;
  }

  // Render a loading state until favorites are loaded
  if (favorites === null) {
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
