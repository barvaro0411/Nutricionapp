# Especificación de Diseño: Soporte Integral de Unidades Líquidas (ml, L) y Registro de Bebidas

**Fecha:** 2026-10-07  
**Estado:** Aprobado para Planificación  
**Autor:** Antigravity & Usuario  

---

## 1. Resumen y Contexto

Actualmente, la aplicación de nutrición asume que todos los alimentos se miden exclusivamente en **gramos (`g`)**. Cuando los usuarios registran bebidas comunes (como una lata de **Red Bull de 250 ml** antes de entrenar o una botella de **Gatorade de 1 Litro (1.000 ml)** durante el almuerzo), la interfaz presenta textos confusos como *"¿Cuántos gramos consumiste?"*, ofrece atajos inadecuados (como 100g o 180g) y muestra `250g` o `1000g` en el panel de control.

Este diseño especifica el soporte de primera clase para **líquidos y bebidas** con unidades en **mililitros (`ml`)** y **litros (`L`)**, detección inteligente de bebidas, selección rápida de envases típicos (latas, botellas, vasos) y alternancia entre versiones regulares y "Zero / Sin Azúcar".

---

## 2. Objetivos y No Objetivos

### Objetivos:
- Permitir registrar alimentos en **`ml`** o **`g`** de forma fluida.
- Detectar automáticamente si un producto o texto ingresado es una bebida para preseleccionar `ml`.
- Ofrecer chips rápidos de envases reales (`200 ml` vaso, `250 ml` lata Red Bull, `350 ml` lata estándar, `500 ml` botella, `1.000 ml / 1L` botella grande Gatorade).
- Permitir entradas amigables como `"1L"`, `"1.5L"` o `"1000"` y convertirlas limpiamente a mililitros.
- Facilitar el cambio entre versiones con azúcar y "Zero / Sugar Free" para bebidas deportivas y energéticas con 1 toque.
- Mostrar la unidad correcta (`250 ml`, `1 L`) en el Dashboard (`MealCard`) y pantallas de historial.
- Mantener 100% de compatibilidad hacia atrás con registros históricos y con la base de datos Supabase existente.

### No Objetivos:
- No se implementa un sistema complejo de cocina con docenas de medidas volumétricas oscuras (oz líquidas, galones, pintas). Se mantiene el sistema métrico internacional/chileno estándar (`ml`, `L`, `g`, `kg`).
- No se altera la estructura relacional de la tabla `meal_items` de Supabase (el valor numérico base se preserva de manera transparente ya que $1\text{ ml} \approx 1\text{ g}$ de densidad).

---

## 3. Modelo de Datos y Helpers

### 3.1. Extensión del Tipo de Ítem de Alimento
En `src/types/meal.ts`:
```typescript
export type FoodUnit = "g" | "ml";

export const DetectedFoodItemSchema = z.object({
  id: z.string().optional(),
  food: z.string().min(1, "El nombre del alimento es requerido"),
  grams: z.number().finite().min(0).max(20000), // Mantiene la cantidad base en gramos/ml
  unit: z.enum(["g", "ml"]).default("g").optional(),
  calories: z.number().finite().min(0).max(50000),
  protein: z.number().finite().min(0).max(10000),
  carbs: z.number().finite().min(0).max(10000),
  fat: z.number().finite().min(0).max(10000),
  confidence: z.number().min(0).max(1).default(0.8),
  ratioCalories: z.number().optional(),
  ratioProtein: z.number().optional(),
  ratioCarbs: z.number().optional(),
  ratioFat: z.number().optional(),
});
```

### 3.2. Módulo de Utilidad para Bebidas y Líquidos (`src/utils/liquidUnits.ts`)
Funciones puras y probadas para:
1. `isLiquidFood(foodName: string): boolean`:
   Detecta si el nombre contiene términos como: *red bull, gatorade, powerade, monster, agua, bebida, jugo, leche, café, té, cerveza, energizante, néctar, refresco, soda, kombucha, batido, etc.*
2. `parseQuantityInput(input: string, unit: FoodUnit): number`:
   Interpreta números simples (`250`, `1000`), decimales con coma (`1,5`), sufijos de litros (`1L`, `1.5L`, `1 l`) convirtiendo litros a mililitros ($1\text{L} \rightarrow 1.000\text{ ml}$).
3. `formatQuantityDisplay(amount: number, unit?: FoodUnit): string`:
   Formatea de forma legible: `250 ml`, `1 L` (para 1.000 ml), `500 ml`, `150 g`.
