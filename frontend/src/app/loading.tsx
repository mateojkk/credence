import { RefreshCw } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
      <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
        Syncing Creditcoin State...
      </span>
    </div>
  );
}
