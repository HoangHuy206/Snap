"use client";

import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import {
  buildQrMatrix,
  getFlowerPalette,
  getSeasonPreset,
  type FlowerColorId,
  type QrMatrixData,
  type SeasonId,
} from "@/lib/magic-tree";

export interface MagicTreeCanvasHandle {
  exportCurrentPng: (filename?: string) => void;
}

interface MagicTreeCanvasProps {
  url: string;
  season: SeasonId;
  flowerColor: FlowerColorId;
  mode: "tree" | "qr";
  onToggleMode: () => void;
  ref?: Ref<MagicTreeCanvasHandle>;
}

interface VoxelSpec {
  gx: number;
  gy: number;
  baseZ: number;
  height: number;
  treeColor: string;
  qrColor: string;
  stagger: number;
  role: "grass" | "trunk" | "blossom" | "puff";
}

interface PetalParticle {
  gx: number;
  gy: number;
  gz: number;
  vx: number;
  vy: number;
  vz: number;
  phase: number;
  size: number;
  colorIndex: number;
}

function hash2d(a: number, b: number, seed = 1337): number {
  let x = (a * 374761393 + b * 668265263 + seed * 1442695041) | 0;
  x = ((x ^ (x >> 13)) * 1274126177) | 0;
  return ((x ^ (x >> 16)) >>> 0) / 4294967296;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const k = clamp01(t);
  const r = Math.round(ar + (br - ar) * k);
  const g = Math.round(ag + (bg - ag) * k);
  const bl = Math.round(ab + (bb - ab) * k);
  return `rgb(${r},${g},${bl})`;
}

