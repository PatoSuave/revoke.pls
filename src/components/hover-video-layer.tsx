"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

interface HoverVideoLayerProps {
  src: string;
}

export function HoverVideoLayer({ src }: HoverVideoLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isGif = /\.gif(?:[?#]|$)/i.test(src);

  useEffect(() => {
    const layer = layerRef.current;
    const video = videoRef.current;
    const card = layer?.closest<HTMLElement>("[data-hover-video-card]");

    if (!layer || !card) return;

    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!canHover.matches || reduceMotion.matches) return;

    let pointerInside = false;
    let focusInside = false;

    const play = () => {
      card.dataset.hoverVideoActive = "true";
      if (video) {
        void video.play().catch(() => {
          delete card.dataset.hoverVideoActive;
        });
      }
    };

    const pause = () => {
      if (pointerInside || focusInside) return;

      delete card.dataset.hoverVideoActive;
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
    };

    const onPointerEnter = () => {
      pointerInside = true;
      play();
    };
    const onPointerLeave = () => {
      pointerInside = false;
      pause();
    };
    const onFocusIn = () => {
      focusInside = true;
      play();
    };
    const onFocusOut = () => {
      window.setTimeout(() => {
        focusInside = card.contains(document.activeElement);
        pause();
      }, 0);
    };

    card.addEventListener("pointerenter", onPointerEnter);
    card.addEventListener("pointerleave", onPointerLeave);
    card.addEventListener("focusin", onFocusIn);
    card.addEventListener("focusout", onFocusOut);

    return () => {
      card.removeEventListener("pointerenter", onPointerEnter);
      card.removeEventListener("pointerleave", onPointerLeave);
      card.removeEventListener("focusin", onFocusIn);
      card.removeEventListener("focusout", onFocusOut);
      delete card.dataset.hoverVideoActive;
    };
  }, []);

  return (
    <div ref={layerRef} className="hover-video-layer" aria-hidden>
      {isGif ? (
        <Image
          className="hover-video-layer-media"
          src={src}
          alt=""
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          unoptimized
        />
      ) : (
        <video
          ref={videoRef}
          className="hover-video-layer-media"
          src={src}
          muted
          loop
          playsInline
          preload="metadata"
          tabIndex={-1}
        />
      )}
    </div>
  );
}
