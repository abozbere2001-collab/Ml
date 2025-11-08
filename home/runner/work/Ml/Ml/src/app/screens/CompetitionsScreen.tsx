

"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Star, Plus, Users, Trophy, User as PlayerIcon, Search } from 'lucide-react';
import type { ScreenProps } from '@/app/page';
import { Button } from '@/components/ui/button';
import { useAuth, useFirestore } from '@/firebase/provider';
import type { Favorites } from '@/lib/types';
import { SearchSheet } from '@/app/screens/SearchSheet';
import { ProfileButton } from '../AppContentWrapper';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hardcodedTranslations } from '@/lib/hardcoded-translations';
import { collection, getDocs } from 'firebase/firestore';

// --- MAIN SCREEN COMPONENT ---
export function CompetitionsScreen({ navigate, goBack, canGoBack, favorites, setFavorites, customNames, onCustomNameChange }: ScreenProps & {setFavorites: (favorites: Partial<Favorites> | null) => void, customNames: any, onCustomNameChange: () => void}) {
    const { user, db } = useAuth();
    
     const getDisplayName = useCallback((type: 'league' | 'team', id: number, defaultName: string) => {
        if (!customNames) return defaultName;
        const key = `${type}s` as 'leagues' | 'teams';
        const map = customNames[key] as Map<number, string>;
        const customName = map?.get(id);
        if (customName) return customName;

        const hardcodedMap = hardcodedTranslations[key];
        const hardcodedName = hardcodedMap[id as any];
        if (hardcodedName) return hardcodedName;

        return defaultName;
    }, [customNames]);


    const favoriteTeams = useMemo(() => {
      if (!favorites?.teams || !customNames) return [];
      return Object.values(favorites.teams).map(team => ({
        ...team,
        name: getDisplayName('team', team.teamId, team.name)
      }));
    }, [favorites, customNames, getDisplayName]);

    const favoriteLeagues = useMemo(() => {
        if (!favorites?.leagues || !customNames) return [];
        return Object.values(favorites.leagues).map(comp => ({
            ...comp,
            name: getDisplayName('league', comp.leagueId, comp.name)
        }));
    }, [favorites, customNames, getDisplayName]);

    const favoritePlayers = useMemo(() => favorites?.players ? Object.values(favorites.players) : [], [favorites?.players]);
    
    const handleLoginClick = () => {
        if ((window as any).appNavigate) {
            (window as any).appNavigate('Welcome');
        }
    }

    if (!favorites || !customNames) {
        // You can return a loading spinner here if you want
        return null;
    }

    return (
        <div class="flex h-full flex-col bg-background">
             <ScreenHeader 
                title={"اختياراتي"} 
                onBack={goBack} 
                canGoBack={canGoBack} 
                actions={
                  <div class="flex items-center gap-1">
                      <SearchSheet navigate={navigate} favorites={favorites} customNames={customNames} setFavorites={setFavorites} onCustomNameChange={onCustomNameChange}>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Search class="h-5 w-5" />
                          </Button>
                      </SearchSheet>
                      <ProfileButton />
                  </div>
                }
            />
            <div class="flex-1 flex flex-col min-h-0">
                <div class="flex-1 overflow-y-auto">
                     <div class="space-y-6 py-4">
                        <ScrollArea className="w-full whitespace-nowrap">
                            <div class="flex w-max space-x-4 px-4 flex-row-reverse">
                                 <div class="flex flex-col items-center gap-2 w-20 h-[84px] text-center">
                                      <SearchSheet navigate={navigate} initialItemType="teams" favorites={favorites} customNames={customNames} setFavorites={setFavorites} onCustomNameChange={onCustomNameChange}>
                                        <div class="flex flex-col items-center justify-center h-14 w-14 bg-card rounded-full cursor-pointer hover:bg-accent/50 transition-colors">
                                            <Plus class="h-6 w-6 text-primary" />
                                        </div>
                                      </SearchSheet>
                                      <span class="text-xs font-medium truncate w-full text-primary">أضف</span>
                                </div>
                                {favoriteTeams.map((team, index) => (
                                    <div key={`${team.teamId}-${index}`} className="relative flex flex-col items-center gap-2 w-20 text-center cursor-pointer" onClick={() => navigate('TeamDetails', { teamId: team.teamId })}>
                                        <Avatar className="h-14 w-14 border-2 border-border">
                                            <AvatarImage src={team.logo} />
                                            <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span class="text-xs font-medium truncate w-full">{team.name}</span>
                                        <Star class="absolute top-0 right-0 h-4 w-4 text-yellow-400 fill-current" />
                                    </div>
                                ))}
                            </div>
                            <ScrollBar orientation="horizontal" className="h-1.5 mt-2" />
                        </ScrollArea>

                        <Tabs defaultValue="teams" className="w-full px-1">
                             <div class="bg-card text-card-foreground rounded-b-lg border-x border-b shadow-md">
                                <TabsList className="grid w-full grid-cols-3 bg-transparent h-11 p-0">
                                    <TabsTrigger value="players" className="data-[state=active]:shadow-none"><PlayerIcon class="ml-1 h-4 w-4"/>اللاعبين</TabsTrigger>
                                    <TabsTrigger value="competitions" className="data-[state=active]:shadow-none"><Trophy class="ml-1 h-4 w-4"/>البطولات</TabsTrigger>
                                    <TabsTrigger value="teams" className="data-[state=active]:shadow-none"><Users class="ml-1 h-4 w-4"/>الفرق</TabsTrigger>
                                </TabsList>
                            </div>
                            
                            <TabsContent value="teams" className="mt-4 px-3">
                                <div class="grid grid-cols-4 gap-4">
                                     <div class="h-[76px] w-full">
                                         <SearchSheet navigate={navigate} initialItemType="teams" favorites={favorites} customNames={customNames} setFavorites={setFavorites} onCustomNameChange={onCustomNameChange}>
                                            <div class="flex flex-col items-center justify-center gap-2 text-center p-2 rounded-2xl border-2 border-dashed border-muted-foreground/50 h-full w-full cursor-pointer hover:bg-accent/50 transition-colors">
                                                <div class="flex items-center justify-center h-10 w-10 bg-primary/10 rounded-full">
                                                    <Plus class="h-6 w-6 text-primary" />
                                                </div>
                                            </div>
                                         </SearchSheet>
                                    </div>
                                    {favoriteTeams.map((team, index) => 
                                        <div key={`${team.teamId}-${index}`} className="relative flex flex-col items-center justify-start gap-1 text-center cursor-pointer h-[76px]" onClick={() => navigate('TeamDetails', { teamId: team.teamId })}>
                                            <Avatar className="h-12 w-12 border-2 border-border">
                                                <AvatarImage src={team.logo} />
                                                <AvatarFallback>{team.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span class="text-[11px] font-medium truncate w-full">{team.name}</span>
                                            <Star class="absolute top-1 right-1 h-3 w-3 text-yellow-400 fill-current" />
                                        </div>
                                    )}
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="competitions" className="mt-4 px-3">
                                <div class="grid grid-cols-4 gap-4">
                                    <div class="h-[76px] w-full">
                                        <SearchSheet navigate={navigate} initialItemType="leagues" favorites={favorites} customNames={customNames} setFavorites={setFavorites} onCustomNameChange={onCustomNameChange}>
                                            <div class="flex flex-col items-center justify-center gap-2 text-center p-2 rounded-2xl border-2 border-dashed border-muted-foreground/50 h-full w-full cursor-pointer hover:bg-accent/50 transition-colors">
                                                <div class="flex items-center justify-center h-10 w-10 bg-primary/10 rounded-full">
                                                    <Plus class="h-6 w-6 text-primary" />
                                                </div>
                                            </div>
                                        </SearchSheet>
                                    </div>
                                    {favoriteLeagues.map((comp, index) => 
                                        <div key={`${comp.leagueId}-${index}`} className="relative flex flex-col items-center justify-start gap-1 text-center cursor-pointer h-[76px]" onClick={() => navigate('CompetitionDetails', { title: comp.name, leagueId: comp.leagueId, logo: comp.logo })}>
                                            <Avatar className="h-12 w-12 border-2 border-border p-1">
                                                <AvatarImage src={comp.logo} className="object-contain" />
                                                <AvatarFallback>{comp.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                             <span class="text-[11px] font-medium truncate w-full">{comp.name}</span>
                                            <Star class="absolute top-1 right-1 h-3 w-3 text-yellow-400 fill-current" />
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            <TabsContent value="players" className="mt-4 px-3">
                                <div class="grid grid-cols-4 gap-4">
                                     <div class="h-[76px] w-full">
                                        <SearchSheet navigate={navigate} initialItemType="teams" favorites={favorites} customNames={customNames} setFavorites={setFavorites} onCustomNameChange={onCustomNameChange}>
                                            <div class="flex flex-col items-center justify-center gap-2 text-center p-2 rounded-2xl border-2 border-dashed border-muted-foreground/50 h-full w-full cursor-pointer hover:bg-accent/50 transition-colors">
                                                <div class="flex items-center justify-center h-10 w-10 bg-primary/10 rounded-full">
                                                    <Plus class="h-6 w-6 text-primary" />
                                                </div>
                                            </div>
                                        </SearchSheet>
                                     </div>
                                     <div class="h-[76px] w-full col-span-3 flex items-center justify-center">
                                        <p class="text-muted-foreground text-center text-sm">قائمة اللاعبين المفضلين قيد التطوير.</p>
                                     </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                         {user && user.isAnonymous && (
                            <div class="px-4 pt-4 text-center">
                                 <p class="text-sm text-muted-foreground mb-4">للحفاظ على مفضلاتك ومزامنتها عبر الأجهزة، قم بإنشاء حساب دائم.</p>
                                <Button onClick={handleLoginClick} className="w-full max-w-sm mx-auto">تسجيل الدخول أو إنشاء حساب</Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
