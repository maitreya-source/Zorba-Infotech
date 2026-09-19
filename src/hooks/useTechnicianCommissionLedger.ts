import { useMemo, useCallback } from "react";
import type { ServiceCall, TechnicianPayout } from "@/lib/types";
import { shiftYearMonth } from "@/lib/utils";

export function isCallPaymentReceived(c: ServiceCall): boolean {
  if (!c.grandTotal || c.grandTotal === 0) return true;
  return c.paymentStatus === "paid";
}

export function useTechnicianCommissionLedger(options: {
  calls: ServiceCall[];
  payouts: TechnicianPayout[];
  selectedMonth: string;
  setSelectedMonth: React.Dispatch<React.SetStateAction<string>>;
  commissionRate: number;
}) {
  const { calls, payouts, selectedMonth, setSelectedMonth, commissionRate } = options;

  const handlePrevMonth = useCallback(() => {
    setSelectedMonth((prev) => shiftYearMonth(prev, -1));
  }, [setSelectedMonth]);

  const handleNextMonth = useCallback(() => {
    setSelectedMonth((prev) => shiftYearMonth(prev, 1));
  }, [setSelectedMonth]);

  const monthLabel = useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }, [selectedMonth]);

  const monthCalls = useMemo(() => {
    return calls.filter((c) => (c.dateTime || "").startsWith(selectedMonth));
  }, [calls, selectedMonth]);

  const allCompletedCalls = useMemo(() => {
    return monthCalls.filter((c) => c.status === "completed" || c.status === "delivered");
  }, [monthCalls]);

  const completedPaidCalls = useMemo(() => {
    return allCompletedCalls.filter((c) => isCallPaymentReceived(c));
  }, [allCompletedCalls]);

  const completedPaymentDueCalls = useMemo(() => {
    return allCompletedCalls.filter((c) => !isCallPaymentReceived(c));
  }, [allCompletedCalls]);

  const pendingCalls = useMemo(() => {
    return calls.filter(
      (c) => c.status !== "completed" && c.status !== "delivered" && c.status !== "cancelled"
    );
  }, [calls]);

  const paidServiceCharges = useMemo(() => {
    return completedPaidCalls.reduce((sum, c) => sum + (Number(c.serviceCharges) || 0), 0);
  }, [completedPaidCalls]);

  const withheldServiceCharges = useMemo(() => {
    return completedPaymentDueCalls.reduce((sum, c) => sum + (Number(c.serviceCharges) || 0), 0);
  }, [completedPaymentDueCalls]);

  const totalServiceCharges = paidServiceCharges + withheldServiceCharges;

  const commissionEarned = useMemo(() => {
    return Math.round((paidServiceCharges * commissionRate) / 100);
  }, [paidServiceCharges, commissionRate]);

  const commissionWithheld = useMemo(() => {
    return Math.round((withheldServiceCharges * commissionRate) / 100);
  }, [withheldServiceCharges, commissionRate]);

  const totalPaid = useMemo(() => {
    return payouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payouts]);

  const balanceDue = useMemo(() => {
    return commissionEarned - totalPaid;
  }, [commissionEarned, totalPaid]);

  return {
    selectedMonth,
    setSelectedMonth,
    handlePrevMonth,
    handleNextMonth,
    monthLabel,
    monthCalls,
    allCompletedCalls,
    completedPaidCalls,
    completedPaymentDueCalls,
    pendingCalls,
    paidServiceCharges,
    withheldServiceCharges,
    totalServiceCharges,
    commissionEarned,
    commissionWithheld,
    totalPaid,
    balanceDue,
  };
}
