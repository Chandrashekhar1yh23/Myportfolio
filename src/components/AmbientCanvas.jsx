import { useEffect, useRef } from 'react';

const noiseScriptUrl = '/ambient-canvas/noise.min.js';

function loadNoiseScript() {
  if (window.SimplexNoise) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${noiseScriptUrl}"]`);
    const script = existingScript || document.createElement('script');

    if (!existingScript) {
      script.src = noiseScriptUrl;
      document.head.appendChild(script);
    }

    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', reject, { once: true });
  });
}

export default function AmbientCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    let animationFrame;
    let cancelled = false;
    const canvas = canvasRef.current;

    loadNoiseScript()
      .then(() => {
        if (cancelled || !canvas) return;

        const ctx = canvas.getContext('2d');
        const simplex = new window.SimplexNoise();
        const rayCount = 500;
        const rayPropCount = 8;
        const rayProps = new Float32Array(rayCount * rayPropCount);
        const rand = (number) => number * Math.random();
        const round = (number) => Math.round(number);
        const fadeInOut = (time, total) => {
          const half = 0.5 * total;
          return Math.abs(((time + half) % total) - half) / half;
        };

        let tick = 0;
        let width = 0;
        let height = 0;
        let centerY = 0;

        const resize = () => {
          const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
          width = window.innerWidth;
          height = window.innerHeight;
          canvas.width = Math.floor(width * pixelRatio);
          canvas.height = Math.floor(height * pixelRatio);
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
          ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
          centerY = height * 0.5;
        };

        const initRay = (index) => {
          const length = 200 + rand(200);
          const x = rand(width);
          const y1 = centerY + 100;
          const y2 = y1 - length;
          const noise = simplex.noise3D(
            x * 0.0015,
            y1 * 0.0015,
            tick * 0.0015
          ) * 100;
          const ttl = 50 + rand(100);
          const widthValue = 10 + rand(20);
          const speed = (0.05 + rand(0.1)) * (round(rand(1)) ? 1 : -1);
          const hue = 120 + rand(60);

          rayProps.set([x, y1 + noise, y2 + noise, 0, ttl, widthValue, speed, hue], index);
        };

        const draw = () => {
          tick++;
          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = 'hsla(220,60%,3%,1)';
          ctx.fillRect(0, 0, width, height);
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.filter = 'blur(12px)';

          for (let i = 0; i < rayProps.length; i += rayPropCount) {
            let x = rayProps[i];
            const y1 = rayProps[i + 1];
            const y2 = rayProps[i + 2];
            let life = rayProps[i + 3];
            const ttl = rayProps[i + 4];
            const lineWidth = rayProps[i + 5];
            const speed = rayProps[i + 6];
            const hue = rayProps[i + 7];
            const alpha = fadeInOut(life, ttl);

            const gradient = ctx.createLinearGradient(x, y1, x, y2);
            gradient.addColorStop(0, `hsla(${hue},100%,65%,0)`);
            gradient.addColorStop(0.5, `hsla(${hue},100%,65%,${alpha})`);
            gradient.addColorStop(1, `hsla(${hue},100%,65%,0)`);

            ctx.beginPath();
            ctx.strokeStyle = gradient;
            ctx.lineWidth = lineWidth;
            ctx.moveTo(x, y1);
            ctx.lineTo(x, y2);
            ctx.stroke();

            x += speed;
            life++;
            rayProps[i] = x;
            rayProps[i + 3] = life;

            if (x < 0 || x > width || life > ttl) {
              initRay(i);
            }
          }

          ctx.restore();
          animationFrame = window.requestAnimationFrame(draw);
        };

        resize();
        for (let i = 0; i < rayProps.length; i += rayPropCount) {
          initRay(i);
        }
        window.addEventListener('resize', resize);
        draw();

        canvas.cleanup = () => {
          window.removeEventListener('resize', resize);
        };
      })
      .catch(() => {
        // Keep the existing CSS background visible if the canvas library fails.
      });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(animationFrame);
      if (canvas?.cleanup) {
        canvas.cleanup();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="ambient-canvas"
      aria-hidden="true"
    />
  );
}
