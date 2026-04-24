"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useSocket } from "@/hooks/use-socket";
import { getWallFeed } from "@/lib/api";
import type { Question } from "@/lib/types";

function sortFeed(items: Question[]) {
  return [...items].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function mergeQuestion(list: Question[], incoming: Question): Question[] {
  const idx = list.findIndex((q) => q.id === incoming.id);
  if (idx === -1) return sortFeed([incoming, ...list]);
  const next = [...list];
  next[idx] = incoming;
  return sortFeed(next);
}

export default function WallPage() {
  const queryClient = useQueryClient();
  const { socket, connected } = useSocket(true);
  const [highlighted, setHighlighted] = useState<Record<string, number>>({});

  const feedQuery = useQuery({
    queryKey: ["wall-feed"],
    queryFn: getWallFeed,
    refetchInterval: false,
  });

  useEffect(() => {
    if (!socket) return;
    const timeouts = new Set<number>();

    const onNew = (payload: { question: Question }) => {
      queryClient.setQueryData<Question[]>(["wall-feed"], (prev) => {
        const base = prev ?? [];
        return mergeQuestion(base, payload.question);
      });
    };

    const onAnswered = (payload: { question: Question }) => {
      const q = payload.question;
      queryClient.setQueryData<Question[]>(["wall-feed"], (prev) => {
        const base = prev ?? [];
        return mergeQuestion(base, q);
      });
      setHighlighted((h) => ({ ...h, [q.id]: Date.now() }));
      const t = window.setTimeout(() => {
        setHighlighted((h) => {
          const { [q.id]: _removed, ...rest } = h;
          return rest;
        });
        timeouts.delete(t);
      }, 12_000);
      timeouts.add(t);
    };

    const onConnect = () => {
      void queryClient.invalidateQueries({ queryKey: ["wall-feed"] });
    };

    socket.on("new_question", onNew);
    socket.on("question_answered", onAnswered);
    socket.on("connect", onConnect);

    return () => {
      timeouts.forEach(clearTimeout);
      socket.off("new_question", onNew);
      socket.off("question_answered", onAnswered);
      socket.off("connect", onConnect);
    };
  }, [socket, queryClient]);

  const items = useMemo(
    () => sortFeed(feedQuery.data ?? []),
    [feedQuery.data],
  );

  return (
    <main className="fixed inset-0 flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-50">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-800/80 px-8 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-200">
            Live wall
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Questions & answers
          </h1>
        </div>
        <div className="text-right text-sm text-slate-400">
          <p
            className={
              connected ? "text-emerald-400" : "text-amber-300 animate-pulse-soft"
            }
          >
            {connected ? "Live" : "Reconnecting…"}
          </p>
          {feedQuery.isError && (
            <p className="text-rose-400">Could not refresh feed.</p>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-8">
        {feedQuery.isLoading && items.length === 0 && (
          <p className="text-lg text-slate-400">Loading wall…</p>
        )}
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
          {items.map((q) => {
            const isHot = highlighted[q.id];
            return (
              <article
                key={q.id}
                className={`flex flex-col rounded-2xl border p-6 shadow-lg transition duration-500 md:p-7 ${
                  isHot
                    ? "border-emerald-400/80 bg-emerald-950/35 shadow-emerald-900/40 ring-2 ring-emerald-400/50"
                    : "border-slate-800/90 bg-slate-950/60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-indigo-200 md:text-base">
                    {q.user.name}
                  </p>
                  <Badge tone={q.status === "answered" ? "success" : "warning"}>
                    {q.status}
                  </Badge>
                </div>
                <h2 className="mt-4 font-display text-xl font-semibold leading-snug text-white md:text-2xl">
                  {q.content}
                </h2>
                {q.answer ? (
                  <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/80 p-4 text-base leading-relaxed text-slate-100 md:text-lg">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Answer
                    </p>
                    <p className="mt-2">{q.answer}</p>
                  </div>
                ) : (
                  <p className="mt-5 text-sm italic text-slate-500 md:text-base">
                    Awaiting moderator response…
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
