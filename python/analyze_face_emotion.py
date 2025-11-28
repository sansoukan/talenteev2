#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nova RH – analyze_face_emotion.py
---------------------------------
Analyse d’une image faciale : émotion dominante, posture, regard et stabilité.
Conçu pour être appelé par Next.js via /api/analyze-face (spawn python3 ...).

Sortie JSON :
{
  "emotion": "happy",
  "confidence": 0.93,
  "emotion_scores": {...},
  "gaze_direction": "center",
  "eye_contact": 87.5,
  "gaze_stability": 91.0,
  "posture_score": 89.0,
  "session_id": "abcd-1234"
}
"""

import sys
import json
import cv2
import numpy as np
import mediapipe as mp
from deepface import DeepFace


def analyze_face(image_path: str):
    """
    Analyse une image : émotions (DeepFace) + posture et regard (MediaPipe)
    Retourne un dictionnaire JSON prêt à être parsé côté Node.
    """
    try:
        frame = cv2.imread(image_path)
        if frame is None:
            raise ValueError("Invalid image path or corrupted frame")

        # 🔹 Étape 1 : Analyse DeepFace (émotion dominante)
        analysis = DeepFace.analyze(
            img_path=frame,
            actions=["emotion"],
            enforce_detection=False,
            silent=True
        )

        dominant_emotion = analysis[0]["dominant_emotion"]
        emotion_scores = analysis[0]["emotion"]
        confidence = emotion_scores.get(dominant_emotion, 0) / 100

        # 🔹 Étape 2 : Analyse visuelle (MediaPipe FaceMesh)
        mp_face = mp.solutions.face_mesh
        face_mesh = mp_face.FaceMesh(static_image_mode=True, refine_landmarks=True)
        results = face_mesh.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        face_mesh.close()

        gaze_direction = "unknown"
        gaze_stability = 0
        eye_contact = 0
        posture_score = 0

        if results.multi_face_landmarks:
            face_landmarks = results.multi_face_landmarks[0]
            left_eye = face_landmarks.landmark[33]   # coin œil gauche
            right_eye = face_landmarks.landmark[263] # coin œil droit
            nose = face_landmarks.landmark[1]        # centre du nez

            # Calcul du décalage par rapport au centre de l’image
            dx = abs(nose.x - 0.5)
            dy = abs(nose.y - 0.5)

            # Direction du regard
            if dx > 0.05:
                gaze_direction = "left" if nose.x < 0.5 else "right"
            elif dy > 0.05:
                gaze_direction = "down"
            else:
                gaze_direction = "center"

            # Scores comportementaux
            gaze_stability = round(max(0, 100 - dx * 200), 2)
            eye_contact = round(max(0, 100 - dx * 250), 2)
            posture_score = round(max(0, 100 - (dx + dy) * 200), 2)

        # 🔹 Résultat final
        return {
            "emotion": dominant_emotion,
            "confidence": round(confidence, 3),
            "emotion_scores": emotion_scores,
            "gaze_direction": gaze_direction,
            "eye_contact": eye_contact,
            "gaze_stability": gaze_stability,
            "posture_score": posture_score,
        }

    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    # 🔹 Paramètres CLI : chemin de l’image + session_id
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing arguments"}))
        sys.exit(1)

    image_path = sys.argv[1]
    session_id = sys.argv[2]

    result = analyze_face(image_path)
    result["session_id"] = session_id
    print(json.dumps(result))
    sys.exit(0)