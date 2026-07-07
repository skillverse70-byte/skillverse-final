import React, { useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StatusBadge from "@/components/shared/StatusBadge";
import { isVerifiedOrganization } from "@/lib/trust-state";

const emptyForm = {
  business_name: "",
  account_holder_name: "",
  bank_name: "",
  bank_code: "",
  account_number: "",
  mobile_money_number: "",
  setup_notes: "",
};

export default function FinancialAccountSetupCard({
  organization,
  financialAccount,
  saving = false,
  onSave,
  compact = false,
}) {
  const [form, setForm] = useState({
    ...emptyForm,
    business_name: financialAccount?.business_name || "",
    account_holder_name: financialAccount?.account_holder_name || "",
    bank_name: financialAccount?.bank_name || "",
    bank_code: financialAccount?.bank_code || "",
    mobile_money_number: financialAccount?.mobile_money_number || "",
    setup_notes: financialAccount?.setup_notes || "",
  });

  const verified = isVerifiedOrganization(organization);
  const canAcceptPaid = financialAccount?.can_accept_paid_enrollments;
  const heading = compact ? "Monetization Readiness" : "Financial Setup";
  const reviewMessage = {
    ready: "Approved by an admin. Paid enrollment can open when organization verification is also active.",
    pending: "Submitted for admin review. Paid enrollment stays blocked until approval.",
    restricted:
      financialAccount?.restricted_reason ||
      "The account needs changes before it can be approved.",
    not_started: "Add payout details to submit this account for admin review.",
  }[financialAccount?.status || "not_started"];

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="rounded-3xl border border-border/50 bg-white p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-teal-700" />
            <h3 className="font-heading text-lg font-semibold">{heading}</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {verified
              ? "Verified organizations can prepare paid enrollment, but learners stay blocked until this setup becomes ready."
              : "Verification must be approved before paid-course monetization can be unlocked."}
          </p>
        </div>
        {financialAccount?.status ? <StatusBadge status={financialAccount.status} /> : null}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="mb-1 font-medium text-foreground">Paid publishing</div>
          <p className="text-muted-foreground">
            {financialAccount?.can_publish_paid_courses ? "Available" : "Locked"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="mb-1 font-medium text-foreground">Enrollment state</div>
          <p className="text-muted-foreground">
            {financialAccount?.enrollment_gate_label || "Enrollment Unavailable"}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm">
          <div className="mb-1 font-medium text-foreground">Financial readiness</div>
          <p className="text-muted-foreground">
            {canAcceptPaid ? "Ready for paid enrollments" : "Still blocked"}
          </p>
        </div>
      </div>

      {!compact ? (
        <>
          <div className="mt-6 border-l-2 border-teal-500 bg-teal-50/60 px-4 py-3 text-sm text-teal-950">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{reviewMessage}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Business name</Label>
              <Input
                className="mt-1.5"
                value={form.business_name}
                onChange={(event) => setField("business_name", event.target.value)}
                placeholder="Legal or payout business name"
              />
            </div>
            <div>
              <Label>Account holder name</Label>
              <Input
                className="mt-1.5"
                value={form.account_holder_name}
                onChange={(event) => setField("account_holder_name", event.target.value)}
                placeholder="Account holder"
              />
            </div>
            <div>
              <Label>Bank name</Label>
              <Input
                className="mt-1.5"
                value={form.bank_name}
                onChange={(event) => setField("bank_name", event.target.value)}
                placeholder="Commercial Bank"
              />
            </div>
            <div>
              <Label>Bank code</Label>
              <Input
                className="mt-1.5"
                value={form.bank_code}
                onChange={(event) => setField("bank_code", event.target.value)}
                placeholder="CBE001"
              />
            </div>
            <div>
              <Label>Account number</Label>
              <Input
                className="mt-1.5"
                value={form.account_number}
                onChange={(event) => setField("account_number", event.target.value)}
                placeholder={
                  financialAccount?.account_number_last4
                    ? `Current account ends in ${financialAccount.account_number_last4}`
                    : "Only the last 4 digits are stored"
                }
              />
            </div>
            <div>
              <Label>Mobile money number</Label>
              <Input
                className="mt-1.5"
                value={form.mobile_money_number}
                onChange={(event) => setField("mobile_money_number", event.target.value)}
                placeholder="Optional mobile payout number"
              />
            </div>
          </div>

          <div className="mt-4">
            <Label>Setup notes</Label>
            <Input
              className="mt-1.5"
              value={form.setup_notes}
              onChange={(event) => setField("setup_notes", event.target.value)}
              placeholder="Anything the platform should know before payment activation"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={() => onSave(form)}
              disabled={saving}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {saving ? "Submitting..." : "Submit Financial Setup"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
