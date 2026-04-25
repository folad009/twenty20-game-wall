"use client";

import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, createQuestion, login } from "@/lib/api";
import { loginFormSchema, questionSchema } from "@/lib/validation";
import { useAuthStore } from "@/store/auth-store";

const guidedPrompts = [
  "What’s the one problem in your business that’s quietly costing you?",
  "What’s the overlooked gap in your business that’s holding back growth right now?",
] as const;

export default function HomePage() {
  const { token, user, setSession, clear } = useAuthStore();
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ name: "", phone: "" });
  const [question, setQuestion] = useState("");

  const loggedIn = Boolean(token && user);

  const loginMutation = useMutation({
    mutationFn: () => {
      const parsed = loginFormSchema.safeParse(loginForm);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        parsed.error.issues.forEach((e) => {
          const key = e.path[0];
          if (typeof key === "string") fieldErrors[key] = e.message;
        });
        setLoginErrors(fieldErrors);
        return Promise.reject(new Error("validation"));
      }
      setLoginErrors({});
      return login(parsed.data);
    },
    onSuccess: (data) => {
      setSession(data.accessToken, data.user);
    },
    onError: (err: Error) => {
      if (err.message !== "validation") {
        setLoginErrors({ _form: err.message });
      }
    },
  });

  const questionMutation = useMutation({
    mutationFn: () => {
      if (!token) throw new Error("Not signed in");
      const parsed = questionSchema.safeParse({ content: question });
      if (!parsed.success) {
        setQuestionError(parsed.error.issues[0]?.message ?? "Invalid question");
        return Promise.reject(new Error("validation"));
      }
      setQuestionError(null);
      return createQuestion(token, parsed.data.content);
    },
    onSuccess: () => {
      setQuestion("");
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setQuestionError(String(err.message));
      } else if (err instanceof Error && err.message !== "validation") {
        setQuestionError(err.message);
      }
    },
  });

  const submittingQuestion = questionMutation.isPending;

  const canSubmitQuestion = useMemo(() => {
    if (!loggedIn || submittingQuestion) return false;
    const parsed = questionSchema.safeParse({ content: question });
    return parsed.success;
  }, [loggedIn, question, submittingQuestion]);

  if (!loggedIn) {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
        <div className="mb-10 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
            Live Q&A
          </p>
          <h1 className="text-3xl font-semibold text-white">
            Join with your name and phone number
          </h1>
        </div>

        <form
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-indigo-950/40"
          onSubmit={(e) => {
            e.preventDefault();
            loginMutation.mutate();
          }}
        >
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Name</label>
            <Input
              value={loginForm.name}
              onChange={(e) =>
                setLoginForm((s) => ({ ...s, name: e.target.value }))
              }
              autoComplete="name"
              placeholder="Ada Love"
            />
            {loginErrors.name && (
              <p className="text-xs text-rose-400">{loginErrors.name}</p>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400">Phone</label>
            <Input
              value={loginForm.phone}
              onChange={(e) =>
                setLoginForm((s) => ({ ...s, phone: e.target.value }))
              }
              autoComplete="tel"
              placeholder="0803 352 3010"
            />
            {loginErrors.phone && (
              <p className="text-xs text-rose-400">{loginErrors.phone}</p>
            )}
          </div>
          {loginErrors._form && (
            <p className="text-sm text-rose-400">{loginErrors._form}</p>
          )}
          {loginMutation.isError && !loginErrors._form && (
            <p className="text-sm text-rose-400">Could not sign you in.</p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Signing in…" : "Continue"}
          </Button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-16">
      <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
            Signed in
          </p>
          <h1 className="text-2xl font-semibold text-white">
            Hi, {user?.name}
          </h1>
          <p className="text-sm text-slate-400">{user?.phone}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => clear()}>
            Sign out
          </Button>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
        <h2 className="text-lg font-medium text-white">
          Share your biggest growth blocker
        </h2>
        <div className="mt-4 grid gap-3">
          {guidedPrompts.map((prompt, index) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setQuestion(prompt)}
              className="rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-left text-sm text-slate-200 transition hover:border-indigo-400 hover:bg-slate-900"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
                Prompt {index + 1}
              </span>
              <p className="mt-1">{prompt}</p>
            </button>
          ))}
        </div>
        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmitQuestion) return;
            questionMutation.mutate();
          }}
        >
          <Textarea
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your response or select a prompt above..."
            disabled={submittingQuestion}
          />
          {questionError && (
            <p className="text-sm text-rose-400">{questionError}</p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={!canSubmitQuestion}>
              {submittingQuestion ? "Submitting…" : "Submit question"}
            </Button>
          </div>
        </form>
        {questionMutation.isSuccess && (
          <p className="mt-4 text-sm text-emerald-400">
            Question received — moderators have been notified in real time.
          </p>
        )}
      </section>

      <p className="mt-10 text-center text-xs text-slate-500">
        <Link className="text-indigo-300 hover:underline" href="/wall">
          View public wall
        </Link>
      </p>
    </main>
  );
}
