export type PassStatus = "active" | "expiring_soon" | "exhausted" | "expired";

export type LoyaltyPass = {
  id: string;
  businessName: string;
  productName: string;
  description: string;
  initialUnits: number;
  remainingUnits: number;
  expiresAt: string;
  status: PassStatus;
};

export type Redemption = {
  id: string;
  passId: string;
  businessName: string;
  productName: string;
  units: number;
  createdAt: string;
};

export const demoUser = {
  name: "Alejandro",
  publicId: "BN-8F21A9",
  qrToken: "bonoa://wallet/demo-token-8f21a9-v1",
};

export const demoPasses: LoyaltyPass[] = [
  {
    id: "lavado-premium",
    businessName: "StarGarage",
    productName: "Bono Lavado Premium",
    description: "5 lavados premium para tu coche.",
    initialUnits: 5,
    remainingUnits: 3,
    expiresAt: "2026-12-31",
    status: "active",
  },
  {
    id: "cafe-club",
    businessName: "Garage Coffee",
    productName: "10 cafés",
    description: "Tu café de siempre, sin sacar la cartera.",
    initialUnits: 10,
    remainingUnits: 8,
    expiresAt: "2026-09-10",
    status: "expiring_soon",
  },
  {
    id: "detailing",
    businessName: "Detail Lab",
    productName: "Pack Interior",
    description: "3 limpiezas interiores completas.",
    initialUnits: 3,
    remainingUnits: 0,
    expiresAt: "2026-07-01",
    status: "exhausted",
  },
];

export const demoRedemptions: Redemption[] = [
  {
    id: "r-001",
    passId: "lavado-premium",
    businessName: "StarGarage",
    productName: "Bono Lavado Premium",
    units: 1,
    createdAt: "2026-08-24T18:42:00+01:00",
  },
  {
    id: "r-002",
    passId: "cafe-club",
    businessName: "Garage Coffee",
    productName: "10 cafés",
    units: 1,
    createdAt: "2026-08-22T10:15:00+01:00",
  },
  {
    id: "r-003",
    passId: "lavado-premium",
    businessName: "StarGarage",
    productName: "Bono Lavado Premium",
    units: 1,
    createdAt: "2026-08-15T17:05:00+01:00",
  },
];
