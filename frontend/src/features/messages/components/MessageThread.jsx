import React from "react";
import { ArrowLeft, User } from "lucide-react";
import moment from "moment";

export default function MessageThread({
  me,
  selected,
  messages,
  onBack,
  getOtherName,
}) {
  return (
    <>
      <div className="p-4 border-b border-border/50 flex items-center gap-3">
        <button onClick={onBack} className="sm:hidden p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center">
          <User className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <div className="font-heading font-semibold text-sm">
            {getOtherName(selected)}
          </div>
          <div className="text-xs text-muted-foreground">Skill Swap Partner</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-muted-foreground">
              No messages yet. Say hello! 👋
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isMe = message.sender_id === me?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs sm:max-w-sm rounded-2xl px-4 py-2.5 ${
                    isMe ? "bg-teal-600 text-white" : "bg-secondary"
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isMe ? "text-teal-200" : "text-muted-foreground"
                    }`}
                  >
                    {moment(message.created_date).format("h:mm A")}
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
