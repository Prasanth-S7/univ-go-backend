import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store/store';
import {
  fetchAvailableCourses,
  fetchAvailableTeachers,
  fetchAvailableSlots,
  createCourseSelection,
  fetchMyCourseSelections,
  deleteCourseSelection,
} from '../store/courseSelectionSlice';

const CourseSelection: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    availableCourses,
    availableTeachers,
    availableSlots,
    myCourseSelections,
    loading,
    error,
  } = useSelector((state: RootState) => state.courseSelection);

  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');

  useEffect(() => {
    dispatch(fetchAvailableCourses());
    dispatch(fetchMyCourseSelections());
  }, [dispatch]);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId);
    setSelectedTeacher('');
    setSelectedSlot('');
    if (courseId) {
      dispatch(fetchAvailableTeachers(courseId));
    }
  };

  const handleTeacherChange = (teacherId: string) => {
    setSelectedTeacher(teacherId);
    setSelectedSlot('');
    if (teacherId && selectedCourse) {
      dispatch(fetchAvailableSlots({ courseId: selectedCourse, teacherId }));
    }
  };

  const handleSubmit = async () => {
    if (selectedCourse && selectedTeacher && selectedSlot) {
      await dispatch(
        createCourseSelection({
          course_id: selectedCourse,
          teacher_id: selectedTeacher,
          slot_id: selectedSlot,
        })
      );
      // Reset form
      setSelectedCourse('');
      setSelectedTeacher('');
      setSelectedSlot('');
      // Refresh course selections
      dispatch(fetchMyCourseSelections());
    }
  };

  const handleDelete = async (id: string) => {
    await dispatch(deleteCourseSelection(id));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Course Selection
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {/* Course Selection Form */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Select Course and Teacher
              </Typography>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Course</InputLabel>
                <Select
                  value={selectedCourse}
                  label="Course"
                  onChange={(e) => handleCourseChange(e.target.value)}
                >
                  {availableCourses.map((course: any) => (
                    <MenuItem key={course.id} value={course.id}>
                      {course.course_id.course_name} ({course.course_id.course_id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Teacher</InputLabel>
                <Select
                  value={selectedTeacher}
                  label="Teacher"
                  onChange={(e) => handleTeacherChange(e.target.value)}
                  disabled={!selectedCourse}
                >
                  {availableTeachers.map((teacher: any) => (
                    <MenuItem key={teacher.id} value={teacher.id}>
                      {teacher.teacher_id.first_name} {teacher.teacher_id.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Time Slot</InputLabel>
                <Select
                  value={selectedSlot}
                  label="Time Slot"
                  onChange={(e) => setSelectedSlot(e.target.value)}
                  disabled={!selectedTeacher}
                >
                  {availableSlots.map((slot: any) => (
                    <MenuItem key={slot.id} value={slot.id}>
                      {slot.day} ({slot.start_time} - {slot.end_time})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleSubmit}
                disabled={!selectedCourse || !selectedTeacher || !selectedSlot}
              >
                Add Course
              </Button>
            </CardContent>
          </Card>
        </Box>

        {/* Selected Courses */}
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                My Course Selections
              </Typography>

              {myCourseSelections.length === 0 ? (
                <Typography color="textSecondary">No courses selected yet</Typography>
              ) : (
                myCourseSelections.map((selection: any) => (
                  <Card key={selection.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="subtitle1">
                        {selection.course_details.course_id.course_name}
                      </Typography>
                      <Typography color="textSecondary">
                        Teacher: {selection.teacher_details.teacher_id.first_name}{' '}
                        {selection.teacher_details.teacher_id.last_name}
                      </Typography>
                      <Typography color="textSecondary">
                        Slot: {selection.slot_details.day} ({selection.slot_details.start_time} -{' '}
                        {selection.slot_details.end_time})
                      </Typography>
                      <Typography color="textSecondary">Status: {selection.status}</Typography>
                      <div className="flex items-center mt-1 text-sm text-muted-foreground">
                        <Building className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                        {selection.course?.dept_name || "Department N/A"} • Year{" "}
                        {selection.course?.course_year || "?"}, Sem{" "}
                        {selection.course?.course_semester || "?"}
                      </div>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleDelete(selection.id)}
                        sx={{ mt: 1 }}
                      >
                        Remove
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Container>
  );
};

export default CourseSelection; 
