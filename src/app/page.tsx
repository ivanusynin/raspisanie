import { SchedulingProvider } from "@/lib/scheduling/scheduling-context";
import { SchedulingApp } from "@/components/scheduling/scheduling-app";
import { Toaster } from "@/components/ui/sonner";

export default function Page() {
  return (
    <SchedulingProvider>
      <SchedulingApp />
      <Toaster position="bottom-right" richColors closeButton />
    </SchedulingProvider>
  );
}
