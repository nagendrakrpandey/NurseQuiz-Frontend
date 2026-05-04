import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearAuthSession,
  getLastSessionActivity,
  hasAuthSession,
  IDLE_LOGOUT_MS,
  isSessionIdleExpired,
  markSessionActivity,
} from "@/lib/session";

const ACTIVITY_EVENTS = [
  "click",
  "keydown",
  "mousemove",
  "scroll",
  "touchstart",
  "focus",
];

export const useIdleLogout = (enabled = true) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled || !hasAuthSession()) return;

    if (!getLastSessionActivity()) {
      markSessionActivity();
    }

    let lastWriteAt = 0;

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastWriteAt < 1000) return;
      lastWriteAt = now;
      markSessionActivity();
    };

    const logoutIfIdle = () => {
      if (!hasAuthSession()) return;

      if (isSessionIdleExpired(IDLE_LOGOUT_MS)) {
        clearAuthSession("idle");
        navigate("/login", { replace: true });
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });

    const timer = window.setInterval(logoutIfIdle, 30 * 1000);
    window.addEventListener("storage", logoutIfIdle);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      window.clearInterval(timer);
      window.removeEventListener("storage", logoutIfIdle);
    };
  }, [enabled, navigate]);
};
