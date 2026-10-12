# Observatorio de Migración del Perú

Sitio: https://lotuslatte.github.io/peru-migration-observatory/

Observatorio abierto de la movilidad humana en el Perú, hermano del
[Observatorio Laboral del Perú](https://lotuslatte.github.io/peru-labour-observatory/).
Reúne los flujos de migración interna de la ENAHO (INEI, módulo 400), la población venezolana
según la ENPOVE 2018 y 2022, y la relación entre choques climáticos y (in)movilidad.

- `pipeline/` — Python: carga, armonización, indicadores con errores estándar de diseño,
  grados de confiabilidad y exportación de los JSON/CSV que consume el sitio.
- `site/` — Astro 5 + Preact + D3: sitio estático (atlas, flujos, Venezuela, clima, historias,
  compendio, metodología). Los datos agregados están en `site/public/data/`, así que el sitio
  compila sin Python.

```bash
cd site && npm ci && npm run build
```

Prototipo en desarrollo, abierto a colaboración:
[Favio Samillan](https://lotuslatte.github.io).

Licencia de datos y sitio: CC-BY 4.0. Fuentes: INEI – ENAHO, ENPOVE.
