/**
 * ======================================================
 *  👑 NovaPlaylistManager — V3.2 SafeQueue
 * ------------------------------------------------------
 *  Gestionnaire global de la file d’attente (queue[]) des
 *  vidéos du moteur Playlist.
 *
 *  ✅ Convertit automatiquement tout objet { url } en string
 *  ✅ Évite les [object Object] → 404
 *  ✅ Logs clairs et file auto-reprise
 * ======================================================
 */

export class NovaPlaylistManager {
  private queue: string[] = [];
  private listeners: ((src: string | null) => void)[] = [];
  private isPlaying = false;
  private currentSrc: string | null = null;

  /**
   * ➕ Ajoute une ou plusieurs vidéos dans la file
   */
  add(...videos: any[]) {
    if (!videos.length) return;

    // 🧠 Sécurisation : conversion automatique en string pure
    const normalized = videos
      .map((v) => {
        if (typeof v === "string") return v;
        if (v && typeof v === "object" && "url" in v) return v.url;
        console.warn("⚠️ [NovaPlaylistManager] vidéo ignorée (type inconnu):", v);
        return null;
      })
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0);

    if (!normalized.length) {
      console.warn("⚠️ [NovaPlaylistManager] aucune vidéo valide ajoutée", videos);
      return;
    }

    console.log(`🎞️ PlaylistManager.add → ${normalized.length} vidéos ajoutées`, normalized);
    this.queue.push(...normalized);

    // Si aucune lecture en cours, on démarre immédiatement
    if (!this.isPlaying) {
      this.next();
    }
  }

  /**
   * ▶️ Passe à la vidéo suivante (appelée par onEnded)
   */
  next() {
    const nextVideo = this.queue.shift() || null;

    if (nextVideo) {
      this.isPlaying = true;
      this.currentSrc = nextVideo;
      console.log("🎬 Lecture du prochain clip :", nextVideo);
      this.notify(nextVideo);
    } else {
      console.log("⏸ Playlist vide, attente de nouveaux clips");
      this.isPlaying = false;
      this.currentSrc = null;
      this.notify(null);
    }
  }

  /**
   * 🔔 Notifie tous les abonnés
   */
  private notify(src: string | null) {
    this.listeners.forEach((cb) => {
      try {
        cb(src);
      } catch (err) {
        console.warn("⚠️ Erreur listener playlist:", err);
      }
    });
  }

  /**
   * 👂 Abonne un listener au flux vidéo
   * ➕ Envoie immédiatement la vidéo courante si elle existe
   */
  subscribe(cb: (src: string | null) => void) {
    this.listeners.push(cb);

    if (this.currentSrc) {
      console.log("🔁 PlaylistManager.subscribe → émission immédiate du clip courant");
      cb(this.currentSrc);
    }
  }

  /**
   * ♻️ Réinitialise complètement la file
   */
  reset() {
    console.log("♻️ PlaylistManager.reset()");
    this.queue = [];
    this.isPlaying = false;
    this.currentSrc = null;
  }

  /**
   * 🧹 Vide la file et stoppe tout
   */
  clear() {
    console.log("🧹 PlaylistManager.clear()");
    this.queue = [];
    this.isPlaying = false;
    this.currentSrc = null;
    this.notify(null);
  }

  /**
   * 📊 Retourne la taille de la file
   */
  size() {
    return this.queue.length;
  }

  /**
   * 📜 Debug
   */
  debug() {
    console.log("📜 File actuelle :", this.queue);
  }
}