4. `getStandardPortions(unit: FoodUnit)`:
   - Para `ml`: `[{ label: "200 ml (Vaso)", value: 200 }, { label: "250 ml (Lata chica)", value: 250 }, { label: "350 ml (Lata)", value: 350 }, { label: "500 ml (Botella)", value: 500 }, { label: "1.000 ml (1 Litro)", value: 1000 }]`.
   - Para `g`: `[{ label: "100g", value: 100 }, { label: "150g", value: 150 }, { label: "200g", value: 200 }, { label: "250g", value: 250 }, { label: "300g", value: 300 }]`.

---

## 4. Cambios en la Interfaz de Usuario y Flujos

### 4.1. Escáner de Código de Barras (`app/meal/barcode.tsx`)
- Al consultar Open Food Facts o la base local, detectar si el producto tiene volumen (`ml`, `cl`, `l` o nombre de bebida).
- Si es bebida:
  - Cambiar el texto a: *"¿Cuánto volumen consumiste?"*.
  - Mostrar el selector `[ g | ml ]` con `ml` seleccionado.
  - Ofrecer chips de porción líquida (`250 ml`, `350 ml`, `500 ml`, `1 L`).
  - Prellenar la porción con el tamaño real de la lata/botella si viene en la información del producto (ej: 250 ml para Red Bull).

### 4.2. Pantalla de Revisión de Comidas (`app/meal/review.tsx`)
- En cada tarjeta de alimento:
  - Toggle `[ g | ml ]` para cambiar la unidad en cualquier momento.
  - Si la unidad es `ml`:
    - Botones de paso rápido: `[-50 ml]` y `[+50 ml]`.
    - Fila de chips de envases reales: `200 ml`, `250 ml (Red Bull)`, `350 ml`, `500 ml`, `1.000 ml (Gatorade)`.
    - Input de texto que acepta `1L`, `1.5L` o números directos.
  - Para bebidas energéticas/isotónicas/gaseosas:
    - Chip de acción rápida: *"⚡ Cambiar a Zero / Sin Azúcar"* o *"🔄 Cambiar a Regular"*, recalculando los macros al instante.
- En el modal "+ Agregar otro":
  - Selector de unidad `[ g | ml ]` que adapta los campos e indicadores.

### 4.3. Tarjetas del Dashboard e Historial (`MealCard.tsx`)
- Mostrar la unidad adecuada según el tipo de alimento:
  - `Math.round(item.grams) + "g"` para alimentos sólidos.
  - Formato líquido para bebidas: `250 ml` o `1 L` si la cantidad es 1000 ml.

### 4.4. Procesamiento de Texto y Voz (Prompt de IA)
- Reforzar el prompt del nutricionista IA (`mealTextPrompt.ts` y `mealVisionPrompt.ts`) para que cuando el usuario mencione botellas de 1L, latas de Red Bull o vasos de bebida, asigne la unidad `"ml"` y la cantidad en mililitros exactos.

---

## 5. Casos Extremos y Manejo de Errores

| Caso Extremo | Comportamiento Esperado |
|---|---|
| Usuario ingresa `"1,5L"` o `"1.5 l"` | Sanitizar coma a punto, detectar sufijo `l` o `L`, multiplicar por 1000 $\rightarrow$ `1500 ml`. |
| Cantidad fuera de límites | Aceptar entre 1 ml y 5.000 ml (5 Litros). Valores negativos o absurdos muestran mensaje de validación. |
| Comida histórica en base de datos sin campo `unit` | Fallback inteligente: si `isLiquidFood(food_name)` es verdadero muestra `ml`; en caso contrario muestra `g`. |
| Toggle entre `g` y `ml` | La cantidad numérica se preserva intacta (ej: 250g pasa a 250ml) y se actualizan los chips a medidas líquidas. |

---

## 6. Plan de Pruebas

1. **Pruebas Unitarias (`src/utils/__tests__/liquidUnits.test.ts`):**
   - Detección de líquidos (Gatorade, Red Bull, agua mineral, pan con palta, cazuela).
   - Parseo de entradas flexibles (`1L`, `1.5L`, `250`, `500ml`, `0.75L`, `1,5`).
   - Formateo de cantidades (`250 ml`, `1 L`, `1.5 L`, `100 g`).
2. **Pruebas de Componentes / Integración:**
   - Registro de 1 lata de Red Bull (250 ml) con cálculo de macros correspondiente.
   - Registro de 1 botella de Gatorade (1.000 ml) con ~240 kcal y ~60g carbs.
   - Alternancia a variante Zero / Sugar Free.
   - Renderizado en `MealCard` y persistencia en store y base de datos.
