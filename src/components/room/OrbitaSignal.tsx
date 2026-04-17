import React from "react";
import styles from "./OrbitaSignal.module.css";

type OrbitaSignalProps = {
  className?: string;
};

const ECG_PATH =
  "M0 42 L98 42 L116 42 L130 30 L146 54 L164 16 L182 42 L278 42 L296 42 L312 28 L326 50 L344 18 L362 42 L560 42";

export function OrbitaSignal({ className = "" }: OrbitaSignalProps) {
  return (
    <div className={`${styles.root} ${className}`.trim()} aria-hidden>
      <div className={styles.grid} />

      <svg viewBox="0 0 560 84" className={styles.svg}>
        <path className={styles.track} d={ECG_PATH} />
        <path className={styles.flowLeft} d={ECG_PATH} />
        <path className={styles.flowRight} d={ECG_PATH} />
        <path className={styles.dot} d={ECG_PATH} />
      </svg>

      <div className={styles.scanLeft} />
      <div className={styles.scanRight} />
      <div className={styles.core} />
    </div>
  );
}
