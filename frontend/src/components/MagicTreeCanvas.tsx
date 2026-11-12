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

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface BranchSegment {
  p0: Vec3;
  p1: Vec3;
  r0: number;
  r1: number;
  depthLevel: number;
}

interface BlossomParticle {
  /** QR cell coordinate if paired to a real QR dark module in the crown (-1 if accent-only blossom) */
  qrRow: number;
  qrCol: number;
  /** Target 3D position in organic tree canopy (module units, origin at canvas center) */
  treeX: number;
  treeY: number;
  treeZ: number;
  /** Light shade tier 0 (deep inner shadow) -> 3 (sunlit bright highlight) */
  tier: number;
  /** Sprite stamp variant index */
  variant: number;
  /** Relative size in canopy */
  size: number;
  rotation: number;
  phase: number;
  swayAmp: number;
  qrInkHex: string;
}

interface GrassTuft {
  gx: number;
  gy: number;
  qrRow: number;
  qrCol: number;
  seed: number;
  blades: Array<{
    angle: number;
    height: number;
    curve: number;
    thickness: number;
    toneIdx: number;
  }>;
  hasTinyBud: boolean;
  qrInkHex: string;
}

interface StoneTile {
  gx: number;
  gy: number;
  qrRow: number;
  qrCol: number;
  qrInkHex: string;
}

interface GroundPetal {
  gx: number;
  gy: number;
  rot: number;
  scale: number;
  color: string;
}

interface FallingPetal {
  baseX: number;
  baseY: number;
  startZ: number;
  speed: number;
  driftR: number;
  phase: number;
  rotSpeed: number;
  size: number;
  colorIdx: number;
}

interface SceneData {
  qr: QrMatrixData;
  branches: BranchSegment[];
  blossoms: BlossomParticle[];
  grassTufts: GrassTuft[];
  stoneTiles: StoneTile[];
  groundPetals: GroundPetal[];
  fallingPetals: FallingPetal[];
  trunkScanInk: string;
}

