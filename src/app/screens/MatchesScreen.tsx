
"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import type { ScreenProps } from '@/app/page';
import { format, addDays, subDays, isToday } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useAuth, useFirestore, useAdmin } from '@/firebase/provider';
import { doc, getDocs, collection, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Loader2, Search, Star, Crown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { Button } from '@/components/ui/button';
import { SearchSheet } from '@/components/SearchSheet';
import { ProfileButton } from '../AppContentWrapper';
import type { Fixture as FixtureType, Favorites, PredictionMatch } from '@/lib/types';
import { FixtureItem } from '@/components/FixtureItem';
import { hardcodedTranslations } from '@/lib/hardcoded-translations';
import { POPULAR_LEAGUES } from '@/lib/popular-data';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { NabdAlMalaebLogo } from '@/components/icons/NabdAlMalaebLogo';

const API_FOOTBALL_HOST = 'v3.football.api-sports.io';
const API_KEY = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;

interface GroupedFixtures {
    [leagueName: string]: {
        league: FixtureType['league'];
        fixtures: FixtureType[];
    }
}

const popularLeagueIds = new Set(POPULAR_LEAGUES.slice(0, 15).map(l => l.id));

const FixturesList = React.memo((props: { 
    fixtures: FixtureType[], 
    loading: boolean,
    error: string | null,
    hasAnyFavorites: boolean,
    favoritedLeagueIds: number[],
    favoritedTeamIds: number[],
    navigate: ScreenProps['navigate'],
    pinnedPredictionMatches: Set<number>,
    onPinToggle: (fixture: FixtureType) => void,
    isAdmin: boolean,
    showOdds?: boolean,
}) => {
    
    const { favoriteTeamMatches, otherFixtures } = useMemo(() => {
        let favoriteTeamMatches: FixtureType[] = [];
        let otherFixturesList: FixtureType[] = [];

         if (props.hasAnyFavorites) {
             props.fixtures.forEach(f => {
                if (props.favoritedTeamIds.includes(f.teams.home.id) || props.favoritedTeamIds.includes(f.teams.away.id)) {
                    favoriteTeamMatches.push(f);
                } else if (props.favoritedLeagueIds.includes(f.league.id)) {
                    otherFixturesList.push(f);
                }
            });
        } else {
             // If no favorites, show popular leagues only
            otherFixturesList = props.fixtures.filter(f => popularLeagueIds.has(f.league.id));
        }

        return { favoriteTeamMatches, otherFixtures: otherFixturesList };

    }, [props.fixtures, props.favoritedTeamIds, props.favoritedLeagueIds, props.hasAnyFavorites]);


    const groupedOtherFixtures = useMemo(() => {
        return otherFixtures.reduce((acc, fixture) => {
            const leagueName = fixture.league.name;
            if (!acc[leagueName]) {
                acc[leagueName] = { league: fixture.league, fixtures: [] };
            }
            acc[leagueName].fixtures.push(fixture);
            return acc;
        }, {} as GroupedFixtures);
    }, [otherFixtures]);


    if (props.loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }
    
    if (props.error) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-destructive h-64 p-4">
                <p>خطأ في تحميل المباريات.</p>
                <p className="text-xs">{props.error}</p>
            </div>
        )
    }
    
    const totalFixturesToShow = favoriteTeamMatches.length + otherFixtures.length;

    if (totalFixturesToShow === 0) {
        const message = props.hasAnyFavorites ? "لا توجد مباريات لمفضلاتك في هذا اليوم." : "لا توجد مباريات لهذا اليوم.";
        return (
            <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-64 p-4">
                <p>{message}</p>
                <Button className="mt-4" onClick={() => props.navigate('AllCompetitions')}>استكشف البطولات</Button>
            </div>
        );
    }
    
    const sortedLeagues = Object.keys(groupedOtherFixtures).sort((a,b) => a.localeCompare(b));

    return (
        <div className="space-y-4">
            {favoriteTeamMatches.length > 0 && (
                 <div>
                    <div className="font-semibold text-foreground py-1 px-3 rounded-md bg-card border flex items-center gap-2 text-xs h-6">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span className="truncate">مباريات فرقك المفضلة</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                        {favoriteTeamMatches.map(f => (
                            <FixtureItem 
                                key={f.fixture.id} 
                                fixture={f} 
                                navigate={props.navigate}
                                isPinnedForPrediction={props.pinnedPredictionMatches.has(f.fixture.id)}
                                onPinToggle={props.onPinToggle}
                                isAdmin={props.isAdmin}
                                showOdds={props.showOdds}
                            />
                        ))}
                    </div>
                </div>
            )}

            {sortedLeagues.map(leagueName => {
                const { league, fixtures: leagueFixtures } = groupedOtherFixtures[leagueName];
                return (
                    <div key={`${league.id}-${league.name}`}>
                       <div className="font-semibold text-foreground py-1 px-3 rounded-md bg-card border flex items-center gap-2 text-xs h-6 cursor-pointer" onClick={() => props.navigate('CompetitionDetails', { leagueId: league.id, title: league.name, logo: league.logo })}>
                           <Avatar className="h-4 w-4"><AvatarImage src={league.logo} alt={league.name} /></Avatar>
                           <span className="truncate">{league.name}</span>
                       </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 pt-1">
                            {leagueFixtures.map(f => (
                                <FixtureItem 
                                    key={f.fixture.id} 
                                    fixture={f} 
                                    navigate={props.navigate}
                                    isPinnedForPrediction={props.pinnedPredictionMatches.has(f.fixture.id)}
                                    onPinToggle={props.onPinToggle}
                                    isAdmin={props.isAdmin}
                                    showOdds={props.showOdds}
                                />
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    );
});
FixturesList.displayName = 'FixturesList';


const formatDateKey = (date: Date): string => format(date, 'yyyy-MM-dd');

const getDayLabel = (date: Date) => {
    if (isToday(date)) return "اليوم";
    return format(date, "EEEE", { locale: ar });
};

const DateScroller = ({ selectedDateKey, onDateSelect }: {selectedDateKey: string, onDateSelect: (dateKey: string) => void}) => {
    const dates = useMemo(() => {
        const today = new Date();
        const days = [];
        for (let i = -365; i <= 365; i++) {
            days.push(addDays(today, i));
        }
        return days;
    }, []);
    
    const scrollerRef = useRef<HTMLDivElement>(null);
    const selectedButtonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        const scroller = scrollerRef.current;
        const selectedButton = selectedButtonRef.current;
        
        const centerOnSelected = () => {
            if (scroller && selectedButton) {
                const scrollerRect = scroller.getBoundingClientRect();
                const buttonRect = selectedButton.getBoundingClientRect();
                const scrollOffset = buttonRect.left - scrollerRect.left - (scrollerRect.width / 2) + (buttonRect.width / 2);
                scroller.scrollTo({ left: scroller.scrollLeft + scrollOffset, behavior: 'smooth' });
            }
        };
        setTimeout(centerOnSelected, 100);
    }, [selectedDateKey]);
    
    const selectedDayName = getDayLabel(new Date(selectedDateKey));

    return (
        <div className="relative bg-card py-2 border-x border-b rounded-b-lg shadow-md flex flex-col items-center">
            <h3 className="text-sm font-semibold mb-2 text-center text-primary">{selectedDayName}</h3>
            <div className="flex items-center w-full px-1">
                <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-9 w-9 z-10 flex-shrink-0"
                    onClick={() => onDateSelect(formatDateKey(subDays(new Date(selectedDateKey), 1)))}
                >
                    <ChevronRight className="h-5 w-5" />
                </Button>
                <ScrollArea ref={scrollerRef} className="w-full whitespace-nowrap mx-1">
                    <div className="flex flex-row-reverse justify-start items-center h-9">
                        {dates.map(date => {
                            const dateKey = formatDateKey(date);
                            const isSelected = dateKey === selectedDateKey;

                            return (
                                <button
                                    key={dateKey}
                                    ref={isSelected ? selectedButtonRef : null}
                                    className={cn(
                                        "relative flex items-center justify-center h-8 w-8 rounded-full transition-colors ml-2 flex-shrink-0",
                                        "text-foreground/80 hover:text-primary",
                                        isSelected && "bg-primary text-primary-foreground"
                                    )}
                                    onClick={() => onDateSelect(dateKey)}
                                >
                                    <span className="font-semibold text-sm">{format(date, 'd')}</span>
                                </button>
                            )
                        })}
                    </div>
                    <ScrollBar orientation="horizontal" className="h-0" />
                </ScrollArea>
                <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-9 w-9 z-10 flex-shrink-0"
                    onClick={() => onDateSelect(formatDateKey(addDays(new Date(selectedDateKey), 1)))}
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
            </div>
        </div>
    );
}

// Main Screen Component
export function MatchesScreen({ navigate, goBack, canGoBack, isVisible, favorites, setFavorites, customNames, onCustomNameChange }: ScreenProps & { isVisible: boolean, setFavorites: React.Dispatch<React.SetStateAction<Partial<Favorites> | null>>, customNames: any, onCustomNameChange: () => void }) {
  const { user } = useAuth();
  const { db, isAdmin, isCheckingAdmin } = useAdmin();
  const { toast } = useToast();
  const [showOdds, setShowOdds] = useState(false);
  
  const [selectedDateKey, setSelectedDateKey] = useState<string>(formatDateKey(new Date()));
  
  const [matchesCache, setMatchesCache] = useState<Map<string, FixtureType[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
    
  const [pinnedPredictionMatches, setPinnedPredictionMatches] = useState(new Set<number>());
  

  useEffect(() => {
    if (!db || !isAdmin) return;
    
    const q = collection(db, "predictionFixtures");
    const unsub = onSnapshot(q, (snapshot) => {
        const newPinnedSet = new Set<number>();
        snapshot.forEach(doc => newPinnedSet.add(Number(doc.id)));
        setPinnedPredictionMatches(newPinnedSet);
    }, (err) => {
        if ((err as any).code === 'permission-denied') {
            console.warn("Permission denied for predictionFixtures listener. This is expected for non-admins.");
        } else {
            console.error("Error fetching predictions for admin:", err);
        }
    });

    return () => unsub();
  }, [db, isAdmin]);

  const getDisplayName = useCallback((type: 'team' | 'league', id: number, defaultName: string) => {
    if (!customNames) return defaultName;
    const firestoreMap = type === 'team' ? customNames?.teams : customNames?.leagues;
    const customName = firestoreMap?.get(id);
    if (customName) return customName;

    const hardcodedMap = type === 'team' ? hardcodedTranslations.teams : hardcodedTranslations.leagues;
    const hardcodedName = hardcodedMap[id as any];
    if(hardcodedName) return hardcodedName;

    return defaultName;
}, [customNames]);


  const handlePinToggle = useCallback((fixture: FixtureType) => {
    if (!db || !isAdmin) return;
    const fixtureId = fixture.fixture.id;
    const isPinned = pinnedPredictionMatches.has(fixtureId);
    const docRef = doc(db, 'predictionFixtures', String(fixtureId));

    if (isPinned) {
        deleteDoc(docRef).then(() => {
            toast({ title: "تم إلغاء التثبيت", description: "تمت إزالة المباراة من التوقعات." });
        }).catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'delete' }));
        });
    } else {
        const data: PredictionMatch = { fixtureData: fixture };
        setDoc(docRef, data).then(() => {
            toast({ title: "تم التثبيت", description: "أصبحت المباراة متاحة الآن للتوقع." });
        }).catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({ path: docRef.path, operation: 'create', requestResourceData: data }));
        });
    }
  }, [db, pinnedPredictionMatches, toast, isAdmin]);

    const fetchAndProcessData = useCallback(async (dateKey: string, abortSignal: AbortSignal) => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`https://v3.football.api-sports.io/fixtures?date=${dateKey}`, { 
                signal: abortSignal,
                headers: { 'x-rapidapi-key': API_KEY || '' },
             });
            if (!res.ok) {
                 const errorData = await res.json();
                 const errorMessage = errorData?.message || `API fetch failed with status ${res.status}`;
                 throw new Error(errorMessage);
            }
            
            const data = await res.json();
            if (abortSignal.aborted) return;
            
            const allFixturesToday: FixtureType[] = data.response || [];
            
            const processedFixtures = allFixturesToday.map(fixture => ({
                ...fixture,
                league: { ...fixture.league, name: getDisplayName('league', fixture.league.id, fixture.league.name) },
                teams: {
                    home: { ...fixture.teams.home, name: getDisplayName('team', fixture.teams.home.id, fixture.teams.home.name) },
                    away: { ...fixture.teams.away, name: getDisplayName('team', fixture.teams.away.id, fixture.teams.away.name) }
                }
            }));
            
            setMatchesCache(prev => new Map(prev).set(dateKey, processedFixtures));

        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error(`Failed to fetch data for ${dateKey}:`, error);
                setError(error.message);
                setMatchesCache(prev => new Map(prev).set(dateKey, []));
            }
        } finally {
            if (!abortSignal.aborted) setLoading(false);
        }
    }, [getDisplayName]);

    const updateLiveData = useCallback(async (dateKey: string, abortSignal: AbortSignal) => {
        const cachedFixtures = matchesCache.get(dateKey);
        if (!cachedFixtures) return;

        const liveFixtureIds = cachedFixtures
            .filter(f => f.fixture.status.short !== 'FT' && f.fixture.status.short !== 'PST' && f.fixture.status.short !== 'CANC')
            .map(f => f.fixture.id);

        if (liveFixtureIds.length === 0) return;
        
        try {
            const res = await fetch(`https://v3.football.api-sports.io/fixtures?ids=${liveFixtureIds.join('-')}`, { 
                signal: abortSignal,
                headers: { 'x-rapidapi-key': API_KEY || '' },
            });
            if (!res.ok) return;

            const data = await res.json();
            if (abortSignal.aborted || !data.response) return;

            const updatedFixturesMap = new Map(data.response.map((f: FixtureType) => [f.fixture.id, f]));
            
            const newFixtures = cachedFixtures.map(oldFixture => {
                const updatedFixture = updatedFixturesMap.get(oldFixture.fixture.id);
                return updatedFixture ? {
                    ...updatedFixture,
                    league: { ...updatedFixture.league, name: getDisplayName('league', updatedFixture.league.id, updatedFixture.league.name) },
                    teams: {
                        home: { ...updatedFixture.teams.home, name: getDisplayName('team', updatedFixture.teams.home.id, updatedFixture.teams.home.name) },
                        away: { ...updatedFixture.teams.away, name: getDisplayName('team', updatedFixture.teams.away.id, updatedFixture.teams.away.name) }
                    }
                } : oldFixture;
            });
            
            setMatchesCache(prev => new Map(prev).set(dateKey, newFixtures));

        } catch (error: any) {
            if (error.name !== 'AbortError') console.error("Live update failed:", error);
        }

    }, [matchesCache, getDisplayName]);

  
  useEffect(() => {
      if (!isVisible || !customNames || !API_KEY) return;

      const controller = new AbortController();
      
      if (!matchesCache.has(selectedDateKey)) {
          fetchAndProcessData(selectedDateKey, controller.signal);
      } else {
          setLoading(false);
          setError(null);
      }
      
      const interval = setInterval(() => {
          if (document.visibilityState === 'visible') {
            updateLiveData(selectedDateKey, controller.signal);
          }
      }, 60000);

      return () => {
          controller.abort();
          clearInterval(interval);
      };

  }, [selectedDateKey, isVisible, customNames, matchesCache, fetchAndProcessData, updateLiveData]);


  const handleDateChange = (dateKey: string) => {
      setSelectedDateKey(dateKey);
  };
  
  const favoritedTeamIds = useMemo(() => (favorites && favorites.teams) ? Object.keys(favorites.teams).map(Number) : [], [favorites]);
  const favoritedLeagueIds = useMemo(() => (favorites && favorites.leagues) ? Object.keys(favorites.leagues).map(Number) : [], [favorites]);
  const hasAnyFavorites = favoritedLeagueIds.length > 0 || favoritedTeamIds.length > 0;
  
  const allFixturesForDay = matchesCache.get(selectedDateKey) || [];

  if (customNames === null) {
      return (
        <div className="flex h-full flex-col bg-background">
            <ScreenHeader title="" canGoBack={false} onBack={() => {}} />
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        </div>
      );
  }
    
  return (
    <div className="flex h-full flex-col bg-background">
        <ScreenHeader 
            title="نبض الملاعب" 
            canGoBack={false}
            onBack={() => {}} 
            actions={
               <div className="flex items-center gap-0.5">
                  <div
                    onClick={() => setShowOdds(prev => !prev)}
                    className={cn("flex items-center justify-center h-7 w-7 rounded-md cursor-pointer", showOdds ? 'bg-accent' : 'hover:bg-accent/50')}
                  >
                    <span className="text-xs font-mono select-none">1x2</span>
                  </div>
                   <SearchSheet navigate={navigate} favorites={favorites} customNames={customNames} setFavorites={setFavorites} onCustomNameChange={onCustomNameChange}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Search className="h-5 w-5" />
                      </Button>
                  </SearchSheet>
                  <ProfileButton />
              </div>
            }
        />
        
        <div className="flex flex-1 flex-col min-h-0">
             <div className="sticky top-0 z-10 px-1 pt-1 bg-background">
                 <DateScroller selectedDateKey={selectedDateKey} onDateSelect={handleDateChange} />
            </div>
            
            <div className="flex-1 overflow-y-auto p-1 space-y-4 mt-2">
                <FixturesList 
                    fixtures={allFixturesForDay}
                    loading={loading}
                    error={error}
                    favoritedLeagueIds={favoritedLeagueIds}
                    favoritedTeamIds={favoritedTeamIds}
                    hasAnyFavorites={hasAnyFavorites}
                    navigate={navigate}
                    pinnedPredictionMatches={pinnedPredictionMatches}
                    onPinToggle={handlePinToggle}
                    isAdmin={isAdmin}
                    showOdds={showOdds}
                />
            </div>

        </div>
    </div>
  );
}
