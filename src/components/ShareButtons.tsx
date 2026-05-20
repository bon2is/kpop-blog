'use client';

import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';

interface ShareButtonsProps {
  title: string;
  url: string;
  className?: string;
}

export default function ShareButtons({ title, url, className = '' }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // user cancelled
      }
    } else {
      // fallback: copy link
      await handleCopy();
    }
  };

  const shareLinks = [
    {
      name: 'Twitter / X',
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      bgColor: 'bg-black hover:bg-gray-800',
    },
    {
      name: 'Threads',
      href: `https://www.threads.net/intent/post?text=${encodedTitle}%20${encodedUrl}`,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.5 12.068V12c.012-3.497.86-6.337 2.519-8.419C5.88 1.205 8.63.024 12.186 0h.014c2.709.018 5.203.909 7.012 2.506 1.73 1.529 2.668 3.618 2.714 6.039l.001.085h-3.014l-.001-.075c-.039-1.597-.58-2.862-1.609-3.76-1.125-.983-2.757-1.483-4.85-1.497-2.71.018-4.762.868-6.1 2.527C5.13 7.453 4.509 9.639 4.5 12.022v.048c.009 2.374.629 4.554 1.852 6.12 1.338 1.66 3.39 2.51 6.1 2.528 2.133-.014 3.591-.529 4.462-1.572.756-.905 1.186-2.197 1.278-3.842H15.5v-2.836h7.014l-.001.165c-.08 3.354-1.072 5.967-2.948 7.766C17.714 22.925 15.244 24 12.186 24zm2.245-9.655c-1.099.237-2.233.168-3.196-.22-.832-.337-1.39-.907-1.609-1.649-.167-.574-.085-1.164.231-1.654.342-.528.915-.918 1.655-1.126.9-.252 2.003-.228 2.919.065v4.584zm0-6.82c-1.513-.477-3.255-.552-4.847-.206-1.174.258-2.168.823-2.872 1.631-.685.785-1.024 1.761-.982 2.826.043 1.13.472 2.133 1.242 2.9.816.813 1.98 1.342 3.36 1.572l.12.02v1.447c-.83-.174-1.58-.491-2.224-.94-1.297-.908-2.069-2.314-2.187-3.946-.1-1.383.29-2.654 1.094-3.67.858-1.083 2.122-1.79 3.654-2.05.423-.072.862-.108 1.307-.108.766 0 1.518.107 2.204.313l.131.04v2.171z" />
        </svg>
      ),
      bgColor: 'bg-[#000000] hover:bg-[#1a1a1a]',
    },
    {
      name: 'LINE',
      href: `https://line.me/R/share?text=${encodeURIComponent(`${title} ${url}`)}`,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.070 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
        </svg>
      ),
      bgColor: 'bg-[#06C755] hover:bg-[#05B04C]',
    },
    {
      name: 'Reddit',
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      ),
      bgColor: 'bg-[#FF4500] hover:bg-[#E03D00]',
    },
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
      bgColor: 'bg-[#1877F2] hover:bg-[#166FE5]',
    },
  ];

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="text-sm font-medium text-gray-700">Share:</span>
      <div className="flex gap-2">
        {shareLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2.5 rounded-full text-white transition-colors ${link.bgColor}`}
            title={`Share on ${link.name}`}
          >
            {link.icon}
          </a>
        ))}
        {/* Native Share (shows KakaoTalk + all apps on mobile) */}
        <button
          onClick={handleNativeShare}
          className="p-2.5 bg-[#FEE500] hover:bg-[#FDD835] rounded-full transition-colors"
          title="Share (KakaoTalk, LINE, etc.)"
        >
          <Share2 className="w-4 h-4 text-black" />
        </button>
        <button
          onClick={handleCopy}
          className="p-2.5 bg-gray-200 hover:bg-gray-300 rounded-full transition-colors"
          title="Copy link"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4 text-gray-600" />
          )}
        </button>
      </div>
    </div>
  );
}