/** Deterministic PRNG */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function easeInOutCubic(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : clean;
  const num = Number.parseInt(full, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function mixHex(hexA: string, hexB: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  const c = Math.max(0, Math.min(1, t));
  const r = Math.round(r1 + (r2 - r1) * c);
  const g = Math.round(g1 + (g2 - g1) * c);
  const b = Math.round(b1 + (b2 - b1) * c);
  return `rgb(${r},${g},${b})`;
}

/**
 * Generates an organic multi-branched 3D skeleton + anchored botanical blossom clusters
 * without using any cubes or boxy primitives.
 */
function buildOrganicScene(
  url: string,
  seasonId: SeasonId,
  flowerId: FlowerColorId
): SceneData {
  const qr = buildQrMatrix(url);
  const season = getSeasonPreset(seasonId);
  const palette = getFlowerPalette(flowerId);
  const rng = mulberry32(
    url.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 1337)
  );

  const N = qr.size;
  const half = (N - 1) / 2;
  const crownRadius = N * 0.34;
  const trunkZoneR = Math.max(1.8, N * 0.085);

  const branches: BranchSegment[] = [];
  const tipAnchors: Array<{ pos: Vec3; spread: number; tierHint: number }> = [];

  // 1. Splayed root buttresses resting seamlessly on center courtyard tiles
  for (let i = 0; i < 4; i++) {
    const baseAngle = (i * Math.PI) / 2 + 0.38 + (rng() - 0.5) * 0.3;
    const len = 1.6 + rng() * 0.85;
    branches.push({
      p0: { x: Math.cos(baseAngle) * 0.35, y: Math.sin(baseAngle) * 0.35, z: 0.72 },
      p1: { x: Math.cos(baseAngle) * len, y: Math.sin(baseAngle) * len, z: 0.04 },
      r0: 0.42,
      r1: 0.1,
      depthLevel: 0,
    });
  }

  // 2. Curved organic main trunk (4 tapered segments for subtle natural S-bend)
  const trunkPts: Vec3[] = [
    { x: 0, y: 0, z: 0.02 },
    { x: (rng() - 0.5) * 0.45, y: (rng() - 0.5) * 0.35, z: 1.55 },
    { x: (rng() - 0.5) * 0.65, y: (rng() - 0.5) * 0.45, z: 3.15 },
    { x: (rng() - 0.5) * 0.5, y: (rng() - 0.5) * 0.4, z: 4.75 },
  ];
  const trunkRadii = [0.68, 0.54, 0.44, 0.33];
  for (let i = 0; i < trunkPts.length - 1; i++) {
    branches.push({
      p0: trunkPts[i],
      p1: trunkPts[i + 1],
      r0: trunkRadii[i],
      r1: trunkRadii[i + 1],
      depthLevel: 0,
    });
  }

  // 3. Recursive 3D limb & fine twig branching
  function growLimb(
    origin: Vec3,
    yaw: number,
    pitch: number,
    length: number,
    radius: number,
    level: number
  ) {
    const dx = Math.cos(pitch) * Math.cos(yaw) * length;
    const dy = Math.cos(pitch) * Math.sin(yaw) * length;
    const dz = Math.sin(pitch) * length;
    const end: Vec3 = {
      x: origin.x + dx,
      y: origin.y + dy,
      z: origin.z + dz,
    };
    const nextRadius = radius * 0.62;
    branches.push({
      p0: origin,
      p1: end,
      r0: radius,
      r1: nextRadius,
      depthLevel: level,
    });

    if (level >= 2) {
      // Branch tip foliage cloud anchor
      tipAnchors.push({
        pos: end,
        spread: level === 2 ? 2.1 : 1.55,
        tierHint: end.z > 8.5 ? 2 : 1,
      });
    }

    if (level >= 3) return;

    const childCount = level === 1 ? 3 : 2 + (rng() > 0.45 ? 1 : 0);
    for (let c = 0; c < childCount; c++) {
      const spreadYaw =
        yaw + ((c - (childCount - 1) / 2) * (level === 1 ? 1.05 : 0.85)) + (rng() - 0.5) * 0.45;
      const childPitch = Math.max(
        0.18,
        Math.min(1.18, pitch + (rng() - 0.35) * 0.42)
      );
      const childLen = length * (0.64 + rng() * 0.2);
      growLimb(end, spreadYaw, childPitch, childLen, nextRadius, level + 1);
    }
  }

  // Main upper crown boughs (5 primary spreading limbs + 2 lower side limbs)
  const trunkTop = trunkPts[trunkPts.length - 1];
  const trunkMid = trunkPts[trunkPts.length - 2];
  for (let b = 0; b < 5; b++) {
    const yaw = (b * Math.PI * 2) / 5 + (rng() - 0.5) * 0.35;
    const pitch = b === 0 ? 1.08 : 0.48 + rng() * 0.42;
    const len = N * (0.145 + rng() * 0.045);
    growLimb(trunkTop, yaw, pitch, len, 0.28, 1);
  }
  for (let lb = 0; lb < 2; lb++) {
    const yaw = lb * Math.PI + 0.7 + (rng() - 0.5) * 0.45;
    growLimb(trunkMid, yaw, 0.36 + rng() * 0.25, N * 0.125, 0.22, 1);
  }
  // Extra crown summit anchor
  tipAnchors.push({
    pos: { x: 0, y: 0, z: N * 0.42 },
    spread: 2.35,
    tierHint: 3,
  });

  // 4. Classify dark QR modules into Grass Rim, Crown QR Modules (paired with blossoms), and Courtyard Stone Tiles
  const crownModules: Array<{ r: number; c: number; gx: number; gy: number; dist: number }> = [];
  const grassTufts: GrassTuft[] = [];
  const stoneTiles: StoneTile[] = [];

  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (!qr.modules[r][c]) continue;
      const gx = c - half;
      const gy = r - half;
      const dist = Math.hypot(gx, gy);
      const edgeDist = Math.min(r, c, N - 1 - r, N - 1 - c);

      if (qr.isFinder[r][c] || edgeDist <= 2) {
        // Perimeter & Finder patterns: grass tufts morph smoothly into green QR pixels
        const numBlades = qr.isFinder[r][c] ? 4 : 5;
        const blades = Array.from({ length: numBlades }, () => ({
          angle: -Math.PI / 2 + (rng() - 0.5) * 0.75,
          height: 0.75 + rng() * 1.15,
          curve: (rng() - 0.5) * 0.9,
          thickness: 0.14 + rng() * 0.09,
          toneIdx: Math.floor(rng() * season.grassPalette.length),
        }));
        grassTufts.push({
          gx,
          gy,
          qrRow: r,
          qrCol: c,
          seed: rng(),
          blades,
          hasTinyBud: seasonId !== "autumn" && rng() > 0.78,
          qrInkHex: season.grassScanInk[Math.floor(rng() * season.grassScanInk.length)],
        });
      } else if (dist <= trunkZoneR) {
        stoneTiles.push({
          gx,
          gy,
          qrRow: r,
          qrCol: c,
          qrInkHex: season.trunkScanInk,
        });
      } else if (dist <= crownRadius) {
        crownModules.push({ r, c, gx, gy, dist });
      } else {
        // Mid courtyard modules: subtle pale flagstones in tree view, high-contrast grass/stone in QR view
        const isOuterBand = dist > N * 0.42;
        if (isOuterBand) {
          const blades = Array.from({ length: 4 }, () => ({
            angle: -Math.PI / 2 + (rng() - 0.5) * 0.7,
            height: 0.65 + rng() * 1.0,
            curve: (rng() - 0.5) * 0.75,
            thickness: 0.13 + rng() * 0.08,
            toneIdx: Math.floor(rng() * season.grassPalette.length),
          }));
          grassTufts.push({
            gx,
            gy,
            qrRow: r,
            qrCol: c,
            seed: rng(),
            blades,
            hasTinyBud: false,
            qrInkHex: season.grassScanInk[Math.floor(rng() * season.grassScanInk.length)],
          });
        } else {
          stoneTiles.push({
            gx,
            gy,
            qrRow: r,
            qrCol: c,
            qrInkHex: palette.qrScanShades[Math.floor(rng() * palette.qrScanShades.length)],
          });
        }
      }
    }
  }

  // 5. Generate organic botanical blossom clusters anchored around 3D branch tips
  const blossoms: BlossomParticle[] = [];
  const sampleAnchorPosition = (anchorIdx: number): { pos: Vec3; tier: number } => {
    const anchor = tipAnchors[anchorIdx % tipAnchors.length];
    // Spherical Gaussian-like offset around branch tip so crown reads as fluffy natural clouds
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    const rad = Math.pow(rng(), 0.55) * anchor.spread;
    const tx = anchor.pos.x + Math.sin(phi) * Math.cos(theta) * rad;
    const ty = anchor.pos.y + Math.sin(phi) * Math.sin(theta) * rad;
    const tz = Math.max(3.6, anchor.pos.z + Math.cos(phi) * rad * 0.68);
    // Light tier: higher Z and slightly south-west sunlit faces get brighter highlight tiers
    const sunScore = (tz - 4.0) / 8.5 + (-tx - ty) * 0.03 + rng() * 0.45;
    const tier = sunScore > 1.05 ? 3 : sunScore > 0.68 ? 2 : sunScore > 0.35 ? 1 : 0;
    return { pos: { x: tx, y: ty, z: tz }, tier };
  };

  // First pair every crown QR module to a real canopy blossom so it cleanly morphs down into its exact QR pixel!
  for (let i = 0; i < crownModules.length; i++) {
    const mod = crownModules[i];
    // Bias anchor selection smoothly by module azimuth so morph travel feels radial & natural
    const modAngle = Math.atan2(mod.gy, mod.gx);
    let bestAnchor = i % tipAnchors.length;
    let bestScore = Infinity;
    for (let a = 0; a < tipAnchors.length; a++) {
      const anc = tipAnchors[a];
      const angDiff = Math.abs(Math.atan2(anc.pos.y, anc.pos.x) - modAngle);
      const wrapDiff = Math.min(angDiff, Math.PI * 2 - angDiff) + rng() * 0.65;
      if (wrapDiff < bestScore) {
        bestScore = wrapDiff;
        bestAnchor = a;
      }
    }
    const { pos, tier } = sampleAnchorPosition(bestAnchor);
    blossoms.push({
      qrRow: mod.r,
      qrCol: mod.c,
      treeX: pos.x,
      treeY: pos.y,
      treeZ: pos.z,
      tier,
      variant: Math.floor(rng() * 4),
      size: 0.78 + rng() * 0.55,
      rotation: rng() * Math.PI * 2,
      phase: rng() * Math.PI * 2,
      swayAmp: 0.08 + rng() * 0.14,
      qrInkHex: palette.qrScanShades[(mod.r * 5 + mod.c * 3) % palette.qrScanShades.length],
    });
  }

  // Add rich secondary botanical flower/foliage clusters around branch tips (fade gently before flat QR mode)
  const targetTotalBlossoms = Math.max(780, crownModules.length + 520);
  for (let i = blossoms.length; i < targetTotalBlossoms; i++) {
    const anchorIdx = Math.floor(rng() * tipAnchors.length);
    const { pos, tier } = sampleAnchorPosition(anchorIdx);
    blossoms.push({
      qrRow: -1,
      qrCol: -1,
      treeX: pos.x,
      treeY: pos.y,
      treeZ: pos.z,
      tier,
      variant: Math.floor(rng() * 4),
      size: 0.65 + rng() * 0.62,
      rotation: rng() * Math.PI * 2,
      phase: rng() * Math.PI * 2,
      swayAmp: 0.1 + rng() * 0.16,
      qrInkHex: palette.qrScanShades[0],
    });
  }

  // 6. Scattered fallen petals around base on stone patio
  const groundPetals: GroundPetal[] = [];
  for (let i = 0; i < 42; i++) {
    const a = rng() * Math.PI * 2;
    const rDist = 1.1 + Math.pow(rng(), 0.7) * (crownRadius * 0.95);
    groundPetals.push({
      gx: Math.cos(a) * rDist,
      gy: Math.sin(a) * rDist,
      rot: rng() * Math.PI * 2,
      scale: 0.55 + rng() * 0.55,
      color: palette.treeShades[Math.floor(rng() * palette.treeShades.length)],
    });
  }

  // 7. Drifting breeze petals falling smoothly in 3D space
  const fallingPetals: FallingPetal[] = Array.from({ length: 22 }, () => {
    const a = rng() * Math.PI * 2;
    const rad = 1.5 + rng() * (crownRadius * 0.85);
    return {
      baseX: Math.cos(a) * rad,
      baseY: Math.sin(a) * rad,
      startZ: 4.5 + rng() * 8.0,
      speed: 0.6 + rng() * 0.7,
      driftR: 0.5 + rng() * 0.9,
      phase: rng() * Math.PI * 2,
      rotSpeed: (rng() - 0.5) * 3.0,
      size: 0.36 + rng() * 0.25,
      colorIdx: Math.floor(rng() * palette.treeShades.length),
    };
  });

  return {
    qr,
    branches,
    blossoms,
    grassTufts,
    stoneTiles,
    groundPetals,
    fallingPetals,
    trunkScanInk: season.trunkScanInk,
  };
}

