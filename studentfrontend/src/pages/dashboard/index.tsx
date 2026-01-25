import { useCurrentUser } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Calendar,
  Clock,
  GraduationCap,
  Building,
  BookOpenCheck,
  Mail,
  User,
  Award,
  Bell,
  Check,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import {
  dashboardApi,
} from "@/services/api";
import { toast } from "sonner";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useStudentTimetableData } from '@/action/timetable';
import ReactGA from 'react-ga4';
import { useAllowedLoginStatus, clearAuthCookies } from "@/services/auth";
import { useLocation } from "react-router-dom";

export default function DashboardPage() {
  const { data: studentDetails, isPending: loadingStudentDetails } = useCurrentUser();
  const { isOnline } = useNetworkStatus();
  const location = useLocation();
  const { data: isLoginAllowed } = useAllowedLoginStatus();

  useEffect(() => {
    if (!isOnline) {
      toast.warning("You are currently offline. Some data may not be up to date.", {
        id: "network-offline",
        duration: 3000,
      });
    }
  }, [isOnline]);

  useEffect(() => {
    if (isLoginAllowed === false) {
      clearAuthCookies();
      window.location.href = "/auth/login?reason=not-allowed";
    }
  }, [isLoginAllowed]);

  // Fetch dashboard data
  // const {
  //   data: dashboardData,
  //   isLoading,
  //   error,
  // } = useQuery({
  //   queryKey: ["dashboard"],
  //   queryFn: async () => {
  //     try {
  //       const enrolledResponse = await studentCourseApi.getMyCourseSelections();
  //       let enrolledCount = 0;
  //       if (Array.isArray(enrolledResponse.data)) {
  //         enrolledCount = enrolledResponse.data.length;
  //         console.log(enrolledCount)
  //       } else if (enrolledResponse.data?.count) {
  //         enrolledCount = enrolledResponse.data.count;
  //       }
  //       return {
  //         enrolledCourses: enrolledCount,
  //         todaySchedule: [],
  //       };
  //     } catch {
  //     }
  //   },
  //   staleTime: 5 * 60 * 1000,
  //   retry: 2,
  // });

  // Fetch notifications
  const { data: notificationData = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      try {
        const response = await dashboardApi.getNotifications();
        const notificationsData = Array.isArray(response.data)
          ? response.data
          : response.data?.results && Array.isArray(response.data.results)
          ? response.data.results
          : [];
        return notificationsData;
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  // Timetable-based today's sessions
  // const {
  //   data: timetableData,
  //   isLoading: isLoadingTimetableData,
  //   refetch: refetchTimetableData,
  // } = useStudentTimetableData();

  // useEffect(() => {
  //   refetchTimetableData();
  // }, [refetchTimetableData]);

  // Transform timetable data to flat entries (reuse logic from timetable page)
  // const timetableEntries = useMemo(() => (
  //   (timetableData && Array.isArray(timetableData)) ? timetableData.flatMap((item) =>
  //     item.sessions.map((session) => ({
  //       courseId: item.teacher_course_id,
  //       courseCode: item.course_code,
  //       teacherName: item.teacher_name,
  //       day: session.day,
  //       startTime: session.session.start_time,
  //       endTime: session.session.end_time,
  //       location: `${session.venue.room_number} (${session.venue.block})`,
  //       sessionName: session.session.name,
  //       is_lab: session.is_lab ?? session.session.is_lab_time,
  //       is_batched: session.is_batched ?? ((session.is_lab ?? session.session.is_lab_time) && !!session.batch),
  //       batch: session.batch,
  //     }))
  //   ) : []
  // ), [timetableData]);

  // Use useMemo to always get today's sessions when timetableEntries changes
  // const todayTimetableSessions = useMemo(() => {
  //   const today = new Date().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  //   return timetableEntries.filter(entry => entry.day.toLowerCase() === today);
  // }, [timetableEntries]);

  // Formatters
  const formatDegreeType = (type) => {
    if (!type) return "Not specified";
    const typeMappings = {
      ug: "Undergraduate",
      pg: "Postgraduate",
      phd: "Doctorate",
      diploma: "Diploma",
      mba: "Master of Business Administration",
    };
    return typeMappings[type.toLowerCase()] || type;
  };

  // Mark a notification as read
  const markAsRead = async (id) => {
    try {
      await dashboardApi.markNotificationAsRead(id);
      toast.success("Notification marked as read");
    } catch {
      toast.error("Failed to mark notification as read");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center">
          <GraduationCap className="h-6 w-6 mr-2 text-primary" />
          Welcome back, {studentDetails?.user.first_name} {studentDetails?.user.last_name}!
        </h1>
        <p className="text-muted-foreground ml-8 text-sm">
          Here's an overview of your academic activities
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Personal Information Card (now includes degree type) */}
        <Card className="border-primary/20 border-dashed">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Email Address:</span>
                </div>
                <div className="text-sm pl-6">
                  {loadingStudentDetails ? (
                    <div className="h-4 w-40 bg-muted animate-pulse rounded"></div>
                  ) : (
                    studentDetails?.user?.email
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Department:</span>
                </div>
                <div className="text-sm pl-6">
                  {loadingStudentDetails ? (
                    <div className="h-4 w-48 bg-muted animate-pulse rounded"></div>
                  ) : (
                    <Badge variant="outline" className="font-normal">
                      {studentDetails?.student?.department?.dept_name || "department"}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Degree Type:</span>
                </div>
                <div className="text-sm pl-6">
                  {loadingStudentDetails ? (
                    <div className="h-4 w-32 bg-muted animate-pulse rounded"></div>
                  ) : (
                    <Badge>
                      {formatDegreeType(studentDetails?.student?.degree_type)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Details Card (keep only semester, academic year, progress) */}
        <Card className="border-primary/20 border-dashed">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center">
              <BookOpenCheck className="h-5 w-5 mr-2 text-primary" />
              Academic Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpenCheck className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Current Semester:</span>
                </div>
                <div className="text-sm pl-6">
                  {loadingStudentDetails ? (
                    <div className="h-4 w-36 bg-muted animate-pulse rounded"></div>
                  ) : (
                    <Badge variant="secondary">
                      {studentDetails?.student?.current_semester || 1} Semester
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Academic Year:</span>
                </div>
                <div className="text-sm pl-6">
                  {loadingStudentDetails ? (
                    <div className="h-4 w-20 bg-muted animate-pulse rounded"></div>
                  ) : (
                    <Badge>
                      Year {Math.ceil((studentDetails?.student?.current_semester || 1) / 2)}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Current Progress:</span>
                </div>
                <div className="text-sm pl-6">
                  {loadingStudentDetails ? (
                    <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                  ) : (
                    <div className="mt-1">
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{
                            width: `${((studentDetails?.student?.current_semester || 0) / 8) * 100}%`,
                          }}
                        ></div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground text-center">
                        Semester {studentDetails?.student?.current_semester}/8
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Un comment after live */}
      {/* <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-primary/20 border-dashed">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-primary" />
              Today's Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="mt-8">
                <div className="font-semibold text-base flex items-center mb-2">
                  Today's Sessions (from Timetable)
                </div>
                {isLoadingTimetableData ? (
                  <div className="h-8 w-40 bg-muted animate-pulse rounded" />
                ) : todayTimetableSessions.length > 0 ? (
                  <ul className="space-y-2">
                    {todayTimetableSessions.sort((a, b) => {
                      const timeA = new Date(`2000-01-01T${a.startTime}`);
                      const timeB = new Date(`2000-01-01T${b.startTime}`);
                      return timeA.getTime() - timeB.getTime();
                    }).map((entry, idx) => {
                      const startTime = new Date(`2000-01-01T${entry.startTime}`);
                      const endTime = new Date(`2000-01-01T${entry.endTime}`);
                      return (
                        <li key={`${entry.courseId}-${idx}`} className="border-b last:border-b-0 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div className="flex-1">
                            <span className="font-semibold">{entry.courseCode}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{entry.teacherName}</span>
                          </div>
                          <div className="flex-1 text-sm">
                            {startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - {endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                          </div>
                          <div className="flex-1 text-sm">
                            {entry.location}
                          </div>
                          <div className="flex-1 text-xs">
                            {entry.is_lab ? 'Lab' : 'Theory'}
                            {entry.batch && entry.batch !== 'no-batch' ? ` (${entry.batch === 'batch-1' ? 'Batch 1' : 'Batch 2'})` : ''}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="text-muted-foreground text-sm">No sessions from timetable for today</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 border-dashed">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="flex items-center">
              <Bell className="h-5 w-5 mr-2 text-primary" />
              Notifications
            </CardTitle>
            <CardDescription>Recent updates and announcements</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {notificationData.length > 0 ? (
                notificationData.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`overflow-hidden border ${
                      notification.is_read
                        ? "bg-muted/50"
                        : "bg-card shadow-sm border-primary/20"
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {!notification.is_read && (
                              <span className="h-2 w-2 rounded-full bg-primary" />
                            )}
                            {notification.notification_details.title}
                            <Badge variant="outline" className="text-xs">
                            {new Date(
                              notification.notification_details.created_at
                            ).toLocaleDateString()}
                          </Badge>
                          </div>
                          <div
                            className="text-sm text-muted-foreground mt-2"
                            dangerouslySetInnerHTML={{
                              __html: notification.notification_details.message.replace(/\n/g, "<br />"),
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/50">
                        {!notification.is_read ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-primary hover:bg-primary/10"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                            Mark as read
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center">
                            <Check className="h-3 w-3 mr-1" />
                            Read
                          </span>
                        )}

                        {notification.notification_details.action_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-primary hover:bg-primary/10"
                            onClick={(e) => {
                              if (!notification.is_read) {
                                e.preventDefault();
                                markAsRead(notification.notification_details.id);
                                window.location.href =
                                  notification.notification_details.action_url || "";
                              } else {
                                window.location.href =
                                  notification.notification_details.action_url || "";
                              }
                            }}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {notification.notification_details.action_text || "View"}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground rounded-lg border border-dashed p-6">
                  <Bell className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="font-medium">No new notifications</h3>
                  <p className="text-sm mt-1">You're all caught up!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div> */}
    </div>
  );
}
