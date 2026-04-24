"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSocket } from "@/hooks/use-socket";
import { ApiError, answerQuestion, listQuestions, login } from "@/lib/api";
import type { Question } from "@/lib/types";
import { answerSchema, loginFormSchema } from "@/lib/validation";
import { useAuthStore } from "@/store/auth-store";

type Filter = "all" | "pending" | "answered";

export default function AdminPage() {
  const queryClient = useQueryClient();
  const { token, user, setSession, clear } = useAuthStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Question | null>(null);
  const [answerDraft, setAnswerDraft] = useState("");
  const [loginForm, setLoginForm] = useState({ name: "", phone: "" });
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({});
  const [answerError, setAnswerError] = useState<string | null>(null);

  const { socket, connected } = useSocket(Boolean(token && user));

  const questionsQuery = useQuery({
    queryKey: ["questions", filter, token],
    queryFn: () => {
      if (!token) throw new Error("no token");
      return listQuestions(token, filter);
    },
    enabled: Boolean(token && user?.role === "admin"),
  });

  useEffect(() => {
    if (!socket || !token || user?.role !== "admin") return;

    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["questions"] });
    };

    const onConnect = () => {
      refresh();
    };

    socket.on("new_question", refresh);
    socket.on("question_answered", refresh);
    socket.on("connect", onConnect);

    return () => {
      socket.off("new_question", refresh);
      socket.off("question_answered", refresh);
      socket.off("connect", onConnect);
    };
  }, [socket, token, user?.role, queryClient]);

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
      if (data.user.role !== "admin") {
        setLoginErrors({
          _form:
            "This phone is not configured as an admin. Set ADMIN_PHONE on the server to match your number (see README).",
        });
        return;
      }
      setSession(data.accessToken, data.user);
    },
  });

  const answerMutation = useMutation({
    mutationFn: async () => {
      if (!token || !selected) throw new Error("missing");
      const parsed = answerSchema.safeParse({ answer: answerDraft });
      if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid answer");
      }
      return answerQuestion(token, selected.id, parsed.data.answer);
    },
    onMutate: async () => {
      if (!selected || !token) return;
      const parsed = answerSchema.safeParse({ answer: answerDraft });
      if (!parsed.success) return;

      await queryClient.cancelQueries({ queryKey: ["questions"] });
      const snapshots = queryClient.getQueriesData<Question[]>({
        queryKey: ["questions"],
      });

      const optimistic: Question = {
        ...selected,
        answer: parsed.data.answer,
        status: "answered",
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueriesData<Question[]>(
        { queryKey: ["questions"] },
        (old) => {
          if (!old) return old;
          return old.map((q) => (q.id === selected.id ? optimistic : q));
        },
      );

      setSelected(optimistic);
      return { snapshots };
    },
    onError: (err, _v, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      if (err instanceof ApiError) {
        setAnswerError(String(err.message));
      } else if (err instanceof Error) {
        setAnswerError(err.message);
      }
    },
    onSuccess: (q) => {
      setAnswerDraft("");
      setAnswerError(null);
      setSelected(q);
      void queryClient.invalidateQueries({ queryKey: ["questions"] });
    },
  });

  const isAdmin = user?.role === "admin";

  const list = useMemo(
    () => questionsQuery.data ?? [],
    [questionsQuery.data],
  );

  const selectedFromList = useMemo(() => {
    if (!selected) return null;
    return list.find((q) => q.id === selected.id) ?? selected;
  }, [list, selected]);

  if (!token || !user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-semibold text-white">Admin sign-in</h1>
        <p className="mt-2 text-sm text-slate-400">
          Use the phone number that matches{" "}
          <code className="rounded bg-slate-900 px-1 py-0.5 text-indigo-200">
            ADMIN_PHONE
          </code>{" "}
          on the API server.
        </p>
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            loginMutation.mutate();
          }}
        >
          <div>
            <label className="text-xs text-slate-400">Name</label>
            <Input
              className="mt-1"
              value={loginForm.name}
              onChange={(e) =>
                setLoginForm((s) => ({ ...s, name: e.target.value }))
              }
            />
            {loginErrors.name && (
              <p className="mt-1 text-xs text-rose-400">{loginErrors.name}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-slate-400">Phone</label>
            <Input
              className="mt-1"
              value={loginForm.phone}
              onChange={(e) =>
                setLoginForm((s) => ({ ...s, phone: e.target.value }))
              }
            />
            {loginErrors.phone && (
              <p className="mt-1 text-xs text-rose-400">{loginErrors.phone}</p>
            )}
          </div>
          {loginErrors._form && (
            <p className="text-sm text-rose-400">{loginErrors._form}</p>
          )}
          <Button className="w-full" type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <Link className="mt-8 text-center text-sm text-indigo-300" href="/">
          ← Back to attendee portal
        </Link>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <h1 className="text-2xl font-semibold text-white">Access denied</h1>
        <p className="mt-2 text-sm text-slate-400">
          Signed in as {user.name}, but this account is not an admin.
        </p>
        <Button className="mt-6" variant="ghost" onClick={() => clear()}>
          Sign out
        </Button>
        <Link className="mt-4 text-sm text-indigo-300" href="/">
          ← Attendee portal
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 lg:px-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">
            Admin
          </p>
          <h1 className="text-2xl font-semibold text-white">Question queue</h1>
          <p className="text-sm text-slate-400">
            {user.name} · Realtime{" "}
            <span className={connected ? "text-emerald-400" : "text-amber-400"}>
              {connected ? "connected" : "reconnecting…"}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/wall"
            className="inline-flex items-center justify-center rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
          >
            Wall
          </Link>
          <Button variant="ghost" onClick={() => clear()}>
            Sign out
          </Button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "answered"] as const).map((key) => (
          <Button
            key={key}
            type="button"
            variant={filter === key ? "primary" : "ghost"}
            className="capitalize"
            onClick={() => setFilter(key)}
          >
            {key}
          </Button>
        ))}
      </div>

      {questionsQuery.isLoading && (
        <p className="mt-8 text-sm text-slate-400">Loading questions…</p>
      )}
      {questionsQuery.isError && (
        <p className="mt-8 text-sm text-rose-400">Could not load questions.</p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          {list.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => {
                setSelected(q);
                setAnswerDraft(q.answer ?? "");
                setAnswerError(null);
              }}
              className={`w-full rounded-xl border p-4 text-left transition hover:border-indigo-500/60 ${
                selected?.id === q.id
                  ? "border-indigo-500 bg-indigo-950/40"
                  : "border-slate-800 bg-slate-900/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">
                  {q.user.name} · {q.user.phone}
                </span>
                <Badge tone={q.status === "answered" ? "success" : "warning"}>
                  {q.status}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-slate-100">{q.content}</p>
            </button>
          ))}
          {list.length === 0 && !questionsQuery.isLoading && (
            <p className="text-sm text-slate-500">No questions in this view.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 lg:sticky lg:top-8 lg:self-start">
          {!selectedFromList ? (
            <p className="text-sm text-slate-500">
              Select a question to review and answer.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-medium text-white">Detail</h2>
                <Badge
                  tone={
                    selectedFromList.status === "answered"
                      ? "success"
                      : "warning"
                  }
                >
                  {selectedFromList.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {selectedFromList.user.name} · {selectedFromList.user.phone}
              </p>
              <p className="mt-4 text-sm text-slate-200">
                {selectedFromList.content}
              </p>
              {selectedFromList.answer && (
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Current answer
                  </p>
                  <p className="mt-1">{selectedFromList.answer}</p>
                </div>
              )}
              {selectedFromList.status === "pending" ? (
                <form
                  className="mt-6 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setAnswerError(null);
                    answerMutation.mutate();
                  }}
                >
                  <label className="text-xs text-slate-400">Your answer</label>
                  <Textarea
                    rows={5}
                    value={answerDraft}
                    onChange={(e) => setAnswerDraft(e.target.value)}
                    disabled={answerMutation.isPending}
                  />
                  {answerError && (
                    <p className="text-sm text-rose-400">{answerError}</p>
                  )}
                  <Button
                    type="submit"
                    disabled={
                      answerMutation.isPending || answerDraft.trim().length === 0
                    }
                  >
                    {answerMutation.isPending ? "Publishing…" : "Submit answer"}
                  </Button>
                </form>
              ) : (
                <p className="mt-6 text-sm text-slate-500">
                  This question is already answered.
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
