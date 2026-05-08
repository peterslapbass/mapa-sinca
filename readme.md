# 🌫️ Dashboard Calidad del Aire Chile (SINCA + RedMeteo)

Dashboard interactivo en tiempo real para visualizar calidad del aire y condiciones meteorológicas en Chile.

Integra datos del sistema **SINCA** y estaciones meteorológicas procesadas automáticamente mediante **GitHub Actions**.

https://peterslapbass.github.io/AirQualityChile/

---

## 🚀 Características

### 🗺️ Visualización geoespacial
- Mapa interactivo con Leaflet
- Marcadores dinámicos por estación
- Capas de contaminantes activables

### 🌫️ Contaminantes atmosféricos
- MP 2.5
- MP 10
- NO₂
- CO
- O₃

### 🌬️ Meteorología integrada
- Velocidad del viento
- Dirección del viento
- Temperatura
- Humedad
- Presión atmosférica

### 🧭 Modelos avanzados
- Campo de viento interpolado (grid vectorial)
- Normalización automática de datos heterogéneos

### 📊 Analítica
- Ranking de estaciones con peor calidad del aire
- Sistema de alertas automáticas
- Filtros dinámicos por contaminante

### ⚡ Automatización
- Actualización automática cada **30 minutos**
- Pipeline ETL con GitHub Actions

## 🧱 Arquitectura del sistema

-EXTRACT
├── SINCA API
└── Red Meteo API

-TRANSFORM
├── process_meteo.py
└── Normalización de datos

-LOAD / COMPUTE
└── generate_wind_field.py
   └── Interpolación de campo de viento

## 📁 Estructura del proyecto

-/project
│
├── index.html
├── app.js
│
├── process_meteo.py
├── generate_wind_field.py
│
├── datos_sinca.json
├── datos_meteo_raw.json
├── datos_meteo.json
├── wind_field.json
│
└── .github/workflows/update.yml


## ⚙️ Cómo funciona
### 🌫️ SINCA
- Descarga automática desde API oficial
- Normalización de contaminantes
- Generación de snapshot por estación
### 🌬️ Meteo
- Procesamiento de estaciones meteorológicas
- Extracción de variables:
- viento
- temperatura
- humedad
- presión
### 🧭 Campo de viento
- Conversión a vectores (u, v)
- Interpolación espacial con SciPy
- Generación de grid climático


## 🧠 Modelo de datos
### Estación meteorológica
{
  "name": "Estación X",
  "lat": -33.45,
  "lon": -70.66,
  "wind_speed": 4.2,
  "wind_dir": 180,
  "temp": 18.5,
  "humidity": 55,
  "pressure": 1016.7
}
### Campo de viento interpolado
{
  "grid_size": 50,
  "bounds": {
    "min_lat": -34.0,
    "max_lat": -32.0,
    "min_lon": -71.5,
    "max_lon": -69.5
  },
  "u": [[...]],
  "v": [[...]]
}

## 🎨 Clasificación de calidad del aire
- Valor	Estado	Color
- 0–25	Bueno	🟢
- 26–50	Regular	🟡
- 51–100	Moderado	🟠
- 101–150	Malo	🔴
- 150+	Crítico	🟣

## 🔄 Actualización de datos 
- Cada 30 minutos Ejecutado vía GitHub Actions 
- Sin intervención manual 

## 🧩 Funcionalidades del mapa 
- 🗺️ Marcadores dinámicos por estación 
- 🌫️ Capas de contaminantes 
- 🌬️ Visualización de viento (vector field) 
- 📊 Panel lateral de ranking 
- 📱 Adaptación mobile 

## 📌 Notas técnicas Normalización de nombres de contaminantes (MP-2.5, PM25, etc.) 
- Manejo de datasets inconsistentes del SINCA 
- Interpolación espacial con scipy.griddata 
- Separación clara entre extracción y transformación de datos 
- Pipeline automatizado sin intervención manual 

## 🚀 Futuras mejoras 
- 🧠 Índice de Calidad del Aire (ICA Chile) 
- 📍 Clustering geográfico de estaciones
- 🌪️ Predicción simple de viento (modelos básicos) 
- 📱 Versión PWA (instalable como app) 
- 🔔 Alertas personalizadas por usuario 

## 👤 Autor 
- Proyecto de visualización ambiental basado en datos SINCA y meteorología de Chile, desarrollado por Pedro Rubio. 
- Enfoque en: procesamiento de datos ambientales visualización geoespacial automatización con GitHub Actions 
- Enfoque “vibecoding” + data engineering ligero 

## 🙏🏻 🙏🏼 🙏🏽 🙏🏾 🙏🏿 Agradecimientos 
- Red Meteorológica Aficionada de Chile. (2019). Sitio web RedMeteo. Red Ciudadana De Estaciones Meteorológicas. Desde 22-04-2026, https://www.redmeteo.cl/ 
- SINCA. Sistema de Información Nacional de Calidad del Aire, Ministerio de Medio Ambiente, Gobierno de Chile. Desde 22-04-2026, https://sinca.mma.gob.cl

## Última actualización

- Incorporación de fuentes puntuales RETC 2024.
- Mejoras de compatibilidad móvil (Safari/iOS).
- Correcciones de caché y actualización automática.
- Optimización visual de capas y superposición de marcadores.

> Nota: Las emisiones RETC pueden presentar distintas unidades dependiendo del tipo de fuente, combustible y metodología reportada.