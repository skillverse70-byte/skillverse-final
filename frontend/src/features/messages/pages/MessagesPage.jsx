import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageLoader from "@/components/shared/PageLoader";
import PageHeader from "@/components/shared/PageHeader";
import ConversationList from "@/features/messages/components/ConversationList";
import MessageThread from "@/features/messages/components/MessageThread";
import { useMessages } from "@/hooks/messages/useMessages";

export default function MessagesPage() {
  const {
    me,
    conversations,
    selected,
    setSelected,
    messages,
    newMessage,
    setNewMessage,
    loading,
    openConversation,
    submitMessage,
  } = useMessages();

  const getOtherName = (conversation) => {
    if (!me || !conversation.participant_names) return "User";
    const index = conversation.participant_ids?.indexOf(me.id);
    return conversation.participant_names?.[index === 0 ? 1 : 0] || "User";
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader title="Messages" />

      <div
        className="bg-white rounded-2xl border border-border/50 overflow-hidden"
        style={{ height: "calc(100vh - 220px)" }}
      >
        <div className="flex h-full">
          <div
            className={`w-full sm:w-80 border-r border-border/50 flex-shrink-0 flex flex-col ${
              selected ? "hidden sm:flex" : "flex"
            }`}
          >
            <div className="p-4 border-b border-border/50">
              <h2 className="font-heading font-semibold text-sm text-muted-foreground">
                Conversations
              </h2>
            </div>
            <ConversationList
              conversations={conversations}
              selected={selected}
              onSelect={openConversation}
              getOtherName={getOtherName}
            />
          </div>

          <div
            className={`flex-1 flex flex-col ${
              !selected ? "hidden sm:flex" : "flex"
            }`}
          >
            {!selected ? (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={MessageCircle}
                  title="Select a conversation"
                  description="Choose a conversation from the sidebar to start chatting."
                />
              </div>
            ) : (
              <>
                <MessageThread
                  me={me}
                  selected={selected}
                  messages={messages}
                  onBack={() => setSelected(null)}
                  getOtherName={getOtherName}
                />

                <div className="p-4 border-t border-border/50">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(event) => setNewMessage(event.target.value)}
                      onKeyDown={(event) =>
                        event.key === "Enter" && submitMessage()
                      }
                      className="flex-1"
                    />
                    <Button
                      onClick={submitMessage}
                      className="bg-teal-600 hover:bg-teal-700"
                      size="icon"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
