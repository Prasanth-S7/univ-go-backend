import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentNotesApi } from '@/services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle, Circle, Edit, Trash2, Plus } from 'lucide-react';
import { useAllowedLoginStatus, clearAuthCookies } from "@/services/auth";
import { useLocation } from "react-router-dom";

export default function NotesPage() {
  const location = useLocation();
  const { data: isLoginAllowed } = useAllowedLoginStatus();

  useEffect(() => {
    if (isLoginAllowed === false) {
      clearAuthCookies();
      window.location.href = "/auth/login?reason=not-allowed";
    }
  }, [isLoginAllowed]);

  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['student-notes'],
    queryFn: studentNotesApi.getNotes,
    staleTime: 2 * 60 * 1000,
  });

  // State for add/edit
  const [form, setForm] = useState<{ id?: number; title: string; content: string }>({ title: '', content: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Mutations
  const createMutation = useMutation({
    mutationFn: studentNotesApi.createNote,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['student-notes'] }); setForm({ title: '', content: '' }); setShowForm(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => studentNotesApi.updateNote(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['student-notes'] }); setForm({ title: '', content: '' }); setEditingId(null); setShowForm(false); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => studentNotesApi.deleteNote(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['student-notes'] }); },
  });
  const toggleDoneMutation = useMutation({
    mutationFn: ({ id, is_completed }: any) => studentNotesApi.updateNote(id, { is_completed }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['student-notes'] }); },
  });

  // Handlers
  const handleEdit = (note: any) => {
    setForm({ id: note.id, title: note.title, content: note.content });
    setEditingId(note.id);
    setShowForm(true);
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, title: form.title, content: form.content });
    } else {
      createMutation.mutate({ title: form.title, content: form.content });
    }
  };
  const handleCancel = () => {
    setForm({ title: '', content: '' });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 border-dashed">
        <CardHeader className="border-b bg-muted/20 flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Circle className="h-5 w-5 mr-2 text-primary" />
            My Notes / Todos
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm({ title: '', content: '' }); }}>
            <Plus className="h-4 w-4 mr-1" /> Add Note
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 space-y-2">
              <Input
                placeholder="Title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
                maxLength={200}
              />
              <textarea
                placeholder="Details (optional)"
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={2}
                maxLength={1000}
                className="w-full rounded border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex gap-2 mt-2">
                <Button type="submit" size="sm">
                  {editingId ? 'Update' : 'Add'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
              </div>
            </form>
          )}
          {isLoading ? (
            <div className="text-center text-muted-foreground">Loading notes...</div>
          ) : error ? (
            <div className="text-center text-destructive">Failed to load notes.</div>
          ) : data?.data?.length === 0 ? (
            <div className="text-center text-muted-foreground">No notes yet. Add your first note!</div>
          ) : (
            <ul className="space-y-3">
              {data?.data?.map((note: any) => (
                <li key={note.id} className={`border rounded-lg p-4 flex flex-col gap-1 bg-muted/10 ${note.is_completed ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-full p-1 hover:bg-primary/10"
                      title={note.is_completed ? 'Mark as not done' : 'Mark as done'}
                      onClick={() => toggleDoneMutation.mutate({ id: note.id, is_completed: !note.is_completed })}
                    >
                      {note.is_completed ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                    </button>
                    <span className={`font-semibold text-base flex-1 ${note.is_completed ? 'line-through text-muted-foreground' : ''}`}>{note.title}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(note)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(note.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                  {note.content && <div className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{note.content}</div>}
                  <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                    <span>Created: {new Date(note.created_at).toLocaleString()}</span>
                    {note.updated_at !== note.created_at && <span>Updated: {new Date(note.updated_at).toLocaleString()}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 