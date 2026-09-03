"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wallet,
} from "lucide-react";
import { connectBrowserWallet, fetchUserBalances } from "@/lib/web3";
import { NETWORKS } from "@/lib/constants";

function MarkGlyph({ className = "w-[1.05em] h-[1.05em]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 0 L24 8.4 V15.6 L12 24 L0 15.6 V8.4 Z" opacity="0.35" />
      <path d="M12 4.6 L19.6 9.9 V14.1 L12 19.4 L4.4 14.1 V9.9 Z" />
    </svg>
  );
}

const REQUIRED_CHAIN_ID = NETWORKS.CREDITCOIN_TESTNET.chainId;        // 102031
const REQUIRED_HEX      = NETWORKS.CREDITCOIN_TESTNET.hexChainId;     // "0x18E8F"

/** Prompt the wallet to switch to Creditcoin Testnet, adding it first if needed. */
async function switchToCredencoinTestnet() {
  const eth = (window as any).ethereum;
  if (!eth) return;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: REQUIRED_HEX }],
    });
  } catch (err: any) {
    // 4902 = chain not yet in wallet — add it then switch
    if (err.code === 4902 || err.code === -32603) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId:           REQUIRED_HEX,
          chainName:         NETWORKS.CREDITCOIN_TESTNET.name,
          nativeCurrency: {
            name:     "Testnet CTC",
            symbol:   NETWORKS.CREDITCOIN_TESTNET.symbol,
            decimals: NETWORKS.CREDITCOIN_TESTNET.decimals,
          },
          rpcUrls:        [NETWORKS.CREDITCOIN_TESTNET.rpcUrl],
          blockExplorerUrls: [NETWORKS.CREDITCOIN_TESTNET.explorer],
        }],
      });
    }
    // User rejected or other error — silently ignore (badge stays visible)
  }
}

const featureTabs = [
  { name: "Dashboard", href: "/overview" },
  { name: "Credit check", href: "/check" },
  { name: "Borrow", href: "/borrow" },
  { name: "Supply", href: "/lend" },
  { name: "Sentinel", href: "/sentinel" },
  { name: "Faucet", href: "/faucet" },
];

export const Navbar = () => {
  const pathname = usePathname();
  const [walletConnected, setWalletConnected] = useState(false);
  const [userAddress, setUserAddress] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);
  const [showNoWalletModal, setShowNoWalletModal] = useState(false);

  const updateBalances = async (addr: string) => {
    try {
      await fetchUserBalances(addr);
    } catch (e) {
      console.warn("Balance fetch error:", e);
    }
  };

  /** Read current chainId and update network state */
  const checkNetwork = async () => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    try {
      const chainId: string = await eth.request({ method: "eth_chainId" });
      setIsCorrectNetwork(parseInt(chainId, 16) === REQUIRED_CHAIN_ID);
    } catch {
      setIsCorrectNetwork(false);
    }
  };

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (typeof window === "undefined" || !eth) return;

    // Check if an account is already authorized
    eth
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          setUserAddress(accounts[0]);
          setWalletConnected(true);
          updateBalances(accounts[0]);
          checkNetwork();
        }
      })
      .catch(() => {});

    // React to account changes
    const onAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setUserAddress(accounts[0]);
        setWalletConnected(true);
        updateBalances(accounts[0]);
        checkNetwork();
      } else {
        setUserAddress("");
        setWalletConnected(false);
        setIsCorrectNetwork(true);
      }
    };

    // React to chain changes
    const onChainChanged = (chainId: string) => {
      const correct = parseInt(chainId, 16) === REQUIRED_CHAIN_ID;
      setIsCorrectNetwork(correct);
    };

    eth.on("accountsChanged", onAccountsChanged);
    eth.on("chainChanged", onChainChanged);

    return () => {
      eth.removeListener?.("accountsChanged", onAccountsChanged);
      eth.removeListener?.("chainChanged", onChainChanged);
    };
  }, []);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      if (typeof window === "undefined" || !(window as any).ethereum) {
        setShowNoWalletModal(true);
        return;
      }
      const { address } = await connectBrowserWallet();
      setUserAddress(address);
      setWalletConnected(true);
      await updateBalances(address);
      // Check network after connecting and auto-switch if needed
      const eth = (window as any).ethereum;
      if (eth) {
        const chainId: string = await eth.request({ method: "eth_chainId" });
        const correct = parseInt(chainId, 16) === REQUIRED_CHAIN_ID;
        setIsCorrectNetwork(correct);
        if (!correct) await switchToCredencoinTestnet();
      }
    } catch (err: any) {
      console.warn("Wallet connect warning:", err?.message || err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectWallet = async () => {
    // Best-effort permission revoke (supported by MetaMask); always clears app state.
    try {
      await (window as any).ethereum?.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // Wallet may not support revoking — clearing local state is enough.
    }
    setUserAddress("");
    setWalletConnected(false);
    setIsCorrectNetwork(true);
    // Reload so every page's data resets to the logged-out view.
    window.location.reload();
  };

  return (
    <header className="settle sticky top-0 z-40 border-b border-hairline bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-2 text-foreground shrink-0">
            <MarkGlyph className="w-[1.15em] h-[1.15em] text-mark" />
            <span className="text-[1.05rem] font-medium tracking-tight">credence</span>
          </Link>

          {/* Feature tabs */}
          <nav className="hidden md:flex items-stretch gap-8 self-stretch">
            {featureTabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.name}
                  href={tab.href}
                  className={`relative flex items-center text-sm transition-colors ${
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab.name}
                  {isActive && (
                    <span className="absolute inset-x-0 -bottom-px h-px bg-foreground" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="flex items-center gap-3">
            <button
              onClick={walletConnected ? handleDisconnectWallet : handleConnectWallet}
              disabled={isConnecting}
              title={walletConnected ? "Disconnect" : undefined}
              className="inline-flex items-center gap-2 rounded-lg bg-surface-2 px-3.5 py-2 text-sm font-medium text-foreground transition-[transform,background-color] hover:bg-surface-2/80 active:scale-[0.98] disabled:opacity-60"
            >
              {walletConnected ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-positive" />
                  <span>{`${userAddress.slice(0, 6)}…${userAddress.slice(-4)}`}</span>
                </>
              ) : (
                <>
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{isConnecting ? "Connecting…" : "Connect wallet"}</span>
                </>
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
              className="md:hidden flex flex-col justify-center gap-[5px] w-9 h-9 items-center"
            >
              <span
                className={`block w-5 h-[1.6px] bg-foreground transition-transform ${
                  mobileMenuOpen ? "translate-y-[3.3px] rotate-45" : ""
                }`}
              />
              <span
                className={`block w-5 h-[1.6px] bg-foreground transition-transform ${
                  mobileMenuOpen ? "-translate-y-[3.3px] -rotate-45" : ""
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-hairline bg-background/95 backdrop-blur-md px-4 py-4 space-y-1">
          {featureTabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && <span className="w-1 h-1 rounded-full bg-accent" />}
                <span>{tab.name}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Web3 Wallet Required Modal */}
      {showNoWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="glass-card max-w-sm w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-accent/15 text-accent flex items-center justify-center mx-auto">
              <Wallet className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-medium text-foreground">Web3 Wallet Required</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                No Web3 wallet extension was detected in this browser. To borrow, supply, or mint tokens on Creditcoin CC3 Testnet, please install MetaMask.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 transition-opacity"
              >
                Get MetaMask
              </a>
              <button
                type="button"
                onClick={() => setShowNoWalletModal(false)}
                className="w-full inline-flex items-center justify-center rounded-lg bg-surface-2 px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
