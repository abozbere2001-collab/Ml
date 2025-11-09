
"use client";

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from '@/components/ui/button';
import { Search, Star, Pencil, Loader2, Crown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useDebounce } from '@/hooks/use-debounce';
import type { ScreenProps } from '@/app/page';
import { useAdmin, useAuth, useFirestore } from '@/firebase';
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { RenameDialog } from '@/components/RenameDialog';
import { cn } from '@/lib/utils';
import type { Favorites, FavoriteLeague, FavoriteTeam, Team } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { POPULAR_TEAMS, POPULAR_LEAGUES } from '@/lib/popular-data';
import { hardcodedTranslations } from '@/lib/hardcoded-translations';

const API_FOOTBALL_HOST = 'v3.football.api-sports.io';
const API_KEY = process.env.NEXT_PUBLIC_API_FOOTBALL_KEY;

// --- TYPES ---
interface SearchTeam extends Team {}
interface SearchLeague { id: number; name: string; logo: string; }
type ItemType = 'teams' | 'leagues';
type RenameType = 'league' | 'team' | 'player' | 'continent' | 'country' | 'coach' | 'status' | 'crown';
type SearchItemOriginal = SearchTeam | SearchLeague;

interface SearchableItem {
    id: number;
    type: ItemType;
    name: string;
    originalName: string;
    logo: string;
    originalItem: SearchItemOriginal;
}

interface RenameState {
    id: string | number;
    name: string;
    note?: string;
    type: RenameType;
    purpose: 'rename' | 'note' | 'crown';
    originalData?: any;
    originalName?: string;
}

// --- HELPER FUNCTIONS ---
const normalizeArabic = (text: string) => {
  if (!text) return '';
  return text.replace(/[\u064B-\u0652]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/\s+/g, ' ').trim().toLowerCase();
};

const COMPETITIONS_CACHE_KEY = 'goalstack_all_competitions_cache_v1';
const TEAMS_CACHE_KEY = 'goalstack_national_teams_cache_v1';
interface Cache<T> { data: T; lastFetched: number; }
const getCachedData = <T,>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    try {
        const cachedData = localStorage.getItem(key);
        return cachedData ? (JSON.parse(cachedData) as Cache<T>).data : null;
    } catch (error) { return null; }
};


// --- SUB-COMPONENTS ---
const ItemRow = ({ item, type, isFavorited, isCrowned, onFavoriteToggle, onCrownToggle, onResultClick, onRename, isAdmin }: { item: SearchItemOriginal, type: ItemType, isFavorited: boolean, isCrowned: boolean, onFavoriteToggle: (item: SearchItemOriginal, type: ItemType) => void, onCrownToggle: (item: SearchItemOriginal) => void, onResultClick: () => void, onRename: () => void, isAdmin: boolean }) => (
    <div className="flex items-center gap-2 p-1.5 border-b last:border-b-0 hover:bg-accent/50 rounded-md">
       <div className="flex-1 flex items-center gap-2 cursor-pointer" onClick={onResultClick}>
            <Avatar className={cn('h-7 w-7', type === 'leagues' && 'p-0.5')}>
                <AvatarImage src={item.logo} alt={item.name} className={type === 'leagues' ? 'object-contain' : 'object-cover'} />
                <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 font-semibold truncate text-sm">{item.name}</div>
        </div>
        <div className="flex items-center">
            {isAdmin && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onRename(); }}>
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
            )}
            {type === 'teams' && (
                 <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onCrownToggle(item); }}>
                    <Crown className={cn("h-5 w-5 text-muted-foreground/60", isCrowned && "fill-current text-yellow-400")} />
                </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onFavoriteToggle(item, type); }}>
                <Star className={cn("h-5 w-5 text-muted-foreground/60", isFavorited && "fill-current text-yellow-400")} />
            </Button>
        </div>
    </div>
);


