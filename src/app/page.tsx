
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/firebase';
import { AppContentWrapper } from './AppContentWrapper';
import { AdProvider } from '@/components/AdProvider';
import { Loader2 } from 'lucide-react';
import { FavoriteSelectionScreen } from './screens/FavoriteSelectionScreen';
import { NabdAlMalaebLogo } from '@/components/icons/NabdAlMalaebLogo';
import { WelcomeScreen, GUEST_MODE_KEY } from './screens/WelcomeScreen';

export type ScreenKey = 'Welcome' | 'SignUp' | 'Matches' | 'Competitions' | 'AllCompetitions' | 'News' | 'Settings' | 'CompetitionDetails' | 'TeamDetails' | 'PlayerDetails' | 'AdminFavoriteTeamDetails' | 'Profile' | 'SeasonPredictions' | 'SeasonTeamSelection' | 'SeasonPlayerSelection' | 'AddEditNews' | 'ManageTopScorers' | 'MatchDetails' | 'NotificationSettings' | 'GeneralSettings' | 'ManagePinnedMatch' | 'PrivacyPolicy' | 'TermsOfService' | 'FavoriteSelection' | 'GoPro' | 'MyCountry' | 'Predictions';

export type ScreenProps = {
  navigate: (screen: ScreenKey, props?: Record<string, any>) => void;
  goBack: () => void;
  canGoBack: boolean;
  favorites?: any; // To accept props from wrapper
  customNames?: any; // To accept props from wrapper
};

const GUEST_ONBOARDING_COMPLETE_KEY = 'goalstack_guest_onboarding_complete';
const NEW_USER_HINTS_SHOWN_KEY = 'goalstack_new_user_hints_shown';

const LoadingSplashScreen = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-background text-center">
        <NabdAlMalaebLogo className="h-24 w-24 mb-4" />
        <h1 className="text-2xl font-bold font-headline mb-8 text-primary">نبض الملاعب</h1>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
);

export default function Home() {
    const { isUserLoading } = useAuth();
    const [initialLoad, setInitialLoad] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setInitialLoad(false);
        }, 1500); // Simulate a loading time to allow Firebase to initialize

        return () => clearTimeout(timer);
    }, []);

    if (isUserLoading || initialLoad) {
        return <LoadingSplashScreen />;
    }

    return (
        <AdProvider>
            <AppContentWrapper showHints={false} onHintsDismissed={() => {}} />
        </AdProvider>
    );
}
