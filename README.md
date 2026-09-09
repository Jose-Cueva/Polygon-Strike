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
css/style.css      Toda la interfaz (menús, HUD, tema táctico)
js/audio.js         Motor de sonido sintetizado (Web Audio API)
js/weapons.js        Definición y modelos 3D de las armas
js/maps.js            Los 3 mapas jugables
js/bots.js             IA de los bots (percepción, objetivos, combate, animación)
js/modes.js              Los 4 modos de juego
js/game.js                 Motor: física, cámara, combate, armería, HUD, bucle principal
js/menu.js                  Pantallas de menú y configuración de partida
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
| Cambiar arma | `1` `2` / Rueda del ratón |
| Interactuar (plantar/desactivar) | `E` |

## Modos de juego

- **Todos contra Todos (FFA)** — cada bot va por su cuenta; el primero en llegar al límite de bajas gana.
- **Duelo por Equipos (TDM)** — tu escuadra de bots aliados contra la escuadra enemiga.
- **Búsqueda y Destrucción (S&D)** — rondas a vida única; los atacantes deben plantar y detonar el explosivo, los defensores impedirlo o desactivarlo.
- **Modo Arsenal (Gun Game)** — cada baja te asciende a la siguiente arma; gana quien complete primero la escalera de armas.

## Mapas

Distrito Industrial, Zona Desértica y Complejo Urbano — cada uno con su propio trazado, paleta de colores, rampas, coberturas, una torre de radar, bandera, plataforma elevadora y zona de plantado.

## Armería

Rifle, Escopeta y Francotirador son seleccionables como arma principal en la configuración de partida; la Pistola siempre va de arma secundaria. Cofres de munición repartidos por el mapa recargan la reserva de ambas armas al caminar sobre ellos.

## Características

- Menú completo: selección de modo, mapa, dificultad de los bots, número de bots y arma principal.
- Gunplay estilo CoD: retroceso, muzzle flash, trazas de bala, hitmarker, balanceo del arma (sway/bobbing), ADS con zoom proporcional y mira telescópica real en el francotirador.
- Bots dinámicos: ciclo de caminata animado, pose de apuntado, flinch al recibir daño, IA consciente de equipos (aliados vs. enemigos) con detección por campo de visión y línea de visión.
- Mapas vivos: cielo con degradado, torre de radar giratoria, baliza parpadeante, bandera que ondea, plataforma elevadora móvil, partículas de polvo.
- Regeneración de salud tras 4s sin recibir daño, viñeta roja de daño e indicador de dirección de impacto.
- Audio 100% sintetizado en tiempo real con la Web Audio API.
- Pausa, reinicio y pantalla de fin de partida con estadísticas.
