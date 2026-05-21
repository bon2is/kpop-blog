'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Youtube,
  Ticket,
  ExternalLink,
  Music,
  Mic2,
  Tv,
  Star,
  Heart,
  Trophy,
  PackageOpen,
  Filter,
  RefreshCw,
} from 'lucide-react';

type EventType = 'comeback' | 'concert' | 'broadcast' | 'youtube' | 'fanmeeting' | 'award' | 'release' | 'other';

interface ScheduleEvent {
  id: string;
  date: string;
  time?: string;
  timezone?: string;
  type: EventType;
  artist: string;
  title: string;
  description?: string;
  links?: {
    youtube?: string;
    ticket?: string;
    official?: string;
  };
}

interface ScheduleData {
  lastUpdated: string;
  events: ScheduleEvent[];
}

const EVENT_CONFIG: Record<EventType, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  comeback: { label: 'Comeback', color: 'text-pink-700', bg: 'bg-pink-100 border-pink-200', icon: Music },
  concert: { label: 'Concert', color: 'text-purple-700', bg: 'bg-purple-100 border-purple-200', icon: Mic2 },
  broadcast: { label: 'Broadcast', color: 'text-sky-700', bg: 'bg-sky-100 border-sky-200', icon: Tv },
  youtube: { label: 'YouTube', color: 'text-red-700', bg: 'bg-red-100 border-red-200', icon: Youtube },
  fanmeeting: { label: 'Fan Meet', color: 'text-orange-700', bg: 'bg-orange-100 border-orange-200', icon: Heart },
  award: { label: 'Awards', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-200', icon: Trophy },
  release: { label: 'Release', color: 'text-emerald-700', bg: 'bg-emerald-100 border-emerald-200', icon: PackageOpen },
  other: { label: 'Other', color: 'text-gray-700', bg: 'bg-gray-100 border-gray-200', icon: Star },
};

function isToday(dateStr: string): boolean {
  const today = new Date();
  const d = new Date(dateStr + 'T00:00:00');
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function groupByDate(events: ScheduleEvent[]): Record<string, ScheduleEvent[]> {
  return events.reduce<Record<string, ScheduleEvent[]>>((acc, event) => {
    if (!acc[event.date]) acc[event.date] = [];
    acc[event.date].push(event);
    return acc;
  }, {});
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div className="h-10 bg-gray-200 rounded-lg w-64 mb-3" />
          <div className="space-y-3">
            {[1, 2].map((j) => (
              <div key={j} className="h-24 bg-gray-100 rounded-xl border border-gray-200" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SchedulePage() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [activeFilter, setActiveFilter] = useState<EventType | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadSchedule() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/schedule.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Failed to load schedule (${res.status})`);
      const json: ScheduleData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchedule();
  }, []);

  const filteredEvents = data
    ? activeFilter === 'all'
      ? data.events
      : data.events.filter((e) => e.type === activeFilter)
    : [];

  const sortedDates = Object.keys(groupByDate(filteredEvents)).sort();
  const grouped = groupByDate(filteredEvents);

  const filterTypes: Array<EventType | 'all'> = ['all', 'comeback', 'concert', 'broadcast', 'youtube', 'fanmeeting', 'award', 'release'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-6 h-6 text-pink-500" />
            <h1 className="text-2xl font-bold text-gray-900">K-Pop Schedule</h1>
          </div>
          <p className="text-sm text-gray-500">Upcoming comebacks, concerts, broadcasts & more · All times KST</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          <div className="flex items-center gap-1 text-gray-400 mr-1">
            <Filter className="w-4 h-4" />
          </div>
          {filterTypes.map((type) => {
            const isActive = activeFilter === type;
            const config = type !== 'all' ? EVENT_CONFIG[type] : null;
            return (
              <button
                key={type}
                onClick={() => setActiveFilter(type)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  isActive
                    ? type === 'all'
                      ? 'bg-gray-800 text-white border-gray-800'
                      : `${config?.bg} ${config?.color} border-current`
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                {type === 'all' ? 'All Events' : config?.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading && <LoadingSkeleton />}

        {error && (
          <div className="text-center py-16">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={loadSchedule}
              className="flex items-center gap-2 mx-auto px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        )}

        {!loading && !error && sortedDates.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No events found</p>
            <p className="text-sm mt-1">Try selecting a different filter</p>
          </div>
        )}

        {!loading && !error && sortedDates.length > 0 && (
          <div className="space-y-8">
            {sortedDates.map((date) => {
              const today = isToday(date);
              return (
                <div key={date}>
                  {/* Date header */}
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg mb-3 text-sm font-bold ${
                      today
                        ? 'bg-pink-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-200'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    {today ? 'Today — ' : ''}{formatDateHeader(date)}
                  </div>

                  {/* Events for this date */}
                  <div className="space-y-3">
                    {grouped[date].map((event) => {
                      const config = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.other;
                      const Icon = config.icon;
                      return (
                        <div
                          key={event.id}
                          className={`bg-white rounded-xl border p-4 flex gap-4 items-start hover:shadow-md transition-shadow ${
                            today ? 'border-pink-100' : 'border-gray-200'
                          }`}
                        >
                          {/* Type badge */}
                          <div
                            className={`flex-shrink-0 flex flex-col items-center gap-1 px-2.5 py-2 rounded-lg border text-xs font-bold ${config.bg} ${config.color}`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{config.label}</span>
                          </div>

                          {/* Event info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              {event.time && (
                                <span className="text-xs font-mono text-gray-400 bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5">
                                  {event.time} {event.timezone ?? 'KST'}
                                </span>
                              )}
                              <Link
                                href={`/search?q=${encodeURIComponent(event.artist)}`}
                                className="text-sm font-bold text-pink-600 hover:underline"
                              >
                                {event.artist}
                              </Link>
                            </div>
                            <p className="text-sm text-gray-900 font-medium leading-snug">{event.title}</p>
                            {event.description && (
                              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{event.description}</p>
                            )}

                            {/* Links */}
                            {event.links && Object.keys(event.links).length > 0 && (
                              <div className="flex gap-2 mt-2 flex-wrap">
                                {event.links.youtube && (
                                  <a
                                    href={event.links.youtube}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
                                  >
                                    <Youtube className="w-3 h-3" />
                                    YouTube
                                  </a>
                                )}
                                {event.links.ticket && (
                                  <a
                                    href={event.links.ticket}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 transition-colors"
                                  >
                                    <Ticket className="w-3 h-3" />
                                    Tickets
                                  </a>
                                )}
                                {event.links.official && (
                                  <a
                                    href={event.links.official}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Official
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer note */}
        {data && (
          <p className="text-center text-xs text-gray-400 mt-10">
            Updated {new Date(data.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}
            All times in KST (UTC+9)
          </p>
        )}
      </div>
    </div>
  );
}
