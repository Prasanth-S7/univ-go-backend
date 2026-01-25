import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { studentCourseApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Book, Calendar, Clock, User, Users, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import ReactGa from 'react-ga4';

interface Instructor {
  id: number;
  name: string;
  department: string;
  email: string;
}

interface Schedule {
  day: string;
  startTime: string;
  endTime: string;
  room: string;
}

interface Course {
  id: number;
  code: string;
  name: string;
  description: string;
  credits: number;
  prerequisites: string[];
  instructors: Instructor[];
  schedule: Schedule[];
  capacity: number;
  enrolled: number;
  syllabus: string;
  isEnrolled: boolean;
  semester: string;
}

export default function CourseDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);

  useEffect(() => {
    ReactGa.send({
      hitType: "Course Detail Page",
      page: "/course-detail",
      title: "Teacher Selection App",
    });
  }, []);

  // Fetch course details
  const { data: courseData, isLoading, error } = useQuery({
    queryKey: ['course', id],
    queryFn: async () => {
      try {
        // Try to get the course details from the API
        const response = await studentCourseApi.getCourseDetails(Number(id));
        return response.data;
      } catch (error) {
        // console.error('Error fetching course details:', error);
        
        // Mock data in case of error or during development
        return {
          id: Number(id),
          code: "CS101",
          name: "Introduction to Computer Science",
          description: "This course provides a comprehensive introduction to the fundamental concepts of computer science, covering the basics of programming, algorithms, data structures, and computational thinking. Students will learn problem-solving techniques through practical programming exercises.",
          credits: 3,
          prerequisites: ["None"],
          instructors: [
            {
              id: 1,
              name: "Dr. Jane Smith",
              department: "Computer Science",
              email: "jane.smith@university.edu"
            }
          ],
          schedule: [
            {
              day: "Monday",
              startTime: "10:00",
              endTime: "11:30",
              room: "CS Building 101"
            },
            {
              day: "Wednesday",
              startTime: "10:00",
              endTime: "11:30",
              room: "CS Building 101"
            }
          ],
          capacity: 120,
          enrolled: 95,
          syllabus: "Week 1: Introduction to Programming\nWeek 2: Variables and Data Types\nWeek 3: Control Structures\nWeek 4: Functions and Methods\nWeek 5: Data Structures\nWeek 6: Object-Oriented Programming\nWeek 7: Algorithms\nWeek 8: Software Development\nWeek 9-10: Final Project",
          isEnrolled: Math.random() > 0.5, // Randomly determine enrollment status for demo
          semester: "Fall 2023"
        };
      }
    },
    enabled: !!id,
  });

  // Set course data when it's available
  useEffect(() => {
    if (courseData) {
      setCourse(courseData);
    }
  }, [courseData]);

  // Enroll in course mutation
  const enrollMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const response = await studentCourseApi.selectCourse(id);
        return response.data;
      } catch (error) {
        // console.error('Error enrolling in course:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Update local course state
      setCourse(prev => prev ? { ...prev, isEnrolled: true } : null);
      toast.success('Successfully enrolled in course');
    },
    onError: (error: any) => {
      // Show specific error message if available
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to enroll in course');
      }
    }
  });

  // Drop course mutation
  const dropMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        const response = await studentCourseApi.dropCourse(id);
        return response.data;
      } catch (error) {
        console.error('Error dropping course:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Update local course state
      setCourse(prev => prev ? { ...prev, isEnrolled: false } : null);
      toast.success('Successfully dropped course');
    },
    onError: (error: any) => {
      // Show specific error message if available
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to drop course');
      }
    }
  });

  // Handle enrollment toggle
  const handleEnrollmentToggle = () => {
    if (!course) return;
    
    if (course.isEnrolled) {
      // Drop the course
      dropMutation.mutate(course.id);
    } else {
      // Enroll in the course
      enrollMutation.mutate(course.id);
    }
  };
  
  // Calculate enrollment percentage
  const enrollmentPercentage = course ? Math.round((course.enrolled / course.capacity) * 100) : 0;
  
  // Check if course is full
  const isFull = course ? course.enrolled >= course.capacity : false;
  
  // Format days for display
  const formatSchedule = (schedule: Schedule[]) => {
    // Group by days to make it cleaner
    const dayGroups: Record<string, Schedule[]> = {};
    
    schedule.forEach(item => {
      if (!dayGroups[item.room]) {
        dayGroups[item.room] = [];
      }
      dayGroups[item.room].push(item);
    });
    
    return Object.entries(dayGroups).map(([room, items]) => (
      <div key={room} className="mb-3 last:mb-0">
        <span className="font-medium">{room}</span>
        <div className="mt-1 space-y-1">
          {items.map((item, index) => (
            <div key={index} className="text-sm flex items-center">
              <Badge variant="outline" className="mr-2">
                {item.day}
              </Badge>
              <span>{item.startTime} - {item.endTime}</span>
            </div>
          ))}
        </div>
      </div>
    ));
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Show error state
  if (error && !course) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertCircle className="h-5 w-5 mr-2" />
            Error Loading Course
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>We couldn't load the course details. Please try again later.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => navigate('/course-selection')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Course Selection
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // If we have no course data, show empty state
  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[50vh]">
        <Book className="h-10 w-10 mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold mb-1">No Course Selected</h2>
        <p className="text-muted-foreground mb-4">Please select a course to view details</p>
        <Button onClick={() => navigate('/course-selection')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Browse Courses
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate('/course-selection')}
          className="flex items-center"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>
        
        <div className="flex items-center">
          <Badge
            variant={course.isEnrolled ? "default" : isFull ? "destructive" : "outline"}
            className="mr-2"
          >
            {course.isEnrolled ? 'Enrolled' : isFull ? 'Full' : `${enrollmentPercentage}% Full`}
          </Badge>
          
          <Button
            variant={course.isEnrolled ? "destructive" : "default"}
            disabled={!course.isEnrolled && isFull}
            onClick={handleEnrollmentToggle}
          >
            {enrollMutation.isPending || dropMutation.isPending ? (
              <span className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                Processing...
              </span>
            ) : course.isEnrolled ? (
              <span className="flex items-center">
                <XCircle className="h-4 w-4 mr-2" />
                Drop Course
              </span>
            ) : (
              <span className="flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Enroll
              </span>
            )}
          </Button>
        </div>
      </div>
      
      <div>
        <h1 className="text-3xl font-bold">{course.name}</h1>
        <div className="flex items-center mt-2">
          <Badge variant="secondary" className="mr-2">{course.code}</Badge>
          <Badge variant="outline">{course.credits} Credits</Badge>
        </div>
      </div>
      
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Course Details</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="syllabus">Syllabus</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{course.description}</p>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Instructors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {course.instructors.map((instructor) => (
                    <div key={instructor.id} className="flex flex-col">
                      <span className="font-medium">{instructor.name}</span>
                      <span className="text-sm text-muted-foreground">{instructor.department}</span>
                      <span className="text-sm text-muted-foreground">{instructor.email}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Book className="h-5 w-5 mr-2" />
                  Prerequisites
                </CardTitle>
              </CardHeader>
              <CardContent>
                {course.prerequisites.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {course.prerequisites.map((prereq, index) => (
                      <li key={index}>{prereq}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No prerequisites required</p>
                )}
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Enrollment
              </CardTitle>
              <CardDescription>
                {course.enrolled} students enrolled of {course.capacity} capacity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-muted rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    enrollmentPercentage > 90
                      ? "bg-destructive"
                      : enrollmentPercentage > 70
                      ? "bg-warning"
                      : "bg-primary"
                  }`}
                  style={{ width: `${Math.min(enrollmentPercentage, 100)}%` }}
                ></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Course Schedule
              </CardTitle>
              <CardDescription>
                {course.schedule.length} sessions per week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formatSchedule(course.schedule)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="syllabus">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Course Syllabus
              </CardTitle>
              <CardDescription>
                {course.semester}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-line font-sans p-4 bg-muted rounded-md">
                {course.syllabus}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 