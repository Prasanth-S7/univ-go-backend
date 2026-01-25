import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Building, Clock, Search, CheckCircle, LayoutGrid, Monitor, TabletSmartphone, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { timetableApi } from '@/services/api';
import { useAllowedLoginStatus, clearAuthCookies } from "@/services/auth";
import { useLocation } from "react-router-dom";

function formatTime(t: string) {
  return t.slice(0, 5);
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  'Class-Room': 'Classroom',
  'Computer-Lab': 'Computer Lab',
  'Core-Lab': 'Core Lab',
};

const ROOM_TYPE_ICONS: Record<string, React.ReactNode> = {
  'Class-Room': <LayoutGrid className="h-4 w-4 text-primary" />, 
  'Computer-Lab': <Monitor className="h-4 w-4 text-primary" />, 
  'Core-Lab': <TabletSmartphone className="h-4 w-4 text-primary" />,
};

export default function FreeRoomsPage() {
  const location = useLocation();
  const { data: isLoginAllowed } = useAllowedLoginStatus();

  useEffect(() => {
    if (isLoginAllowed === false) {
      clearAuthCookies();
      window.location.href = "/auth/login?reason=not-allowed";
    }
  }, [isLoginAllowed]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['free-rooms-today'],
    queryFn: timetableApi.getFreeRoomsToday,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Extract all unique session timings from the API response
  const sessionOptions = useMemo(() => {
    if (!data?.data) return [];
    const timings: { session_name: string; start_time: string; end_time: string; is_lab?: boolean }[] = [];
    data.data.forEach((item: any) => {
      item.free_times.forEach((ft: any) => {
        timings.push({
          session_name: ft.session_name,
          start_time: ft.start_time,
          end_time: ft.end_time,
          is_lab: ft.session_name.toLowerCase().includes('lab') || undefined,
        });
      });
    });
    // Remove duplicates
    const unique = Array.from(
      new Map(
        timings.map((t) => [t.session_name + t.start_time + t.end_time, t])
      ).values()
    );
    // Sort by start_time
    unique.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return unique;
  }, [data]);

  // State: selected session (dropdown)
  const [selectedSession, setSelectedSession] = useState<number>(0);
  const [timingDropdownOpen, setTimingDropdownOpen] = useState(false);

  // State: search/filter for rooms
  const [roomSearch, setRoomSearch] = useState('');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('');
  const [blockFilter, setBlockFilter] = useState<string>('');

  // Get all blocks for filter chips
  const allBlocks = useMemo(() => {
    if (!data?.data) return [];
    const blocks = new Set<string>();
    data.data.forEach((item: any) => blocks.add(item.room.block));
    return Array.from(blocks).sort();
  }, [data]);

  // Filter rooms for the selected session and search/filters
  const filteredRooms = useMemo(() => {
    if (!data?.data || sessionOptions.length === 0) return [];
    const sel = sessionOptions[selectedSession] || sessionOptions[0];
    return data.data.filter((item: any) => {
      // Only rooms free for this session
      const isFree = item.free_times.some(
        (ft: any) =>
          ft.session_name === sel.session_name &&
          ft.start_time === sel.start_time &&
          ft.end_time === sel.end_time
      );
      if (!isFree) return false;
      // Room search
      if (
        roomSearch &&
        !(
          item.room.room_number.toLowerCase().includes(roomSearch.toLowerCase()) ||
          item.room.block.toLowerCase().includes(roomSearch.toLowerCase()) ||
          (ROOM_TYPE_LABELS[item.room.room_type] || '').toLowerCase().includes(roomSearch.toLowerCase())
        )
      ) {
        return false;
      }
      // Room type filter
      if (roomTypeFilter && item.room.room_type !== roomTypeFilter) return false;
      // Block filter
      if (blockFilter && item.room.block !== blockFilter) return false;
      return true;
    });
  }, [data, sessionOptions, selectedSession, roomSearch, roomTypeFilter, blockFilter]);

  // Loading skeletons
  const Skeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-muted rounded w-1/2 mx-auto" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 border-dashed">
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 mr-2 text-primary" />
            Free Rooms (Today)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Timing dropdown */}
          <div className="mb-4 flex flex-col sm:flex-row gap-2 items-center">
            <div className="relative w-full max-w-xs">
              <button
                className="w-full flex items-center justify-between px-4 py-2 border rounded bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                onClick={() => setTimingDropdownOpen((v) => !v)}
                type="button"
              >
                {sessionOptions.length > 0 ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-semibold">
                      {sessionOptions[selectedSession]?.session_name}
                    </span>
                    <span className="ml-2 text-xs">
                      {formatTime(sessionOptions[selectedSession]?.start_time)} - {formatTime(sessionOptions[selectedSession]?.end_time)}
                    </span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${sessionOptions[selectedSession]?.is_lab ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{sessionOptions[selectedSession]?.is_lab ? 'Lab' : 'Theory'}</span>
                  </>
                ) : (
                  <span>No timings</span>
                )}
                <svg className="h-4 w-4 ml-auto text-muted-foreground" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </button>
              {timingDropdownOpen && sessionOptions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-background border rounded shadow z-20 max-h-60 overflow-y-auto">
                  {sessionOptions.map((s, idx) => (
                    <button
                      key={s.session_name + s.start_time + s.end_time}
                      className={`w-full text-left px-4 py-2 flex items-center gap-2 text-sm hover:bg-primary/10 ${idx === selectedSession ? 'bg-primary/10 font-semibold' : ''}`}
                      onClick={() => {
                        setSelectedSession(idx);
                        setTimingDropdownOpen(false);
                      }}
                    >
                      <Clock className="h-4 w-4 mr-1 text-primary" />
                      <span>{s.session_name}</span>
                      <span className="ml-2 text-xs">{formatTime(s.start_time)} - {formatTime(s.end_time)}</span>
                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${s.is_lab ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{s.is_lab ? 'Lab' : 'Theory'}</span>
                      {idx === selectedSession && <CheckCircle className="h-3 w-3 ml-auto text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Room search and filters */}
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                className="pl-8 pr-2 py-2 rounded border bg-background w-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Search rooms, block, type..."
                value={roomSearch}
                onChange={e => setRoomSearch(e.target.value)}
              />
            </div>
            {/* Room type filter chips */}
            {/* {Object.entries(ROOM_TYPE_LABELS).map(([type, label]) => (
              <button
                key={type}
                className={`px-3 py-1 rounded-full border text-xs flex items-center gap-1 transition-all ${
                  roomTypeFilter === type
                    ? 'bg-primary text-white border-primary'
                    : 'bg-muted text-foreground border-border hover:bg-primary/10'
                }`}
                onClick={() => setRoomTypeFilter(roomTypeFilter === type ? '' : type)}
              >
                {ROOM_TYPE_ICONS[type]} {label}
                {roomTypeFilter === type && <CheckCircle className="h-3 w-3 ml-1" />}
              </button>
            ))} */}
            {/* Block filter chips */}
            {allBlocks.map(block => (
              <button
                key={block}
                className={`px-3 py-1 rounded-full border text-xs flex items-center gap-1 transition-all ${
                  blockFilter === block
                    ? 'bg-primary text-white border-primary'
                    : 'bg-muted text-foreground border-border hover:bg-primary/10'
                }`}
                onClick={() => setBlockFilter(blockFilter === block ? '' : block)}
              >
                <Building className="h-3 w-3 mr-1" /> {block}
                {blockFilter === block && <CheckCircle className="h-3 w-3 ml-1" />}
              </button>
            ))}
          </div>

          {/* Room grid */}
          {isLoading ? (
            <Skeleton />
          ) : error ? (
            <div className="text-center text-destructive">Failed to load free rooms. Please try again later.</div>
          ) : sessionOptions.length === 0 ? (
            <div className="text-center text-muted-foreground">No free rooms available for today.</div>
          ) : filteredRooms.length === 0 ? (
            <div className="text-center text-muted-foreground">No rooms found for this timing and filters.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredRooms.map((item: any) => (
                <div key={item.room.id} className="border rounded-lg p-4 bg-muted/10 flex flex-col gap-2">
                  <div className="flex items-center gap-2 mb-1">
                    {ROOM_TYPE_ICONS[item.room.room_type]}
                    <span className="font-semibold text-base">{item.room.room_number}</span>
                    <span className="ml-2 text-xs text-muted-foreground">({item.room.block})</span>
                    {/* <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border">{ROOM_TYPE_LABELS[item.room.room_type]}</span> */}
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">{item.room.description}</div>
                  <div className="flex flex-wrap gap-2 text-xs items-center">
                    {item.room.room_max_cap > 0 && <span className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded"><Users className="h-3 w-3" />{item.room.room_max_cap}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 