// --- MAIN COMPONENT ---
export function SearchSheet({ children, navigate, initialItemType, favorites, customNames, setFavorites, onCustomNameChange }: ScreenProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [searchResults, setSearchResults] = useState<SearchableItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [itemType, setItemType] = useState<ItemType>(initialItemType || 'teams');
  
  const { isAdmin } = useAdmin();
  const { user, db } = useFirestore();
  const { toast } = useToast();
  
  const [renameItem, setRenameItem] = useState<RenameState | null>(null);

  const getDisplayName = useCallback((type: 'team' | 'league', id: number, defaultName: string) => {
    if (!customNames) return defaultName;
    const customMap = type === 'team' ? customNames.teams : customNames.leagues;
    return customMap?.get(id) || hardcodedTranslations[`${type}s`]?.[id] || defaultName;
  }, [customNames]);


  const localSearchIndex = useMemo(() => {
    if (!customNames) return [];
    const index: SearchableItem[] = [];
    const seen = new Set<string>();

    const competitionsCache = getCachedData<any[]>(COMPETITIONS_CACHE_KEY);
    const nationalTeamsCache = getCachedData<Team[]>(TEAMS_CACHE_KEY);

    if (competitionsCache) {
      competitionsCache.forEach(comp => {
        const league = comp.league;
        const key = `leagues-${league.id}`;
        if (!seen.has(key)) {
            index.push({
                id: league.id, type: 'leagues', name: getDisplayName('league', league.id, league.name),
                originalName: league.name, logo: league.logo, originalItem: league as SearchLeague
            });
            seen.add(key);
        }
      });
    }
    if (nationalTeamsCache) {
      nationalTeamsCache.forEach(team => {
        const key = `teams-${team.id}`;
        if (!seen.has(key)) {
            index.push({
                id: team.id, type: 'teams', name: getDisplayName('team', team.id, team.name),
                originalName: team.name, logo: team.logo, originalItem: team as SearchTeam
            });
            seen.add(key);
        }
      });
    }
    return index;
  }, [customNames, getDisplayName]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchTerm('');
      setSearchResults([]);
      if (initialItemType) setItemType(initialItemType);
    }
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query || !API_KEY) { setSearchResults([]); return; }
    setLoading(true);
    const finalResults: SearchableItem[] = [];
    const seen = new Set<string>();
    const normalizedQuery = normalizeArabic(query);

    // 1. Search local index
    localSearchIndex.forEach(item => {
      if (normalizeArabic(item.name).includes(normalizedQuery) || normalizeArabic(item.originalName).includes(normalizedQuery)) {
        if (!seen.has(`${item.type}-${item.id}`)) {
          finalResults.push(item);
          seen.add(`${item.type}-${item.id}`);
        }
      }
    });

    // 2. Search API
    const apiSearchPromises = [
      fetch(`https://${API_FOOTBALL_HOST}/teams?search=${encodeURIComponent(query)}`, { headers: { 'x-rapidapi-key': API_KEY } }).then(res => res.ok ? res.json() : { response: [] }),
      fetch(`https://${API_FOOTBALL_HOST}/leagues?search=${encodeURIComponent(query)}`, { headers: { 'x-rapidapi-key': API_KEY } }).then(res => res.ok ? res.json() : { response: [] })
    ];
    try {
        const [teamsData, leaguesData] = await Promise.all(apiSearchPromises);
        teamsData.response?.forEach((r: { team: SearchTeam }) => {
            if (!seen.has(`teams-${r.team.id}`)) {
                finalResults.push({ id: r.team.id, type: 'teams', name: getDisplayName('team', r.team.id, r.team.name), originalName: r.team.name, logo: r.team.logo, originalItem: r.team });
                seen.add(`teams-${r.team.id}`);
            }
        });
        leaguesData.response?.forEach((r: { league: SearchLeague }) => {
            if (!seen.has(`leagues-${r.league.id}`)) {
                finalResults.push({ id: r.league.id, type: 'leagues', name: getDisplayName('league', r.league.id, r.league.name), originalName: r.league.name, logo: r.league.logo, originalItem: r.league });
                seen.add(`leagues-${r.league.id}`);
            }
        });
    } catch(e) { console.error("API search failed", e); }
    
    setSearchResults(finalResults);
    setLoading(false);
  }, [getDisplayName, localSearchIndex]);

  useEffect(() => {
    if (debouncedSearchTerm && isOpen) handleSearch(debouncedSearchTerm);
    else setSearchResults([]);
  }, [debouncedSearchTerm, handleSearch, isOpen]);

  const handleFavorite = useCallback((item: SearchItemOriginal, type: ItemType) => {
    const itemId = item.id;
    if (!setFavorites) return;

    setFavorites(prev => {
        if (!prev) return null;
        const newFavorites = JSON.parse(JSON.stringify(prev));
        if (!newFavorites[type]) newFavorites[type] = {};
        
        const isCurrentlyFavorited = !!newFavorites[type]?.[itemId];

        if (isCurrentlyFavorited) {
            delete newFavorites[type]![itemId];
        } else {
            const favData = type === 'leagues'
                ? { name: item.name, leagueId: itemId, logo: item.logo, notificationsEnabled: true } as FavoriteLeague
                : { name: (item as SearchTeam).name, teamId: itemId, logo: item.logo, type: (item as SearchTeam).national ? 'National' : 'Club', notificationsEnabled: true } as FavoriteTeam;
            newFavorites[type]![itemId] = favData as any;
        }
        return newFavorites;
    });
  }, [setFavorites]);

  const handleOpenCrownDialog = (team: SearchItemOriginal) => {
    if (!user) { toast({ title: 'مستخدم زائر', description: 'يرجى تسجيل الدخول لاستخدام هذه الميزة.' }); return; }
    setRenameItem({
        id: team.id, name: getDisplayName('team', team.id, team.name), type: 'crown', purpose: 'crown',
        originalData: team, note: favorites?.crownedTeams?.[team.id]?.note || '',
    });
  };

  const handleResultClick = (result: SearchableItem) => {
    if (result.type === 'teams') navigate('TeamDetails', { teamId: result.id });
    else navigate('CompetitionDetails', { leagueId: result.id, title: result.name, logo: result.logo });
    handleOpenChange(false);
  }

  const handleOpenRename = (type: RenameType, id: number, originalItem: SearchItemOriginal) => {
    const currentName = getDisplayName(type as 'team' | 'league', id, originalItem.name);
    setRenameItem({ id, name: currentName, type, originalData: originalItem, purpose: 'rename', originalName: originalItem.name });
  };
  
  const handleSaveRenameOrNote = (type: RenameType, id: string | number, newName: string, newNote: string = '') => {
    if (!renameItem || !db) return;
    const { purpose, originalData, originalName } = renameItem;

    if (purpose === 'rename' && isAdmin && onCustomNameChange) {
        const collectionName = `${type}Customizations`;
        const docRef = doc(db, collectionName, String(id));
        if (newName && newName !== originalName) setDoc(docRef, { customName: newName });
        else deleteDoc(docRef);
        onCustomNameChange();
    } else if (purpose === 'crown' && user && setFavorites) {
        const teamId = Number(id);
        setFavorites(prev => {
            if (!prev) return null;
            const newFavorites = JSON.parse(JSON.stringify(prev));
            if (!newFavorites.crownedTeams) newFavorites.crownedTeams = {};
            if (!!newFavorites.crownedTeams?.[teamId]) delete newFavorites.crownedTeams[teamId];
            else newFavorites.crownedTeams[teamId] = { teamId, name: (originalData as SearchTeam).name, logo: (originalData as SearchTeam).logo, note: newNote };
            return newFavorites;
        });
    }
    setRenameItem(null);
  };
  
  const popularItems = useMemo(() => {
    if (!customNames) return [];
    return [...POPULAR_TEAMS, ...POPULAR_LEAGUES].map(item => {
        const type: ItemType = 'national' in item || 'type' in item ? 'teams' : 'leagues';
        return {
            id: item.id, type, name: getDisplayName(type.slice(0, -1) as 'team' | 'league', item.id, item.name),
            originalName: item.name, logo: item.logo, originalItem: item as SearchItemOriginal,
        };
    }).filter((item, index, self) => index === self.findIndex(t => t.id === item.id && t.type === item.type));
  }, [getDisplayName, customNames]);

  const renderContent = () => {
    if (!favorites || !customNames) return <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    if (loading) return <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    
    const itemsToDisplay = debouncedSearchTerm ? searchResults : popularItems.filter(item => item.type === itemType);
    if (itemsToDisplay.length === 0) return <p className="text-muted-foreground text-center pt-8">{debouncedSearchTerm ? "لا توجد نتائج بحث." : "لا توجد عناصر شائعة."}</p>;

    return (
        <div className="space-y-2">
            {!debouncedSearchTerm && <h3 className="font-bold text-md text-center text-muted-foreground">{itemType === 'teams' ? 'الفرق الأكثر شعبية' : 'البطولات الأكثر شعبية'}</h3>}
            {itemsToDisplay.map(result => {
                const isFavorited = !!favorites?.[result.type]?.[result.id];
                const isCrowned = result.type === 'teams' && !!favorites?.crownedTeams?.[result.id];
                return (
                    <ItemRow
                        key={`${result.type}-${result.id}`}
                        item={{...result.originalItem, name: result.name}}
                        type={result.type}
                        isFavorited={isFavorited}
                        isCrowned={isCrowned}
                        onFavoriteToggle={handleFavorite}
                        onCrownToggle={handleOpenCrownDialog}
                        onResultClick={() => handleResultClick(result)}
                        isAdmin={isAdmin}
                        onRename={() => handleOpenRename(result.type as RenameType, result.id, result.originalItem)}
                    />
                );
            })}
        </div>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild onClick={(e) => { e.stopPropagation(); setIsOpen(true) }}>{children}</SheetTrigger>
      <SheetContent side="bottom" className="flex flex-col h-[90vh] top-0 rounded-t-none">
        <SheetHeader><SheetTitle>اكتشف</SheetTitle></SheetHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="ابحث عن فريق أو بطولة..." className="pl-10 text-md" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {!debouncedSearchTerm && (
             <div className="flex items-center justify-center pt-2">
                <Button variant={itemType === 'teams' ? 'secondary' : 'ghost'} size="sm" onClick={() => setItemType('teams')}>الفرق</Button>
                <Button variant={itemType === 'leagues' ? 'secondary' : 'ghost'} size="sm" onClick={() => setItemType('leagues')}>البطولات</Button>
            </div>
        )}
        <div className="mt-4 flex-1 overflow-y-auto space-y-1 pr-2 relative">{renderContent()}</div>
        {renameItem && <RenameDialog isOpen={!!renameItem} onOpenChange={(isOpen) => !isOpen && setRenameItem(null)} item={renameItem} onSave={(type, id, name, note) => handleSaveRenameOrNote(type, id, name, note || '')} />}
      </SheetContent>
    </Sheet>
  );
}
