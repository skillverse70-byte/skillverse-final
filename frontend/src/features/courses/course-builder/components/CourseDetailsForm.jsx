import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isVerifiedOrganization } from "@/lib/trust-state";

export default function CourseDetailsForm({
  form,
  set,
  tagInput,
  setTagInput,
  organization,
}) {
  const canCreatePaidCourse = isVerifiedOrganization(organization);
  const paidToggleLocked = !canCreatePaidCourse && form.is_free;

  return (
    <div className="bg-white rounded-2xl border border-border/50 p-6 mb-6 space-y-4">
      <h2 className="font-heading font-semibold text-sm text-muted-foreground uppercase tracking-wider">
        Course Details
      </h2>
      <div>
        <Label>Title</Label>
        <Input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className="mt-1.5"
          placeholder="e.g. Python for Beginners"
        />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className="mt-1.5"
          rows={3}
          placeholder="What will students learn?"
        />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Category</Label>
          <Input
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            className="mt-1.5"
            placeholder="e.g. Programming"
          />
        </div>
        <div>
          <Label>Difficulty</Label>
          <Select value={form.difficulty} onValueChange={(v) => set("difficulty", v)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label>Instructor</Label>
          <Input
            value={form.instructor_name}
            onChange={(e) => set("instructor_name", e.target.value)}
            className="mt-1.5"
            placeholder="Instructor name"
          />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Tags (comma-separated)</Label>
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          className="mt-1.5"
          placeholder="python, coding, beginner"
        />
      </div>
      {!canCreatePaidCourse ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Verified organization status is required before you can create or keep a paid course.
          Free courses are still available right now.
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-4 pt-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_free}
            onChange={(e) => set("is_free", e.target.checked)}
            className="rounded"
            disabled={paidToggleLocked}
          />
          Free course
        </label>
        {!form.is_free && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Label>Price</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => set("price", Number(e.target.value))}
                className="w-28"
                disabled={!canCreatePaidCourse}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label>Currency</Label>
              <Select
                value={form.price_currency}
                onValueChange={(v) => set("price_currency", v)}
                disabled={!canCreatePaidCourse}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETB">ETB</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enrollment_open}
            onChange={(e) => set("enrollment_open", e.target.checked)}
            className="rounded"
          />
          Enrollment open
        </label>
      </div>
    </div>
  );
}
