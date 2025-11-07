
"use client";

import React from 'react';
import { AppContentWrapper } from '@/app/AppContentWrapper';
import { AdProvider } from '@/components/AdProvider';
import { WelcomeScreen } from '@/app/screens/WelcomeScreen';
import { useAuth } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { FavoriteSelectionScreen } from '@/app/screens/FavoriteSelectionScreen';
import { OnboardingHints } from '@/components/OnboardingHints';

export type ScreenKey = 'Welcome' | 'SignUp' | 'Matches' | 'Competitions' | 'AllCompetitions' | 'News' | 'Settings' | 'CompetitionDetails' | 'TeamDetails' | 'PlayerDetails' | 'AdminFavoriteTeamDetails' | 'Profile' | 'SeasonPredictions' | 'SeasonTeamSelection' | 'SeasonPlayerSelection' | 'AddEditNews' | 'ManageTopScorers' | 'MatchDetails' | 'NotificationSettings' | 'GeneralSettings' | 'ManagePinnedMatch' | 'PrivacyPolicy' | 'TermsOfService' | 'FavoriteSelection' | 'GoPro' | 'MyCountry' | 'Predictions';

export type ScreenProps = {
  navigate: (screen: ScreenKey, props?: Record<string, any>) => void;
  goBack: () => void;
  canGoBack: boolean;
  favorites?: any; // To accept props from wrapper
  onCustomNameChange?: () => Promise<void>; // Added for screens that need to trigger a re-fetch
  customNames?: any; // To accept props from wrapper
  setFavorites?: React.Dispatch<React.SetStateAction<Partial<import('@/lib/types').Favorites> | null>>;
};

const ONBOARDING_COMPLETE_KEY = 'goalstack_onboarding_complete_v1';
const HINTS_DISMISSED_KEY = 'goalstack_hints_dismissed_v1';

export default function Home() {
    const { user, isUserLoading } = useAuth();
    const [isOnboardingComplete, setIsOnboardingComplete] = React.useState(true);
    const [isClient, setIsClient] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<ScreenKey>('Matches');
    const [hintsDismissed, setHintsDismissed] = React.useState(true);

    React.useEffect(() => {
        setIsClient(true);
        // Force hints to be dismissed for a better studio experience
        if (typeof window !== 'undefined' && window.frameElement) {
             setHintsDismissed(true); 
        } else {
            const dismissed = localStorage.getItem(HINTS_DISMISSED_KEY);
            setHintsDismissed(dismissed === 'true');
        }
    }, []);

    React.useEffect(() => {
        if (!isClient || !user || user.isAnonymous) return;
        const onboardingStatus = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
        setIsOnboardingComplete(onboardingStatus === 'true');
    }, [user, isClient]);

    const handleOnboardingComplete = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
        }
        setIsOnboardingComplete(true);
    };
    
    // This effect is to listen to navigation changes from the AppContentWrapper
    React.useEffect(() => {
        const handleNavChange = (event: CustomEvent) => {
            setActiveTab(event.detail.activeTab);
        };
        window.addEventListener('navigationChange', handleNavChange as EventListener);
        return () => window.removeEventListener('navigationChange', handleNavChange as EventListener);
    }, []);

    if (isUserLoading || !isClient) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user) {
        return <WelcomeScreen />;
    }

    if (!isOnboardingComplete && !user.isAnonymous) {
        return <FavoriteSelectionScreen onOnboardingComplete={handleOnboardingComplete} />;
    }

    return (
        <AdProvider>
            <AppContentWrapper />
             { !hintsDismissed && user && !user.isAnonymous && (
                <OnboardingHints onDismiss={() => {
                    localStorage.setItem(HINTS_DISMISSED_KEY, 'true');
                    setHintsDismissed(true);
                }} activeTab={activeTab}/>
              )
            }
        </AdProvider>
    );
}
