
"use client";

import React, { useState, useEffect } from 'react';
import { AppContentWrapper } from './AppContentWrapper';
import { AdProvider } from '@/components/AdProvider';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { FavoriteSelectionScreen } from './screens/FavoriteSelectionScreen';
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

const ONBOARDING_COMPLETE_KEY = 'goalstack_onboarding_complete_v2';
const HINTS_DISMISSED_KEY = 'goalstack_hints_dismissed_v1';


export default function Home() {
    const { user, isUserLoading, profile } = useAuth();
    const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean | null>(null);
    const [showHints, setShowHints] = useState<boolean>(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const onboardingStatus = localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
            setIsOnboardingComplete(onboardingStatus);

            const hintsDismissed = localStorage.getItem(HINTS_DISMISSED_KEY) === 'true';
            // Show hints only if onboarding is complete AND they haven't been dismissed
            setShowHints(onboardingStatus && !hintsDismissed);
        }
    }, []);

    const handleOnboardingComplete = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
        }
        setIsOnboardingComplete(true);
        setShowHints(true); // Show hints right after onboarding
    };

    const handleHintsDismissed = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(HINTS_DISMISSED_KEY, 'true');
        }
        setShowHints(false);
    };
    
    // While checking user auth state or onboarding status, show a loader
    if (isUserLoading || isOnboardingComplete === null) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    // If no user, show the Welcome screen
    if (!user) {
        return <WelcomeScreen />;
    }

    // If user exists but onboarding is not complete, show the favorite selection
    if (!isOnboardingComplete && !profile?.onboardingComplete) {
        return <FavoriteSelectionScreen onOnboardingComplete={handleOnboardingComplete} />;
    }

    // Otherwise, show the main app content
    return (
        <AdProvider>
            <AppContentWrapper showHints={showHints} onHintsDismissed={handleHintsDismissed} />
        </AdProvider>
    );
}


    