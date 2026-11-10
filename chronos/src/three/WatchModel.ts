import * as THREE from 'three';
import { ChronosMaterials, CHRONOS_COLORS } from './Materials';

export interface WatchConfig {
  caseFinish: 'gold' | 'obsidian' | 'titanium';
  dialStyle: 'skeleton' | 'sunburst_black' | 'warm_ivory';
  strapStyle: 'alligator' | 'gold_mesh' | 'slate_leather';
  tourbillonSpeed: number; // multiplier
  explodedRatio: number; // 0 (assembled) to 1 (fully exploded)
  isTicking: boolean;
}

export class WatchModel {
  public group: THREE.Group;

  // Exploded layer groups for smooth separation
  private layerBezel: THREE.Group;
  private layerGlass: THREE.Group;
  private layerHands: THREE.Group;
  private layerDial: THREE.Group;
  private layerBridges: THREE.Group;
  private layerGears: THREE.Group;
  private layerTourbillon: THREE.Group;
  private layerCase: THREE.Group;
  private layerCaseback: THREE.Group;

  // Animated mechanical components
  private secondHand: THREE.Group;
  private minuteHand: THREE.Group;
  private hourHand: THREE.Group;
  private tourbillonCage: THREE.Group;
  private balanceWheel: THREE.Group;
  private escapementWheel: THREE.Mesh;
  private gearCenter: THREE.Mesh;
  private gearThird: THREE.Mesh;
  private gearFourth: THREE.Mesh;
  private windingRotor: THREE.Group;

  // Customizable meshes for atelier configurator
  private caseMeshes: THREE.Mesh[] = [];
  private dialMesh: THREE.Mesh | null = null;
  private strapMeshes: THREE.Mesh[] = [];

  // Internal physics/movement clock
  private balancePhase = 0;
  private secondsAngle = 0;
  private currentExplodedRatio = 0;
  private targetExplodedRatio = 0;

  constructor() {
    this.group = new THREE.Group();

    this.layerBezel = new THREE.Group();
    this.layerGlass = new THREE.Group();
    this.layerHands = new THREE.Group();
    this.layerDial = new THREE.Group();
    this.layerBridges = new THREE.Group();
    this.layerGears = new THREE.Group();
    this.layerTourbillon = new THREE.Group();
    this.layerCase = new THREE.Group();
    this.layerCaseback = new THREE.Group();

    this.group.add(this.layerCaseback);
    this.group.add(this.layerCase);
    this.group.add(this.layerGears);
    this.group.add(this.layerTourbillon);
    this.group.add(this.layerBridges);
    this.group.add(this.layerDial);
    this.group.add(this.layerHands);
    this.group.add(this.layerGlass);
    this.group.add(this.layerBezel);

    // Initial dummy assignments
    this.secondHand = new THREE.Group();
    this.minuteHand = new THREE.Group();
    this.hourHand = new THREE.Group();
    this.tourbillonCage = new THREE.Group();
    this.balanceWheel = new THREE.Group();
    this.escapementWheel = new THREE.Mesh();
    this.gearCenter = new THREE.Mesh();
    this.gearThird = new THREE.Mesh();
    this.gearFourth = new THREE.Mesh();
    this.windingRotor = new THREE.Group();

    this.buildWatch();
  }

  private buildWatch(): void {
    this.buildCaseAndLugs();
    this.buildCasebackAndRotor();
    this.buildGearTrain();
    this.buildTourbillon();
    this.buildBridgesAndJewels();
    this.buildDial();
    this.buildHands();
    this.buildBezelAndGlass();
    this.buildStraps();
  }

  // --- 1. Case, Lugs, and Crown ---
  private buildCaseAndLugs(): void {
    const caseRadius = 2.4;
    const caseHeight = 0.85;

    // Main central chassis ring (Obsidian PVD / Titanium)
    const caseGeom = new THREE.CylinderGeometry(caseRadius, caseRadius, caseHeight, 64, 1, true);
    const caseMat = ChronosMaterials.surfaceSlate(0.35);
    const caseMesh = new THREE.Mesh(caseGeom, caseMat);
    caseMesh.rotation.x = Math.PI / 2;
    this.layerCase.add(caseMesh);
    this.caseMeshes.push(caseMesh);

    // Inner stepped ring
    const innerRingGeom = new THREE.TorusGeometry(caseRadius - 0.05, 0.08, 16, 64);
    const innerRingMesh = new THREE.Mesh(innerRingGeom, ChronosMaterials.antiqueGold('polished'));
    this.layerCase.add(innerRingMesh);

    // Winding Crown at 3 o'clock (x = caseRadius, y = 0)
    const crownGroup = new THREE.Group();
    crownGroup.position.set(caseRadius + 0.22, 0, 0);

    const crownStemGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 16);
    const crownStem = new THREE.Mesh(crownStemGeom, ChronosMaterials.steelSlate());
    crownStem.rotation.z = Math.PI / 2;
    crownGroup.add(crownStem);

