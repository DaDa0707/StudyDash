"use client";

import { useActionState } from "react";

import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SelectField } from "@/components/form/select-field";
import { SubmitButton } from "@/components/form/submit-button";
import {
  createAssignmentAction,
  updateAssignmentAction,
} from "@/lib/actions/assignments";
import { ASSIGNMENT_STATUSES, PRIORITIES } from "@/lib/assignments";
import { idleFormState } from "@/lib/form";
import type { AssignmentStatus, PriorityLevel, Subject } from "@/types/database";

interface Props {
  subjects: Subject[];
  /** 既定の締切日（YYYY-MM-DD、ユーザーのタイムゾーン基準） */
  defaultDueDate: string;
  assignment?: {
    id: string;
    title: string;
    subject_id: string | null;
    dueDate: string;
    /** 日付のみの締切なら "" */
    dueTime: string;
    priority: PriorityLevel | null;
    status: AssignmentStatus;
    note: string | null;
  };
}

export function AssignmentForm({ subjects, defaultDueDate, assignment }: Props) {
  const isEdit = Boolean(assignment);
  const [state, formAction] = useActionState(
    isEdit ? updateAssignmentAction : createAssignmentAction,
    idleFormState,
  );

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {assignment ? <input type="hidden" name="id" value={assignment.id} /> : null}

      <Field
        label="タイトル"
        name="title"
        defaultValue={assignment?.title ?? ""}
        maxLength={100}
        required
        placeholder="数学 ワークp.42-45"
        error={state.fieldErrors?.title}
      />

      <SelectField
        label="科目"
        name="subjectId"
        defaultValue={assignment?.subject_id ?? ""}
        hint={subjects.length === 0 ? "科目を登録すると選べるようになります" : undefined}
        error={state.fieldErrors?.subjectId}
      >
        <option value="">指定しない</option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.name}
          </option>
        ))}
      </SelectField>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="締切日"
          name="dueDate"
          type="date"
          defaultValue={assignment?.dueDate ?? defaultDueDate}
          required
          error={state.fieldErrors?.dueDate}
        />
        <Field
          label="時刻"
          name="dueTime"
          type="time"
          defaultValue={assignment?.dueTime ?? ""}
          hint="空なら日付のみ"
          error={state.fieldErrors?.dueTime}
        />
      </div>

      <SelectField
        label="優先度"
        name="priority"
        defaultValue={assignment?.priority ?? ""}
        error={state.fieldErrors?.priority}
      >
        <option value="">指定しない</option>
        {PRIORITIES.map((priority) => (
          <option key={priority.value} value={priority.value}>
            {priority.label}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="状態"
        name="status"
        defaultValue={assignment?.status ?? "not_started"}
        error={state.fieldErrors?.status}
      >
        {ASSIGNMENT_STATUSES.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </SelectField>

      <Field
        label="メモ"
        name="note"
        defaultValue={assignment?.note ?? ""}
        maxLength={2000}
        placeholder="任意"
        error={state.fieldErrors?.note}
      />

      <FormMessage state={state} />
      <SubmitButton>{isEdit ? "保存" : "課題を追加"}</SubmitButton>
    </form>
  );
}
