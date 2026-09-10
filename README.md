# GridWarfare

FPS 3D en el navegador, estilo Call of Duty, construido con Three.js y Web Audio API — sin dependencias externas de assets (todas las texturas y sonidos se generan por código).

## Jugar

Abre `index.html` en un navegador moderno (Chrome/Edge/Firefox), o sírvelo con cualquier servidor estático:

```bash
npx serve .
```

## Estructura del proyecto

```
index.html        Menús, HUD y montaje de la escena
css/style.css      Toda la interfaz (menús, HUD, diálogos, tema táctico)
js/audio.js         Motor de sonido sintetizado (Web Audio API)
js/weapons.js        Definición y modelos 3D de las 6 armas
js/maps.js            Los 3 mapas multijugador + el valle de la campaña (con sus coordenadas de misión)
js/bots.js             IA de los bots (percepción, objetivos, flanqueo, búsqueda, ragdoll)
js/modes.js              Modos multijugador: FFA, TDM, S&D, Arsenal, Horda
js/campaign.js            Modo Campaña: guion de misión, NPCs, diálogos, jefe, resistencia, extracción
js/effects.js              Partículas GPU (impactos, sangre, fogonazos, explosiones, despliegue)
js/game.js                  Motor: física, cámara, combate, rachas, post-procesado, HUD, bucle principal
js/menu.js                   Pantallas de menú, configuración y ajustes
tools/e2e/                    Pruebas end-to-end en Chrome headless (WebGL real)
```

## Controles

| Acción | Tecla |
|---|---|
| Moverse | `W A S D` (doble toque: esquiva) |
| Esprintar | `Shift` |
| Saltar | `Espacio` |
| Agacharse | `Ctrl` (permite pasar bajo obstáculos bajos) |
| Disparar | Clic izquierdo |
| Apuntar (ADS) | Clic derecho (mantener o alternar, según ajustes) |
| Recargar | `R` |
| Cuchillo | `V` |
| Cambiar arma | `1` `2` / Rueda del ratón |
| Interactuar / hablar | `E` |
| Usar racha (UAV / ataque aéreo) | `Q` |

## Campaña — Operación Trueno Rojo

Misión larga de un jugador en un mapa dedicado (Valle Trueno Rojo), un cañón fortificado que se recorre de sur a norte:

1. **Campamento** — informe del capitán Vega (diálogo con `E`).
2. **Puesto de control** — trinchera con sacos terreros, búnkeres y torre de guardia; primera oleada.
3. **Patio de contenedores** — el sargento Ruiz da inteligencia; emboscada con flanqueadores por las rocas.
4. **Complejo amurallado** — asalto por la puerta o por la brecha del muro este; el comandante Korvin (jefe con barra de vida) y su guardia.
5. **Helipuerto** — fase de resistencia con refuerzos por los barrancos y la puerta trasera hasta que llega el helicóptero.
6. **Extracción** — el operador Ortega pide el pájaro; aterrizaje cinemático y rango final (S/A/B/C) con tiempo, bajas, muertes y precisión.

Incluye tarjeta de capítulo, waypoint 3D con distancia y flecha de borde, marcador en el minimapa, puntos de control con curación, transmisiones de radio, diálogos con efecto máquina de escribir y retrato, y arma bajada mientras hablas. La dificultad ajusta el número y la resistencia de los enemigos.

## Modos multijugador (contra bots)

- **Todos contra Todos (FFA)**, **Duelo por Equipos (TDM)**, **Búsqueda y Destrucción (S&D)**, **Modo Arsenal (Gun Game)** y **Modo Horda** (oleadas crecientes).
- Rachas de bajas en todos los modos salvo S&D: 3 bajas → UAV (radar ampliado), 6 bajas → ataque aéreo.

## Mapas

Distrito Industrial, Zona Desértica y Complejo Urbano (simétricos, con carriles, rampas, plataformas y zona de plantado) y el Valle Trueno Rojo de la campaña.

## Ajustes

Sensibilidad, eje Y invertido, modo de ADS, volumen, FOV, calidad gráfica (sombras y post-procesado), sangre, minimapa, duración de partida, fuego amigo y mira personalizable (estilo, color y tamaño, con vista previa).

## Pruebas end-to-end

`tools/e2e` lanza el juego en Chrome headless con WebGL real (SwiftShader), sin extensiones ni servidor:

```bash
cd tools/e2e
npm install
npm test            # smoke de carga + regresión de modos + recorrido completo de la campaña
npm run campaign:big  # recorrido a 1280x800 y calidad alta, con capturas en tools/e2e/shots
```

El recorrido de la campaña usa eventos de teclado reales para los diálogos, teletransporta al jugador entre zonas, mata las oleadas y verifica cada transición de la misión, los puntos de control, el jefe, la resistencia, el helicóptero y la pantalla final. Define `CHROME_PATH` si Chrome no está en la ruta por defecto.
