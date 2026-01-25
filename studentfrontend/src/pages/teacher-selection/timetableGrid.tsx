import { cn } from "@/lib/utils";
import { Building, AlertTriangle, Clock } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import React from "react";
import './time.css'

interface TimetableEntry {
  courseId: number;
  selectionId?: number;
  courseCode: string;
  courseName: string;
  teacherName: string;
  day: string;
  startTime: string;
  endTime: string;
  location: string;
  sessionName?: string;
  hasClash?: boolean;
  isPreview?: boolean;
  is_lab?: boolean;
  is_batched?: boolean;
  batch?: string;
  slot_available?: number;
  is_available?: boolean;
  groupIndex?: number;
}

interface TimeTableGridProps {
  selections: TimetableEntry[];
}

// Color palette for course dots
const COURSE_COLORS = [
  "#60a5fa", // blue
  "#f472b6", // pink
  "#34d399", // green
  "#fbbf24", // yellow
  "#a78bfa", // purple
  "#f87171", // red
  "#38bdf8", // sky
  "#facc15", // amber
  "#4ade80", // emerald
  "#818cf8", // indigo
];

function getCourseColor(courseCode: string) {
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
  return COURSE_COLORS[Math.abs(hash) % COURSE_COLORS.length];
}

export const TimeTableGrid = ({ selections }: TimeTableGridProps) => {
  // Filter out entries with missing time data to prevent errors
  const validSelections = selections.filter(entry => 
    entry.startTime && entry.endTime && entry.day
  );

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const TIMES = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

  const parseTime = (timeStr: string): number => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const sessionOverlapsTimeSlot = (sessionStart: string, sessionEnd: string, slotTime: string): boolean => {
    if (!sessionStart || !sessionEnd || !slotTime) return false;
    
    const sessionStartMinutes = parseTime(sessionStart);
    const sessionEndMinutes = parseTime(sessionEnd);
    const slotMinutes = parseTime(slotTime);

    return sessionStartMinutes <= slotMinutes && sessionEndMinutes > slotMinutes;
  };

  const getEntriesForCell = (day: string, time: string): TimetableEntry[] => {
    return validSelections.filter(entry => {
      return entry.day.toLowerCase() === day.toLowerCase() && 
             sessionOverlapsTimeSlot(entry.startTime, entry.endTime, time);
    });
  };

  const getPreviewEntriesForCell = (day: string, time: string): TimetableEntry[] => {
    return validSelections.filter(entry => {
      return entry.isPreview && 
             entry.day.toLowerCase() === day.toLowerCase() && 
             sessionOverlapsTimeSlot(entry.startTime, entry.endTime, time);
    });
  };

  const getRegularEntriesForCell = (day: string, time: string): TimetableEntry[] => {
    return validSelections.filter(entry => {
      return !entry.isPreview && 
             entry.day.toLowerCase() === day.toLowerCase() && 
             sessionOverlapsTimeSlot(entry.startTime, entry.endTime, time);
    });
  };

  const hasRealClash = (entries: TimetableEntry[]): boolean => {
    const realEntries = entries.filter(entry => !entry.isPreview);
    if (realEntries.length <= 1) return false;
    
    return realEntries.some(entry => entry.hasClash);
  };

  const hasPreviewClash = (entries: TimetableEntry[]): boolean => {
    const previewEntries = entries.filter(entry => entry.isPreview);
    const realEntries = entries.filter(entry => !entry.isPreview);
    
    if (previewEntries.length === 0 || realEntries.length === 0) return false;
    
    return previewEntries.some(entry => entry.hasClash);
  };

  const shouldDisplayEntry = (entry: TimetableEntry, time: string): boolean => {
    const entryStartHour = parseInt(entry.startTime.split(':')[0]);
    const slotHour = parseInt(time.split(':')[0]);
    return entryStartHour === slotHour;
  };

  const calculateRowSpan = (entry: TimetableEntry): number => {
    if (!entry.startTime || !entry.endTime) return 1;
    
    const startMinutes = parseTime(entry.startTime);
    const endMinutes = parseTime(entry.endTime);
    const durationMinutes = endMinutes - startMinutes;
    
    return Math.max(1, Math.ceil(durationMinutes / 60));
  };

  const calculateTopOffset = (entry: TimetableEntry): number => {
    if (!entry.startTime) return 0;
    
    const startMinutes = parseTime(entry.startTime);
    const hourStartMinutes = Math.floor(startMinutes / 60) * 60;
    
    return ((startMinutes - hourStartMinutes) / 60) * 60;
  };

  const checkisLab = (startTime: string, endTime: string) => {
      const knownLabTimes = [
        ['08:00', '09:40'],
        ['10:00', '11:40'],
        ['11:50', '13:20'],
        ['13:20', '15:00'],
        ['15:00', '16:40'],
        ['17:10', '18:50'],
      ];
      return knownLabTimes.some(([labStart, labEnd]) => startTime.startsWith(labStart) && endTime.startsWith(labEnd));
  }

  const calculateEntryHeight = (entry: TimetableEntry): number => {
    if (!entry.startTime || !entry.endTime) return 60;
    
    const startMinutes = parseTime(entry.startTime);
    const endMinutes = parseTime(entry.endTime);
    const durationMinutes = endMinutes - startMinutes;
    
    return (durationMinutes / 60) * 60;
  };

  const shouldDisplayInTimeSlot = (entry: TimetableEntry, timeSlot: string): boolean => {
    if (!entry.startTime || !entry.endTime || !timeSlot) {
      return false;
    }
    
    const entryStartHour = parseInt(entry.startTime.split(':')[0]);
    const entryEndHour = parseInt(entry.endTime.split(':')[0]);
    const slotHour = parseInt(timeSlot.split(':')[0]);
    
    return entryStartHour === slotHour;
  };

  return (
    <div className="w-full min-h-[600px] p-4">
      <div className="w-full mx-auto border">
        <div className="grid grid-cols-7 gap-0 mb-4">
          <div className="text-xs text-gray-500 font-medium p-3 text-center">Time</div>
          {DAYS.map((dayInfo) => (
            <div key={dayInfo} className="text-center p-3">
              <div className="text-xs text-gray-500 font-medium">
                {dayInfo}
              </div>
            </div>
          ))}
        </div>

        <div className="relative">
           <div className="absolute inset-0 opacity-10 pointer-events-none z-0 [background-size:5px_5px] [background-image:repeating-linear-gradient(-45deg,_#737373_0,_#737373_1px,_#737373_0,_#e5e5f7_50%)]" />

        <div className="grid grid-cols-7 gap-0 border-l border-t" style={{ gridTemplateRows: `repeat(${TIMES.length}, 60px)` }}>
          {TIMES.map((time, timeIndex) => (
            <div 
              key={`time-${time}`} 
              className="border-r border-b p-2 text-xs text-gray-500 font-medium"
              style={{ gridRow: timeIndex + 1 }}
            >
              {time}
            </div>
          ))}
          
          {DAYS.map((day, dayIndex) => {
            const dayEntries = validSelections.filter(entry => 
              entry.day.toLowerCase() === day.toLowerCase()
            );
            
            const timeSlotMap = new Map();
            TIMES.forEach((time, timeIndex) => {
              const entriesForSlot = dayEntries.filter(entry => shouldDisplayInTimeSlot(entry, time));
              timeSlotMap.set(timeIndex, entriesForSlot);
            });
            
            return TIMES.map((time, timeIndex) => {
              const entries = timeSlotMap.get(timeIndex) || [];
              const hasRealClashes = hasRealClash(entries);
              const hasPreviewClashes = hasPreviewClash(entries);
              return (
                <div
                  key={`${day}-${time}`}
                  className={cn(
                    "border-r border-b p-0 relative",
                    hasRealClashes && "bg-red-50",
                    !hasRealClashes && hasPreviewClashes && "bg-yellow-50"
                  )}
                  style={{ 
                    gridColumn: dayIndex + 2,
                    gridRow: timeIndex + 1
                  }}
                >
                  {entries.map((entry, index) => {
                    const isPreview = entry.isPreview;
                    const isClashing = entry.hasClash;
                    const color = getCourseColor(entry.courseCode);
                    const rowSpan = calculateRowSpan(entry);
                    const topOffset = calculateTopOffset(entry);
                    const entryHeight = calculateEntryHeight(entry);
                    
                    return (
                      <div
                        key={`${entry.courseId}-${entry.selectionId}-${index}`}
                        className={cn(
                          'p-2 rounded border-l-4 text-xs cursor-pointer hover:shadow-md transition-shadow w-full absolute',
                          isPreview && isClashing
                            ? 'bg-red-100 border-red-400 text-red-800'
                            : isClashing && !isPreview
                              ? 'bg-red-100 border-red-500 text-red-800'
                              : isPreview
                                ? 'bg-blue-50 border-blue-400 text-blue-800'
                                : 'bg-gray-50 border-gray-400 text-gray-800'
                        )}
                        style={{
                          borderLeftColor: !isClashing ? color : undefined,
                          gridRow: `span ${rowSpan}`,
                          top: `${topOffset}px`,
                          height: `${entryHeight}px`,
                          zIndex: 10,
                        }}
                      >
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="w-full h-full">
                              <div className="font-semibold truncate flex justify-between items-center" title={entry.courseCode}>
                                {/* <span>
                                </span> */}
                                  {entry.courseCode}
                                  {" "}-{" "}
                                  {entry.location.split(' ')[0]}
                                {/* <span className="text-[10px]">
                                </span> */}
                              </div>
                              <div className="text-[10px] text-gray-600 truncate mt-1" title={`${entry.startTime} - ${entry.endTime}`}>
                                {entry.startTime.substring(0, 5)} - {entry.endTime.substring(0, 5)}
                              </div>
                              {rowSpan > 1 && (
                                <div className="text-[8px] text-gray-500 mt-1">
                                  {rowSpan} hour{rowSpan > 1 ? 's' : ''}
                                </div>    
                              )}
                              {entry.groupIndex !== undefined && (
                                <div style={{
                                  backgroundColor: color
                                }} className="text-[10px] flex justify-center items-center text-gray-500 mt-1 absolute bottom-1 right-2 bg-primary/50 text-white rounded-full px-2 py-0.5">
                                  <span>
                                    G-{entry.groupIndex}
                                  </span>
                                </div>
                              )}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 p-4 bg-white border border-gray-200 shadow-lg rounded-lg">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-3 h-3 rounded-full" 
                                  style={{ backgroundColor: color }}
                                />
                                <span className="font-bold text-lg text-gray-900">
                                  {entry.courseCode}
                                </span>
                                {isClashing && !isPreview && (
                                  <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                                    <AlertTriangle className="h-3 w-3" /> CLASH
                                  </span>
                                )}
                                {isPreview && (
                                  isClashing ? (
                                    <span className="flex items-center gap-1 text-red-600 text-xs font-medium">
                                      <AlertTriangle className="h-3 w-3" /> CLASH PREVIEW
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-blue-600 text-xs font-medium">
                                      <Clock className="h-3 w-3" /> PREVIEW
                                    </span>
                                  )
                                )}
                              </div>
                              <div className="text-sm font-medium text-gray-800">
                                {entry.courseName}
                              </div>
                              <div className="text-sm text-gray-600">
                                <div className="mb-1 flex gap-2 items-center">
                                  {entry.is_lab ? (
                                    <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold">Lab</span>
                                  ) : (
                                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-semibold">{checkisLab(entry.startTime, entry.endTime) ? "Lab": "Theory"}</span>
                                  )}
                                  {entry.is_lab && entry.batch && (
                                    <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">{entry.batch}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span>👨‍🏫</span>
                                  <span>{entry.teacherName }</span>
                                </div>
                                {entry.groupIndex !== undefined && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-medium text-gray-500">Group:</span>
                                    <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-semibold">
                                      {entry.groupIndex}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mb-1">
                                  <Building className="h-4 w-4" />
                                  <span>{entry.location}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>
                                    {entry.is_lab
                                      ? `${entry.startTime.substring(0, 5)} - ${entry.endTime.substring(0, 5)}`
                                      : `${entry.startTime.substring(0, 5)} - ${entry.endTime.substring(0, 5)}`}
                                  </span>
                                  {entry.sessionName && (
                                    <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                                      {entry.sessionName}
                                    </span>
                                  )}
                                </div>
                                <div className="mt-2 space-x-2">
                                  {entry.is_lab && (
                                    <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">Lab</span>
                                  )}
                                  {entry.is_batched && (
                                    <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs">Batch: {entry.batch || 'N/A'}</span>
                                  )}
                                  {typeof entry.slot_available === 'number' && (
                                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">Slots: {entry.slot_available}</span>
                                  )}
                                  {typeof entry.is_available === 'boolean' && (
                                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${entry.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{entry.is_available ? 'Available' : 'Full'}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    );
                  })}
                </div>
              );
            });
          }).flat()}
        </div>
        </div>
      </div>
    </div>
  );
};