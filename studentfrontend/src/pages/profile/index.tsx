import { useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/use-auth";
import { useAllowedLoginStatus, clearAuthCookies } from "@/services/auth";
import { useLocation } from "react-router-dom";

import {
  calculateCurrentSemester,
  formatSemester,
  calculateAcademicYear,
  estimateBatchYear,
} from "@/utils/semester-calculator";
import {
  User,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  School,
  BookOpen,
  Award,
  Clock,
  Shield,
  Building,
} from "lucide-react";

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  gender: string;
  phone_number: string;
  is_active: boolean;
  user_type: string;
  date_joined: string;
  last_login: string | null;
  is_staff: boolean;
  is_superuser: boolean;
}

export interface ProfileResponse {
  user: User;
  student?: {
    id: number;
    batch: number;
    current_semester: number;
    year: number;
    roll_no: string | null;
    student_type: string;
    degree_type: string;
    department?: {
      id: number;
      dept_name: string;
      date_established: string;
      contact_info: string;
    };
  };
  teacher?: {
    id: number;
    staff_code: string;
    teacher_role: string;
    teacher_specialisation: string;
    teacher_working_hours: number;
    department?: {
      id: number;
      dept_name: string;
      date_established: string;
      contact_info: string;
    };
  };
}

export default function ProfilePage() {
  const location = useLocation();
  const { data: isLoginAllowed } = useAllowedLoginStatus();

  useEffect(() => {
    if (isLoginAllowed === false) {
      clearAuthCookies();
      window.location.href = "/auth/login?reason=not-allowed";
    }
  }, [isLoginAllowed]);

  // Fetch current user profile data
  const { data: userProfile } = useCurrentUser();

  // Format gender to full form
  const formatGender = (gender?: string): string => {
    if (!gender) return "Not specified";
    if (gender.toLowerCase() === "m") return "Male";
    if (gender.toLowerCase() === "f") return "Female";
    return gender;
  };

  // Get ordinal suffix for numbers (1st, 2nd, 3rd, etc.)
  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  // Calculate progress percentage for academic journey
  const calculateProgress = () => {
    if (!userProfile?.student) return 0;

    const totalSemesters = 8; // Assuming a 4-year degree with 8 semesters
    const currentSemester = userProfile.student.current_semester || 1;
    return Math.min(Math.round((currentSemester / totalSemesters) * 100), 100);
  };

  // Calculate expected graduation year
  const calculateGraduationYear = () => {
    if (!userProfile?.student) return "";

    const batch = userProfile.student.batch || new Date().getFullYear();
    return batch + 4; // Assuming a 4-year undergraduate program
  };

  // Mock education history for display
  const educationHistory = [
    {
      id: 1,
      institution: userProfile?.student?.department?.dept_name || "Current University",
      degree: userProfile?.student?.degree_type || "Bachelor's Degree",
      field: userProfile?.student?.department?.dept_name || "Computer Science",
      startYear: userProfile?.student?.batch || 2021,
      endYear: "Current",
      grade: "Current",
    },
  ];

  if (!userProfile) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Cover and Header */}
      <div className="h-64">
        <Card className="h-full relative border-dashed border-primary/20">
          <CardContent className="p-0">
            <div className="absolute bottom-0 left-0 right-0 px-8 py-6">
              <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
                {/* Avatar Section */}
                <div className="relative group bg-gradient-to-br from-primary/20 to-primary/10 p-1 rounded-full border border-background shadow-lg overflow-hidden">
                  <Avatar className="h-28 w-28 shadow-md overflow-hidden">
                    <div className="aspect-square h-full w-full flex items-center justify-center">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl h-full w-full flex items-center justify-center">
                        {userProfile.user?.first_name?.[0]?.toUpperCase() || ""}
                        {userProfile.user?.last_name?.[0]?.toUpperCase() || ""}
                      </AvatarFallback>
                    </div>
                  </Avatar>
                </div>

                {/* Profile Details */}
                <div className="flex-1 z-10">
                  <h1 className="text-3xl font-bold text-black dark:text-white drop-shadow-md">
                    {userProfile.user?.first_name || ""}{" "}
                    {userProfile.user?.last_name || ""}
                  </h1>
                  <div className="flex flex-wrap gap-3 mt-2">
                    <Badge
                      variant="secondary"
                      className="text-primary font-medium"
                    >
                      <GraduationCap className="h-3 w-3 mr-1" />
                      {userProfile.user?.user_type === "student" ? "Student" : "Teacher"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-white border bg-black/70"
                    >
                      <Building className="h-3 w-3 mr-1" />
                      {userProfile.student?.department?.dept_name || userProfile.teacher?.department?.dept_name || "Not specified"}
                    </Badge>
                    {userProfile.student && (
                      <Badge
                        variant="outline"
                        className="text-white bg-black/70"
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Batch of {userProfile.student.batch || "2023"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {userProfile.student && <TabsTrigger value="academic">Academic</TabsTrigger>}
          <TabsTrigger value="education">Education History</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="grid gap-6 md:grid-cols-2 ">
            <Card className="border-dashed border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Personal details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <User className="h-4 w-4 mr-1 text-muted-foreground" />
                    First Name
                  </label>
                  <div className="p-3 bg-muted rounded-md font-medium">
                    {userProfile.user?.first_name || "Not specified"}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <User className="h-4 w-4 mr-1 text-muted-foreground" />
                    Last Name
                  </label>
                  <div className="p-3 bg-muted rounded-md font-medium">
                    {userProfile.user?.last_name || "Not specified"}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <Mail className="h-4 w-4 mr-1 text-muted-foreground" />
                    Email
                  </label>
                  <div className="p-3 bg-muted rounded-md font-medium">
                    {userProfile.user?.email || "Not specified"}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center">
                    <Phone className="h-4 w-4 mr-1 text-muted-foreground" />
                    Phone Number
                  </label>
                  <div className="p-3 bg-muted rounded-md font-medium">
                    {userProfile.user?.phone_number || "Not specified"}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-dashed border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  {userProfile.user?.user_type === "student" ? "Student Information" : "Staff Information"}
                </CardTitle>
                <CardDescription>
                  {userProfile.user?.user_type === "student" ? "Student identification details" : "Staff identification details"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {userProfile.student && (
                  <>
                    <div className="space-y-1">
                      <label className="text-sm font-medium flex items-center text-muted-foreground">
                        <GraduationCap className="h-4 w-4 mr-1" />
                        Roll Number
                      </label>
                      <div className="font-medium text-foreground">
                        {userProfile.student.roll_no || "Not available"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium flex items-center text-muted-foreground">
                        <Building className="h-4 w-4 mr-1" />
                        Department
                      </label>
                      <div className="font-medium text-foreground">
                        {userProfile.student.department?.dept_name || "Not specified"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium flex items-center text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1" />
                        Batch
                      </label>
                      <div className="font-medium text-foreground">
                        {userProfile.student.batch || "Not specified"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium flex items-center text-muted-foreground">
                        <BookOpen className="h-4 w-4 mr-1" />
                        Degree Type
                      </label>
                      <div className="font-medium text-foreground">
                        {userProfile.student.degree_type || "Not specified"}
                      </div>
                    </div>
                  </>
                )}

                {userProfile.teacher && (
                  <>
                    <div className="space-y-1">
                      <label className="text-sm font-medium flex items-center text-muted-foreground">
                        <Shield className="h-4 w-4 mr-1" />
                        Staff Code
                      </label>
                      <div className="font-medium text-foreground">
                        {userProfile.teacher.staff_code || "Not available"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium flex items-center text-muted-foreground">
                        <Building className="h-4 w-4 mr-1" />
                        Department
                      </label>
                      <div className="font-medium text-foreground">
                        {userProfile.teacher.department?.dept_name || "Not specified"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium flex items-center text-muted-foreground">
                        <User className="h-4 w-4 mr-1" />
                        Role
                      </label>
                      <div className="font-medium text-foreground">
                        {userProfile.teacher.teacher_role || "Not specified"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium flex items-center text-muted-foreground">
                        <BookOpen className="h-4 w-4 mr-1" />
                        Specialisation
                      </label>
                      <div className="font-medium text-foreground">
                        {userProfile.teacher.teacher_specialisation || "Not specified"}
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium flex items-center text-muted-foreground">
                    <User className="h-4 w-4 mr-1" />
                    Gender
                  </label>
                  <div className="font-medium text-foreground">
                    {formatGender(userProfile.user?.gender)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Academic Tab - Only for Students */}
        {userProfile.student && (
          <TabsContent value="academic">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BookOpen className="h-5 w-5 mr-2" />
                    Academic Progress
                  </CardTitle>
                  <CardDescription>
                    Current academic status and progress
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <div className="text-sm font-medium">
                        {formatSemester(userProfile.student.current_semester || 1)}
                      </div>
                      <div className="text-sm font-medium">
                        {calculateProgress()}% Complete
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full bg-primary"
                        style={{ width: `${calculateProgress()}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                      <span>1st Semester</span>
                      <span>
                        Expected Graduation: {calculateGraduationYear()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-muted/40 rounded-lg p-4 overflow-hidden">
                      <div className="text-xl font-bold text-foreground truncate">
                        {userProfile.student.year || 1}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        Current Year
                      </div>
                    </div>

                    <div className="bg-muted/40 rounded-lg p-4 overflow-hidden">
                      <div className="text-xl font-bold text-foreground truncate">
                        {userProfile.student.current_semester 
                          ? `${userProfile.student.current_semester}${getOrdinalSuffix(userProfile.student.current_semester)}`
                          : "1st"}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        Semester
                      </div>
                    </div>

                    <div className="bg-muted/40 rounded-lg p-4 overflow-hidden">
                      <div className="text-xl font-bold text-foreground truncate">
                        {userProfile.student.student_type || "Regular"}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        Student Type
                      </div>
                    </div>

                    <div className="bg-muted/40 rounded-lg p-4 overflow-hidden">
                      <div className="text-xl font-bold text-foreground truncate">
                        {userProfile.student.degree_type || "Undergraduate"}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        Degree Type
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Award className="h-5 w-5 mr-2" />
                    Academic Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="rounded-lg border p-4">
                      <div className="font-medium text-foreground">
                        Department
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {userProfile.student.department?.dept_name || "Not specified"}
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="font-medium text-foreground">
                        Batch Year
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {userProfile.student.batch || "Not specified"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Education History Tab */}
        <TabsContent value="education">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <School className="h-5 w-5 mr-2" />
                Education History
              </CardTitle>
              <CardDescription>
                Educational qualifications and background
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {educationHistory.map((education) => (
                  <div
                    key={education.id}
                    className="flex border-l-2 border-primary pl-4 pb-6 relative"
                  >
                    <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-full bg-primary"></div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground">
                        {education.institution}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <Badge variant="secondary">
                          {education.startYear} - {education.endYear}
                        </Badge>
                        <Badge variant="outline">{education.degree}</Badge>
                        {education.grade !== "Current" && (
                          <Badge variant="outline" className="bg-primary/10">
                            Grade: {education.grade}
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground">
                        {education.field}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}