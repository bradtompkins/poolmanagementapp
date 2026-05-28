import { z } from "zod";

// Validation error type
export type ValidationError = {
  field: string;
  message: string;
};

// CheckIn Zod schema
export const CheckInSchema = z.object({
  name: z.string().min(1, "Name must not be empty"),
  membershipNumber: z
    .string()
    .regex(/^\d+$/, "Membership number must contain only digits"),
  phoneNumber: z
    .string()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits")
    .optional()
    .or(z.literal("")),
  partySize: z
    .number()
    .int("Party size must be an integer")
    .min(1, "Party size must be at least 1")
    .max(20, "Party size must be at most 20"),
  isPrivate: z.boolean(),
});

// CheckOut Zod schema
export const CheckOutSchema = z.object({
  membershipNumber: z
    .string()
    .regex(/^\d+$/, "Membership number must contain only digits"),
});

// Inferred TypeScript types
export type CheckInInput = z.infer<typeof CheckInSchema>;
export type CheckOutInput = z.infer<typeof CheckOutSchema>;

// Helper to map Zod errors to ValidationError[]
function mapZodErrors(error: z.ZodError): ValidationError[] {
  return error.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));
}

// Validate check-in input
export function validateCheckIn(
  data: unknown
): { success: true; data: CheckInInput } | { success: false; errors: ValidationError[] } {
  const result = CheckInSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: mapZodErrors(result.error) };
}

// Validate check-out input
export function validateCheckOut(
  data: unknown
): { success: true; data: CheckOutInput } | { success: false; errors: ValidationError[] } {
  const result = CheckOutSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: mapZodErrors(result.error) };
}
