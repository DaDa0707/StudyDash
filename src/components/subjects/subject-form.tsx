"use client";

import { useActionState } from "react";

import { ColorPicker } from "@/components/subjects/color-picker";
import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { createSubjectAction, updateSubjectAction } from "@/lib/actions/subjects";
import { idleFormState } from "@core/form";
import { SUBJECT_COLORS } from "@core/validation/timetable";
import type { Subject } from "@core/database";

interface Props {
  /** 未指定なら新規作成 */
  subject?: Subject;
}

export function SubjectForm({ subject }: Props) {
  const isEdit = Boolean(subject);
  const [state, formAction] = useActionState(
    isEdit ? updateSubjectAction : createSubjectAction,
    idleFormState,
  );

  // 新規作成が成功したらフォームを空に戻す（続けて追加できるように）
  const formKey = !isEdit && state.status === "success" ? state.message : "form";

  return (
    <form key={formKey} action={formAction} className="space-y-4" noValidate>
      {subject ? <input type="hidden" name="id" value={subject.id} /> : null}

      <Field
        label="科目名"
        name="name"
        defaultValue={subject?.name ?? ""}
        maxLength={50}
        required
        placeholder="数学Ⅱ"
        error={state.fieldErrors?.name}
      />

      <Field
        label="先生名"
        name="teacher"
        defaultValue={subject?.teacher ?? ""}
        maxLength={50}
        placeholder="任意"
        error={state.fieldErrors?.teacher}
      />

      <ColorPicker name="color" defaultValue={subject?.color ?? SUBJECT_COLORS[5]} />

      <FormMessage state={state} />
      <SubmitButton>{isEdit ? "保存" : "科目を追加"}</SubmitButton>
    </form>
  );
}