function shadeRgb(rgbStr: string, factor: number): string {
  const match = rgbStr.match(/\d+/g);
  if (!match || match.length < 3) return rgbStr;
  const r = Math.max(0, Math.min(255, Math.round(Number(match[0]) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(Number(match[1]) * factor)));
  const b = Math.max(0, Math.min(255, Math.round(Number(match[2]) * factor)));
  return `rgb(${r},${g},${b})`;
}

function buildSceneVoxels(
  matrix: QrMatrixData,
  seasonId: SeasonId,
  flowerId: FlowerColorId
): { qrVoxels: VoxelSpec[]; canopyPuffs: VoxelSpec[] } {
  const season = getSeasonPreset(seasonId);
  const flower = getFlowerPalette(flowerId);
  const size = matrix.size;
  const half = (size - 1) / 2;
  const scaleFactor = size / 29; // normalize visual tree height cleanly across QR versions

  const qrVoxels: VoxelSpec[] = [];
  const canopyPuffs: VoxelSpec[] = [];

  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!matrix.modules[r][c]) continue;

      const gx = c - half;
      const gy = r - half;
      const h1 = hash2d(r, c, 11);
      const h2 = hash2d(r, c, 97);
      const distNorm = Math.hypot(gx, gy) / (size * 0.5);
      const isOuterSquare =
        Math.abs(gx) > size * 0.365 || Math.abs(gy) > size * 0.365;

      if (matrix.isFinder[r][c] || isOuterSquare) {
        const idx = Math.floor(h1 * season.grassPalette.length);
        const scanIdx = Math.floor(h2 * season.grassScanInk.length);
        qrVoxels.push({
          gx,
          gy,
          baseZ: 0,
          height: (0.28 + h2 * 0.52) * scaleFactor,
          treeColor: season.grassPalette[idx],
          qrColor: season.grassScanInk[scanIdx],
          stagger: clamp01(0.05 + distNorm * 0.16),
          role: "grass",
        });
        continue;
      }

      if (distNorm <= 0.13) {
        const idx = Math.floor(h1 * season.trunkPalette.length);
        qrVoxels.push({
          gx,
          gy,
          baseZ: 0,
          height: (6.2 + h2 * 2.8) * scaleFactor,
          treeColor: season.trunkPalette[idx],
          qrColor: season.trunkScanInk,
          stagger: clamp01(h1 * 0.08),
          role: "trunk",
        });
        continue;
      }

      // Canopy modules: form an organic dome crown above the trunk in 3D,
      // while remaining 100% faithful to flat QR coordinates when morphed down.
      const crownFalloff = clamp01(1 - (distNorm - 0.12) / 0.45);
      const baseLift = (4.2 + crownFalloff * 3.8 + h1 * 1.8) * scaleFactor;
      const blockHeight = (1.3 + crownFalloff * 2.6 + h2 * 1.4) * scaleFactor;
      const idx = Math.floor(h1 * flower.treeShades.length);

      qrVoxels.push({
        gx,
        gy,
        baseZ: baseLift,
        height: blockHeight,
        treeColor: flower.treeShades[idx],
        qrColor: flower.qrScanShades[idx],
        stagger: clamp01(0.1 + distNorm * 0.25),
        role: "blossom",
      });
    }
  }

  // Sculpt extra lush crown puffs only visible in 3D tree mode (fade out smoothly when flat).
  const puffCount = Math.round(115 * scaleFactor);
  for (let i = 0; i < puffCount; i += 1) {
    const angle = hash2d(i, 3, 401) * Math.PI * 2;
    const rad = Math.pow(hash2d(i, 7, 509), 0.65) * size * 0.34;
    const gx = Math.cos(angle) * rad;
    const gy = Math.sin(angle) * rad;
    const falloff = clamp01(1 - rad / (size * 0.36));
    const hVal = hash2d(i, 13, 701);
    const shadeIdx = Math.floor(hVal * flower.treeShades.length);

    canopyPuffs.push({
      gx,
      gy,
      baseZ: (5.6 + falloff * 5.2 + hVal * 2.1) * scaleFactor,
      height: (1.2 + falloff * 1.4) * scaleFactor,
      treeColor: flower.treeShades[shadeIdx],
      qrColor: flower.treeShades[shadeIdx],
      stagger: clamp01(0.2 + (rad / (size * 0.4)) * 0.2),
      role: "puff",
    });
  }

  // Add subtle wooden trunk core center blocks so trunk always looks full even if URL center is sparse
  const trunkOffsets: Array<[number, number, number]> = [
    [0, 0, 7.6],
    [-0.5, 0, 5.8],
    [0.5, 0, 5.4],
    [0, 0.5, 5.6],
    [0, -0.5, 6.2],
  ];
  for (let i = 0; i < trunkOffsets.length; i += 1) {
    const [ox, oy, th] = trunkOffsets[i];
    canopyPuffs.push({
      gx: ox,
      gy: oy,
      baseZ: 0,
      height: th * scaleFactor,
      treeColor: season.trunkPalette[i % season.trunkPalette.length],
      qrColor: season.trunkScanInk,
      stagger: 0.02,
      role: "trunk",
    });
  }

  return { qrVoxels, canopyPuffs };
}

function createPetals(size: number): PetalParticle[] {
  const list: PetalParticle[] = [];
  const half = size * 0.42;
  for (let i = 0; i < 28; i += 1) {
    list.push({
      gx: (hash2d(i, 1, 88) * 2 - 1) * half,
      gy: (hash2d(i, 2, 99) * 2 - 1) * half,
      gz: (2 + hash2d(i, 3, 101) * 10) * (size / 29),
      vx: (hash2d(i, 4, 111) - 0.5) * 0.015,
      vy: (hash2d(i, 5, 121) - 0.5) * 0.015,
      vz: -(0.02 + hash2d(i, 6, 131) * 0.022) * (size / 29),
      phase: hash2d(i, 7, 141) * Math.PI * 2,
      size: 0.36 + hash2d(i, 8, 151) * 0.24,
      colorIndex: i % 3,
    });
  }
  return list;
}

