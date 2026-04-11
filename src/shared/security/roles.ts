export const ROLES = {
  ADMIN: "ADMIN",
  //   SUPPORT: "SUPPORT",
  RESTAURANT: "RESTAURANT",
  RIDER: "RIDER",
  //   CUSTOMER: "CUSTOMER",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
