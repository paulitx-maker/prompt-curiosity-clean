// src/hooks/use-device-id.ts - VERSÃO FINAL SSR-SAFE
import { getDeviceId } from "@/lib/device";

export function useDeviceId(): string {
  if (typeof window === 'undefined') return '';
  
  // delega pra versão que já lida com cookie + localStorage
  return getDeviceId();
}

export function getDeviceIdHook(): string {
  return useDeviceId();
}