import React from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { Link2, MessageCircle, Send } from "lucide-react";
import AIAdaptiveMonitoringPanel from "@/components/shared/AIAdaptiveMonitoringPanel";
import EmptyState from "@/components/shared/EmptyState";
import ModuleDetailShell from "@/components/shared/ModuleDetailShell";
import PageLoader from "@/components/shared/PageLoader";
import ConversationList from "@/features/messages/components/ConversationList";
import MessageThread from "@/features/messages/components/MessageThread";
import { useAIAdaptiveMonitoring } from "@/hooks/ai/useAIAdaptiveMonitoring";
import { useDetailPageTab } from "@/hooks/dashboard/useDetailPageTab";
import { useMessages } from "@/hooks/messages/useMessages";
import { useSwapSessions } from "@/hooks/messages/useSwapSessions";
import SessionPlannerPanel from "@/features/messages/components/SessionPlannerPanel";

export default function MessagesPage() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialConversationId =
    searchParams.get("conversation") || searchParams.get("thread") || "";
  const {
    adaptiveState,
    loading: adaptiveLoading,
    submitting: adaptiveSubmitting,
    error: adaptiveError,
    submitCheckIn,
  } = useAIAdaptiveMonitoring({
    surface: "/messages",
  });
  const {
    me,
    conversations,
    selected,
    setSelected,
    messages,
    newMessage,
    setNewMessage,
    resourceUrl,
    setResourceUrl,
    resourceLabel,
    setResourceLabel,
    showResourceFields,
    setShowResourceFields,
    connectionState,
    loading,
    sending,
    error,
    openConversation,
    submitMessage,
  } = useMessages(initialConversationId);
  const messageTabs = React.useMemo(
    () => [
      {
        value: "conversations",
        label: "Conversations",
        description: "Chat threads, resource sharing, and session coordination.",
        icon: MessageCircle,
        badge: conversations.length,
      },
      {
        value: "focus",
        label: "Focus support",
        description: "Adaptive check-ins for coordination and communication load.",
        icon: Link2,
      },
    ],
    [conversations.length],
  );
  const { activeTab, setActiveTab } = useDetailPageTab(
    messageTabs.map((tab) => tab.value),
    "conversations",
  );
  const {
    sessions,
    loading: sessionsLoading,
    saving: sessionsSaving,
    error: sessionsError,
    createPlannedSession,
    patchSession,
  } = useSwapSessions(selected?.swap_request || null);

  const handleCreateSession = async (payload) => {
    const normalizedPayload = {
      ...payload,
      scheduled_start_at: new Date(payload.scheduled_start_at).toISOString(),
      scheduled_end_at: payload.scheduled_end_at
        ? new Date(payload.scheduled_end_at).toISOString()
        : null,
      metadata: {
        delivery_mode: payload.meeting_url ? "external_link" : "coordination_only",
      },
    };
    await createPlannedSession(normalizedPayload);
  };

  const handleConfirmSession = async (session) => {
    await patchSession(session.id, { status: "confirmed" });
  };

  const handleCompleteSession = async (session, completionNotes) => {
    await patchSession(session.id, {
      status: "completed",
      completion_notes: completionNotes,
    });
  };

  const handleCancelSession = async (session) => {
    await patchSession(session.id, { status: "cancelled" });
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <ModuleDetailShell
      eyebrow="Swap coordination workspace"
      title="Messages"
      description="Keep the conversation flow focused, then open adaptive support only when you want a quick coordination check-in."
      value={activeTab}
      onValueChange={setActiveTab}
      tabs={messageTabs}
    >
      <TabsContent value="conversations" className="mt-0">
        <div
          className="overflow-hidden rounded-2xl border border-border/50 bg-white"
          style={{ height: "calc(100vh - 280px)" }}
        >
          <div className="flex h-full">
            <div
              className={`flex w-full flex-shrink-0 flex-col border-r border-border/50 sm:w-80 ${
                selected ? "hidden sm:flex" : "flex"
              }`}
            >
              <div className="border-b border-border/50 p-4">
                <h2 className="font-heading text-sm font-semibold text-muted-foreground">
                  Conversations
                </h2>
              </div>
              <ConversationList
                conversations={conversations}
                selected={selected}
                onSelect={openConversation}
              />
            </div>

            <div
              className={`flex flex-1 flex-col ${
                !selected ? "hidden sm:flex" : "flex"
              }`}
            >
              {!selected ? (
                <div className="flex flex-1 items-center justify-center">
                  <EmptyState
                    icon={MessageCircle}
                    title="Select a conversation"
                    description="Choose a swap thread from the sidebar to start coordinating."
                  />
                </div>
              ) : (
                <>
                  <MessageThread
                    me={me}
                    selected={selected}
                    messages={messages}
                    connectionState={connectionState}
                    headerActions={
                      <SessionPlannerPanel
                        sessions={sessions}
                        loading={sessionsLoading}
                        saving={sessionsSaving}
                        error={sessionsError}
                        onCreateSession={handleCreateSession}
                        onConfirmSession={handleConfirmSession}
                        onCompleteSession={handleCompleteSession}
                        onCancelSession={handleCancelSession}
                      />
                    }
                    onBack={() => setSelected(null)}
                  />

                  <div className="border-t border-border/50 p-4">
                    {error ? (
                      <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {error}
                      </div>
                    ) : null}

                    {showResourceFields ? (
                      <div className="mb-3 grid gap-2 sm:grid-cols-2">
                        <Input
                          placeholder="Resource URL"
                          value={resourceUrl}
                          onChange={(event) => setResourceUrl(event.target.value)}
                        />
                        <Input
                          placeholder="Optional label"
                          value={resourceLabel}
                          onChange={(event) => setResourceLabel(event.target.value)}
                        />
                      </div>
                    ) : null}

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowResourceFields((current) => !current)}
                        title="Share a resource link"
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(event) => setNewMessage(event.target.value)}
                        onKeyDown={(event) =>
                          event.key === "Enter" && !event.shiftKey && submitMessage()
                        }
                        className="flex-1"
                      />
                      <Button
                        onClick={submitMessage}
                        className="bg-teal-600 hover:bg-teal-700"
                        size="icon"
                        disabled={sending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="focus" className="mt-0">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_320px]">
          <AIAdaptiveMonitoringPanel
            title="Messaging focus"
            description="A quick mirror for focus and coordination signals while you manage swap conversations."
            adaptiveState={adaptiveState}
            loading={adaptiveLoading}
            submitting={adaptiveSubmitting}
            error={adaptiveError}
            onSubmitCheckIn={submitCheckIn}
            manageHref="/profile?tab=adaptive"
          />
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-white p-5 shadow-sm shadow-black/5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <MessageCircle className="h-4 w-4 text-teal-700" />
                Why this is separate
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Messaging is the primary workflow here. Focus support stays close by, but it should not push the chat surface down every time you open this page.
              </p>
              <Button
                variant="outline"
                className="mt-5 w-full"
                onClick={() => setActiveTab("conversations")}
              >
                Back to conversations
              </Button>
            </div>
          </div>
        </div>
      </TabsContent>
    </ModuleDetailShell>
  );
}
