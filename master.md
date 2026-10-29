# RutaBanano — Sistema de Diseño Base UI/UX Pro Max (`master.md`)

> **Categoría de Producto:** PWA Agro-Fintech & Control Operativo de Rutas, Gastos, Cartera, Inventario y Auditoría  
> **Enfoque de Diseño:** Mobile-First Android + Desktop Collapsible Workspace · Accesibilidad Senior **WCAG 2.1 AAA** · Operación Real **Offline-First**

---

## 1. Principios de Diseño (UI/UX Pro Max)

1. **Claridad Radical para Personas Mayores y Trabajo en Campo:**
   - Ninguna acción crítica depende solo del color: cada estado combina **color de alto contraste + ícono semántico + etiqueta en lenguaje cotidiano**.
   - Áreas táctiles mínimas de **`56px` a `64px`** de alto (superando el mínimo de `48×48dp` de Material Design y WCAG 2.5.5 Target Size).
2. **Adaptabilidad Ambiental (Sol Directo vs. Madrugada en Bodega):**
   - **Modo Claro (Luz Solar / Exterior):** Fondo cálido marfil (`#FEFCE8`) que reduce el deslumbramiento en pantallas Android bajo el sol, con bordes definidos (`2px solid`) y texto carbón profundo (`#0F172A`, contraste `16.4:1`).
   - **Modo Oscuro (Madrugada / Cabina de Camión):** Fondo pizarra profundo (`#090D16`) con tarjetas elevadas (`#111827`), texto blanco cálido (`#F8FAFC`) y acentos ámbar/esmeralda luminosos que evitan la fatiga visual nocturna.
3. **Transparencia Offline-First y Confianza Financiera:**
   - El usuario siempre sabe si sus apuntes están **guardados en el celular (`IndexedDB`)** o **sincronizados en la nube**, sin bloquear jamás el flujo de trabajo por falta de cobertura móvil.

---

## 2. Paleta de Colores Adaptativa (Tokens Semánticos)

| Token CSS | Rol Semántico | Modo Claro (Exterior / Sol) | Modo Oscuro (Cabina / Madrugada) | Ratio Contraste WCAG |
|---|---|---|---|---|
| `--bg-app` | Fondo general de la aplicación | `#FEFCE8` (Marfil cálido) | `#090D16` (Pizarra nocturno) | Base |
| `--bg-surface` | Tarjetas y contenedores primarios | `#FFFFFF` (Blanco puro) | `#111827` (Gris grafito) | Base |
| `--bg-elevated` | Modales, barras fijas y paneles destacados | `#F8FAFC` (Pizarra claro) | `#1E293B` (Pizarra elevado) | Base |
| `--text-primary` | Texto principal y títulos | `#0F172A` (Carbón profundo) | `#F8FAFC` (Blanco hielo) | **15.8:1 (AAA)** |
| `--text-secondary` | Subtítulos y metadatos | `#334155` (Pizarra medio) | `#CBD5E1` (Plata legible) | **8.2:1 (AAA)** |
| `--border-strong` | Bordes de tarjetas e inputs táctiles | `#94A3B8` / `#475569` | `#334155` / `#64748B` | **3.5:1+ (UI AA)** |
| `--brand-primary` | Acción principal (Hoja de Banano) | `#15803D` (Verde esmeralda) | `#22C55E` (Verde brillante) | **7.1:1 (AAA)** |
| `--brand-accent` | Acento e indicador activo (Fruta) | `#EAB308` (Amarillo banano) | `#FACC15` (Oro luminoso) | **10.4:1 (AAA)** |
| `--status-editable` | 🟢 Dentro del plazo de edición | Fondo `#DCFCE7` / Texto `#14532D` | Fondo `#052E16` / Texto `#86EFAC` | **9.3:1 (AAA)** |
| `--status-expired` | 🟠 Plazo vencido (Requiere permiso) | Fondo `#FFEDD5` / Texto `#9A3412` | Fondo `#431407` / Texto `#FDBA74` | **8.4:1 (AAA)** |
| `--status-approved` | 🔵 Permiso aprobado (1 solo uso) | Fondo `#DBEAFE` / Texto `#1E3A8A` | Fondo `#172554` / Texto `#93C5FD` | **8.9:1 (AAA)** |
| `--status-closed` | 🔒 Jornada cerrada / Bloqueo | Fondo `#FEE2E2` / Texto `#7F1D1D` | Fondo `#450A0A` / Texto `#FCA5A5` | **9.1:1 (AAA)** |

---

## 3. Tipografía (Google Fonts)

Se cargan desde Google Fonts tres familias complementarias optimizadas para legibilidad senior y precisión numérica:

1. **Lectura General y Botones (`--font-sans`: `'Atkinson Hyperlegible'`, `'Plus Jakarta Sans'`, `system-ui`)**:
   - Diseñada específicamente para personas con baja visión o presbicia: distingue inequívocamente `0` de `O`, `1` de `l` e `I`.
   - Tamaño base en móvil: **`19px` (`1.1875rem`)**, interlineado `1.5`.
2. **Encabezados y Pasos de Cierre (`--font-display`: `'Plus Jakarta Sans'`)**:
   - Pesos `700` y `800` para jerarquía visual instantánea.
3. **Cifras Monetarias, Cantidades y Reloj de Edición (`--font-mono`: `'JetBrains Mono'`)**:
   - Siempre con `font-variant-numeric: tabular-nums` para evitar saltos visuales en cuentas regresivas de plazos de edición y sumatorias de caja vs. utilidad.

---

## 4. Patrones de Navegación para PWA (Mobile-First + Desktop)

### 4.1 Móvil y Tablet Vertical (`< 1024px`)
- **Top Status Header (`sticky top-0 z-40`)**:
  - Muestra el nombre de la ruta, estado de conexión en vivo (`Con señal` / `Sin señal — Guardado en celular`), botón de Modo Claro/Oscuro (`☀️/🌙`) y acceso al panel de estado de sincronización.
- **Bottom Navigation Bar (`fixed bottom-0 z-50`)**:
  - 4 pestañas grandes de `76px` de alto con ícono de `26px`, etiqueta clara en español cotidiano y contador de notificaciones pendientes:
    1. `1. Ruta Hoy` (Ventas, cobros, gastos, compras, devoluciones, canastillas)
    2. `2. Cerrar Día` (Asistente guiado de 4 pasos + arqueo)
    3. `3. Dueño` (Aprobaciones vencidas, configuración de minutos, auxiliares y ajustes post-cierre)
    4. `4. 15 Pruebas` (Verificador en vivo de aceptación, auditoría inmutable y respaldos)

### 4.2 Desktop y Tablet Horizontal (`≥ 1024px`)
- **Menú Lateral Colapsable (`CollapsibleSidebar`)**:
  - Ancho expandido: `280px` | Ancho colapsado: `88px`.
  - Incluye botón de colapso rápido, estado del Service Worker/IndexedDB, resumen rápido de caja y selector de usuario/reloj integrado.
- **Área de Trabajo Multi-Columna**:
  - Aprovecha pantallas anchas mostrando las tarjetas de operación a la izquierda y un panel lateral fijo (`sticky`) con el resumen financiero en tiempo real (Ventas vs. Cartera vs. Utilidad Económica vs. Efectivo Físico en Caja).

---

## 5. Reglas WCAG y Pautas de UI para Operación Offline / Service Worker

1. **Estados de Conexión Explícitos (Nunca Silenciosos)**:
   - **Conectado y al día (`ONLINE_SYNCED`)**: Píldora verde esmeralda con ícono Wi-Fi y texto `"Al día en celular y nube"`.
   - **Sin Cobertura Móvil (`OFFLINE_PERSISTED`)**: Banner ámbar de alto contraste en la parte superior que informa: *"Sin señal móvil. Todos los registros se están guardando seguros en la memoria del celular (IndexedDB) y se enviarán automáticamente cuando vuelva la señal."*
2. **Skeletons de Carga Accesibles (`aria-busy="true"`)**:
   - Mientras se hidrata la base local `IndexedDB` o se recalculan las 15 pruebas de aceptación, se muestran bloques estructurales (`SkeletonMetrics`, `SkeletonOperationCard`) que conservan exactamente las dimensiones finales para evitar *Cumulative Layout Shift (CLS = 0)*.
3. **Protección en Acciones Irreversibles**:
   - Confirmación explícita con casilla de verificación de gran tamaño (`28×28px`) antes de ejecutar un cierre definitivo o consumir una autorización de edición vencida.

---

## 6. Estructura de Componentes React + Tailwind

```text
src/
├── components/
│   ├── layout/
│   │   └── ResponsivePwaShell.tsx   # Menú lateral colapsable (Desktop) + Barra inferior (Móvil) + Header
│   └── ui/
│       ├── PwaConnectionSheet.tsx   # Cajón de estado Offline, cola idempotente, backup y Service Worker
│       ├── SkeletonLoaders.tsx      # Skeletons de carga con soporte prefers-reduced-motion
│       └── ThemeToggle.tsx          # Conmutador accesible Modo Claro / Modo Oscuro
├── domain/                          # Motores de reglas oficiales (Tiempo, Seguridad, Inventario, Finanzas)
├── storage/                         # Persistencia transaccional en IndexedDB + Backups verificados
├── sync/                            # Conector Firebase Cloud Firestore + Reglas de servidor
├── App.tsx                          # Flujos operativos integrados con el nuevo Design System
└── styles.css                       # Tokens adaptativos CSS + Utilidades Tailwind
```

