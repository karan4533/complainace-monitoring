import React, { useEffect, useRef, useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { palette } from '../../theme/theme';

export default function ZoneCanvas({ previewUrl, zones, onZonesChange }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState([]);
  const [activeZoneIndex, setActiveZoneIndex] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    zones.forEach((zone, i) => {
      if (!zone.length) return;
      ctx.beginPath();
      zone.forEach((pt, idx) => {
        const x = pt.x * canvas.width;
        const y = pt.y * canvas.height;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = i === activeZoneIndex ? palette.error : palette.primary;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = i === activeZoneIndex ? 'rgba(198,40,40,0.12)' : 'rgba(74,55,40,0.08)';
      ctx.fill();
    });

    if (drawing.length) {
      ctx.beginPath();
      drawing.forEach((pt, idx) => {
        const x = pt.x * canvas.width;
        const y = pt.y * canvas.height;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = palette.primaryLight;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [zones, drawing, activeZoneIndex]);

  const handleClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
    setDrawing((prev) => [...prev, point]);
  };

  const finishZone = () => {
    if (drawing.length < 3) return;
    onZonesChange([...zones, drawing]);
    setDrawing([]);
  };

  const clearDrawing = () => setDrawing([]);

  const removeZone = (index) => {
    onZonesChange(zones.filter((_, i) => i !== index));
    setActiveZoneIndex(null);
  };

  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: '12px' }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 1.5 }}>
        Detection Zones (optional)
      </Typography>
      <Box sx={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#111' }}>
        {previewUrl ? (
          <Box
            component="img"
            src={previewUrl}
            alt="Camera preview"
            sx={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'cover' }}
          />
        ) : (
          <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)' }}>Live preview unavailable — draw zones on canvas</Typography>
          </Box>
        )}
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          onClick={handleClick}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            cursor: 'crosshair',
          }}
        />
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
        <Button size="small" variant="contained" onClick={finishZone} disabled={drawing.length < 3}>
          Finish Zone
        </Button>
        <Button size="small" variant="outlined" onClick={clearDrawing}>
          Clear Current
        </Button>
        {zones.map((_, i) => (
          <Button key={i} size="small" variant="outlined" color="error" onClick={() => removeZone(i)}>
            Remove Zone {i + 1}
          </Button>
        ))}
      </Box>
      <Typography variant="body2" sx={{ mt: 1.5, color: palette.textMuted }}>
        Click to place polygon points on the preview. Zones are optional — leave empty to monitor the full frame.
      </Typography>
    </Paper>
  );
}