/**
 * Pre-renders organic offscreen Canvas sprite stamps (ZERO cubes or plain flat dots).
 * Each [tier][variant] creates delicate botanical petals/foliage clusters matching the season.
 */
function buildBotanicalSpriteAtlas(
  seasonId: SeasonId,
  flowerId: FlowerColorId
): HTMLCanvasElement[][] {
  const palette = getFlowerPalette(flowerId);
  const season = getSeasonPreset(seasonId);
  // Ensure 4 clear tonal tiers: inner shadow -> lower mid -> sunlit mid -> bright blossom highlight
  const baseHex = palette.treeShades[2] ?? palette.swatchHex;
  const lightHex = palette.treeShades[0] ?? "#fce7f3";
  const midHex = palette.treeShades[1] ?? palette.swatchHex;
  const shadowHex = mixHex(baseHex, season.trunkScanInk, 0.28);
  const tierColors = [shadowHex, baseHex, midHex, lightHex];

  const stampSize = 56;
  const cx = stampSize / 2;
  const cy = stampSize / 2;

  return tierColors.map((mainColor, tierIdx) => {
    const highlightColor = tierIdx >= 2 ? "#ffffff" : lightHex;
    const coreColor = mixHex(palette.qrScanShades[0], season.trunkScanInk, 0.35);

    return [0, 1, 2, 3].map((variant) => {
      const off = document.createElement("canvas");
      off.width = stampSize;
      off.height = stampSize;
      const octx = off.getContext("2d");
      if (!octx) return off;

      octx.translate(cx, cy);
      octx.rotate(variant * 0.72);

      if (seasonId === "summer") {
        // Lush summer botanical leaf sprays + tiny seasonal floret accent
        const leafCount = 4 + (variant % 2);
        for (let l = 0; l < leafCount; l++) {
          octx.save();
          octx.rotate((l * Math.PI * 2) / leafCount + (variant * 0.3));
          octx.beginPath();
          octx.moveTo(0, 0);
          octx.bezierCurveTo(6, -10, 16, -9, 20, 0);
          octx.bezierCurveTo(16, 9, 6, 10, 0, 0);
          octx.fillStyle = l % 2 === 0 ? mainColor : mixHex(season.grassPalette[l % season.grassPalette.length], mainColor, 0.55);
          octx.globalAlpha = tierIdx === 0 ? 0.84 : 0.92;
          octx.fill();
          octx.restore();
        }
        if (variant === 0 || variant === 3) {
          // Small summer flower accent tucked in leaves
          octx.fillStyle = highlightColor;
          octx.globalAlpha = 0.85;
          octx.beginPath();
          octx.arc(4, -3, 3.8, 0, Math.PI * 2);
          octx.fill();
        }
      } else if (seasonId === "autumn") {
        // Jagged 5-lobed autumn maple / oak foliage cluster
        const lobes = 5;
        octx.beginPath();
        for (let i = 0; i < lobes * 2; i++) {
          const ang = (i * Math.PI) / lobes;
          const r = i % 2 === 0 ? 20 - (i % 4) * 1.5 : 8.5;
          const px = Math.cos(ang) * r;
          const py = Math.sin(ang) * r;
          if (i === 0) octx.moveTo(px, py);
          else octx.lineTo(px, py);
        }
        octx.closePath();
        octx.fillStyle = mainColor;
        octx.globalAlpha = tierIdx === 0 ? 0.86 : 0.93;
        octx.fill();

        // Warm leaf vein accent
        octx.strokeStyle = highlightColor;
        octx.globalAlpha = 0.42;
        octx.lineWidth = 1.2;
        octx.beginPath();
        octx.moveTo(0, 0);
        octx.lineTo(14, -4);
        octx.stroke();
      } else {
        // Spring Sakura / Tet Apricot 5-petal botanical blossom cluster
        if (variant < 2) {
          // Full 5-petal notched cherry/apricot flower
          const petals = 5;
          for (let p = 0; p < petals; p++) {
            octx.save();
            octx.rotate((p * Math.PI * 2) / petals);
            octx.beginPath();
            octx.moveTo(0, 0);
            octx.bezierCurveTo(-6, -9, -7, -18, -1.6, -19.5);
            // Tiny iconic cherry blossom notch at tip
            octx.lineTo(0, -16.8);
            octx.lineTo(1.6, -19.5);
            octx.bezierCurveTo(7, -18, 6, -9, 0, 0);
            octx.fillStyle = p % 2 === 0 ? mainColor : mixHex(mainColor, highlightColor, 0.25);
            octx.globalAlpha = tierIdx === 0 ? 0.82 : 0.94;
            octx.fill();
            octx.restore();
          }
          // Soft dark-rose stamen pistil center
          octx.fillStyle = coreColor;
          octx.globalAlpha = 0.55;
          octx.beginPath();
          octx.arc(0, 0, 2.3, 0, Math.PI * 2);
          octx.fill();
        } else {
          // Layered 3-petal / fluffy spray cluster for organic overlapping texture
          const sprayAngles = [-0.8, 0.2, 1.35];
          for (let s = 0; s < sprayAngles.length; s++) {
            octx.save();
            octx.translate(Math.cos(sprayAngles[s]) * 5, Math.sin(sprayAngles[s]) * 5);
            octx.rotate(sprayAngles[s] + 0.5);
            octx.beginPath();
            octx.moveTo(0, 0);
            octx.bezierCurveTo(-5, -8, -5, -15, 0, -16);
            octx.bezierCurveTo(5, -15, 5, -8, 0, 0);
            octx.fillStyle = s === 2 ? mixHex(mainColor, highlightColor, 0.35) : mainColor;
            octx.globalAlpha = 0.86;
            octx.fill();
            octx.restore();
          }
        }
      }

      return off;
    });
  });
}

