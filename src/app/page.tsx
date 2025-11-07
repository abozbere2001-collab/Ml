
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
    const [isOnboardingComplete, setIsOnboardingComplete] = React.useState(true);
    const [isClient, setIsClient] = React.useState(false);

    React.useEffect(() => {
        setIsClient(true);
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
        </AdProvider>
    );
}
