
"use client";

import React, { useState, useEffect } from 'react';
import { AppContentWrapper } from './AppContentWrapper';
import { AdProvider } from '@/components/AdProvider';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { useAuth } from '@/firebase';
import { Loader2 } from 'lucide-react';

export type ScreenKey = 'Welcome' | 'SignUp' | 'Matches' | 'Competitions' | 'AllCompetitions' | 'News' | 'Settings' | 'CompetitionDetails' | 'TeamDetails' | 'PlayerDetails' | 'AdminFavoriteTeamDetails' | 'Profile' | 'SeasonPredictions' | 'SeasonTeamSelection' | 'SeasonPlayerSelection' | 'AddEditNews' | 'ManageTopScorers' | 'MatchDetails' | 'NotificationSettings' | 'GeneralSettings' | 'ManagePinnedMatch' | 'PrivacyPolicy' | 'TermsOfService' | 'FavoriteSelection' | 'GoPro' | 'MyCountry' | 'Predictions';

export type ScreenProps = {
  navigate: (screen: ScreenKey, props?: Record<string, any>) => void;
  goBack: () => void;
  canGoBack: boolean;
  favorites?: any; // To accept props from wrapper
  customNames?: any; // To accept props from wrapper
};

const HINTS_DISMISSED_KEY = 'goalstack_hints_dismissed_v1';


export default function Home() {
    const { user, isUserLoading } = useAuth();
    const [showHints, setShowHints] = useState<boolean>(false);

    useEffect(() => {
        const hintsDismissed = localStorage.getItem(HINTS_DISMISSED_KEY) === 'true';
        setShowHints(!hintsDismissed);
    }, []);


    const handleHintsDismissed = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(HINTS_DISMISSED_KEY, 'true');
        }
        setShowHints(false);
    };
    
    // The main loading indicator is now handled by the FirebaseClientProvider.
    // This component will only render its content *after* isUserLoading is false.
    if (isUserLoading) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    // Once loading is complete, decide which screen to show.
    if (!user) {
        return <WelcomeScreen />;
    }

    // If there is a user, show the main app content.
    return (
        <AdProvider>
            <AppContentWrapper showHints={showHints} onHintsDismissed={handleHintsDismissed} />
        </AdProvider>
    );
}