export function MagicTreeCanvas({
  url,
  season,
  flowerColor,
  mode,
  onToggleMode,
  ref,
}: MagicTreeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sceneRef = useRef<SceneData | null>(null);
  const atlasRef = useRef<HTMLCanvasElement[][] | null>(null);

  // Morph state: 1 = Tree 3D, 0 = Flat Scannable QR
  const morphRef = useRef<{ value: number; target: number }>({
    value: mode === "tree" ? 1 : 0,
    target: mode === "tree" ? 1 : 0,
  });

  // Interactive pointer drag yaw rotation
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startYaw: number;
    yaw: number;
    targetYaw: number;
    moved: boolean;
  }>({
    active: false,
    startX: 0,
    startYaw: 0,
    yaw: 0.32,
    targetYaw: 0.32,
    moved: false,
  });

  // Expose PNG snapshot downloader
  useImperativeHandle(
    ref,
    () => ({
      exportCurrentPng: (filename = "vidqr-magic-tree.png") => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement("a");
        link.download = filename;
        link.href = canvas.toDataURL("image/png");
        link.click();
      },
    }),
    []
  );

  // Rebuild organic botanical scene & pre-rendered petal/leaf stamps when url, season, or flowerColor changes
  useEffect(() => {
    sceneRef.current = buildOrganicScene(url, season, flowerColor);
    atlasRef.current = buildBotanicalSpriteAtlas(season, flowerColor);
  }, [url, season, flowerColor]);

  // Sync morph target on mode prop change
  useEffect(() => {
    morphRef.current.target = mode === "tree" ? 1 : 0;
  }, [mode]);

  // Render & animate loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      if (!prefersReducedMotion) {
        elapsed += dt;
      }

      const scene = sceneRef.current;
      const atlas = atlasRef.current;
      if (!scene || !atlas) {
        rafId = requestAnimationFrame(renderFrame);
        return;
      }

      // Smoothly ease morph & yaw
      const m = morphRef.current;
      if (prefersReducedMotion) {
        m.value = m.target;
      } else {
        const diff = m.target - m.value;
        if (Math.abs(diff) > 0.0005) {
          m.value += diff * Math.min(1, dt * 5.2);
        } else {
          m.value = m.target;
        }
      }
      const t = easeInOutCubic(m.value);

      const d = dragRef.current;
      const desiredYaw = d.active ? d.targetYaw : t > 0.08 ? d.targetYaw : 0;
      d.yaw += (desiredYaw - d.yaw) * Math.min(1, dt * 8.5);
      // In flat QR mode, force rotation cleanly back to 0° straight-on
      const activeYaw = d.yaw * Math.pow(t, 0.8);

      // HiDPI sizing
      const rect = canvas.getBoundingClientRect();
      const cssW = Math.max(300, rect.width || 560);
      const cssH = Math.max(300, rect.height || 520);
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Stage background
      const seasonPreset = getSeasonPreset(season);
      const flowerPalette = getFlowerPalette(flowerColor);
      const isDark =
        document.documentElement.getAttribute("data-theme") === "dark" ||
        (!document.documentElement.getAttribute("data-theme") &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);

      const bgColor =
        t < 0.25
          ? "#fcfaf5"
          : mixHex("#fcfaf5", isDark ? seasonPreset.stageDarkBg : seasonPreset.stageLightBg, t);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, cssW, cssH);

      // Compute scale & camera geometry so tall tree fits gracefully with zero clipping
      const N = scene.qr.size;
      const maxSpan = N + 4;
      const flatCell = Math.min(cssW * 0.8, cssH * 0.82) / maxSpan;
      const treeCell = Math.min(cssW * 0.72, cssH * 0.68) / maxSpan;
      const cell = lerp(flatCell, treeCell, t);

      const cx = cssW / 2;
      const cy = lerp(cssH / 2, cssH * 0.69, t);
      const tiltPitch = lerp(1.0, 0.54, t); // 1.0 = flat top-down; 0.54 = lush isometric terrace tilt
      const liftZ = lerp(0, cell * 1.18, t);

      const cosY = Math.cos(activeYaw);
      const sinY = Math.sin(activeYaw);

      const project = (gx: number, gy: number, gz: number) => {
        const rx = gx * cosY - gy * sinY;
        const ry = gx * sinY + gy * cosY;
        return {
          px: cx + rx * cell,
          py: cy + ry * cell * tiltPitch - gz * liftZ,
          depth: ry * tiltPitch + gz * 0.18,
        };
      };

      // 1. Soft courtyard drop shadow & stone terrace plate
      const slabHalf = (N + 1.35) / 2;
      const cTL = project(-slabHalf, -slabHalf, 0);
      const cTR = project(slabHalf, -slabHalf, 0);
      const cBR = project(slabHalf, slabHalf, 0);
      const cBL = project(-slabHalf, slabHalf, 0);

      if (t > 0.04) {
        // Soft diffused ground drop shadow
        ctx.save();
        ctx.fillStyle = `rgba(15, 23, 42, ${0.14 * t})`;
        ctx.filter = "blur(8px)";
        ctx.beginPath();
        ctx.moveTo(cTL.px, cTL.py + 12 * t);
        ctx.lineTo(cTR.px, cTR.py + 12 * t);
        ctx.lineTo(cBR.px, cBR.py + 14 * t);
        ctx.lineTo(cBL.px, cBL.py + 14 * t);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // Crisp cream-limestone square QR / Courtyard surface
      ctx.save();
      ctx.fillStyle = "#fcfaf5";
      ctx.beginPath();
      ctx.moveTo(cTL.px, cTL.py);
      ctx.lineTo(cTR.px, cTR.py);
      ctx.lineTo(cBR.px, cBR.py);
      ctx.lineTo(cBL.px, cBL.py);
      ctx.closePath();
      ctx.fill();

      // Subtle 3D slab bevel edge only visible in 3D view
      if (t > 0.05) {
        const rimDrop = cell * 0.58 * t;
        // Front-left bevel
        ctx.fillStyle = "#ded8ca";
        ctx.beginPath();
        ctx.moveTo(cBL.px, cBL.py);
        ctx.lineTo(cBR.px, cBR.py);
        ctx.lineTo(cBR.px, cBR.py + rimDrop);
        ctx.lineTo(cBL.px, cBL.py + rimDrop);
        ctx.closePath();
        ctx.fill();

        // Determine whichever side edge faces viewer based on yaw
        const rightEdge = activeYaw >= 0 ? [cTR, cBR] : [cTL, cBL];
        ctx.fillStyle = "#cbc3b2";
        ctx.beginPath();
        ctx.moveTo(rightEdge[0].px, rightEdge[0].py);
        ctx.lineTo(rightEdge[1].px, rightEdge[1].py);
        ctx.lineTo(rightEdge[1].px, rightEdge[1].py + rimDrop);
        ctx.lineTo(rightEdge[0].px, rightEdge[0].py + rimDrop);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 2. Render Stone Mosaic Tiles & Flat QR Ground Modules
      const drawGroundCell = (gx: number, gy: number, fillStyle: string, shrink = 0.03) => {
        const s = 0.5 - shrink;
        const p1 = project(gx - s, gy - s, 0.005);
        const p2 = project(gx + s, gy - s, 0.005);
        const p3 = project(gx + s, gy + s, 0.005);
        const p4 = project(gx - s, gy + s, 0.005);
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.lineTo(p3.px, p3.py);
        ctx.lineTo(p4.px, p4.py);
        ctx.closePath();
        ctx.fill();
      };

      // Subtle courtyard flagstone pattern in Tree mode -> high contrast ink in Flat QR mode
      for (const tile of scene.stoneTiles) {
        const tileColor = t < 0.15 ? tile.qrInkHex : mixHex(tile.qrInkHex, "#dcd6c8", Math.min(0.88, t * 0.92));
        drawGroundCell(tile.gx, tile.gy, tileColor, t > 0.3 ? 0.06 : 0.015);
      }

      // Grass-rim modules: solid green/season ink at t -> 0 so scanner locks finder squares 100%
      const flatOpacity = Math.max(0, 1 - t * 1.15);
      if (flatOpacity > 0.01) {
        for (const tuft of scene.grassTufts) {
          ctx.save();
          ctx.globalAlpha = Math.max(0.35, flatOpacity);
          drawGroundCell(tuft.gx, tuft.gy, tuft.qrInkHex, 0.015);
          ctx.restore();
        }
      } else {
        // Light mossy shadow base under grass tufts in tree mode
        for (const tuft of scene.grassTufts) {
          drawGroundCell(tuft.gx, tuft.gy, "#d9dfca", 0.06);
        }
      }

      // Paired crown QR modules smoothly fade onto the flat ground grid when morphing toward QR (t < 0.45)
      if (t < 0.45) {
        const qrReveal = 1 - t / 0.45;
        ctx.save();
        ctx.globalAlpha = qrReveal;
        for (const bl of scene.blossoms) {
          if (bl.qrRow < 0) continue;
          const gx = bl.qrCol - (N - 1) / 2;
          const gy = bl.qrRow - (N - 1) / 2;
          drawGroundCell(gx, gy, bl.qrInkHex, 0.015);
        }
        ctx.restore();
      }

      // 3. Fallen petals on stone courtyard (Tree mode)
      if (t > 0.3) {
        ctx.save();
        ctx.globalAlpha = (t - 0.3) / 0.7;
        for (const gp of scene.groundPetals) {
          const p = project(gp.gx, gp.gy, 0.02);
          ctx.save();
          ctx.translate(p.px, p.py);
          ctx.rotate(gp.rot);
          ctx.fillStyle = gp.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, cell * 0.24 * gp.scale, cell * 0.13 * gp.scale, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }

      // 4. Collect depth-sorted drawables (Grass Tufts, Bark Branches, Canopy Blossoms, Falling Petals)
      type DrawItem = { depth: number; draw: () => void };
      const drawList: DrawItem[] = [];

      // 4a. Organic Grass Blades (curved tapered Bezier tufts — ZERO cubes)
      if (t > 0.14) {
        const grassScale = easeInOutCubic((t - 0.14) / 0.86);
        for (const tuft of scene.grassTufts) {
          const base = project(tuft.gx, tuft.gy, 0.02);
          drawList.push({
            depth: base.depth - 0.15,
            draw: () => {
              const sway = Math.sin(elapsed * 2.1 + tuft.gx * 0.4 + tuft.seed * 6) * cell * 0.16 * grassScale;
              for (let i = 0; i < tuft.blades.length; i++) {
                const b = tuft.blades[i];
                const bx = base.px + (i - (tuft.blades.length - 1) / 2) * cell * 0.18;
                const by = base.py;
                const h = b.height * cell * 0.92 * grassScale;
                const tipX = bx + Math.cos(b.angle) * h * 0.65 + b.curve * cell * 0.3 + sway;
                const tipY = by + Math.sin(b.angle) * h;
                const halfBase = b.thickness * cell * 0.5;

                ctx.fillStyle = seasonPreset.grassPalette[b.toneIdx];
                ctx.beginPath();
                ctx.moveTo(bx - halfBase, by);
                ctx.quadraticCurveTo(bx + b.curve * cell * 0.15, by - h * 0.5, tipX, tipY);
                ctx.quadraticCurveTo(bx + halfBase + b.curve * cell * 0.15, by - h * 0.45, bx + halfBase, by);
                ctx.closePath();
                ctx.fill();
              }
              if (tuft.hasTinyBud && grassScale > 0.7) {
                ctx.fillStyle = flowerPalette.treeShades[1];
                ctx.beginPath();
                ctx.arc(base.px + sway * 0.8, base.py - cell * 0.62 * grassScale, cell * 0.14, 0, Math.PI * 2);
                ctx.fill();
              }
            },
          });
        }
      }

      // 4b. Gnarled Organic Trunk, Root Flares & Branching Limbs (tapered Bark Splines)
      if (t > 0.16) {
        const trunkGrowth = easeInOutCubic((t - 0.16) / 0.84);
        for (const seg of scene.branches) {
          const p0 = project(seg.p0.x, seg.p0.y, seg.p0.z * trunkGrowth);
          const p1 = project(seg.p1.x, seg.p1.y, seg.p1.z * trunkGrowth);
          const avgDepth = (p0.depth + p1.depth) * 0.5;

          drawList.push({
            depth: avgDepth,
            draw: () => {
              const w0 = Math.max(1.2, seg.r0 * cell * 1.15 * trunkGrowth);
              const w1 = Math.max(0.8, seg.r1 * cell * 1.15 * trunkGrowth);
              const dx = p1.px - p0.px;
              const dy = p1.py - p0.py;
              const len = Math.hypot(dx, dy) || 1;
              const nx = -dy / len;
              const ny = dx / len;

              // Tapered wooden polygon body (smoothly rounded caps via lineJoin/fill)
              ctx.fillStyle =
                seg.depthLevel === 0
                  ? seasonPreset.trunkPalette[0]
                  : seg.depthLevel === 1
                    ? seasonPreset.trunkPalette[1]
                    : seasonPreset.trunkPalette[2];
              ctx.beginPath();
              ctx.moveTo(p0.px - nx * w0, p0.py - ny * w0);
              ctx.lineTo(p1.px - nx * w1, p1.py - ny * w1);
              ctx.lineTo(p1.px + nx * w1, p1.py + ny * w1);
              ctx.lineTo(p0.px + nx * w0, p0.py + ny * w0);
              ctx.closePath();
              ctx.fill();

              // Sunlit highlight bark rim on one side + textured crevice on main trunk
              if (seg.depthLevel <= 1) {
                ctx.strokeStyle = mixHex(seasonPreset.trunkPalette[2], "#ffffff", 0.2);
                ctx.lineWidth = Math.max(1, w0 * 0.25);
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(p0.px - nx * w0 * 0.55, p0.py - ny * w0 * 0.55);
                ctx.lineTo(p1.px - nx * w1 * 0.55, p1.py - ny * w1 * 0.55);
                ctx.stroke();

                ctx.strokeStyle = seasonPreset.trunkScanInk;
                ctx.lineWidth = Math.max(0.9, w0 * 0.18);
                ctx.beginPath();
                ctx.moveTo(p0.px + nx * w0 * 0.58, p0.py + ny * w0 * 0.58);
                ctx.lineTo(p1.px + nx * w1 * 0.58, p1.py + ny * w1 * 0.58);
                ctx.stroke();
              }
            },
          });
        }
      }

      // 4c. Airy Multi-Layered Botanical Blossom Canopy (Sprite Stamps Morphing from QR Modules)
      if (t > 0.06) {
        for (const bl of scene.blossoms) {
          // Accent-only blossoms gracefully scale out cleanly before flat QR mode
          if (bl.qrRow < 0 && t < 0.25) continue;

          const startX = bl.qrRow >= 0 ? bl.qrCol - (N - 1) / 2 : bl.treeX * 0.35;
          const startY = bl.qrRow >= 0 ? bl.qrRow - (N - 1) / 2 : bl.treeY * 0.35;
          const breeze =
            t > 0.45 && !prefersReducedMotion
              ? Math.sin(elapsed * 1.9 + bl.phase + bl.treeX * 0.25) * bl.swayAmp * t
              : 0;

          // Graceful parabolic spiral lift from flat QR square into tree canopy
          const arcLift = Math.sin(t * Math.PI) * 1.1;
          const curX = lerp(startX, bl.treeX + breeze, t);
          const curY = lerp(startY, bl.treeY + breeze * 0.45, t);
          const curZ = lerp(0.05, bl.treeZ, t) + arcLift;

          const proj = project(curX, curY, curZ);
          const stamp = atlas[bl.tier][bl.variant];
          const alpha =
            bl.qrRow < 0
              ? Math.min(1, Math.max(0, (t - 0.25) / 0.45))
              : Math.min(1, Math.max(0, (t - 0.06) / 0.28));
          const spriteSize = cell * 1.72 * bl.size * (0.45 + 0.55 * t);

          drawList.push({
            depth: proj.depth,
            draw: () => {
              ctx.save();
              ctx.globalAlpha = alpha;
              ctx.translate(proj.px, proj.py);
              ctx.rotate(bl.rotation + breeze * 0.9);
              ctx.drawImage(stamp, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
              ctx.restore();
            },
          });
        }
      }

      // 4d. Falling Breeze Petals (Tree mode)
      if (t > 0.45 && !prefersReducedMotion) {
        const petalAlpha = (t - 0.45) / 0.55;
        for (const fp of scene.fallingPetals) {
          const cycleSpan = fp.startZ;
          const curZ = fp.startZ - ((elapsed * fp.speed + fp.phase * 2) % cycleSpan);
          const curX = fp.baseX + Math.sin(elapsed * 1.6 + fp.phase) * fp.driftR;
          const curY = fp.baseY + Math.cos(elapsed * 1.3 + fp.phase) * fp.driftR * 0.65;
          const p = project(curX, curY, curZ);
          const fadeNearGround = Math.min(1, curZ / 1.4);

          drawList.push({
            depth: p.depth + 0.4,
            draw: () => {
              ctx.save();
              ctx.globalAlpha = petalAlpha * fadeNearGround * 0.92;
              ctx.translate(p.px, p.py);
              ctx.rotate(elapsed * fp.rotSpeed + fp.phase);
              ctx.fillStyle = flowerPalette.treeShades[fp.colorIdx];
              ctx.beginPath();
              ctx.ellipse(0, 0, cell * fp.size * 0.68, cell * fp.size * 0.36, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            },
          });
        }
      }

      // Paint depth-sorted scene back-to-front
      drawList.sort((a, b) => a.depth - b.depth);
      for (const item of drawList) {
        item.draw();
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [season, flowerColor]);

  // Pointer drag rotation (in Tree mode) + single tap toggle
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current.active = true;
    dragRef.current.startX = e.clientX;
    dragRef.current.startYaw = dragRef.current.targetYaw;
    dragRef.current.moved = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 5) {
      dragRef.current.moved = true;
    }
    const maxYaw = 0.44; // ~25 degrees left/right
    const nextYaw = dragRef.current.startYaw + dx * 0.0048;
    dragRef.current.targetYaw = Math.max(-maxYaw, Math.min(maxYaw, nextYaw));
  };

  const handlePointerUp = () => {
    const wasClick = dragRef.current.active && !dragRef.current.moved;
    dragRef.current.active = false;
    if (wasClick) {
      onToggleMode();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={
        mode === "tree"
          ? "Cây hoa 3D hoạt ảnh tương tác chứa mã QR — kéo để xoay, chạm để xem mã QR"
          : "Mã QR phẳng tương phản cao — chạm để biến lại thành cây hoa 3D"
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        dragRef.current.active = false;
      }}
      className="mx-auto block w-full max-w-[520px] h-[270px] sm:h-[340px] lg:h-[395px] rounded-2xl touch-none select-none cursor-grab active:cursor-grabbing"
    />
  );
}
