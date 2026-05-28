# Roadmap de OCR/Face Local para m8 INE Proxy

## Fase 1: OCR de INE (PaddleOCR / EasyOCR)
- [ ] PaddleOCR: detección DB + reconocimiento SVTR, entrenado en español
- [ ] EasyOCR alternativa: soporte nativo español, API simple
- [ ] Pipeline: imagen → preprocesamiento (deskew, contrast) → OCR → extracción de campos
- [ ] Validación de campos: regex CURP, checksum clave elector

## Fase 2: Face Detection + Comparison (OpenCV + Dlib / InsightFace)
- [ ] Face detection: InsightFace (RetinaFace) o YuNet de OpenCV zoo
- [ ] Face landmarks: Dlib 68 puntos o InsightFace 5 puntos
- [ ] Face embedding: InsightFace (ArcFace) o DeepFace con modelos open
- [ ] Cosine similarity threshold: 0.80 para match, 0.60 para review

## Fase 3: Liveness Local
- [ ] Blink detection con eye aspect ratio (Dlib landmarks)
- [ ] Head pose estimation para evitar foto plana
- [ ] Opcional: challenge-response ("gire a la izquierda")
- [ ] Depth estimation: focus analysis o stereo si hay dual camera

## Fase 4: On-Device Processing (móvil)
- [ ] CoreML (iOS) / TensorFlow Lite (Android) para face embedding
- [ ] OCR on-device con PaddleOCR mobile o Vision framework (iOS)
- [ ] Todo el pipeline de INE → credencial sin salir del dispositivo
- [ ] Emisor solo firma claims ya verificados localmente

## Stack Local Target
- OCR: PaddleOCR (detección DB + SVTR) o EasyOCR
- Face: InsightFace (RetinaFace + ArcFace) o DeepFace
- Mobile: CoreML, TensorFlow Lite, Vision framework (iOS)
- Zero AWS/Google/Azure. Todo corre en laptop del usuario o servidor self-hosted.
