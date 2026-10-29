# RutaBanano — Master Design System (`design-system/MASTER.md`)

Consulte también [master.md](file:///a:/app%20en%20curso/rutaSync/master.md) en la raíz del proyecto para la especificación completa de:
- **Paleta de Colores Adaptativa (Modo Claro Solar `#FEFCE8` / Modo Oscuro Nocturno `#090D16`)** con contraste certificado **WCAG 2.1 AAA**.
- **Tipografías de Google Fonts**: `Atkinson Hyperlegible` (lectura senior accesible), `Plus Jakarta Sans` (encabezados) y `JetBrains Mono` (`tabular-nums` para cifras financieras y relojes de edición).
- **Patrones de Navegación PWA**:
  - **Mobile-First (`< 1024px`)**: Barra superior adhesiva + Barra inferior fija de 4 pestañas de `78px` de alto (`bottom-nav`).
  - **Desktop (`>= 1024px`)**: Menú lateral colapsable (`288px` expandido / `88px` colapsado) + Panel derecho en vivo de balance financiero e inventario (`ResponsivePwaShell.tsx`).
- **UI de Estado Offline / Service Worker / IndexedDB**:
  - Banner contextual sin cobertura, cajón de diagnóstico y respaldo JSON verificado (`PwaConnectionSheet.tsx`) y Skeletons de carga sin salto visual (`SkeletonLoaders.tsx`).

