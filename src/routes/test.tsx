import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/test")({
  component: () => <div style={{padding:40}}>FUNCIONOU - TEST OK</div>
});