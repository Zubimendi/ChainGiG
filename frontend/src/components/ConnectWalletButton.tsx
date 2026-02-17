"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function ConnectWalletButton() {
  return (
    <ConnectButton
      showBalance={true}
      chainStatus="icon"
      accountStatus="address"
    />
  );
}
