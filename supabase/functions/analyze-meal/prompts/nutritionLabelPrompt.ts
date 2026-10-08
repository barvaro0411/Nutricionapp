export const NUTRITION_LABEL_PROMPT = `
Lee la etiqueta nutricional de la imagen. Devuelve un JSON sin comentarios:
{"meal_type_guess":"snack","items":[{"food":"Nombre del producto","grams":100,"unit":"g","calories":0,"protein":0,"carbs":0,"fat":0,"confidence":0.8}]}
Usa un solo ítem. Prioriza la columna por 100 g o por 100 ml: en ese caso grams=100 y unit="g" o "ml" según la etiqueta.
Si solo hay datos por porción, grams debe ser la cantidad de esa porción y los nutrientes deben corresponder a ESA MISMA porción.
No combines nutrientes de una columna con la cantidad de otra. No uses el volumen total del envase como base de una tabla por 100 ml.
calories representa kcal, protein, carbs y fat representan gramos. Convierte energía en kJ a kcal dividiendo por 4.184 cuando sea necesario.
No inventes nutrientes ilegibles ni el tamaño de una porción desconocida: si faltan datos necesarios devuelve items=[].
`.trim();
