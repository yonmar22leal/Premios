import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';

const ChristmasLayout = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    
    const snowflakes = [];
    const maxFlakes = 100;

    function createSnowflakes() {
      for (let i = 0; i < maxFlakes; i++) {
        snowflakes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 4 + 1,
          speedY: Math.random() * 1 + 0.5,
          speedX: (Math.random() - 0.5) * 0.5,
          opacity: Math.random()
        });
      }
    }

    function drawSnowflakes() {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#dcb157';
      ctx.beginPath();
      for (const flake of snowflakes) {
        ctx.globalAlpha = flake.opacity;
        ctx.moveTo(flake.x, flake.y);
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    function updateSnowflakes() {
      for (const flake of snowflakes) {
        flake.y += flake.speedY;
        flake.x += flake.speedX;
        if (flake.y > height) {
          flake.y = 0;
          flake.x = Math.random() * width;
          flake.opacity = Math.random();
        }
        if (flake.x > width) {
          flake.x = 0;
        } else if (flake.x < 0) {
          flake.x = width;
        }
      }
    }

    function animate() {
      updateSnowflakes();
      drawSnowflakes();
      requestAnimationFrame(animate);
    }

    createSnowflakes();
    animate();

    function onResize() {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    }

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <div className="min-h-screen overflow-hidden relative">
      {/* Fondo imagen */}
      <div className="absolute inset-0 bg-[url('/images/5.png')] bg-cover bg-center" />

      {/* Canvas para nieve */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ display: 'block' }}
      />

      {/* Luces navideñas */}
      <div className="absolute inset-0 animate-pulse-slow pointer-events-none" />

      {/* Contenido de cualquier ruta */}
      <div className="relative z-10 min-h-screen">
        <Outlet />
      </div>
    </div>
  );
};

export default ChristmasLayout;
