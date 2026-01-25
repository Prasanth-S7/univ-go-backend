import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { studentCourseApi } from '@/services/api';

// Define types for state
interface Course {
  id: string;
  course_id: {
    course_name: string;
    course_id: string;
  };
}

interface Teacher {
  id: string;
  teacher_id: {
    first_name: string;
    last_name: string;
  };
}

interface Slot {
  id: string;
  day: string;
  start_time: string;
  end_time: string;
}

interface CourseSelection {
  id: string;
  course_details: Course;
  teacher_details: Teacher;
  slot_details: Slot;
}

interface CourseSelectionState {
  availableCourses: Course[];
  availableTeachers: Teacher[];
  availableSlots: Slot[];
  myCourseSelections: CourseSelection[];
  loading: boolean;
  error: string | null;
}

// Define the initial state
const initialState: CourseSelectionState = {
  availableCourses: [],
  availableTeachers: [],
  availableSlots: [],
  myCourseSelections: [],
  loading: false,
  error: null,
};

// Async thunks
export const fetchAvailableCourses = createAsyncThunk(
  'courseSelection/fetchAvailableCourses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await studentCourseApi.getAvailableCourses();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch available courses');
    }
  }
);

export const fetchAvailableTeachers = createAsyncThunk(
  'courseSelection/fetchAvailableTeachers',
  async (courseId: string, { rejectWithValue }) => {
    try {
      const response = await studentCourseApi.getAvailableTeachers(courseId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch available teachers');
    }
  }
);

export const fetchAvailableSlots = createAsyncThunk(
  'courseSelection/fetchAvailableSlots',
  async ({ courseId, teacherId }: { courseId: string; teacherId: string }, { rejectWithValue }) => {
    try {
      const response = await studentCourseApi.getAvailableSlots(courseId, teacherId);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch available slots');
    }
  }
);

export const fetchMyCourseSelections = createAsyncThunk(
  'courseSelection/fetchMyCourseSelections',
  async (_, { rejectWithValue }) => {
    try {
      const response = await studentCourseApi.getMyCourseSelections();
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch course selections');
    }
  }
);

export const createCourseSelection = createAsyncThunk(
  'courseSelection/createCourseSelection',
  async (data: { course_id: string; teacher_id: string; slot_id: string }, { rejectWithValue }) => {
    try {
      const response = await studentCourseApi.createCourseSelection({
        course_id: Number(data.course_id),
        teacher_id: Number(data.teacher_id),
        slot_id: Number(data.slot_id),
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create course selection');
    }
  }
);

export const deleteCourseSelection = createAsyncThunk(
  'courseSelection/deleteCourseSelection',
  async (id: string, { rejectWithValue }) => {
    try {
      await studentCourseApi.deleteCourseSelection(Number(id));
      return id;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete course selection');
    }
  }
);

// Create the slice
const courseSelectionSlice = createSlice({
  name: 'courseSelection',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // fetchAvailableCourses
    builder
      .addCase(fetchAvailableCourses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableCourses.fulfilled, (state, action) => {
        state.availableCourses = action.payload;
        state.loading = false;
      })
      .addCase(fetchAvailableCourses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // fetchAvailableTeachers
    builder
      .addCase(fetchAvailableTeachers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableTeachers.fulfilled, (state, action) => {
        state.availableTeachers = action.payload;
        state.loading = false;
      })
      .addCase(fetchAvailableTeachers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // fetchAvailableSlots
    builder
      .addCase(fetchAvailableSlots.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAvailableSlots.fulfilled, (state, action) => {
        state.availableSlots = action.payload;
        state.loading = false;
      })
      .addCase(fetchAvailableSlots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // fetchMyCourseSelections
    builder
      .addCase(fetchMyCourseSelections.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyCourseSelections.fulfilled, (state, action) => {
        state.myCourseSelections = action.payload;
        state.loading = false;
      })
      .addCase(fetchMyCourseSelections.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // createCourseSelection
    builder
      .addCase(createCourseSelection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCourseSelection.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createCourseSelection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // deleteCourseSelection
    builder
      .addCase(deleteCourseSelection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCourseSelection.fulfilled, (state, action) => {
        state.myCourseSelections = state.myCourseSelections.filter(
          (selection) => selection.id !== action.payload
        );
        state.loading = false;
      })
      .addCase(deleteCourseSelection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default courseSelectionSlice.reducer; 