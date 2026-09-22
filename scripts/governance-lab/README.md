# Laboratorio local de gobernanza

Banco de pruebas sintético, independiente de las pantallas productivas de PARA.
Compila directamente el motor TypeScript de `../WatZappa/packages/bsky` con el
compilador fijado por ese workspace. No accede a sesiones, PDS, AppView, base de
datos ni credenciales. El estado está en memoria del navegador y se pierde al
recargar. No proporciona anonimato ni almacenamiento transaccional.

Desde PARA, con Node 24.18.0:

```sh
node scripts/governance-lab/serve.mjs
```

Abrir http://127.0.0.1:8931. `GOVERNANCE_LAB_PORT` permite cambiar el puerto.
El servidor solo escucha en loopback, admite rutas estáticas conocidas y
rechaza escrituras. La compilación temporal se elimina al detenerlo con Ctrl+C.

Recorrido comprobable:

1. Ana sigue a Carla a través de Bruno; conserva 5 de 10 créditos.
2. Votar −3 en parque: queda saldo 0 y la señal de intensidad del parque pasa a 1.
3. Elegir biblioteca e intentar +2: el cambio se rechaza, revisión y saldo no cambian.
4. Reiniciar y cerrar: los resultados sintéticos se publican; votar/delegar queda deshabilitado.
5. Reiniciar, retirar la delegación de Ana y cerrar: se retienen los resultados
   porque quedan dos participantes representados, por debajo del mínimo de tres.
6. Cambiar de persona ficticia: el saldo y la representación deben corresponder
   a esa selección. Probar también a 390 px de ancho.

Contrato, decisiones pendientes y límites:
`WatZappa/docs/GOVERNANCE-LAB-CONTRACT.md`. El prototipo HTML es un instrumento
de verificación; su integración con componentes ALF, navegación y sesiones de
PARA está pendiente. No debe montarse como una ruta de votación real.
