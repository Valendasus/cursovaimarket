import { type MotionStyle, useMotionValue, useSpring } from "framer-motion";
import { useCallback, useEffect, useState, type PointerEvent } from "react";
import { useReducedMotionPreference } from "./useReducedMotionPreference";

/** Measure the stationary wrapper; animate its surface without React renders. */
export function usePointerTilt(enabled: boolean) {
  const reducedMotion = useReducedMotionPreference();
  const [finePointer, setFinePointer] = useState(false);
  const spring = { stiffness: 230, damping: 25, mass: 0.7 };
  const rotateX = useSpring(0, spring);
  const rotateY = useSpring(0, spring);
  const y = useSpring(0, spring);
  const lightX = useMotionValue("50%");
  const lightY = useMotionValue("50%");
  const lightOpacity = useSpring(0, spring);
  const active = enabled && finePointer && !reducedMotion;

  const reset = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    y.set(0);
    lightOpacity.set(0);
  }, [rotateX, rotateY, y, lightOpacity]);

  useEffect(() => {
    if (!enabled) return;
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setFinePointer(media.matches);
    update();
    media.addEventListener("change", update);
    window.addEventListener("blur", reset);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("blur", reset);
    };
  }, [enabled, reset]);

  useEffect(() => {
    if (active) return;
    rotateX.jump(0);
    rotateY.jump(0);
    y.jump(0);
    lightOpacity.jump(0);
  }, [active, rotateX, rotateY, y, lightOpacity]);

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!active || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const px = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
    const py = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
    rotateX.set((0.5 - py) * 10);
    rotateY.set((px - 0.5) * 10);
    y.set(-5);
    lightX.set(`${px * 100}%`);
    lightY.set(`${py * 100}%`);
    lightOpacity.set(1);
  };

  const style = {
    rotateX,
    rotateY,
    y,
    "--card-light-x": lightX,
    "--card-light-y": lightY,
    "--card-light-opacity": lightOpacity,
  } as MotionStyle;

  return {
    style,
    reducedMotion,
    events: {
      onPointerMove,
      onPointerLeave: reset,
      onPointerCancel: reset,
      onBlurCapture: reset,
    },
  };
}
