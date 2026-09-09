# GridWarfare

FPS 3D en el navegador, estilo Call of Duty, construido con Three.js y Web Audio API — todo en un único archivo `index.html`, sin dependencias externas de assets.

## Jugar

Abre `index.html` en un navegador moderno (Chrome/Edge/Firefox), o sírvelo con cualquier servidor estático:

```bash
npx serve .
```

## Controles

| Acción | Tecla |
|---|---|
| Moverse | `W A S D` |
| Esprintar | `Shift` |
| Saltar | `Espacio` |
| Agacharse | `Ctrl` |
| Disparar | Clic izquierdo |
| Apuntar (ADS) | Clic derecho |
| Recargar | `R` |

## Características

- Mapa táctico urbano/industrial con contenedores, coberturas, rampas y varios niveles de altura.
- Iluminación con sombras, niebla atmosférica y materiales tácticos generados por código.
- Gunplay estilo CoD: retroceso, muzzle flash, hitmarker, balanceo del arma (sway/bobbing) y ADS con zoom suave.
- Regeneración de salud tras 4s sin recibir daño, con viñeta roja de daño.
- Bots enemigos con patrullaje, detección por campo de visión, persecución, disparo y respawn continuo.
- Audio 100% sintetizado en tiempo real con la Web Audio API (disparo, impacto, recarga, pasos, daño).
- HUD táctico: munición, salud, minimapa con radar de enemigos, contador de bajas y retícula interactiva.
