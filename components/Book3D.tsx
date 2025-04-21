'use client';

import React, { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { motion } from 'framer-motion';
import { Text, useTexture } from '@react-three/drei';

// Enhanced Text Texture Function with Orientation
interface CreateTextureOptions {
  width: number;
  height: number;
  bgColor: string;
  textColor: string;
  fontSize: number;
  fontStyle?: string; // e.g., 'bold', 'italic bold'
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
  lines: { text: string; fontSize?: number; fontStyle?: string }[];
  padding?: number;
  orientation?: 'horizontal' | 'vertical'; // Added orientation
}

const createTextTexture = (options: CreateTextureOptions): THREE.CanvasTexture => {
  const { 
    width, height, // These are the *intended* final dimensions
    bgColor, textColor, 
    fontSize: defaultFontSize, 
    fontStyle: defaultFontStyle = 'bold', 
    textAlign = 'center', 
    textBaseline = 'middle', 
    lines, 
    padding = 0.1, 
    orientation = 'horizontal' 
  } = options;

  const canvas = document.createElement('canvas');
  // Canvas dimensions match intended texture dimensions
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.error("Failed to get 2D context");
    return new THREE.CanvasTexture(document.createElement('canvas')); 
  }

  // Background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Save context before potential rotation
  ctx.save();

  // Translate and rotate context if vertical
  if (orientation === 'vertical') {
      // Move origin to center of the *original* intended dimensions for rotation
      ctx.translate(width / 2, height / 2); 
      ctx.rotate(Math.PI / 2); // Rotate 90 degrees clockwise
      // Move origin back considering the rotation (effectively drawing on a sideways canvas)
      ctx.translate(-height / 2, -width / 2); 
  }

  // Text properties
  ctx.fillStyle = textColor;
  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;

  // Use original height/width for layout logic relative to the *intended* final texture orientation
  const layoutWidth = orientation === 'vertical' ? height : width;
  const layoutHeight = orientation === 'vertical' ? width : height;
  const usableWidth = layoutWidth * (1 - padding * 2);
  const usableHeight = layoutHeight * (1 - padding * 2);
  const startX = layoutWidth * padding;
  const startYBase = layoutHeight * padding;

  // Calculate total required height
  let totalTextHeight = 0;
  lines.forEach(line => {
      const currentFontSize = line.fontSize || defaultFontSize;
      totalTextHeight += currentFontSize * 1.2;
  });

  let currentY = startYBase + (usableHeight - totalTextHeight) / 2;
  if (textBaseline !== 'middle') currentY = startYBase;

  lines.forEach(line => {
    const currentFontSize = line.fontSize || defaultFontSize;
    const currentFontStyle = line.fontStyle || defaultFontStyle;
    ctx.font = `${currentFontStyle} ${currentFontSize}px Arial`;
    const lineHeight = currentFontSize * 1.2;
    let lineYOffset = (textBaseline === 'middle') ? currentFontSize / 2 : currentFontSize;

    // Wrapping Logic (using usableWidth calculated based on layout orientation)
    let words = line.text.split(' ');
    let lineToDraw = '';
    for (let i = 0; i < words.length; i++) {
        let testLine = lineToDraw + words[i] + ' ';
        let metrics = ctx.measureText(testLine);
        // Check against usableWidth for wrapping
        if (metrics.width > usableWidth && i > 0) {
            let drawX = startX;
            if (textAlign === 'center') drawX = layoutWidth / 2;
            if (textAlign === 'right') drawX = layoutWidth * (1 - padding);
            ctx.fillText(lineToDraw.trim(), drawX, currentY + lineYOffset);
            lineToDraw = words[i] + ' ';
            currentY += lineHeight;
        } else {
            lineToDraw = testLine;
        }
    }
    // Draw the last line
    let drawX = startX;
    if (textAlign === 'center') drawX = layoutWidth / 2;
    if (textAlign === 'right') drawX = layoutWidth * (1 - padding);
    ctx.fillText(lineToDraw.trim(), drawX, currentY + lineYOffset);
    currentY += lineHeight;
  });

  // Restore context state (removes rotation)
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace; // Corrected Enum Name
  return texture;
};

// <-- NEW: Helper component to load texture conditionally -->
interface TextureLoaderProps {
    path: string;
    onLoad: (texture: THREE.Texture | THREE.Texture[]) => void;
}
const TextureLoader: React.FC<TextureLoaderProps> = ({ path, onLoad }) => {
    const texture = useTexture(path);
    useEffect(() => {
        if (texture) {
            onLoad(texture);
        }
    }, [texture, onLoad]);
    return null; // This component doesn't render anything itself
};

