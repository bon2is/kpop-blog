'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface Comment {
  id: string;
  article_slug: string;
  user_id: string;
  user_name: string;
  user_avatar: string | null;
  content: string;
  created_at: string;
}

interface CommentsProps {
  slug: string;
  title: string;
  url: string;
}

export default function Comments({ slug, title, url }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('article_slug', slug)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setComments(data as Comment[]);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchComments();

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchComments]);

  const handleLogin = async (provider: 'google' | 'twitter' | 'kakao') => {
    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.href : undefined
        }
      });
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const commentData = {
        article_slug: slug,
        user_id: user.id,
        user_name: user.user_metadata.full_name || user.user_metadata.name || user.email?.split('@')[0] || 'Anonymous',
        user_avatar: user.user_metadata.avatar_url || null,
        content: newComment.trim(),
      };

      const { data, error } = await supabase
        .from('comments')
        .insert([commentData])
        .select()
        .single();

      if (error) throw error;

      setComments((prev) => [...prev, data as Comment]);
      setNewComment('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-12 w-full max-w-4xl mx-auto border-t border-gray-200 dark:border-gray-800 pt-8">
      <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">댓글</h3>
      
      {!user ? (
        <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-center">
          <p className="mb-4 text-gray-600 dark:text-gray-300">댓글을 작성하려면 로그인하세요</p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => handleLogin('google')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded shadow transition-colors"
            >
              Google 로그인
            </button>
            <button
              onClick={() => handleLogin('twitter')}
              className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white font-medium rounded shadow transition-colors"
            >
              Twitter 로그인
            </button>
            <button
              onClick={() => handleLogin('kakao')}
              className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium rounded shadow transition-colors"
            >
              Kakao 로그인
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              {user.user_metadata.avatar_url && (
                <img 
                  src={user.user_metadata.avatar_url} 
                  alt="avatar" 
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {user.user_metadata.full_name || user.user_metadata.name || user.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              로그아웃
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 남겨주세요..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[100px]"
              required
            />
            <div className="mt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? '작성 중...' : '작성하기'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-6">
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-4">댓글 불러오는 중...</p>
        ) : comments.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-4">
              {comment.user_avatar ? (
                <img
                  src={comment.user_avatar}
                  alt={comment.user_name}
                  className="w-10 h-10 rounded-full bg-gray-200 object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold">
                  {comment.user_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{comment.user_name}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
