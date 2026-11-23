import { useEffect, useRef, useState } from 'react';
import { animate, stagger } from 'animejs';
import './GtaViceAnimation.css';

interface GtaViceAnimationProps {
  active: boolean;
  isTyping?: boolean;
}

export default function GtaViceAnimation({ active }: GtaViceAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showToast, setShowToast] = useState(true);
  const toastRef = useRef<HTMLDivElement>(null);

  // Trigger brief GTA VI cinematic neon announcement on activation
  useEffect(() => {
    if (!active) return;

    const timer = setTimeout(() => {
      if (toastRef.current) {
        animate(toastRef.current, {
          opacity: [1, 0],
          translateY: [0, -20],
          duration: 600,
          ease: 'outQuad',
          onComplete: () => setShowToast(false)
        });
      }
    }, 3200);

    return () => clearTimeout(timer);
  }, [active]);

  // Anime.js animation for palm trees and floating neon embers
  useEffect(() => {
    if (!active || !containerRef.current) return;

    // 1. Palm trees swaying animation
    animate('.gta-palm-left', {
      rotate: [-1.2, 1.4],
      transformOrigin: 'bottom left',
      duration: 3800,
      ease: 'inOutSine',
      alternate: true,
      loop: true
    });

    animate('.gta-palm-right', {
      rotate: [1.3, -1.1],
      transformOrigin: 'bottom right',
      duration: 4200,
      ease: 'inOutSine',
      alternate: true,
      loop: true
    });

    // 2. Horizon neon glow pulse
    animate('.gta-horizon-line', {
      opacity: [0.35, 0.85],
      duration: 2200,
      ease: 'inOutQuad',
      alternate: true,
      loop: true
    });

    // 3. Floating Vice City neon dust particles
    animate('.gta-particle', {
      translateY: () => [0, -window.innerHeight * 0.7 - Math.random() * 100],
      translateX: () => [0, (Math.random() - 0.5) * 80],
      opacity: [
        { to: 0.8, duration: 800, ease: 'outQuad' },
        { to: 0, duration: 1800, ease: 'inQuad' }
      ],
      scale: [
        { to: 1.4, duration: 600 },
        { to: 0.6, duration: 2000 }
      ],
      delay: stagger(180, { from: 'random' }),
      duration: () => 2800 + Math.random() * 2200,
      ease: 'linear',
      loop: true
    });
  }, [active]);

  // Anime.js announcement banner stagger reveal
  useEffect(() => {
    if (showToast && toastRef.current) {
      animate(toastRef.current, {
        opacity: [0, 1],
        translateY: [-24, 0],
        scale: [0.94, 1],
        duration: 500,
        ease: 'outBack'
      });

      animate('.gta-toast-letter', {
        opacity: [0, 1],
        translateY: [10, 0],
        delay: stagger(35),
        duration: 350,
        ease: 'outQuad'
      });
    }
  }, [showToast]);

  if (!active) return null;

  const particles = Array.from({ length: 18 });
  const toastText = 'LEONIDA // GTA VI VICE CITY';

  return (
    <div className="gta-anim-container" ref={containerRef} aria-hidden="true">
      {/* Ambient Vice City Horizon Sunset Aura */}
      <div className="gta-sunset-aura" />
      <div className="gta-horizon-line" />

      {/* Floating Neon Dust Sparks */}
      <div className="gta-particles-wrap">
        {particles.map((_, i) => {
          const left = 5 + (i * 92) / 18 + (Math.sin(i) * 3);
          const isPink = i % 2 === 0;
          const isGold = i % 5 === 0;
          const colorClass = isGold ? 'color-gold' : isPink ? 'color-pink' : 'color-cyan';
          return (
            <span
              key={i}
              className={`gta-particle ${colorClass}`}
              style={{
                left: `${left}%`,
                bottom: `${(i % 4) * 8}%`,
                animationDelay: `${i * 0.15}s`
              }}
            />
          );
        })}
      </div>

      {/* Silhouette Palm Trees on Screen Edges */}
      <div className="gta-palm-decor gta-palm-left">
        <svg viewBox="0 0 160 300" width="140" height="260" fill="none">
          {/* Trunk */}
          <path
            d="M 20 300 Q 40 180 60 80 Q 70 40 85 20"
            stroke="rgba(255, 42, 133, 0.25)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Neon Fronds */}
          <path
            d="M 85 20 Q 50 10 10 35 M 85 20 Q 60 -10 25 -10 M 85 20 Q 95 -15 140 -5 M 85 20 Q 115 15 155 45 M 85 20 Q 110 35 130 80 M 85 20 Q 65 35 45 75"
            stroke="rgba(0, 240, 255, 0.45)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 85 20 Q 50 10 10 35 M 85 20 Q 95 -15 140 -5"
            stroke="rgba(255, 42, 133, 0.6)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="gta-palm-decor gta-palm-right">
        <svg viewBox="0 0 160 300" width="140" height="260" fill="none">
          {/* Trunk */}
          <path
            d="M 140 300 Q 120 180 100 80 Q 90 40 75 20"
            stroke="rgba(255, 42, 133, 0.25)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Neon Fronds */}
          <path
            d="M 75 20 Q 110 10 150 35 M 75 20 Q 100 -10 135 -10 M 75 20 Q 65 -15 20 -5 M 75 20 Q 45 15 5 45 M 75 20 Q 50 35 30 80 M 75 20 Q 95 35 115 75"
            stroke="rgba(0, 240, 255, 0.45)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 75 20 Q 110 10 150 35 M 75 20 Q 65 -15 20 -5"
            stroke="rgba(255, 42, 133, 0.6)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Cinematic Toast Notification */}
      {showToast && (
        <div className="gta-intro-toast" ref={toastRef}>
          <div className="gta-toast-glow" />
          <div className="gta-toast-badge">VI</div>
          <div className="gta-toast-text">
            {toastText.split('').map((char, index) => (
              <span key={index} className="gta-toast-letter">
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
