'use client';

import { useState, FormEvent } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { trackNewsletterSignup } from './GoogleAnalytics';

interface NewsletterProps {
  variant?: 'banner' | 'inline' | 'sidebar';
  className?: string;
}

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error';

export default function Newsletter({ variant = 'banner', className = '' }: NewsletterProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setStatus('error');
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setStatus('loading');

    try {
      // Mailchimp subscription via JSONP
      const MAILCHIMP_U = 'c5f997e9353e178149080ef01';
      const MAILCHIMP_ID = 'e76494f051';

      // Use post-json endpoint for JSONP (avoids CORS)
      const url = `https://andxo.us9.list-manage.com/subscribe/post-json?u=${MAILCHIMP_U}&id=${MAILCHIMP_ID}&EMAIL=${encodeURIComponent(email)}`;

      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        const callbackName = 'mc_callback_' + Date.now();

        (window as unknown as Record<string, unknown>)[callbackName] = (data: { result: string; msg: string }) => {
          delete (window as unknown as Record<string, unknown>)[callbackName];
          document.body.removeChild(script);

          if (data.result === 'success') {
            resolve();
          } else if (data.msg?.includes('already subscribed')) {
            resolve(); // Treat as success
          } else {
            reject(new Error(data.msg || 'Subscription failed'));
          }
        };

        script.src = `${url}&c=${callbackName}`;
        script.onerror = () => reject(new Error('Network error'));
        document.body.appendChild(script);

        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('Timeout')), 10000);
      });

      // Track successful signup
      trackNewsletterSignup(email);

      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  };

  if (variant === 'sidebar') {
    return (
      <div className={`bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          <Mail className="w-5 h-5 text-pink-500" />
          <h3 className="font-bold text-gray-900">Newsletter</h3>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Get K-Pop news delivered to your inbox
        </p>

        {status === 'success' ? (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Subscribed!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:from-pink-600 hover:to-purple-600 transition-all disabled:opacity-50"
            >
              {status === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : (
                'Subscribe'
              )}
            </button>
            {status === 'error' && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errorMessage}
              </p>
            )}
          </form>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`bg-gray-50 rounded-lg p-6 ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">Stay in the loop</h3>
            <p className="text-sm text-gray-600">
              Subscribe to get the latest K-Pop news and updates.
            </p>
          </div>

          {status === 'success' ? (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Successfully subscribed!</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                disabled={status === 'loading'}
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-6 py-2 bg-pink-500 text-white font-medium rounded-lg hover:bg-pink-600 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {status === 'loading' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Subscribe'
                )}
              </button>
            </form>
          )}
        </div>
        {status === 'error' && (
          <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errorMessage}
          </p>
        )}
      </div>
    );
  }

  // Banner variant (default)
  return (
    <section className={`bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl p-8 text-center text-white ${className}`}>
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
          <Mail className="w-6 h-6" />
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-2">Stay Updated</h2>
      <p className="mb-6 opacity-90 max-w-md mx-auto">
        Get the latest K-Pop news, exclusive updates, and trending stories delivered to your inbox.
      </p>

      {status === 'success' ? (
        <div className="flex items-center justify-center gap-2 text-white">
          <CheckCircle className="w-6 h-6" />
          <span className="text-lg font-medium">Thank you for subscribing!</span>
        </div>
      ) : (
        <>
          <form onSubmit={handleSubmit} className="flex max-w-md mx-auto gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
              disabled={status === 'loading'}
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="px-6 py-3 bg-white text-pink-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {status === 'loading' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Subscribe'
              )}
            </button>
          </form>
          {status === 'error' && (
            <p className="text-sm text-white/80 mt-3 flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errorMessage}
            </p>
          )}
          <p className="text-xs text-white/60 mt-4">
            No spam, unsubscribe anytime.
          </p>
        </>
      )}
    </section>
  );
}

// Export variants for easy use
export function NewsletterBanner({ className = '' }: { className?: string }) {
  return <Newsletter variant="banner" className={className} />;
}

export function NewsletterInline({ className = '' }: { className?: string }) {
  return <Newsletter variant="inline" className={className} />;
}

export function NewsletterSidebar({ className = '' }: { className?: string }) {
  return <Newsletter variant="sidebar" className={className} />;
}
