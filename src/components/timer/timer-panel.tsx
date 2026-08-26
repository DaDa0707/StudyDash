"use client";

import { Pause, Play, Square, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import {
  discardTimerAction,
  finishTimerAction,
  pauseTimerAction,
  resumeTimerAction,
  startTimerAction,
} from "@/lib/actions/study";
import { idleFormState } from "@/lib/form";
import { elapsedSeconds, formatTimerDisplay, subjectLabel, type TimerFields } from "@/lib/timer";
import { useActionToast } from "@/lib/use-action-toast";
import type { Subject } from "@/types/database";

interface RunningSession extends TimerFields {
  id: string;
  subjectName: string | null;
  subjectColor: string | null;
}

interface Props {
  subjects: Subject[];
  running: RunningSession | null;
  /** サーバー側の現在時刻。端末の時計とのずれを補正するために使う */
  serverNow: string;
  defaultSubjectId: string | null;
}

/**
 * §5.3 のタイマー本体。
 *
 * 経過時間の確定はサーバーが行い、ここは表示のために毎秒描き直すだけ。
 * 端末の時計がずれていても表示が狂わないよう、初回にサーバー時刻との差を測って補正する。
 */
export function TimerPanel({ subjects, running, serverNow, defaultSubjectId }: Props) {
  if (!running) {
    return <IdleTimer subjects={subjects} defaultSubjectId={defaultSubjectId} />;
  }
  return <ActiveTimer running={running} serverNow={serverNow} />;
}

function IdleTimer({
  subjects,
  defaultSubjectId,
}: {
  subjects: Subject[];
  defaultSubjectId: string | null;
}) {
  const [state, formAction] = useActionState(startTimerAction, idleFormState);
  useActionToast(state, { silentOnSuccess: true });

  return (
    <form action={formAction} className="space-y-5">
      <div className="rounded-2xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <p className="font-mono text-5xl font-bold tabular-nums">00:00</p>
        <p className="mt-2 text-sm text-muted-foreground">科目を選んで開始します</p>
      </div>

      <SelectField label="科目" name="subjectId" defaultValue={defaultSubjectId ?? ""}>
        <option value="">その他</option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.name}
          </option>
        ))}
      </SelectField>

      <StartButton />
    </form>
  );
}

function StartButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="h-14 w-full text-base">
      <Play className="size-5" aria-hidden />
      開始
    </Button>
  );
}

function ActiveTimer({
  running,
  serverNow,
}: {
  running: RunningSession;
  serverNow: string;
}) {
  const [pauseState, pauseAction] = useActionState(pauseTimerAction, idleFormState);
  const [resumeState, resumeAction] = useActionState(resumeTimerAction, idleFormState);
  const [finishState, finishAction] = useActionState(finishTimerAction, idleFormState);
  const [discardState, discardAction] = useActionState(discardTimerAction, idleFormState);

  useActionToast(pauseState, { silentOnSuccess: true });
  useActionToast(resumeState, { silentOnSuccess: true });
  useActionToast(finishState);
  useActionToast(discardState);

  const isRunning = running.segment_started_at !== null;

  // 初期値はサーバー時刻で計算する。SSR と一致するのでハイドレーションがずれない。
  const [seconds, setSeconds] = useState(() =>
    elapsedSeconds(running, new Date(Date.parse(serverNow))),
  );

  useEffect(() => {
    // 端末の時計がサーバーとずれていても表示が狂わないよう、差を測って補正する
    const skewMs = Date.now() - Date.parse(serverNow);
    const tick = () => setSeconds(elapsedSeconds(running, new Date(Date.now() - skewMs)));

    // 描画直後に一度合わせる（効果の中で同期的に setState しない）
    const immediate = setTimeout(tick, 0);
    if (!isRunning) return () => clearTimeout(immediate);

    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(immediate);
      clearInterval(interval);
    };
  }, [running, isRunning, serverNow]);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <p
          className="font-mono text-5xl font-bold tabular-nums"
          role="timer"
          aria-live="off"
          aria-label={`経過時間 ${formatTimerDisplay(seconds)}`}
        >
          {formatTimerDisplay(seconds)}
        </p>

        <p className="mt-3 flex items-center justify-center gap-1.5 text-sm">
          {running.subjectColor ? (
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ backgroundColor: running.subjectColor }}
            />
          ) : null}
          <span className="font-medium">{subjectLabel(running.subjectName)}</span>
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {isRunning ? "計測中" : "一時停止中"}
        </p>
      </div>

      <div className="flex gap-3">
        <form action={isRunning ? pauseAction : resumeAction} className="flex-1">
          <PauseResumeButton isRunning={isRunning} />
        </form>
        <form action={finishAction} className="flex-1">
          <FinishButton />
        </form>
      </div>

      <form action={discardAction}>
        <DiscardButton />
      </form>
    </div>
  );
}

function PauseResumeButton({ isRunning }: { isRunning: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className="h-14 w-full text-base"
    >
      {isRunning ? (
        <>
          <Pause className="size-5" aria-hidden />
          一時停止
        </>
      ) : (
        <>
          <Play className="size-5" aria-hidden />
          再開
        </>
      )}
    </Button>
  );
}

function FinishButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="h-14 w-full text-base">
      <Square className="size-5" aria-hidden />
      終了して記録
    </Button>
  );
}

function DiscardButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="ghost"
      disabled={pending}
      className="h-11 w-full text-sm text-muted-foreground"
    >
      <Trash2 className="size-4" aria-hidden />
      記録せずに破棄
    </Button>
  );
}