    const crownCapGeom = new THREE.CylinderGeometry(0.32, 0.35, 0.25, 32);
    const crownCap = new THREE.Mesh(crownCapGeom, ChronosMaterials.antiqueGold('brushed'));
    crownCap.rotation.z = Math.PI / 2;
    crownCap.position.x = 0.12;
    crownGroup.add(crownCap);

    // Fluted ridges on crown
    for (let i = 0; i < 16; i++) {
      const ridgeGeom = new THREE.BoxGeometry(0.04, 0.26, 0.04);
      const ridge = new THREE.Mesh(ridgeGeom, ChronosMaterials.antiqueGold('polished'));
      const angle = (i / 16) * Math.PI * 2;
      ridge.position.set(0.12, Math.cos(angle) * 0.33, Math.sin(angle) * 0.33);
      crownGroup.add(ridge);
    }
    this.layerCase.add(crownGroup);

    // Chrono Pushers at 2 and 4 o'clock
    const pusherAngles = [Math.PI / 6, -Math.PI / 6];
    pusherAngles.forEach((ang) => {
      const pusherGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.22, 16);
      const pusher = new THREE.Mesh(pusherGeom, ChronosMaterials.antiqueGold('polished'));
      pusher.position.set(Math.cos(ang) * (caseRadius + 0.12), Math.sin(ang) * (caseRadius + 0.12), 0);
      pusher.rotation.z = ang - Math.PI / 2;
      this.layerCase.add(pusher);
    });

    // 4 Faceted Curved Lugs (Top-Left, Top-Right, Bottom-Left, Bottom-Right)
    const lugPositions = [
      { x: -1.4, y: 2.3, rotZ: 0.15 },
      { x: 1.4, y: 2.3, rotZ: -0.15 },
      { x: -1.4, y: -2.3, rotZ: -0.15 },
      { x: 1.4, y: -2.3, rotZ: 0.15 },
    ];

    lugPositions.forEach((pos) => {
      const lugGeom = new THREE.BoxGeometry(0.32, 0.9, 0.65);
      const lug = new THREE.Mesh(lugGeom, ChronosMaterials.surfaceSlate(0.2));
      lug.position.set(pos.x, pos.y, 0);
      lug.rotation.z = pos.rotZ;
      this.layerCase.add(lug);
      this.caseMeshes.push(lug);
    });
  }

  // --- 2. Exhibition Caseback & Skeleton Rotor ---
  private buildCasebackAndRotor(): void {
    const casebackRimGeom = new THREE.TorusGeometry(2.35, 0.12, 16, 64);
    const casebackRim = new THREE.Mesh(casebackRimGeom, ChronosMaterials.antiqueGold('brushed'));
    casebackRim.position.z = -0.45;
    this.layerCaseback.add(casebackRim);

    // Exhibition Sapphire Crystal on Back
    const backGlassGeom = new THREE.CircleGeometry(2.1, 48);
    const backGlass = new THREE.Mesh(backGlassGeom, ChronosMaterials.sapphireGlass());
    backGlass.position.z = -0.44;
    this.layerCaseback.add(backGlass);

    // Semicircular Oscillating Winding Rotor in Antique Gold with Cutouts
    this.windingRotor = new THREE.Group();
    this.windingRotor.position.z = -0.38;

    const rotorArcGeom = new THREE.RingGeometry(0.6, 2.05, 32, 1, 0, Math.PI);
    const rotorMesh = new THREE.Mesh(rotorArcGeom, ChronosMaterials.antiqueGold('polished'));
    this.windingRotor.add(rotorMesh);

    // Central Rotor Pivot
    const rotorPivotGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 32);
    const rotorPivot = new THREE.Mesh(rotorPivotGeom, ChronosMaterials.steelSlate());
    rotorPivot.rotation.x = Math.PI / 2;
    this.windingRotor.add(rotorPivot);

    // Golden CHRONOS Engraved Inscription on Rotor
    const inscriptionBarGeom = new THREE.BoxGeometry(1.2, 0.15, 0.05);
    const inscriptionBar = new THREE.Mesh(inscriptionBarGeom, ChronosMaterials.warmIvory(true));
    inscriptionBar.position.set(0, 1.2, 0.02);
    this.windingRotor.add(inscriptionBar);

    this.layerCaseback.add(this.windingRotor);
  }

  // --- 3. Gear Train & Pinions ---
  private buildGearTrain(): void {
    // Calibre Baseplate (Dark Metallic Surface)
    const baseplateGeom = new THREE.CylinderGeometry(2.2, 2.2, 0.1, 48);
    const baseplate = new THREE.Mesh(baseplateGeom, ChronosMaterials.surfaceSlate(0.4));
    baseplate.rotation.x = Math.PI / 2;
    baseplate.position.z = -0.25;
    this.layerGears.add(baseplate);

    // Center Gear Wheel (Driving hour/minute)
    this.gearCenter = this.createSpokedGear(0.85, 24, 0.05, ChronosMaterials.antiqueGold('polished'));
    this.gearCenter.position.set(0, 0, -0.15);
    this.layerGears.add(this.gearCenter);

    // Third Wheel
    this.gearThird = this.createSpokedGear(0.65, 18, 0.05, ChronosMaterials.antiqueGold('polished'));
    this.gearThird.position.set(0.65, 0.45, -0.12);
    this.layerGears.add(this.gearThird);

    // Fourth Wheel (Drives seconds)
    this.gearFourth = this.createSpokedGear(0.55, 16, 0.05, ChronosMaterials.antiqueGold('polished'));
    this.gearFourth.position.set(0.2, 0.85, -0.1);
    this.layerGears.add(this.gearFourth);

    // Escapement Wheel with Angled Teeth
    this.escapementWheel = this.createSpokedGear(0.42, 15, 0.04, ChronosMaterials.antiqueGold('polished'), true);
    this.escapementWheel.position.set(-0.55, 0.65, -0.1);
    this.layerGears.add(this.escapementWheel);

    // Mainspring Barrel at 10 o'clock
    const barrelGeom = new THREE.CylinderGeometry(0.7, 0.7, 0.18, 32);
    const barrel = new THREE.Mesh(barrelGeom, ChronosMaterials.obsidianBlack('satin'));
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(-0.85, -0.55, -0.18);
    this.layerGears.add(barrel);

    const barrelTeeth = this.createSpokedGear(0.75, 36, 0.04, ChronosMaterials.antiqueGold('brushed'));
    barrelTeeth.position.set(-0.85, -0.55, -0.12);
    this.layerGears.add(barrelTeeth);
  }

  // --- 4. Tourbillon & Balance Wheel Assembly (at 6 o'clock) ---
  private buildTourbillon(): void {
    const tourbPos = new THREE.Vector3(0, -1.05, 0.02);

    // Aperture Ring around Tourbillon
    const tourbRingGeom = new THREE.TorusGeometry(0.82, 0.04, 16, 48);
    const tourbRing = new THREE.Mesh(tourbRingGeom, ChronosMaterials.antiqueGold('polished'));
    tourbRing.position.copy(tourbPos);
    this.layerTourbillon.add(tourbRing);

    // Tourbillon Rotating Cage Group
    this.tourbillonCage = new THREE.Group();
    this.tourbillonCage.position.copy(tourbPos);

    // Tri-Spoke Golden Bridge
    for (let i = 0; i < 3; i++) {
      const armGeom = new THREE.BoxGeometry(0.08, 0.75, 0.03);
      const arm = new THREE.Mesh(armGeom, ChronosMaterials.antiqueGold('polished'));
      arm.rotation.z = (i * Math.PI * 2) / 3;
      this.tourbillonCage.add(arm);
    }

    // Outer Cage Ring
    const cageRimGeom = new THREE.TorusGeometry(0.72, 0.025, 16, 48);
    const cageRim = new THREE.Mesh(cageRimGeom, ChronosMaterials.antiqueGold('polished'));
    this.tourbillonCage.add(cageRim);

    // Balance Wheel Group (Harmonically oscillates inside cage)
    this.balanceWheel = new THREE.Group();

    const balanceRimGeom = new THREE.TorusGeometry(0.62, 0.035, 16, 48);
    const balanceRim = new THREE.Mesh(balanceRimGeom, ChronosMaterials.antiqueGold('polished'));
    this.balanceWheel.add(balanceRim);

    // Balance Spokes (2 parallel arms)
    const spoke1Geom = new THREE.BoxGeometry(0.06, 1.2, 0.03);
    const spoke1 = new THREE.Mesh(spoke1Geom, ChronosMaterials.antiqueGold('polished'));
    this.balanceWheel.add(spoke1);

    // Gold Weight Screws around balance rim
    for (let i = 0; i < 12; i++) {
      const screwGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8);
      const screw = new THREE.Mesh(screwGeom, ChronosMaterials.warmIvory(true));
      const ang = (i / 12) * Math.PI * 2;
      screw.position.set(Math.cos(ang) * 0.62, Math.sin(ang) * 0.62, 0);
      screw.rotation.z = ang;
      this.balanceWheel.add(screw);
    }

    // Hairspring Spiral Representation
    const springCurves: THREE.Vector3[] = [];
    const turns = 4;
    for (let t = 0; t < Math.PI * 2 * turns; t += 0.2) {
      const r = 0.05 + 0.035 * t;
      springCurves.push(new THREE.Vector3(Math.cos(t) * r, Math.sin(t) * r, 0.02));
    }
    const springGeom = new THREE.BufferGeometry().setFromPoints(springCurves);
    const springMat = new THREE.LineBasicMaterial({ color: CHRONOS_COLORS.accent, linewidth: 2 });
    const hairspring = new THREE.Line(springGeom, springMat);
    this.balanceWheel.add(hairspring);

    // Synthetic Ruby Jewel Endstone in center of balance
    const rubyGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16);
    const ruby = new THREE.Mesh(rubyGeom, ChronosMaterials.rubyJewel());
    ruby.rotation.x = Math.PI / 2;
    this.balanceWheel.add(ruby);

    this.tourbillonCage.add(this.balanceWheel);
    this.layerTourbillon.add(this.tourbillonCage);
  }

  // --- 5. Movement Bridges & Jewel Settings ---
  private buildBridgesAndJewels(): void {
    // Openworked Bridges in Slate Titanium with Beveled Edges
    const bridgeShape = new THREE.Shape();
    bridgeShape.moveTo(-1.6, 0.3);
    bridgeShape.lineTo(-0.2, 1.4);
    bridgeShape.lineTo(1.4, 0.8);
    bridgeShape.lineTo(1.6, -0.2);
    bridgeShape.lineTo(0.9, -0.6);
    bridgeShape.lineTo(-0.8, -0.2);
    bridgeShape.closePath();

    const extrudeSettings = {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    };

    const bridgeGeom = new THREE.ExtrudeGeometry(bridgeShape, extrudeSettings);
    const bridge = new THREE.Mesh(bridgeGeom, ChronosMaterials.surfaceSlate(0.25));
    bridge.position.set(0, 0, -0.05);
    this.layerBridges.add(bridge);

    // Jewel Settings (Ruby inside Gold Chatons)
    const jewelPositions = [
      { x: 0.65, y: 0.45 },
      { x: 0.2, y: 0.85 },
      { x: -0.55, y: 0.65 },
      { x: -0.85, y: -0.55 },
    ];

    jewelPositions.forEach((pos) => {
      // Gold chaton outer collar
      const chatonGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.06, 16);
      const chaton = new THREE.Mesh(chatonGeom, ChronosMaterials.antiqueGold('polished'));
      chaton.rotation.x = Math.PI / 2;
      chaton.position.set(pos.x, pos.y, 0.04);
      this.layerBridges.add(chaton);

      // Ruby center
      const rubyGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.07, 16);
      const ruby = new THREE.Mesh(rubyGeom, ChronosMaterials.rubyJewel());
      ruby.rotation.x = Math.PI / 2;
      ruby.position.set(pos.x, pos.y, 0.05);
      this.layerBridges.add(ruby);
    });

    // Blued steel movement screws
    const screwPositions = [
      { x: -1.2, y: 0.4 },
      { x: 1.1, y: 1.1 },
      { x: 1.3, y: -0.4 },
      { x: -0.6, y: -0.1 },
    ];

    screwPositions.forEach((pos) => {
      const screwGeom = new THREE.CylinderGeometry(0.07, 0.07, 0.06, 16);
      const screw = new THREE.Mesh(screwGeom, ChronosMaterials.bluedSteel());
      screw.rotation.x = Math.PI / 2;
      screw.position.set(pos.x, pos.y, 0.05);
      this.layerBridges.add(screw);
    });
  }

  // --- 6. Dial, Hour Markers, and Sub-dials ---
  private buildDial(): void {
    // Outer Chapter Ring (Obsidian with Antique Gold Trim)
    const chapterRingGeom = new THREE.RingGeometry(1.65, 2.22, 64);
    const chapterRingMat = ChronosMaterials.obsidianBlack('high-gloss');
    this.dialMesh = new THREE.Mesh(chapterRingGeom, chapterRingMat);
    this.dialMesh.position.z = 0.08;
    this.layerDial.add(this.dialMesh);

    // Inner Rail Track
    const railTrackGeom = new THREE.TorusGeometry(2.15, 0.015, 8, 64);
    const railTrack = new THREE.Mesh(railTrackGeom, ChronosMaterials.antiqueGold('polished'));
    railTrack.position.z = 0.09;
    this.layerDial.add(railTrack);

    const innerRailGeom = new THREE.TorusGeometry(1.7, 0.015, 8, 64);
    const innerRail = new THREE.Mesh(innerRailGeom, ChronosMaterials.antiqueGold('polished'));
    innerRail.position.z = 0.09;
    this.layerDial.add(innerRail);

    // 12 Applied Faceted Hour Markers in Antique Gold + Warm Ivory Infill
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      // Skip 6 o'clock to keep tourbillon aperture clear
      if (i === 6) continue;

      const isQuarter = i % 3 === 0;
      const markerWidth = isQuarter ? 0.12 : 0.07;
      const markerLength = isQuarter ? 0.38 : 0.28;

      const markerGeom = new THREE.BoxGeometry(markerWidth, markerLength, 0.06);
      const marker = new THREE.Mesh(markerGeom, ChronosMaterials.antiqueGold('polished'));

      const r = 1.92;
      marker.position.set(Math.sin(angle) * r, Math.cos(angle) * r, 0.11);
      marker.rotation.z = -angle;
      this.layerDial.add(marker);

      // Warm Ivory luminous insert
      const lumeGeom = new THREE.BoxGeometry(markerWidth * 0.5, markerLength * 0.7, 0.07);
      const lume = new THREE.Mesh(lumeGeom, ChronosMaterials.warmIvory(true));
      lume.position.set(Math.sin(angle) * r, Math.cos(angle) * r, 0.12);
      lume.rotation.z = -angle;
      this.layerDial.add(lume);
    }

    // Minute Hash Marks (60 marks)
    for (let m = 0; m < 60; m++) {
      if (m % 5 === 0) continue; // Skip hour positions
      const angle = (m / 60) * Math.PI * 2;
      const hashGeom = new THREE.BoxGeometry(0.02, 0.1, 0.02);
      const hash = new THREE.Mesh(hashGeom, ChronosMaterials.warmIvory(false));
      hash.position.set(Math.sin(angle) * 2.1, Math.cos(angle) * 2.1, 0.09);
      hash.rotation.z = -angle;
      this.layerDial.add(hash);
    }

    // Top Sub-dial at 12 o'clock (Chronograph 30-min counter)
    const subDialTopGeom = new THREE.RingGeometry(0.3, 0.65, 32);
    const subDialTop = new THREE.Mesh(subDialTopGeom, ChronosMaterials.surfaceSlate(0.4));
    subDialTop.position.set(0, 0.95, 0.09);
    this.layerDial.add(subDialTop);

    const subDialTopBorder = new THREE.TorusGeometry(0.65, 0.02, 8, 32);
    const subDialTopRing = new THREE.Mesh(subDialTopBorder, ChronosMaterials.antiqueGold('polished'));
    subDialTopRing.position.set(0, 0.95, 0.1);
    this.layerDial.add(subDialTopRing);

    // Power Reserve Indicator Arc at 9 o'clock
    const prArcGeom = new THREE.RingGeometry(0.35, 0.42, 32, 1, Math.PI * 0.7, Math.PI * 0.6);
    const prArc = new THREE.Mesh(prArcGeom, ChronosMaterials.antiqueGold('brushed'));
    prArc.position.set(-1.05, 0, 0.09);
    this.layerDial.add(prArc);
  }

  // --- 7. Faceted Hands (Hour, Minute, Seconds) ---
  private buildHands(): void {
    const centerPivot = new THREE.Vector3(0, 0, 0.14);

    // Central Canon Pinion Collar
    const canonPinionGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 24);
    const canonPinion = new THREE.Mesh(canonPinionGeom, ChronosMaterials.antiqueGold('polished'));
    canonPinion.rotation.x = Math.PI / 2;
    canonPinion.position.copy(centerPivot);
    this.layerHands.add(canonPinion);

    // 1. Hour Hand (Dauphine Faceted, Length 1.1)
    this.hourHand = new THREE.Group();
    this.hourHand.position.set(0, 0, 0.16);

    const hourBlade = this.createDauphineHand(1.15, 0.16, ChronosMaterials.antiqueGold('polished'));
    this.hourHand.add(hourBlade);
    this.layerHands.add(this.hourHand);

    // 2. Minute Hand (Length 1.7)
    this.minuteHand = new THREE.Group();
    this.minuteHand.position.set(0, 0, 0.2);

    const minuteBlade = this.createDauphineHand(1.75, 0.14, ChronosMaterials.antiqueGold('polished'));
    this.minuteHand.add(minuteBlade);
    this.layerHands.add(this.minuteHand);

    // 3. Sweeping Second Hand (Needle slim with Antique Gold counterweight)
    this.secondHand = new THREE.Group();
    this.secondHand.position.set(0, 0, 0.24);

    // Main long needle
    const needleGeom = new THREE.BoxGeometry(0.03, 2.05, 0.02);
    const needle = new THREE.Mesh(needleGeom, ChronosMaterials.antiqueGold('polished'));
    needle.position.y = 0.75;
    this.secondHand.add(needle);

    // Counterweight circle at bottom
    const counterGeom = new THREE.CircleGeometry(0.1, 16);
    const counter = new THREE.Mesh(counterGeom, ChronosMaterials.antiqueGold('polished'));
    counter.position.y = -0.38;
    this.secondHand.add(counter);

    // Central Cap
    const capGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16);
    const cap = new THREE.Mesh(capGeom, ChronosMaterials.bluedSteel());
    cap.rotation.x = Math.PI / 2;
    this.secondHand.add(cap);

    this.layerHands.add(this.secondHand);
  }

  // --- 8. Bezel and Domed Sapphire Glass ---
  private buildBezelAndGlass(): void {
    // Stepped Antique Gold Bezel (Hollow Ring Construction)
    const bezelGroup = new THREE.Group();
    bezelGroup.position.z = 0.28;

    // Outer Bezel Ring
    const outerBezelGeom = new THREE.TorusGeometry(2.32, 0.12, 16, 64);
    const outerBezel = new THREE.Mesh(outerBezelGeom, ChronosMaterials.antiqueGold('polished'));
    bezelGroup.add(outerBezel);

    // Inner Bezel Fluted Ring
    const innerBezelGeom = new THREE.TorusGeometry(2.18, 0.06, 16, 64);
    const innerBezel = new THREE.Mesh(innerBezelGeom, ChronosMaterials.antiqueGold('brushed'));
    bezelGroup.add(innerBezel);

    // 60 Fluted notches around bezel
    for (let f = 0; f < 60; f++) {
      const flutingGeom = new THREE.BoxGeometry(0.03, 0.12, 0.04);
      const fluting = new THREE.Mesh(flutingGeom, ChronosMaterials.antiqueGold('polished'));
      const ang = (f / 60) * Math.PI * 2;
      fluting.position.set(Math.cos(ang) * 2.25, Math.sin(ang) * 2.25, 0.05);
      fluting.rotation.z = ang;
      bezelGroup.add(fluting);
    }

    this.layerBezel.add(bezelGroup);
    this.caseMeshes.push(outerBezel);
    this.caseMeshes.push(innerBezel);

    // Front Domed Sapphire Crystal (Transparent Lens Disc)
    const glassGeom = new THREE.CylinderGeometry(2.16, 2.16, 0.03, 64, 1, false);
    const glass = new THREE.Mesh(glassGeom, ChronosMaterials.sapphireGlass());
    glass.rotation.x = Math.PI / 2;
    glass.position.z = 0.32;
    this.layerGlass.add(glass);
  }

  // --- 9. Straps and Deployment Clasp ---
  private buildStraps(): void {
    // Top Strap Segment
    const topStrapGeom = new THREE.BoxGeometry(2.1, 3.2, 0.35);
    const topStrap = new THREE.Mesh(topStrapGeom, ChronosMaterials.obsidianBlack('matte'));
    topStrap.position.set(0, 3.6, -0.15);
    this.layerCase.add(topStrap);
    this.strapMeshes.push(topStrap);

    // Bottom Strap Segment
    const botStrapGeom = new THREE.BoxGeometry(2.1, 3.2, 0.35);
    const botStrap = new THREE.Mesh(botStrapGeom, ChronosMaterials.obsidianBlack('matte'));
    botStrap.position.set(0, -3.6, -0.15);
    this.layerCase.add(botStrap);
    this.strapMeshes.push(botStrap);

    // Antique Gold Deployment Clasp
    const claspGeom = new THREE.BoxGeometry(2.15, 0.6, 0.45);
    const clasp = new THREE.Mesh(claspGeom, ChronosMaterials.antiqueGold('polished'));
    clasp.position.set(0, -4.8, -0.15);
    this.layerCase.add(clasp);
  }

  // --- Helper: Spoked Gear Wheel Generator ---
  private createSpokedGear(
    radius: number,
    teethCount: number,
    thickness: number,
    material: THREE.Material,
    angledTeeth = false
  ): THREE.Mesh {
    const gearGroup = new THREE.Group();

    // Central hub
    const hubGeom = new THREE.CylinderGeometry(radius * 0.28, radius * 0.28, thickness, 24);
    const hub = new THREE.Mesh(hubGeom, material);
    hub.rotation.x = Math.PI / 2;
    gearGroup.add(hub);

    // Outer rim
    const rimGeom = new THREE.TorusGeometry(radius * 0.85, thickness * 0.4, 8, 32);
    const rim = new THREE.Mesh(rimGeom, material);
    gearGroup.add(rim);

    // 4 spokes
    for (let s = 0; s < 4; s++) {
      const spokeGeom = new THREE.BoxGeometry(thickness * 0.8, radius * 0.85, thickness);
      const spoke = new THREE.Mesh(spokeGeom, material);
      spoke.rotation.z = (s * Math.PI) / 2;
      gearGroup.add(spoke);
    }

    // Gear Teeth
    const toothLength = radius * 0.18;
    const toothWidth = (Math.PI * 2 * radius) / (teethCount * 2.2);

    for (let i = 0; i < teethCount; i++) {
      const angle = (i / teethCount) * Math.PI * 2;
      const toothGeom = new THREE.BoxGeometry(toothWidth, toothLength, thickness);
      const tooth = new THREE.Mesh(toothGeom, material);
      tooth.position.set(
        Math.cos(angle) * (radius * 0.85 + toothLength * 0.45),
        Math.sin(angle) * (radius * 0.85 + toothLength * 0.45),
        0
      );
      tooth.rotation.z = angle + (angledTeeth ? 0.35 : 0);
      gearGroup.add(tooth);
    }

    // Merge into single container mesh
    const dummyMesh = new THREE.Mesh();
    dummyMesh.add(gearGroup);
    return dummyMesh;
  }

  // --- Helper: Dauphine Hand Generator ---
  private createDauphineHand(length: number, baseWidth: number, material: THREE.Material): THREE.Group {
    const handGroup = new THREE.Group();

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(-baseWidth / 2, length * 0.25);
    shape.lineTo(0, length);
    shape.lineTo(baseWidth / 2, length * 0.25);
    shape.closePath();

    const geom = new THREE.ExtrudeGeometry(shape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    });

    const mesh = new THREE.Mesh(geom, material);
    mesh.position.z = -0.02;
    handGroup.add(mesh);

    // Warm Ivory lume center ridge
    const lumeGeom = new THREE.BoxGeometry(baseWidth * 0.25, length * 0.5, 0.05);
    const lume = new THREE.Mesh(lumeGeom, ChronosMaterials.warmIvory(true));
    lume.position.set(0, length * 0.4, 0.02);
    handGroup.add(lume);

    return handGroup;
  }

  // --- Real-Time Update Animation Loop ---
  public update(delta: number, config: WatchConfig): void {
    if (config.isTicking) {
      const speed = config.tourbillonSpeed;

      // 1. Balance Wheel Harmonic Oscillation (4Hz = 28,800 vph)
      this.balancePhase += delta * 25 * speed;
      const balanceAmplitude = 1.1; // radians
      this.balanceWheel.rotation.z = Math.sin(this.balancePhase) * balanceAmplitude;

      // 2. Tourbillon Cage continuous 60-second revolution
      this.tourbillonCage.rotation.z += delta * 0.5 * speed;

      // 3. Hands Sweep Rotation
      this.secondsAngle += delta * 1.05 * speed;
      this.secondHand.rotation.z = -this.secondsAngle;
      this.minuteHand.rotation.z = -this.secondsAngle / 60;
      this.hourHand.rotation.z = -this.secondsAngle / 720;

      // 4. Interlocking Gear Train Rotation
      this.gearFourth.rotation.z -= delta * 1.05 * speed;
      this.gearThird.rotation.z += delta * 0.35 * speed;
      this.gearCenter.rotation.z -= delta * 0.1 * speed;
      this.escapementWheel.rotation.z += delta * 2.1 * speed;

      // 5. Automatic Rotor subtle gravitational response
      this.windingRotor.rotation.z += Math.sin(this.secondsAngle * 0.5) * 0.01;
    }

    // 6. Smooth Exploded View Layer Separation Interpolation (Lerp)
    this.targetExplodedRatio = config.explodedRatio;
    this.currentExplodedRatio += (this.targetExplodedRatio - this.currentExplodedRatio) * 0.1;

    const r = this.currentExplodedRatio;
    this.layerBezel.position.z = 2.6 * r;
    this.layerGlass.position.z = 2.0 * r;
    this.layerHands.position.z = 1.4 * r;
    this.layerDial.position.z = 0.8 * r;
    this.layerBridges.position.z = 0.0;
    this.layerGears.position.z = -0.7 * r;
    this.layerTourbillon.position.z = -0.7 * r;
    this.layerCase.position.z = -1.5 * r;
    this.layerCaseback.position.z = -2.3 * r;
  }

  // --- Configurator Material Live Updates ---
  public applyCustomConfig(config: WatchConfig): void {
    // 1. Case Material
    const caseMat =
      config.caseFinish === 'gold'
        ? ChronosMaterials.antiqueGold('polished')
        : config.caseFinish === 'obsidian'
        ? ChronosMaterials.obsidianBlack('satin')
        : ChronosMaterials.surfaceSlate(0.25);

    this.caseMeshes.forEach((mesh) => {
      mesh.material = caseMat;
    });

    // 2. Dial Material
    if (this.dialMesh) {
      if (config.dialStyle === 'sunburst_black') {
        this.dialMesh.material = ChronosMaterials.obsidianBlack('high-gloss');
      } else if (config.dialStyle === 'warm_ivory') {
        this.dialMesh.material = ChronosMaterials.warmIvory(false);
      } else {
        // Skeletonized
        this.dialMesh.material = ChronosMaterials.surfaceSlate(0.4);
      }
    }

    // 3. Strap Material
    const strapMat =
      config.strapStyle === 'alligator'
        ? ChronosMaterials.obsidianBlack('matte')
        : config.strapStyle === 'gold_mesh'
        ? ChronosMaterials.antiqueGold('brushed')
        : ChronosMaterials.surfaceSlate(0.6);

    this.strapMeshes.forEach((mesh) => {
      mesh.material = strapMat;
    });
  }

  // --- Public Getters for Telemetry & Diagnostics ---
  public getBalanceAngle(): number {
    return this.balanceWheel ? this.balanceWheel.rotation.z : 0;
  }

  public getTourbillonAngle(): number {
    return this.tourbillonCage ? this.tourbillonCage.rotation.z : 0;
  }
}
