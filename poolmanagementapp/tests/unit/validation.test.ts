import { describe, it, expect } from "vitest";
import { validateCheckIn, validateCheckOut } from "@/lib/validation";

// --- CheckIn validation ---

describe("validateCheckIn", () => {
  const validInput = {
    name: "Jane Doe",
    membershipNumber: "12345",
    phoneNumber: "5551234567",
    partySize: 3,
    isPrivate: false,
  };

  it("accepts a valid CheckInInput", () => {
    const result = validateCheckIn(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validInput);
    }
  });

  it("accepts isPrivate as true", () => {
    const result = validateCheckIn({ ...validInput, isPrivate: true });
    expect(result.success).toBe(true);
  });

  it("accepts isPrivate as false", () => {
    const result = validateCheckIn({ ...validInput, isPrivate: false });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = validateCheckIn({ ...validInput, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameError = result.errors.find((e) => e.field === "name");
      expect(nameError).toBeDefined();
    }
  });

  it("rejects a non-numeric membershipNumber (e.g. 'abc123')", () => {
    const result = validateCheckIn({ ...validInput, membershipNumber: "abc123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldError = result.errors.find((e) => e.field === "membershipNumber");
      expect(fieldError).toBeDefined();
    }
  });

  it("rejects a phone number with wrong length (e.g. '12345')", () => {
    const result = validateCheckIn({ ...validInput, phoneNumber: "12345" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldError = result.errors.find((e) => e.field === "phoneNumber");
      expect(fieldError).toBeDefined();
    }
  });

  it("rejects a phone number with non-digits (e.g. '123-456-789')", () => {
    const result = validateCheckIn({ ...validInput, phoneNumber: "123-456-789" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldError = result.errors.find((e) => e.field === "phoneNumber");
      expect(fieldError).toBeDefined();
    }
  });

  it("rejects partySize of 0", () => {
    const result = validateCheckIn({ ...validInput, partySize: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldError = result.errors.find((e) => e.field === "partySize");
      expect(fieldError).toBeDefined();
    }
  });

  it("rejects partySize of 21", () => {
    const result = validateCheckIn({ ...validInput, partySize: 21 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldError = result.errors.find((e) => e.field === "partySize");
      expect(fieldError).toBeDefined();
    }
  });

  it("accepts partySize of 1 (lower boundary)", () => {
    const result = validateCheckIn({ ...validInput, partySize: 1 });
    expect(result.success).toBe(true);
  });

  it("accepts partySize of 20 (upper boundary)", () => {
    const result = validateCheckIn({ ...validInput, partySize: 20 });
    expect(result.success).toBe(true);
  });
});

// --- CheckOut validation ---

describe("validateCheckOut", () => {
  it("accepts a valid CheckOutInput", () => {
    const result = validateCheckOut({ membershipNumber: "99999" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.membershipNumber).toBe("99999");
    }
  });

  it("rejects a non-numeric membershipNumber in CheckOutInput", () => {
    const result = validateCheckOut({ membershipNumber: "abc" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldError = result.errors.find((e) => e.field === "membershipNumber");
      expect(fieldError).toBeDefined();
    }
  });
});
