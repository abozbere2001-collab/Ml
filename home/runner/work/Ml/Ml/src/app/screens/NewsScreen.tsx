

"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ScreenProps } from '@/app/page';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Loader2, Search } from 'lucide-react';
import { useFirestore, useAdmin } from '@/firebase';
import { collection, query, orderBy, doc, deleteDoc, getDocs } from 'firebase/firestore';
import type { NewsArticle } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import { SearchSheet } from '@/app/screens/SearchSheet';
import { ProfileButton } from '../AppContentWrapper';

export function NewsScreen({ navigate, goBack, canGoBack, favorites, setFavorites, customNames, onCustomNameChange }: ScreenProps & {setFavorites: (favorites: any) => void, customNames: any, onCustomNameChange: () => void}) {
  const { isAdmin } = useAdmin();
  const { db } = useFirestore();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (!db) {
        setLoading(false);
        return;
    }
    setLoading(true);
    const newsCollectionRef = collection(db, 'news');
    const q = query(newsCollectionRef, orderBy('timestamp', 'desc'));
    
    getDocs(q).then(snapshot => {
      const fetchedNews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NewsArticle));
      setNews(fetchedNews);
      setLoading(false);
    }).catch(error => {
      console.error("Error fetching news:", error);
      // We don't use the permission error emitter here because public read should be allowed.
      // A failure here is more likely a network issue or misconfiguration.
      toast({
          variant: "destructive",
          title: "فشل تحميل الأخبار",
          description: "حدث خطأ أثناء محاولة جلب الأخبار. يرجى المحاولة مرة أخرى."
      });
      setLoading(false);
    });

  }, [db, toast]);
  
  const handleDelete = (articleId: string) => {
    if (!db) return;
    setDeletingId(articleId);
    const docRef = doc(db, 'news', articleId);
    deleteDoc(docRef)
        .then(() => {
            toast({ title: "نجاح", description: "تم حذف الخبر بنجاح." });
            setNews(prevNews => prevNews.filter(article => article.id !== articleId));
        })
        .catch(serverError => {
            const permissionError = new FirestorePermissionError({ path: docRef.path, operation: 'delete' });
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => setDeletingId(null));
  };


  return (
    <div class="flex h-full flex-col bg-background">
      <ScreenHeader 
        title={"أخبار"} 
        onBack={goBack} 
        canGoBack={canGoBack} 
        actions={
          <div class="flex items-center gap-1">
              <SearchSheet navigate={navigate} favorites={favorites} customNames={customNames} setFavorites={setFavorites} onCustomNameChange={onCustomNameChange}>
                  <Button variant="ghost" size="icon">
                      <Search class="h-5 w-5" />
                  </Button>
              </SearchSheet>
              <ProfileButton />
          </div>
        }
      />
      <div class="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="aspect-video w-full mb-4 rounded-md" />
                  <Skeleton className="h-6 w-4/5" />
                </CardHeader>
                <CardContent><Skeleton className="h-4 w-full" /></CardContent>
                <CardFooter><Skeleton className="h-4 w-24" /></CardFooter>
              </Card>
            ))
        ) : news.length > 0 ? (
            news.map((article) => (
              <Card key={article.id}>
                {article.imageUrl && (
                    <CardHeader>
                        <div class="relative aspect-video w-full mb-4">
                        <Image 
                            src={article.imageUrl}
                            alt={article.title}
                            fill
                            className="rounded-md object-cover"
                            data-ai-hint={article.imageHint || "football match"}
                        />
                        </div>
                    </CardHeader>
                )}
                <CardHeader>
                  <CardTitle>{article.title}</CardTitle>
                </CardHeader>
                <CardContent>
                   <p class="text-muted-foreground whitespace-pre-line">{article.content}</p>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                   <p class="text-xs text-muted-foreground">
                    {article.timestamp ? formatDistanceToNow(article.timestamp.toDate(), { addSuffix: true, locale: ar }) : ''}
                  </p>
                  {isAdmin && (
                    <div class="flex gap-2">
                       <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" disabled={deletingId === article.id}>
                                {deletingId === article.id ? <Loader2 class="h-4 w-4 animate-spin"/> : <Trash2 class="h-4 w-4" />}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                               <AlertDialogDescription>
                                 لا يمكن التراجع عن هذا الإجراء. سيتم حذف هذا الخبر بشكل نهائي.
                               </AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>إلغاء</AlertDialogCancel>
                               <AlertDialogAction onClick={() => handleDelete(article.id!)}>حذف</AlertDialogAction>
                             </AlertDialogFooter>
                          </AlertDialogContent>
                       </AlertDialog>
                       <Button variant="outline" size="icon" onClick={() => navigate('AddEditNews', { article, isEditing: true })}>
                        <Edit class="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))
        ) : (
             <div class="text-center text-muted-foreground pt-10">
                <p class="text-lg font-semibold">لا توجد أخبار حاليًا.</p>
                {isAdmin && <p>انقر على زر الإضافة لبدء نشر الأخبار.</p>}
            </div>
        )}
      </div>
      {isAdmin && (
          <Button className="absolute bottom-24 right-4 h-14 w-14 rounded-full shadow-lg" size="icon" onClick={() => navigate('AddEditNews', { isEditing: false })}>
              <Plus class="h-6 w-6" />
          </Button>
      )}
    </div>
  );
}
