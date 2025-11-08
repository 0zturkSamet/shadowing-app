import { useEffect } from "react";

interface KeyboardHandlers {
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onLoop?: () => void;
  onRecord?: () => void;
  onTogglePlayPause?: () => void;
}

export function useKeyboardShortcuts(handlers: KeyboardHandlers) {
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.code) {
        case "Space":
          event.preventDefault();
          handlers.onTogglePlayPause?.();
          break;
        case "KeyN":
          event.preventDefault();
          handlers.onNext?.();
          break;
        case "KeyP":
          event.preventDefault();
          handlers.onPrevious?.();
          break;
        case "KeyL":
          event.preventDefault();
          handlers.onLoop?.();
          break;
        case "KeyR":
          event.preventDefault();
          handlers.onRecord?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handlers]);
}
