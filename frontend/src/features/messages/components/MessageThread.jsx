import React from "react";
import { ArrowLeft, Link2, User } from "lucide-react";
import moment from "moment";

export default function MessageThread({
  me,
  selected,
  messages,
  connectionState = "idle",
  onBack,
}) {
  const connectionCopy =
    connectionState === "connected"
      ? "Live"
      : connectionState === "connecting"
        ? "Connecting..."
        : connectionState === "disconnecting"
          ? "Disconnecting..."
          : connectionState === "disconnected"
            ? "Reconnecting..."
            : "Offline";

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border/50 p-4">
        <button onClick={onBack} className="p-1 sm:hidden">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50">
          <User className="h-4 w-4 text-teal-600" />
        </div>
        <div className="min-w-0">
          <div className="font-heading text-sm font-semibold">
            {selected.counterparty?.full_name || "Skill Swap Partner"}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="truncate">{selected.exchange_summary}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
              {connectionCopy}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              No messages yet. Start coordinating your swap here.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isMe = message.sender?.id === me?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs rounded-2xl px-4 py-2.5 sm:max-w-sm ${
                    isMe ? "bg-teal-600 text-white" : "bg-secondary"
                  }`}
                >
                  {message.content ? (
                    <p className="text-sm">{message.content}</p>
                  ) : null}
                  {message.resource_url ? (
                    <a
                      href={message.resource_url}
                      target="_blank"
                      rel="noreferrer"
                      className={`mt-2 inline-flex items-center gap-2 text-sm underline ${
                        isMe ? "text-white" : "text-teal-700"
                      }`}
                    >
                      <Link2 className="h-4 w-4" />
                      {message.resource_label || message.resource_url}
                    </a>
                  ) : null}
                  <p
                    className={`mt-1 text-xs ${
                      isMe ? "text-teal-200" : "text-muted-foreground"
                    }`}
                  >
                    {moment(message.created_at).format("h:mm A")}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