// Updated Props Interface
interface Book3DProps {
  position?: [number, number, number];
  rotation?: [number, number, number];
  dimensions?: [number, number, number]; // width, height, depth
  spineColor?: string;
  coverColor?: string;
  pageColor?: string;
  textColor?: string;
  title?: string;
  author?: string;
  subtitle?: string;
  onClick?: () => void; // ADDED onClick prop
  useTextureMap?: boolean; // <-- ADDED PROP
  coverTexturePath?: string; // <-- ADDED PROP for specific cover texture
}

export const Book3D: React.FC<Book3DProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  dimensions = [1.5, 2, 0.2], // width, height, depth
  spineColor = '#555555',
  coverColor = '#aaaaaa',
  pageColor = '#f0f0f0',
  textColor = '#ffffff',
  title = 'Book Title',
  author = 'Author Name',
  subtitle,
  onClick, // Destructure onClick
  useTextureMap = false, // <-- Default to false
  coverTexturePath, // <-- Destructure the new prop
}) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [isHovered, setIsHovered] = useState(false);
  const [width, height, depth] = dimensions;
  // <-- NEW: State to hold the loaded specific texture -->
  const [specificCoverTexture, setSpecificCoverTexture] = useState<THREE.Texture | null>(null);

  // Conditionally load the texture
  // Note: Hooks can't be called conditionally, so useTexture is always called, 
  // but the path could be null/undefined, or we check the prop before using the result.
  // Always load the texture, but apply it conditionally later based on useTextureMap.
  const bookTextureMap = useTexture('/textures/leather_white_diff_4k.jpg');
  
  // ----- Stripe‑Press‑style front‑cover texture -----
  const frontCoverTexture = useMemo(() => {
    const coverLines: { text: string; fontSize?: number; fontStyle?: string }[] = [
      { text: 'LIBY PRESS', fontSize: 50, fontStyle: 'bold' },
      { text: title.toUpperCase(), fontSize: 90, fontStyle: 'bold' },
    ];
    if (subtitle) coverLines.push({ text: subtitle, fontSize: 60 });
    if (author)  coverLines.push({ text: `BY ${author.toUpperCase()}`, fontSize: 50 });
    return createTextTexture({
      width: 1024,
      height: 1600,
      bgColor: '#ffffff',
      textColor: '#000000',
      fontSize: 60,
      fontStyle: 'normal',
      textAlign: 'left',
      textBaseline: 'top',
      lines: coverLines,
      padding: 0.07,
    });
  }, [title, subtitle, author]);

  // Configure texture wrapping (only if texture likely loaded)
  useMemo(() => {
      // Check both prop and if texture loaded successfully (useTexture might return array/obj)
      if (useTextureMap && bookTextureMap && !(bookTextureMap instanceof Array)) {
          const texture = bookTextureMap as THREE.Texture; // Type assertion
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.needsUpdate = true; 
      }
      // <-- NEW: Configure specific cover texture -->
      if (specificCoverTexture && !(specificCoverTexture instanceof Array)) {
          const texture = specificCoverTexture as THREE.Texture;
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping; // Or ClampToEdgeWrapping if preferred
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.needsUpdate = true;
      }
  // Add useTextureMap to dependencies here if loading is truly conditional
  // But since useTexture runs always, only bookTextureMap is needed
  }, [bookTextureMap, useTextureMap, specificCoverTexture]); // Removed coverTexturePath, depend on state

  const materials = useMemo(() => {
    // Common properties
    const commonProps = {
        roughness: 0.9,
        metalness: 0.05,
    };

    // Function to create material config, conditionally adding map
    const createMaterialConfig = (color: string, applyGenericTexture: boolean = true) => {
        const config: THREE.MeshStandardMaterialParameters = {
            ...commonProps,
            color: color,
        };
        // Apply GENERIC map only if flag is true, useTextureMap is true, AND texture is valid
        if (applyGenericTexture && useTextureMap && bookTextureMap && !(bookTextureMap instanceof Array)) {
            config.map = bookTextureMap as THREE.Texture;
        }
        return config;
    }

    // Spine Material - Never apply specific texture, optionally apply generic
    const spineMaterial = new THREE.MeshStandardMaterial(createMaterialConfig(spineColor, true));

    // Front Cover Material - Create base, specific texture applied later
    const frontCoverMaterial = new THREE.MeshStandardMaterial(createMaterialConfig(coverColor, true)); // Base with optional generic texture
    
    // Back Cover Material - Never apply specific texture, optionally apply generic
    const backCoverMaterial = new THREE.MeshStandardMaterial(createMaterialConfig(coverColor, true));

    // Page Material - Never textured in this setup
    const pageMaterial = new THREE.MeshStandardMaterial({ 
        color: pageColor, 
        roughness: 0.9, 
        metalness: 0 
    });

    // --- Apply texture prioritisation for front cover ---
    if (specificCoverTexture && !(specificCoverTexture instanceof Array)) {
      frontCoverMaterial.map = specificCoverTexture as THREE.Texture;
    } else {
      frontCoverMaterial.map = frontCoverTexture; // Stripe‑style generated texture
    }
    frontCoverMaterial.needsUpdate = true;

    return [
      spineMaterial,       // Right face (+x)
      pageMaterial,        // Left face (-x)
      pageMaterial,        // Top face (+y)
      pageMaterial,        // Bottom face (-y)
      frontCoverMaterial,  // Front face (+z)
      backCoverMaterial,   // Back face (-z)
    ];
  // Add useTextureMap and bookTextureMap to dependencies
  }, [spineColor, pageColor, coverColor, bookTextureMap, useTextureMap, specificCoverTexture, frontCoverTexture]); // Removed pageStripeTexture

  // Cover Text Content
  const coverTextContent = useMemo(() => {
      const lines = [];
      if (title) lines.push(title.toUpperCase());
      if (subtitle) lines.push(subtitle);
      if (author) lines.push(author);
      return lines.join('\n');
  }, [title, subtitle, author]);

  // Add useFrame for smooth animation
  useFrame((state, delta) => {
      if (!meshRef.current) return;
      // Target values based on hover state
      const targetScale = isHovered ? 1.05 : 1;
      // Target Y relative to the group origin (0) + hover offset
      const targetY = isHovered ? 0 + 0.15 : 0;
      
      // Smoothly interpolate scale (apply to x, y, z)
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      
      // Smoothly interpolate mesh position relative to the group origin
      meshRef.current.position.y = THREE.MathUtils.lerp(meshRef.current.position.y, targetY, 0.1);
      meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, 0, 0.1); // Lerp towards 0 for X
      meshRef.current.position.z = THREE.MathUtils.lerp(meshRef.current.position.z, 0, 0.1); // Lerp towards 0 for Z
  });

  // Constants for text positioning
  const spineTextOffset = 0.01;
  const spineTextRotation: [number, number, number] = [0, Math.PI / 2, Math.PI / 2];
  const coverTextOffset = 0.01;

  return (
    // Group to hold mesh and text, apply main position/rotation here
    <group position={position} rotation={rotation}> 
        {/* <-- NEW: Conditionally render TextureLoader -->*/}
        {coverTexturePath && <TextureLoader path={coverTexturePath} onLoad={(tex) => setSpecificCoverTexture(tex as THREE.Texture)} />}

        <mesh
          ref={meshRef}
          geometry={new THREE.BoxGeometry(width, height, depth)} // Use dimensions directly
          material={materials}
          castShadow
          receiveShadow
          onClick={onClick} // Attach onClick to the mesh
          onPointerOver={(event) => { 
              event.stopPropagation(); 
              setIsHovered(true); 
              document.body.style.cursor = 'pointer';
          }}
          onPointerOut={(event) => { 
              setIsHovered(false); 
              document.body.style.cursor = 'default';
          }}
        >
             {/* Spine Text - Author */}
             {author && (
                <Text
                    position={[width / 2 + spineTextOffset, -height * 0.35, 0]} // Position lower part of spine
                    rotation={spineTextRotation} 
                    fontSize={0.07} // Smaller font for author
                    color={textColor}
                    anchorX="center"
                    anchorY="middle" // Adjust if needed (e.g., top-baseline)
                    textAlign="center"
                    maxWidth={height * 0.3} // Limit width for author section
                    lineHeight={1.0} 
                    material-toneMapped={false} 
                >
                    {author}
                </Text>
             )}

             {/* Spine Text - Title */}
             {title && (
                 <Text
                     position={[width / 2 + spineTextOffset, height * 0.1, 0]} // Position upper part of spine
                     rotation={spineTextRotation} 
                     fontSize={0.09} // Slightly larger for title
                     color={textColor}
                     anchorX="center"
                     anchorY="top" // Anchor at the top
                     textAlign="center"
                     maxWidth={height * 0.6} // More width for title
                     lineHeight={1.0} 
                     material-toneMapped={false} 
                 >
                     {title.toUpperCase()}
                 </Text>
             )}

        </mesh>
    </group>
  );
};