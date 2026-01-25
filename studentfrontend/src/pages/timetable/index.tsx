import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Layers, 
  LayoutGrid, 
  List, 
  GraduationCap, 
  AlertCircle,
  FlaskConical,
  Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStudentTimetableStatus, useStudentTimetableData } from '@/action/timetable';
import { TimeTableGrid } from '../teacher-selection/timetableGrid';
import ReactGa from 'react-ga4';
import { useAllowedLoginStatus, clearAuthCookies } from "@/services/auth";
import { useLocation } from "react-router-dom";

// Updated interface for the new API response structure
interface TimetableData {
  teacher_course_id: number;
  course_code: string;
  teacher_name: string;
  sessions: {
    id: number;
    session: {
      id: number;
      name: string;
      start_time: string;
      end_time: string;
      is_lab_time: boolean;
    };
    venue: {
      id: number;
      room_number: string;
      block: string;
      description: string;
      is_lab: boolean;
      room_type: string;
      room_min_cap: number;
      room_max_cap: number;
    };
    day: string;
    teacher_course_period: number;
    batch?: string;
    is_lab?: boolean;
    is_batched?: boolean;
  }[];
}

interface TimetableStats {
  totalCourses: number;
  totalClassHours: number;
  daysWithClasses: number;
  totalSessions: number;
  theorySessions: number;
  labSessions: number;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetablePage() {
  const location = useLocation();
  const { data: isLoginAllowed } = useAllowedLoginStatus();

  useEffect(() => {
    if (isLoginAllowed === false) {
      clearAuthCookies();
      window.location.href = "/auth/login?reason=not-allowed";
    }
  }, [isLoginAllowed]);

  const [view, setView] = useState<'week' | 'list'>('week');
  const [currentDay, setCurrentDay] = useState<string>(
    new Date().toLocaleDateString('en-US', { weekday: 'long' })
  );

  useEffect(() => {
    ReactGa.send({
      hitType: "My Timetable",
      page: "/timetable",
      title: "Teacher Selection App",
    });
  }, []);

  const {
    data: studentTimetableStatus,
    isLoading: isLoadingStudentTimetableStatus,
  } = useStudentTimetableStatus();

  const {
    data: timetableData,
    isLoading: isLoadingTimetableData,
    error: timetableError,
    refetch: refetchTimetableData,
  } = useStudentTimetableData();

  useEffect(() => {
    // Fetch timetable data if any courses are selected
    const selectedCourseIds = studentTimetableStatus?.courses?.filter((c: any) => c.selected).map((c: any) => c.course_id) || [];
    if (selectedCourseIds.length > 0) {
      refetchTimetableData();
    }
  }, [studentTimetableStatus, refetchTimetableData]);

  // Transform existing timetable data to the format expected by TimeTableGrid
  const existingTimetableEntries = useMemo(() => {
    if (!timetableData || !Array.isArray(timetableData)) {
      return [];
    }

    return timetableData.flatMap((item: TimetableData) => 
      item.sessions.map((session) => ({
        courseId: item.teacher_course_id,
        selectionId: item.teacher_course_id,
        courseCode: item.course_code,
        courseName: item.course_code,
        teacherName: item.teacher_name,
        day: session.day,
        startTime: session.session.start_time,
        endTime: session.session.end_time,
        location: `${session.venue.room_number} (${session.venue.block})`,
        sessionName: session.session.name,
        hasClash: false,
        is_lab: session.is_lab ?? session.session.is_lab_time,
        is_batched: session.is_batched ?? ((session.is_lab ?? session.session.is_lab_time) && !!session.batch),
        batch: session.batch,
      }))
    );
  }, [timetableData]);

  // Calculate timetable stats based on the transformed data
  const timetableStats = useMemo((): TimetableStats => {
    if (!existingTimetableEntries || existingTimetableEntries.length === 0) {
      return {
        totalCourses: 0,
        totalClassHours: 0,
        daysWithClasses: 0,
        totalSessions: 0,
        theorySessions: 0,
        labSessions: 0
      };
    }

    // Calculate total unique courses
    const uniqueCourses = new Set(existingTimetableEntries.map(entry => entry.courseId));
    const totalCourses = uniqueCourses.size;

    // Calculate total class hours and sessions
    let totalClassHours = 0;
    let totalSessions = existingTimetableEntries.length;
    let theorySessions = 0;
    let labSessions = 0;
    
    existingTimetableEntries.forEach(entry => {
      const start = new Date(`2000-01-01T${entry.startTime}`);
      const end = new Date(`2000-01-01T${entry.endTime}`);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      totalClassHours += duration;
      
      if (entry.is_lab) {
        labSessions++;
      } else {
        theorySessions++;
      }
    });

    // Calculate days with classes
    const daysWithClasses = new Set(existingTimetableEntries.map(entry => entry.day)).size;

    return {
      totalCourses,
      totalClassHours: Math.round(totalClassHours * 10) / 10,
      daysWithClasses,
      totalSessions,
      theorySessions,
      labSessions
    };
  }, [existingTimetableEntries]);

  const nextDay = () => {
    const currentIndex = DAYS.indexOf(currentDay);
    const nextIndex = (currentIndex + 1) % DAYS.length;
    setCurrentDay(DAYS[nextIndex]);
  };

  const previousDay = () => {
    const currentIndex = DAYS.indexOf(currentDay);
    const prevIndex = (currentIndex - 1 + DAYS.length) % DAYS.length;
    setCurrentDay(DAYS[prevIndex]);
  };

  const renderWeekView = () => (
    <TimeTableGrid selections={existingTimetableEntries} />
  );

  const renderDayView = () => {
    const dayEntries = existingTimetableEntries.filter(entry => 
      entry.day.toLowerCase() === currentDay.toLowerCase()
    );
    
    // Debug information
    console.log('Current day:', currentDay);
    console.log('All entries:', existingTimetableEntries);
    console.log('Filtered entries for current day:', dayEntries);
    console.log('Available days in data:', [...new Set(existingTimetableEntries.map(entry => entry.day))]);
    
    if (dayEntries.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <h3 className="font-medium">No classes on {currentDay}</h3>
          <p className="text-sm mt-1">Select another day or switch to week view</p>
          {/* <div className="mt-4 p-4 bg-muted/20 rounded-md text-xs">
            <p>Debug Info:</p>
            <p>Current Day: {currentDay}</p>
            <p>Available Days: {[...new Set(existingTimetableEntries.map(entry => entry.day))].join(', ')}</p>
            <p>Total Entries: {existingTimetableEntries.length}</p>
          </div> */}
        </div>
      );
    }

    // Sort entries by start time
    const sortedEntries = dayEntries.sort((a, b) => {
      const timeA = new Date(`2000-01-01T${a.startTime}`);
      const timeB = new Date(`2000-01-01T${b.startTime}`);
      return timeA.getTime() - timeB.getTime();
    });
    
    return (
      <div className="space-y-4">
        {sortedEntries.map((entry, index) => {
          const startTime = new Date(`2000-01-01T${entry.startTime}`);
          const endTime = new Date(`2000-01-01T${entry.endTime}`);
          const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
          
          return (
            <Card key={`${entry.courseId}-${index}`} className="border-l-4 border-l-primary/20 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-2 justify-between">
                  <div className='flex justify-between'>
                    <div className="flex-1 space-y-3">
                      {/* Course and Session Info */}
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          entry.is_lab ? "bg-green-100" : "bg-blue-100"
                        )}>
                          {entry.is_lab ? (
                            <FlaskConical className="h-5 w-5 text-green-600" />
                          ) : (
                            <Monitor className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-foreground">
                            {entry.courseCode} 
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {entry.teacherName}
                          </p>
                        </div>
                      </div>

                      {/* Time and Location */}
                    </div>

                    {/* Session Type Badge */}
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={entry.is_lab ? "default" : "secondary"} className="text-xs">
                        {entry.is_lab ? `Lab Session - ${entry.batch == 'no-batch'? '':entry.batch == 'batch-1' ? 'Batch 1': 'Batch 2'}` : 'Theory Session'}
                      </Badge>
                      {/* Can be used for something els3 */}
                      {/* <div className="text-xs text-muted-foreground text-right">
                        Course ID: {entry.courseId}
                      </div> */}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-normal text-xs text-foreground">
                          {startTime.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })} - {endTime.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {duration} minutes
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm text-foreground">
                          {entry.location}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.is_lab ? 'Laboratory' : 'Classroom'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (isLoadingTimetableData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 md:gap-0">
        <div className="flex flex-col items-start">
          <h1 className="text-3xl font-bold flex items-center">
            <Calendar className="h-7 w-7 mr-2 text-primary" />
            My Timetable
          </h1>
          <p className="text-muted-foreground ml-9 md:ml-9 ml-0 mt-1 md:mt-0">
            View your weekly schedule and class details
          </p>
        </div>
        <div className="flex gap-2 self-start md:self-auto">
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('week')}
            className="flex items-center"
          >
            <LayoutGrid className="h-4 w-4 mr-1.5" />
            Week View
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
            className="flex items-center"
          >
            <List className="h-4 w-4 mr-1.5" />
            List View
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card className="border-primary/20">
            <CardHeader className="border-b bg-muted/20 flex flex-row justify-between items-center space-y-0 pb-4">
              <CardTitle className="flex items-center">
                {view === 'week' ? (
                  <>
                    <Layers className="h-5 w-5 mr-2 text-primary" />
                    Weekly Schedule
                  </>
                ) : (
                  <>
                    <Clock className="h-5 w-5 mr-2 text-primary" />
                    {currentDay} Classes
                  </>
                )}
              </CardTitle>
              {view === 'list' && (
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={previousDay}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={nextDay}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className={cn(
              "p-4", 
              view === 'week' ? "p-0 md:p-2" : "p-4"
            )}>
              {view === 'week' ? renderWeekView() : renderDayView()}
            </CardContent>
          </Card>
        </div>
        
        <div className="space-y-6">
          <Card className="border-primary/20">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="flex items-center">
                <GraduationCap className="h-5 w-5 mr-2 text-primary" />
                Timetable Summary
              </CardTitle>
              <CardDescription>
                Overview of your weekly schedule
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 border rounded-md hover:bg-accent/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/10">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Total Courses</span>
                  </div>
                  <Badge className="text-lg">
                    {timetableStats.totalCourses}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center p-3 border rounded-md hover:bg-accent/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Class Hours/Week</span>
                  </div>
                  <Badge variant="secondary" className="text-lg">
                    {timetableStats.totalClassHours} hrs
                  </Badge>
                </div>

                <div className="flex justify-between items-center p-3 border rounded-md hover:bg-accent/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center bg-blue-100">
                      <Monitor className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium">Theory Sessions</span>
                  </div>
                  <Badge variant="outline" className="text-lg">
                    {timetableStats.theorySessions}
                  </Badge>
                </div>

                <div className="flex justify-between items-center p-3 border rounded-md hover:bg-accent/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center bg-green-100">
                      <FlaskConical className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm font-medium">Lab Sessions</span>
                  </div>
                  <Badge variant="outline" className="text-lg">
                    {timetableStats.labSessions}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center p-3 border rounded-md hover:bg-accent/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Days with Classes</span>
                  </div>
                  <Badge className="text-lg">
                    {timetableStats.daysWithClasses}
                  </Badge>
                </div>
              </div>
              
              <div className="mt-6 rounded-lg border bg-muted/20 p-4">
                <h3 className="font-medium text-sm flex items-center">
                  <Calendar className="h-4 w-4 mr-1.5 text-primary" />
                  Class Days
                </h3>
                <div className="flex flex-wrap gap-2 mt-3">
                  {DAYS.map(day => {
                    const hasClasses = !!existingTimetableEntries.find(entry => 
                      entry.day.toLowerCase() === day.toLowerCase()
                    );
                    return (
                      <Badge 
                        key={day} 
                        variant={hasClasses ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-colors",
                          view === 'list' && currentDay === day ? "ring-2 ring-primary" : "",
                          !hasClasses && "text-muted-foreground"
                        )}
                        onClick={() => {
                          if (hasClasses) {
                            setCurrentDay(day);
                            setView('list');
                          }
                        }}
                      >
                        {day.substring(0, 3)}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* <Card className="border-primary/20">
            <CardHeader className="border-b bg-muted/20">
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-primary" />
                Need Help?
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                If you notice any discrepancies in your timetable or need to request changes, please contact your academic advisor.
              </p>
              <Button variant="outline" className="w-full mt-4 flex items-center justify-center">
                <MapPin className="h-4 w-4 mr-2" />
                Contact Academic Office
              </Button>
            </CardContent>
          </Card> */}
        </div>
      </div>
    </div>
  );
}