export function MagicTreeCanvas({
  url,
  season,
  flowerColor,
  mode,
  onToggleMode,
  ref,
}: MagicTreeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const seasonRef = useRef(season);
  const flowerRef = useRef(flowerColor);
  const morphRef = useRef(mode === "tree" ? 1 : 0);
  const yawOffsetRef = useRef(0);
  const dragStateRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startYaw: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startYaw: 0,
  });

  const sceneRef = useRef<{
    size: number;
    qrVoxels: VoxelSpec[];
    canopyPuffs: VoxelSpec[];
    petals: PetalParticle[];
  } | null>(null);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    seasonRef.current = season;
    flowerRef.current = flowerColor;
    const matrix = buildQrMatrix(url);
    const { qrVoxels, canopyPuffs } = buildSceneVoxels(
      matrix,
      season,
      flowerColor
    );
    sceneRef.current = {
      size: matrix.size,
      qrVoxels,
      canopyPuffs,
      petals: createPetals(matrix.size),
    };
  }, [url, season, flowerColor]);

  useImperativeHandle(ref, () => ({
    exportCurrentPng(filename = "vidqr-magic-tree.png") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement("a");
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let animId = 0;
    let lastTime = performance.now();

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const cssWidth = Math.min(540, parent.clientWidth || 360);
      const cssHeight = Math.round(cssWidth * 0.92);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.round(cssWidth * dpr);
      const targetH = Math.round(cssHeight * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const drawLoop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const scene = sceneRef.current;
      if (!scene) {
        animId = window.requestAnimationFrame(drawLoop);
        return;
      }

      const targetMorph = modeRef.current === "tree" ? 1 : 0;
      if (prefersReducedMotion) {
        morphRef.current = targetMorph;
      } else {
        const diff = targetMorph - morphRef.current;
        if (Math.abs(diff) < 0.002) {
          morphRef.current = targetMorph;
        } else {
          morphRef.current += diff * Math.min(1, dt * 4.2);
        }
      }

      // Gently settle user drag offset back toward 0 when switching to flat QR
      if (modeRef.current === "qr") {
        yawOffsetRef.current *= Math.max(0, 1 - dt * 6);
      }

      const t = easeInOutCubic(morphRef.current);
      const seasonObj = getSeasonPreset(seasonRef.current);
      const w = canvas.width;
      const h = canvas.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark" ||
        (!document.documentElement.getAttribute("data-theme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);

      ctx.save();
      ctx.clearRect(0, 0, w, h);

      // Clean high-contrast backdrop behind the 3D stage; bright quiet zone for QR stays crisp.
      ctx.fillStyle = isDark ? seasonObj.stageDarkBg : seasonObj.stageLightBg;
      ctx.fillRect(0, 0, w, h);

      const size = scene.size;
      const pad = 2.6;
      const boardHalf = size / 2 + pad;
      const maxSpan = w * (0.86 - t * 0.14);
      const cell = maxSpan / (boardHalf * 2 * (1 + t * 0.25));

      const yaw = t * (Math.PI * 0.25 + yawOffsetRef.current);
      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const ySquash = 1 - t * 0.49;
      const zScale = cell * 0.92 * t;

      const centerX = w / 2;
      const centerY = h * (0.5 + t * 0.14);

      const project = (gx: number, gy: number, gz: number): [number, number] => {
        const rx = gx * cosY - gy * sinY;
        const ry = gx * sinY + gy * cosY;
        return [
          centerX + rx * cell,
          centerY + ry * cell * ySquash - gz * zScale,
        ];
      };

      const depthOf = (gx: number, gy: number): number => gx * sinY + gy * cosY;

      const drawVoxel = (
        gx: number,
        gy: number,
        gz0: number,
        height: number,
        halfW: number,
        fillTop: string,
        alpha = 1
      ) => {
        if (alpha <= 0.01) return;
        const gz1 = gz0 + height;
        const extrudePx = height * zScale;
        const expand = t < 0.08 ? 0.35 * dpr / cell : 0;
        const r = halfW + expand;

        const c00Top = project(gx - r, gy - r, gz1);
        const c10Top = project(gx + r, gy - r, gz1);
        const c11Top = project(gx + r, gy + r, gz1);
        const c01Top = project(gx - r, gy + r, gz1);

        ctx.globalAlpha = alpha;

        if (extrudePx >= 0.65) {
          const c00Bot = project(gx - r, gy - r, gz0);
          const c10Bot = project(gx + r, gy - r, gz0);
          const c11Bot = project(gx + r, gy + r, gz0);
          const c01Bot = project(gx - r, gy + r, gz0);
          const centerDepth = depthOf(gx, gy);

          const faces: Array<{
            pts: Array<[number, number]>;
            mx: number;
            my: number;
            shade: number;
          }> = [
            { pts: [c00Top, c10Top, c10Bot, c00Bot], mx: gx, my: gy - r, shade: 0.78 },
            { pts: [c10Top, c11Top, c11Bot, c10Bot], mx: gx + r, my: gy, shade: 0.68 },
            { pts: [c11Top, c01Top, c01Bot, c11Bot], mx: gx, my: gy + r, shade: 0.84 },
            { pts: [c01Top, c00Top, c00Bot, c01Bot], mx: gx - r, my: gy, shade: 0.74 },
          ];

          for (const face of faces) {
            if (depthOf(face.mx, face.my) > centerDepth) {
              ctx.fillStyle = shadeRgb(fillTop, face.shade);
              ctx.beginPath();
              ctx.moveTo(face.pts[0][0], face.pts[0][1]);
              ctx.lineTo(face.pts[1][0], face.pts[1][1]);
              ctx.lineTo(face.pts[2][0], face.pts[2][1]);
              ctx.lineTo(face.pts[3][0], face.pts[3][1]);
              ctx.closePath();
              ctx.fill();
            }
          }
        }

        ctx.fillStyle = fillTop;
        ctx.beginPath();
        ctx.moveTo(c00Top[0], c00Top[1]);
        ctx.lineTo(c10Top[0], c10Top[1]);
        ctx.lineTo(c11Top[0], c11Top[1]);
        ctx.lineTo(c01Top[0], c01Top[1]);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      };

      // 1. Bright QR board base slab (kept bright for guaranteed flat QR contrast)
      const slabThickness = 0.65 * t;
      drawVoxel(
        0,
        0,
        -slabThickness,
        slabThickness,
        boardHalf,
        "rgb(252,250,245)",
        1
      );

      // Subtle checkerboard stone tiles + trunk cast shadow on the 3D platform
      if (t > 0.08) {
        const tileAlpha = clamp01((t - 0.08) / 0.5) * 0.42;
        const halfN = Math.floor(size / 2);
        for (let gy = -halfN; gy <= halfN; gy += 2) {
          for (let gx = -halfN; gx <= halfN; gx += 2) {
            if ((Math.abs(gx + gy) / 2) % 2 === 1) continue;
            const d = Math.hypot(gx, gy);
            if (d < size * 0.34) {
              drawVoxel(
                gx,
                gy,
                0.01,
                0,
                0.85,
                d < size * 0.2 ? "rgb(203,195,180)" : "rgb(232,226,214)",
                tileAlpha
              );
            }
          }
        }
      }

      // 2. Compute animated heights for every QR voxel + decorative canopy puff
      interface RenderBlock {
        gx: number;
        gy: number;
        gz0: number;
        height: number;
        halfW: number;
        color: string;
        alpha: number;
        sortKey: number;
      }

      const renderList: RenderBlock[] = [];

      for (const v of scene.qrVoxels) {
        const localT = clamp01((t - v.stagger * 0.45) / (1 - v.stagger * 0.45));
        const eased = easeInOutCubic(localT);
        const gz0 = v.baseZ * eased;
        const hCurr = v.height * eased;
        const color = mixHex(v.qrColor, v.treeColor, clamp01(eased * 1.15));
        const halfW = v.role === "blossom" ? 0.5 + eased * 0.14 : 0.5;
        const d = depthOf(v.gx, v.gy) + (gz0 + hCurr * 0.5) * 0.45;

        renderList.push({
          gx: v.gx,
          gy: v.gy,
          gz0,
          height: hCurr,
          halfW,
          color,
          alpha: 1,
          sortKey: d,
        });
      }

      const puffAlpha = clamp01((t - 0.32) / 0.58);
      if (puffAlpha > 0.01) {
        for (const p of scene.canopyPuffs) {
          const sway =
            !prefersReducedMotion && p.role === "puff"
              ? Math.sin(now * 0.0018 + p.gx * 0.4) * 0.08 * t
              : 0;
          const gz0 = p.baseZ * t + sway;
          const hCurr = p.height * t;
          const color = mixHex(p.qrColor, p.treeColor, 1);
          const halfW = p.role === "trunk" ? 0.55 : 0.72;
          const d = depthOf(p.gx, p.gy) + (gz0 + hCurr * 0.5) * 0.45;

          renderList.push({
            gx: p.gx,
            gy: p.gy,
            gz0,
            height: hCurr,
            halfW,
            color,
            alpha: p.role === "trunk" ? clamp01((t - 0.15) / 0.5) : puffAlpha * 0.94,
            sortKey: d,
          });
        }
      }

      renderList.sort((a, b) => a.sortKey - b.sortKey);

      for (const b of renderList) {
        drawVoxel(b.gx, b.gy, b.gz0, b.height, b.halfW, b.color, b.alpha);
      }

      // 3. Drifting falling petals/leaves when in 3D tree mode
      const petalAlpha = clamp01((t - 0.45) / 0.55);
      if (petalAlpha > 0.01) {
        const scaleFactor = size / 29;
        for (const pt of scene.petals) {
          if (!prefersReducedMotion) {
            pt.gx += pt.vx + Math.sin(now * 0.002 + pt.phase) * 0.025;
            pt.gy += pt.vy + Math.cos(now * 0.0016 + pt.phase) * 0.018;
            pt.gz += pt.vz;
            if (pt.gz <= 0.15) {
              pt.gz = (7.5 + hash2d(pt.colorIndex, Math.round(now), 5) * 4.5) * scaleFactor;
              pt.gx = (Math.random() - 0.5) * size * 0.55;
              pt.gy = (Math.random() - 0.5) * size * 0.55;
            }
          }
          const [px, py] = project(pt.gx, pt.gy, pt.gz * t);
          ctx.save();
          ctx.globalAlpha = petalAlpha * 0.9;
          ctx.translate(px, py);
          ctx.rotate(pt.phase + now * 0.0015);
          ctx.fillStyle = seasonObj.petalColors[pt.colorIndex % seasonObj.petalColors.length];
          const s = pt.size * cell * 0.72;
          ctx.fillRect(-s / 2, -s / 3, s, s * 0.65);
          ctx.restore();
        }
      }

      ctx.restore();
      animId = window.requestAnimationFrame(drawLoop);
    };

    animId = window.requestAnimationFrame(drawLoop);

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    dragStateRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startYaw: yawOffsetRef.current,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const drag = dragStateRef.current;
    if (!drag.active || modeRef.current !== "tree") return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) > 5) {
      drag.moved = true;
      const next = drag.startYaw + dx * 0.0045;
      yawOffsetRef.current = Math.max(-0.42, Math.min(0.42, next));
    }
  };

  const handlePointerUp = () => {
    const drag = dragStateRef.current;
    drag.active = false;
    if (!drag.moved) {
      onToggleMode();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      aria-label={
        mode === "tree"
          ? "Cây QR 3D hoạt ảnh — nhấn vào cây để biến hình thành mã QR quét được"
          : "Mã QR nghệ thuật — nhấn để biến hình lại thành cây 3D"
      }
      role="img"
      className="mx-auto block cursor-pointer touch-pan-y select-none rounded-2xl"
    />
  );
}
