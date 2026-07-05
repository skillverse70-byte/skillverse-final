import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CourseDetailsForm({ form, set, tagInput, setTagInput }) {
  return (
    <div className="bg-white rounded-2xl border border-border/50 p-6 mb-6 space-y-4">
      <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider">Course Details</h2>
      <div><Label>Title</Label><Input value={form.title} onChange={e => set("title", e.target.value)} className="mt-1.5" placeholder="e.g. Python for Beginners" /></div>
      <div><Label>Description</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} className="mt-1.5" rows={3} placeholder="What will students learn?" /></div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label>Category</Label><Input value={form.category} onChange={e => set("category", e.target.value)} className="mt-1.5" placeholder="e.g. Programming" /></div>
        <div><Label>Difficulty</Label>
          <Select value={form.difficulty} onValueChange={v => set("difficulty", v)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="beginner">Beginner</SelectItem><SelectItem value="intermediate">Intermediate</SelectItem><SelectItem value="advanced">Advanced</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label>Instructor</Label><Input value={form.instructor_name} onChange={e => set("instructor_name", e.target.value)} className="mt-1.5" placeholder="Instructor name" /></div>
        <div><Label>Status</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="published">Published</SelectItem><SelectItem value="archived">Archived</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Tags (comma-separated)</Label><Input value={tagInput} onChange={e => setTagInput(e.target.value)} className="mt-1.5" placeholder="python, coding, beginner" /></div>
      <div className="flex flex-wrap items-center gap-4 pt-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_free} onChange={e => set("is_free", e.target.checked)} className="rounded" /> Free course</label>
        {!form.is_free && <div className="flex items-center gap-2"><Label>Price ($)</Label><Input type="number" value={form.price} onChange={e => set("price", Number(e.target.value))} className="w-24" /></div>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enrollment_open} onChange={e => set("enrollment_open", e.target.checked)} className="rounded" /> Enrollment open</label>
      </div>
    </div>
  );
}
