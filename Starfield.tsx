
import React, { useEffect, useRef } from 'react';

const Starfield: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let stars: { x: number; y: number; size: number; velocity: number; color: string; depth: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      stars = Array.from({ length: 250 }).map(() => {
        const depth = Math.random();
        return {
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: (Math.random() * 1.5) + depth,
          velocity: (Math.random() * 0.15 + 0.05) * (depth + 0.5),
          depth: depth,
          color: Math.random() > 0.8 ? '#00e5ff' : Math.random() > 0.9 ? '#ff2e63' : '#ffffff'
        };
      });
    };

    const draw = () => {
      ctx.fillStyle = '#02040a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw subtle nebula clouds
      const time = Date.now() * 0.0005;
      const gradient = ctx.createRadialGradient(
        canvas.width / 2 + Math.sin(time) * 100, 
        canvas.height / 2 + Math.cos(time) * 100, 
        0,
        canvas.width / 2, 
        canvas.height / 2, 
        canvas.width
      );
      gradient.addColorStop(0, 'rgba(4, 12, 36, 0.4)');
      gradient.addColorStop(0.5, 'rgba(1, 4, 15, 0.1)');
      gradient.addColorStop(1, '#02040a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      stars.forEach(star => {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.shadowBlur = star.depth * 5;
        ctx.shadowColor = star.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        
        star.y += star.velocity;
        if (star.y > canvas.height) {
          star.y = 0;
          star.x = Math.random() * canvas.width;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 -z-10"
    />
  );
};

export default Starfield;
