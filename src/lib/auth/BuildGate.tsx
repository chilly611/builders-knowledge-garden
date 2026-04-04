"use client";

import { ReactNode } from "react";
import { BuildGate as BuildGateBase, Tier } from "@/lib/auth";

interface BuildGateProps {
  children: ReactNode;
  feature?: string;
  requiredTier?: Tier;
}

export default function BuildGate({ children, feature = "This feature", requiredTier = "pro" }: BuildGateProps) {
  return (
    <BuildGateBase feature={feature} requiredTier={requiredTier}>
      {children}
    </BuildGateBase>
  );
}
