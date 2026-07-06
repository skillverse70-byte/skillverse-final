import React from "react";
import { ArrowLeftRight, MessageCircle, User } from "lucide-react";
import moment from "moment";
import StatusBadge from "@/components/shared/StatusBadge";

export default function ConversationList({
  conversations,
  selected,
  onSelect,
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.length === 0 ? (
        <div className="p-6 text-center">
          <MessageCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No conversations yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Accept a skill swap to unlock direct coordination here.
          </p>
        </div>
      ) : (
        conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className={`w-full border-b border-border/50 p-4 text-left transition-colors hover:bg-secondary/50 ${
              selected?.id === conversation.id ? "bg-teal-50" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal-50">
                <User className="h-5 w-5 text-teal-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <div className="truncate text-sm font-medium">
                    {conversation.counterparty?.full_name || "Swap partner"}
                  </div>
                  <StatusBadge status="accepted" label="Active" />
                </div>
                <div className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  {conversation.exchange_summary}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {conversation.latest_message?.content ||
                    conversation.latest_message?.resource_label ||
                    "No messages yet"}
                </div>
              </div>
              {conversation.latest_message?.created_at ? (
                <span className="flex-shrink-0 text-xs text-muted-foreground">
                  {moment(conversation.latest_message.created_at).fromNow()}
                </span>
              ) : null}
            </div>
          </button>
        ))
      )}
    </div>
  );
}
