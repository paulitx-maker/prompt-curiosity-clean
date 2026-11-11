import { useEffect } from "react";
import { getDeviceId } from "@/lib/device";

export function ClientInit() {
  useEffect(() => {
    const deviceId = getDeviceId();
    if(!deviceId) return;

    const ensureUser = async () => {
      try {
        const res = await fetch('/api/ensure-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_id: deviceId })
        });
        const data = await res.json();
        if(data?.credits!== undefined) {
          console.log("[ensureUser] ok", data.credits);
          window.dispatchEvent(new Event("credits-updated"));
        }
      } catch (e:any) {
        console.error("[ensureUser] exception", e.message);
      }
    };
    ensureUser();
  }, []);
  return null;
}