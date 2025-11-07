
"use client";

import React from 'react';
import { AppContentWrapper } from './AppContentWrapper';
import { AdProvider } from '@/components/AdProvider';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { useAuth } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { FavoriteSelectionScreen } from './screens/FavoriteSelectionScreen';

export type ScreenKey = 'Welcome' | 'SignUp' | 'Matches' | 'Competitions' | 'AllCompetitions' | 'News' | 'Settings' | 'CompetitionDetails' | 'TeamDetails' | 'PlayerDetails' | 'AdminFavoriteTeamDetails' | 'Profile' | 'SeasonPredictions' | 'SeasonTeamSelection' | 'SeasonPlayerSelection' | 'AddEditNews' | 'ManageTopScorers' | 'MatchDetails' | 'NotificationSettings' | 'GeneralSettings' | 'ManagePinnedMatch' | 'PrivacyPolicy' | 'TermsOfService' | 'FavoriteSelection' | 'GoPro' | 'MyCountry' | 'Predictions';

export type ScreenProps = {
  navigate: (screen: ScreenKey, props?: Record<string, any>) => void;
  goBack: () => void;
  canGoBack: boolean;
  favorites?: any; // To accept props from wrapper
  customNames?: any; // To accept props from wrapper
};

const ONBOARDING_COMPLETE_KEY = 'goalstack_onboarding_complete_v1';

export default function Home() {
    const { user, isUserLoading } = useAuth();
    const [isOnboardingComplete, setIsOnboardingComplete] = React.useState(true); // Default to true to avoid flashes
    const [isClient, setIsClient] = React.useState(false);

    // This effect runs once on the client to indicate it has mounted.
    React.useEffect(() => {
        setIsClient(true);
    }, []);

    // This effect checks for onboarding status once the client has mounted and the user is known.
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
    
    // Render a loader until the client has mounted and auth state is known.
    // This is the single source of truth for initial loading.
    if (!isClient || isUserLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    // If there's no user, show the welcome screen.
    if (!user) {
        return <WelcomeScreen />;
    }

    // If the user is logged in but hasn't completed onboarding, show the selection screen.
    if (!isOnboardingComplete && !user.isAnonymous) {
        return <FavoriteSelectionScreen onOnboardingComplete={handleOnboardingComplete} />;
    }

    // If the user is logged in and onboarded, show the main app.
    return (
        <AdProvider>
            <AppContentWrapper />
        </AdProvider>
    );
}
