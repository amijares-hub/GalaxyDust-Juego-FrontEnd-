// Localiza la propiedad transition dentro del mapeo del mazo de cartas y actualízala:
transition = {{
  x: { type: "spring", stiffness: springStiffness, damping: springDamping },
  y: { type: "spring", stiffness: springStiffness, damping: springDamping },
  rotateZ: { type: "spring", stiffness: springStiffness, damping: springDamping },
  scale: isActive ? {
    repeat: Infinity,
    duration: 3,
    ease: "easeInOut"
  } : { type: "tween", duration: 0.15, ease: "easeOut" }
}}
