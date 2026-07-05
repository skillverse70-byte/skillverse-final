import React from "react";
import { MessageCircle, User } from "lucide-react";
import moment from "moment";

export default function ConversationList({
  conversations,
  selected,
  onSelect,
  getOtherName,
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.length === 0 ? (
        <div className="p-6 text-center">
          <MessageCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No conversations yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Start a skill swap to begin chatting
          </p>
        </div>
      ) : (
        conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onSelect(conversation)}
            className={`w-full p-4 text-left hover:bg-secondary/50 transition-colors border-b border-border/50 ${
              selected?.id === conversation.id ? "bg-teal-50" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-teal-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm truncate">
                  {getOtherName(conversation)}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {conversation.last_message || conversation.last_message_preview || "No messages yet"}
                </div>
              </div>
              {conversation.last_message_date ? (
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {moment(conversation.last_message_date).fromNow()}
                </span>
              ) : null}
            </div>
          </button>
        ))
      )}
    </div>
  );
}
