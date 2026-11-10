import * as THREE from 'three';

// CHRONOS Color Palette Constants
export const CHRONOS_COLORS = {
  background: 0x0D1117,
  surface: 0x1C2730,
  accent: 0xC8AA73,      // Antique Gold
  textPrimary: 0xF0E9DD, // Warm Ivory
  textSecondary: 0xAEB8BC, // Muted Slate
  goldHighlight: 0xE6D2B0,
  goldShadow: 0x8C6F34,
  rubyJewel: 0x9B111E,
  bluedSteel: 0x1B3F7A,
};

export class ChronosMaterials {
  // Antique Gold (Gears, Bezel, Balance Wheel, Hands)
  public static antiqueGold(finish: 'polished' | 'brushed' | 'matte' = 'polished'): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: CHRONOS_COLORS.accent,
      metalness: finish === 'matte' ? 0.75 : 0.95,
      roughness: finish === 'polished' ? 0.22 : finish === 'brushed' ? 0.38 : 0.55,
      envMapIntensity: 1.5,
    });
  }

  // Obsidian Black (Chassis, Dark PVD Case, Contrast Plates)
  public static obsidianBlack(finish: 'matte' | 'satin' | 'high-gloss' = 'satin'): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: 0x080B0F,
      metalness: finish === 'high-gloss' ? 0.8 : 0.35,
      roughness: finish === 'high-gloss' ? 0.12 : finish === 'satin' ? 0.4 : 0.75,
    });
  }

  // Surface Titanium / Deep Slate (Bridges, Mainplate, Screws)
  public static surfaceSlate(roughness = 0.3): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: CHRONOS_COLORS.surface,
      metalness: 0.85,
      roughness: roughness,
    });
  }

  // Warm Ivory (Dial numerals, Markers, Luminescent hands infill)
  public static warmIvory(emissive = false): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: CHRONOS_COLORS.textPrimary,
      metalness: 0.1,
      roughness: 0.4,
      emissive: emissive ? CHRONOS_COLORS.textPrimary : 0x000000,
      emissiveIntensity: emissive ? 0.25 : 0,
    });
  }

  // Secondary Steel Pinion / Muted Slate (Gear shafts, escapement pallet)
  public static steelSlate(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: CHRONOS_COLORS.textSecondary,
      metalness: 0.9,
      roughness: 0.25,
    });
  }

  // Synthetic Ruby (Watch Jewel Bearings)
  public static rubyJewel(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: CHRONOS_COLORS.rubyJewel,
      metalness: 0.1,
      roughness: 0.1,
      transmission: 0.75,
      thickness: 0.8,
      ior: 1.77, // Real synthetic corundum/sapphire IOR
    });
  }

  // Sapphire Crystal Glass (Front & Exhibition Caseback)
  public static sapphireGlass(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.02,
      transmission: 0.98,
      transparent: true,
      opacity: 0.22,
      ior: 1.768, // Real sapphire crystal IOR
      reflectivity: 0.5,
      depthWrite: false,
    });
  }

  // Blued Steel Screws & Hands
  public static bluedSteel(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: CHRONOS_COLORS.bluedSteel,
      metalness: 0.9,
      roughness: 0.2,
    });
  }
}
