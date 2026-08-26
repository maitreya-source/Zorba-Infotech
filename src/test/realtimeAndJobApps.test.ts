import { describe, it, expect, vi } from "vitest";
import { publishSyncSignal, subscribeSyncSignal } from "@/lib/realtimeSync";
import type { Inquiry } from "@/lib/types";

describe("Realtime Sync Bus & Inquiries Isolation", () => {
  it("publishes and subscribes to sync signals across topics", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeSyncSignal("products", callback);

    publishSyncSignal("products", { action: "update", resourceId: "prod-123" });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: "products",
        action: "update",
        resourceId: "prod-123",
      })
    );

    // Unsubscribe
    unsubscribe();
    publishSyncSignal("products", { action: "create", resourceId: "prod-456" });
    expect(callback).toHaveBeenCalledTimes(1); // Not called again
  });

  it("filters out legacy job application records from inquiry lists", () => {
    const mockInquiries: Inquiry[] = [
      {
        id: "inq-1",
        name: "Rahul Sharma",
        phone: "+91 98765 43210",
        message: "Need quote for 10 CCTV cameras",
        status: "pending",
        source: "contact_page",
      },
      {
        id: "inq-2",
        name: "Amit Verma",
        phone: "+91 99935 99730",
        message: "[Job Application - Computer Hardware Technician]\nExperience: 2 Years",
        status: "pending",
        source: "careers_page",
      },
      {
        id: "inq-3",
        name: "Pooja Mehta",
        phone: "+91 91234 56789",
        message: "Looking for gaming laptop prices",
        status: "completed",
        source: "website_modal",
      },
    ];

    const nonJobInquiries = mockInquiries.filter(
      (inq) => inq.source !== "careers_page" && !inq.message?.startsWith("[Job Application")
    );

    expect(nonJobInquiries.length).toBe(2);
    expect(nonJobInquiries.map((i) => i.id)).toEqual(["inq-1", "inq-3"]);
  });
});
