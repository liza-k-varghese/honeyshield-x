import * as THREE from 'three';
import { CHRONOS_COLORS, ChronosMaterials } from './Materials';

export interface EpochItem {
  id: string;
  year: string;
  title: string;
  subtitle: string;
  description: string;
  accuracy: string;
  oscillator: string;
  architecturalForm: string;
  position: THREE.Vector3;
}

export const HOROLOGICAL_EPOCHS: EpochItem[] = [
  {
    id: 'epoch-ancient',
    year: '1500 BCE',
    title: 'Solar & Hydraulic Clepsydra',
    subtitle: 'Shadow Geometry & Gravitational Flow',
    description:
      'The earliest architectural temporal markers: Egyptian shadow obelisks and water clepsydra measuring time as continuous spatial fluid displacement.',
    accuracy: '±15 Minutes / Day',
    oscillator: 'Planetary Celestial Motion',
    architecturalForm: 'Gnomon & Terraced Basin',
    position: new THREE.Vector3(-4.5, -2.5, 3.0),
  },
  {
    id: 'epoch-verge',
    year: '1300 CE',
    title: 'Verge & Foliot Escapement',
    subtitle: 'Mechanical Discretization of Time',
    description:
      'The birth of the mechanical clock tower. Salisbury and Wells Cathedrals divide continuous duration into discrete, audible ticks using crown wheels and verge pallets.',
    accuracy: '±5 Minutes / Day',
    oscillator: 'Inertial Verge Foliot Bar',
    architecturalForm: 'Gothic Iron Cage Architecture',
    position: new THREE.Vector3(-2.2, -1.0, 1.5),
  },
  {
    id: 'epoch-marine',
    year: '1759 CE',
    title: 'Harrison H4 Marine Chronometer',
    subtitle: 'The Architecture of Global Navigation',
    description:
      'John Harrison solves the longitudinal crisis at sea. Temperature-compensated bimetallic balance wheels maintain astronomical accuracy across turbulent oceanic voyages.',
    accuracy: '±1 Second / Month',
    oscillator: 'Detached Spring Detent Escapement',
    architecturalForm: 'Gimballed Brass Navigational Bowl',
    position: new THREE.Vector3(0.0, 0.5, 0.0),
  },
  {
    id: 'epoch-quartz',
    year: '1969 CE',
    title: 'Piezoelectric Quartz Resonance',
    subtitle: 'Sub-Atomic Crystal Harmonics',
    description:
      'The democratization of high frequency. Synthetic quartz tuning forks vibrated at 32,768 Hz, miniaturizing laboratory standards onto the human wrist.',
    accuracy: '±15 Seconds / Month',
    oscillator: '32,768 Hz Quartz Crystal Tuning Fork',
    architecturalForm: 'Integrated Silicon Micro-Chassis',
    position: new THREE.Vector3(2.5, 1.8, -1.5),
  },
  {
    id: 'epoch-quantum',
    year: '2026+ CE',
    title: 'Optical Lattice Atomic Clocks',
    subtitle: 'Strontium Laser-Trapped Quantum Architecture',
    description:
      'The ultimate frontier of temporal metrology. Ultracold strontium atoms trapped in 1D/3D optical laser standing waves achieve fractional frequency uncertainties beyond 10⁻¹⁸.',
    accuracy: '1 Second Lost in 30 Billion Years',
    oscillator: '429 THz Strontium Optical Clock Transition',
    architecturalForm: 'Vacuum Ultra-High Finesse Cavity',
    position: new THREE.Vector3(4.8, 3.2, -3.0),
  },
];

export class TimelineSpirals {
  public group: THREE.Group;
  public nodeMeshes: { mesh: THREE.Mesh; epoch: EpochItem }[] = [];
  private particleSystem: THREE.Points;
  private helixLine: THREE.Line;

  constructor() {
    this.group = new THREE.Group();

    // 1. Build the Continuous 3D Spacetime Ribbon Helix
    const points: THREE.Vector3[] = [];
    const steps = 300;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * 4 * Math.PI - 2 * Math.PI;
      const x = t * 1.35;
      const y = Math.sin(t * 0.8) * 1.5 + (t * 0.4);
      const z = Math.cos(t * 0.8) * 1.5;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curveGeom = new THREE.BufferGeometry().setFromPoints(points);
    const curveMat = new THREE.LineBasicMaterial({
      color: CHRONOS_COLORS.accent,
      linewidth: 2,
      transparent: true,
      opacity: 0.75,
    });
    this.helixLine = new THREE.Line(curveGeom, curveMat);
    this.group.add(this.helixLine);

    // 2. Build 3D Epoch Markers along the helix
    HOROLOGICAL_EPOCHS.forEach((epoch) => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.copy(epoch.position);

      // Core Golden Sphere
      const sphereGeom = new THREE.SphereGeometry(0.28, 24, 24);
      const sphere = new THREE.Mesh(sphereGeom, ChronosMaterials.antiqueGold('polished'));
      nodeGroup.add(sphere);

      // Outer Rotating Halo Ring
      const haloGeom = new THREE.TorusGeometry(0.48, 0.03, 16, 32);
      const halo = new THREE.Mesh(haloGeom, ChronosMaterials.warmIvory(true));
      nodeGroup.add(halo);

      // Secondary Staggered Ring
      const halo2Geom = new THREE.TorusGeometry(0.68, 0.015, 8, 32);
      const halo2 = new THREE.Mesh(halo2Geom, ChronosMaterials.surfaceSlate(0.2));
      halo2.rotation.x = Math.PI / 3;
      nodeGroup.add(halo2);

      this.nodeMeshes.push({ mesh: sphere, epoch });
      this.group.add(nodeGroup);
    });

    // 3. Ambient Starlight Cosmic Particles
    const particleCount = 600;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let p = 0; p < particleCount * 3; p += 3) {
      particlePositions[p] = (Math.random() - 0.5) * 20;
      particlePositions[p + 1] = (Math.random() - 0.5) * 15;
      particlePositions[p + 2] = (Math.random() - 0.5) * 15;
    }

    const particleGeom = new THREE.BufferGeometry();
    particleGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: CHRONOS_COLORS.accent,
      size: 0.04,
      transparent: true,
      opacity: 0.65,
    });
    this.particleSystem = new THREE.Points(particleGeom, particleMat);
    this.group.add(this.particleSystem);
  }

  public update(delta: number): void {
    // Subtle organic drift
    this.particleSystem.rotation.y += delta * 0.02;
    this.group.children.forEach((child, index) => {
      if (child instanceof THREE.Group) {
        child.rotation.y += delta * (0.3 + (index % 3) * 0.1);
        child.rotation.x += delta * 0.15;
      }
    });
  }
}
