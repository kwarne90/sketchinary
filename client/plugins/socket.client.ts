import { io, type Socket } from "socket.io-client";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const url = config.public.socketUrl || undefined;
  const socket: Socket = io(url, {
    autoConnect: false,
    path: "/socket.io",
    transports: import.meta.dev ? ["polling"] : ["websocket", "polling"],
    upgrade: !import.meta.dev,
  });
  return {
    provide: {
      socket,
    },
  };
});
