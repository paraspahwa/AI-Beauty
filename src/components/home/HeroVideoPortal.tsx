"use client";

import * as React from "react";
import Image from "next/image";
import { useReducedMotion } from "framer-motion";
import styles from "@/app/home.module.css";

const VIDEO_SRC = "/Website%20Hero%20Background.mp4";
const POSTER_SRC = "/1779024315.png";

export function HeroVideoPortal() {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const reducedMotion = useReducedMotion();

  React.useEffect(() => {
    if (reducedMotion || !videoRef.current) return;

    const el = videoRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void el.play().catch(() => undefined);
        } else {
          el.pause();
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return (
    <div className={styles.heroVideoPortal} aria-hidden>
      <div className={styles.heroVideoPortalGlow} />
      <div className={styles.heroVideoFrame}>
        {reducedMotion ? (
          <Image
            src={POSTER_SRC}
            alt=""
            fill
            priority
            className={styles.heroVideoMedia}
            sizes="(max-width: 1024px) 80vw, 720px"
          />
        ) : (
          <video
            ref={videoRef}
            muted
            loop
            playsInline
            preload="metadata"
            poster={POSTER_SRC}
            className={styles.heroVideoMedia}
          >
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>
        )}
        <div className={styles.heroVideoGrade} />
        <div className={styles.heroVideoSheen} />
      </div>
    </div>
  );
}
